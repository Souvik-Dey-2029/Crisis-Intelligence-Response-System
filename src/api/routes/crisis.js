import express from 'express';
import axios from 'axios';
import { generateAIResponse } from '../../utils/aiRouter.js';

const router = express.Router();

// Calculate distance in km between two lat/lng points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Convert magnitude to simple severity scale
function determineSeverity(mag) {
    if (mag >= 6.0) return 'Critical';
    if (mag >= 4.5) return 'Medium';
    return 'Low';
}

router.get('/nearby', async (req, res) => {
    const { lat, lng } = req.query;
    
    if (!lat || !lng) {
        return res.status(400).json({ error: 'lat and lng query parameters are required.' });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const alerts = [];
    let apisFailed = false;

    // 1. Fetch from NASA EONET
    try {
        const eonetRes = await axios.get('https://eonet.gsfc.nasa.gov/api/v3/events?limit=50', { timeout: 8000 });
        if (eonetRes.data && eonetRes.data.events) {
            for (const event of eonetRes.data.events) {
                if (!event.geometry || event.geometry.length === 0) continue;
                
                // Use the most recent geometry point
                const latestGeo = event.geometry[event.geometry.length - 1];
                if (latestGeo.type !== 'Point') continue;
                
                const eventLon = latestGeo.coordinates[0];
                const eventLat = latestGeo.coordinates[1];
                const distance = calculateDistance(userLat, userLng, eventLat, eventLon);
                
                // Show alerts within 1500km to ensure some data for demo, or scale down for production
                if (distance <= 2000) {
                    alerts.push({
                        id: event.id,
                        type: event.categories[0]?.title || 'Disaster',
                        severity: 'Medium', // EONET default
                        title: event.title,
                        description: `NASA EONET detected a ${event.categories[0]?.title || 'event'} at this location.`,
                        location: `${Math.round(distance)} km away`,
                        timestamp: latestGeo.date,
                        source: 'NASA EONET',
                        distance: Math.round(distance),
                        lat: eventLat,
                        lng: eventLon
                    });
                }
            }
        }
    } catch (e) {
        console.error('[CRISIS API] NASA EONET Error:', e.message);
        apisFailed = true;
    }

    // 2. Fetch from USGS Earthquakes
    try {
        // Use the past day's significant earthquakes
        const usgsRes = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', { timeout: 8000 });
        if (usgsRes.data && usgsRes.data.features) {
            for (const feature of usgsRes.data.features) {
                const eventLon = feature.geometry.coordinates[0];
                const eventLat = feature.geometry.coordinates[1];
                const distance = calculateDistance(userLat, userLng, eventLat, eventLon);

                if (distance <= 2000) {
                    alerts.push({
                        id: feature.id,
                        type: 'Earthquake',
                        severity: determineSeverity(feature.properties.mag),
                        title: `M ${feature.properties.mag} Earthquake`,
                        description: feature.properties.title,
                        location: feature.properties.place,
                        timestamp: new Date(feature.properties.time).toISOString(),
                        source: 'USGS',
                        distance: Math.round(distance),
                        lat: eventLat,
                        lng: eventLon
                    });
                }
            }
        }
    } catch (e) {
        console.error('[CRISIS API] USGS Error:', e.message);
        apisFailed = true;
    }
    
    // 3. Fetch from OpenWeatherMap One-Call 3.0 (If configured)
    const openWeatherKey = process.env.OPENWEATHER_API_KEY;
    if (openWeatherKey) {
        try {
            const owmUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${userLat}&lon=${userLng}&exclude=minutely,hourly,daily&appid=${openWeatherKey}`;
            const owmRes = await axios.get(owmUrl, { timeout: 8000 });
            
            if (owmRes.data && owmRes.data.alerts) {
                owmRes.data.alerts.forEach((alert, idx) => {
                    alerts.push({
                        id: `owm_${idx}_${Date.now()}`,
                        type: 'Weather',
                        severity: 'High', // Defaulting to High for active weather alerts
                        title: alert.event,
                        description: alert.description || `Weather alert: ${alert.event} reported by ${alert.sender_name || 'local authorities'}.`,
                        location: 'Your Local Area',
                        timestamp: new Date(alert.start * 1000).toISOString(),
                        source: 'OpenWeatherMap',
                        distance: 0, // Alerts provided for the exact requested location
                        lat: userLat,
                        lng: userLng
                    });
                });
            }
        } catch (e) {
            console.error('[CRISIS API] OpenWeatherMap Error:', e.message);
            // We don't mark apisFailed=true here alone since it's optional auth
        }
    }
    
    // Sort alerts by distance and limit to top 4 to save AI processing time
    alerts.sort((a, b) => a.distance - b.distance);
    const topAlerts = alerts.slice(0, 4);

    // 3. AI Enhancement Layer using parallel requests
    const aiEnhancedAlerts = await Promise.all(topAlerts.map(async (alert) => {
        const prompt = `User is located near coordinates (${userLat}, ${userLng}). A real-world ${alert.type} (${alert.title}) has been detected ${alert.location}. 
        Return a JSON object containing:
        1. "explanation": A simple 1-sentence explanation of the risk.
        2. "safetySteps": An array of 3 actionable safety steps (bullet points).
        3. "severityReasoning": A short 1-sentence reasoning for its severity.
        Return ONLY valid JSON. Nothing else. Example: {"explanation": "...", "safetySteps": ["..."], "severityReasoning": "..."}`;
        
        try {
            const aiResponseStr = await generateAIResponse(prompt, 'en');
            // Try to extract JSON from markdown if model wrapped it
            const jsonMatch = aiResponseStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const aiData = JSON.parse(jsonMatch[0]);
                return { 
                    ...alert, 
                    aiExplanation: aiData.explanation || `Alert detected in your area.`,
                    aiSafetySteps: aiData.safetySteps || ["Stay indoors", "Monitor local news", "Prepare an emergency kit"],
                    aiReasoning: aiData.severityReasoning || `Based on proximity to you.`
                };
            }
            throw new Error("No JSON matched in AI response");
        } catch (err) {
            console.error(`[CRISIS API] AI Enhancement Error for ${alert.title}:`, err.message);
            // Fallback AI data
            return {
                ...alert,
                aiExplanation: `A ${alert.type} was detected in your region.`,
                aiSafetySteps: ["Review local emergency guidelines", "Stay tuned to official channels", "Ensure communications are working"],
                aiReasoning: "Standard safety protocol for unclassified regional events."
            };
        }
    }));

    return res.json({
        fallbackMode: apisFailed && alerts.length === 0,
        alerts: aiEnhancedAlerts,
        updatedAt: new Date().toISOString()
    });
});

export default router;
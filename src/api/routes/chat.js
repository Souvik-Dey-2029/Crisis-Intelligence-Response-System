// ============================================
// ResQAI - Chat API Routes (Chatbot)
// ============================================

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { addChatMessage } from '../../db/db.js';
import { getSystemPrompt, isValidLanguage } from '../../utils/languages.js';
import { generateAIResponse, getAIRouterStatus } from '../../utils/aiRouter.js';

const router = express.Router();

// ==================== GET AI RESPONSE - MULTI-PROVIDER ====================

async function getAIResponse(message, language = 'en') {
    // Message received - processing

    // Validate language
    if (!isValidLanguage(language)) {
        console.warn(`⚠️  Invalid language "${language}", defaulting to English`);
        language = 'en';
    }

    const systemPrompt = getSystemPrompt(language);

    const prompt = `${systemPrompt}

User query (${language}): "${message}"

Provide a comprehensive, structured response in ${language} that follows the exact format above.`;

    // Use the multi-provider AI router
    const response = await generateAIResponse(prompt, language);

    // Limit response length
    if (response.length > 2000) {
        return response.substring(0, 1997) + '...';
    }

    return response;
}

// ==================== POST CHAT MESSAGE ====================

router.post('/', async (req, res) => {
    try {
        const { message, language = 'en', systemId = 'global' } = req.body;

        if (!message || !message.trim()) {
            // Empty message validation failed
            return res.status(400).json({
                success: false,
                error: 'AI service unavailable',
                message: 'Message is required'
            });
        }

        // Chat request received and processed
        const id = uuidv4();

        // Get AI response from multi-provider router (always returns a response)
        const response = await getAIResponse(message, language);

        // Store in database (optional)
        try {
            await addChatMessage(id, message, response, systemId);
            // Database save skipped or completed

        } catch (error) {
            console.warn('⚠️  Could not save chat history:', error.message);
            // Don't fail the response if chat history fails
        }

        // Response prepared and sending to client

        res.json({
            success: true,
            message: message,
            response: response,
            language: language,
            timestamp: new Date().toISOString(),
            providers: getAIRouterStatus().availableProviders
        });
    } catch (error) {
        console.error('\n🔴 [ROUTE] Unhandled error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Error processing chat message',
            details: error.message
        });
    }
});

// ==================== HEALTH CHECK ====================

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'chat-api',
        aiProviders: getAIRouterStatus()
    });
});

export default router;

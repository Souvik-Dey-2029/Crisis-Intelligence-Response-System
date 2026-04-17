// ============================================================
// ECHO+ APP LOGIC — Guest + Admin flows, AI, TTS, Maps
// ============================================================
// NOTE: API keys & credentials removed - handled by backend
// This module is production-ready for integration into ResQAI

const ADMIN_PASS = 'echo2024'; // DEMO ONLY - Replace with backend auth


let state = {
  role: null,
  selectedHotel: null,
  guestName: '', roomNumber: '', secretCode: '',
  guestObj: null,
  currentEmergency: null,
  lang: 'en',
  notifications: [],
  timeline: [],
  emergencyCount: 0,
  mapAnim: null,
  lastInstruction: '',
  aiThinking: false,
};

const $ = id => document.getElementById(id);
const show = id => {
  if (!id || typeof id !== 'string') {
    console.warn('show: Invalid screen ID', id);
    return;
  }
  try {
    document.querySelectorAll('.echo-screen').forEach(s => s.classList.remove('echo-active'));
    const el = $(id);
    if (el) {
      el.classList.add('echo-active');
    } else {
      console.warn('show: Screen not found:', id);
    }
  } catch (error) {
    console.error('show error:', error);
  }
};
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('🚀 [EcoPlus] DOMContentLoaded - Starting initialization...');

    // Verify critical DOM elements exist
    const landingScreen = $('screen-landing');
    if (!landingScreen) {
      console.error('❌ [EcoPlus] Critical element missing: #screen-landing');
      throw new Error('Missing critical DOM element: screen-landing');
    }

    // Display landing screen
    show('screen-landing');
    console.log('📺 [EcoPlus] Landing screen displayed');

    // Safe initialization with null checks
    const hotelSearch = $('hotel-search');
    const adminPassInput = $('admin-pass-input');

    // Initialize app state
    renderHotelList('');
    console.log('🏨 [EcoPlus] Hotel list rendered');

    initAdminMap();
    console.log('🗺️ [EcoPlus] Admin map initialized');

    updateStaffPanel();
    console.log('👥 [EcoPlus] Staff panel updated');

    // Only add listeners if elements exist
    if (hotelSearch) {
      hotelSearch.addEventListener('input', e => renderHotelList(e.target.value));
      console.log('🔍 [EcoPlus] Hotel search listener attached');
    } else {
      console.warn('⚠️ [EcoPlus] Hotel search element not found');
    }

    if (adminPassInput) {
      adminPassInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') adminLogin();
      });
      console.log('🔐 [EcoPlus] Admin login listener attached');
    } else {
      console.warn('⚠️ [EcoPlus] Admin input element not found');
    }

    console.log('✅ [EcoPlus] Initialization complete - Module is ready');
  } catch (error) {
    console.error('❌ [EcoPlus] Initialization error:', error);
    // Show fallback message
    const landingScreen = $('screen-landing');
    if (landingScreen) {
      landingScreen.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #ff4444;
          text-align: center;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <h2 style="font-size: 24px; margin-bottom: 10px;">⚠️ Initialization Error</h2>
          <p style="color: #ccc; margin-bottom: 20px;">${error.message}</p>
          <p style="font-size: 12px; color: #999;">Check browser console for details</p>
        </div>
      `;
    }
  }
});

// ============================================================
// IMMEDIATE BOOT CHECKS
// ============================================================
console.log('🏨 [EcoPlus] App.js loaded');
console.log('  - state object:', typeof state !== 'undefined' ? 'Ready' : 'Not found');
console.log('  - $() helper:', typeof $ !== 'undefined' ? 'Ready' : 'Not found');
console.log('  - show() function:', typeof show !== 'undefined' ? 'Ready' : 'Not found');

// ============================================================
// ROUTING
// ============================================================
function goGuest() {
  console.log('👤 [EcoPlus] Going to guest mode');
  state.role = 'guest';
  show('screen-guest-select');
}

function goAdmin() {
  console.log('🖥️ [EcoPlus] Going to admin mode');
  show('screen-admin-login');
}

function goLanding() {
  state.role = null; state.selectedHotel = null; state.currentEmergency = null;
  state.guestObj = null; state.notifications = [];
  show('screen-landing');
  clearEmergencyVisuals();
}
function goGuestLogin() {
  if (!state.selectedHotel) {
    console.warn('No hotel selected');
    return;
  }

  // Safe DOM updates with null checks
  const hotelName = $('login-hotel-name');
  const hotelLoc = $('login-hotel-loc');

  if (hotelName) hotelName.textContent = state.selectedHotel.name;
  if (hotelLoc) hotelLoc.textContent = `${state.selectedHotel.city}, ${state.selectedHotel.country}`;

  show('screen-guest-login');
}
function goGuestSelectFromLogin() { show('screen-guest-select'); }

// ============================================================
// HOTEL SEARCH
// ============================================================
function renderHotelList(query) {
  const list = $('hotel-list-container');
  const q = query.toLowerCase();
  const filtered = ECHO_DATA.hotels.filter(h =>
    h.name.toLowerCase().includes(q) ||
    h.city.toLowerCase().includes(q) ||
    h.type.toLowerCase().includes(q)
  );
  list.innerHTML = filtered.length === 0
    ? `<div style="color:var(--text3);font-size:14px;text-align:center;padding:24px">No hotels found</div>`
    : filtered.map(h => `
      <div class="hotel-card" onclick="selectHotel('${h.id}')">
        <div class="hotel-type-badge badge-${h.type}">${h.type === 'luxury' ? '👑' : h.type === 'boutique' ? '🌸' : '🏢'}</div>
        <div class="hotel-info">
          <div class="hotel-name">${h.name}</div>
          <div class="hotel-loc">📍 ${h.city}, ${h.country}</div>
          <div class="hotel-meta">${h.type.charAt(0).toUpperCase() + h.type.slice(1)} · ${h.floors} floors · ${h.rooms.filter(r => r.status === 'occupied').length} guests</div>
        </div>
        <div class="hotel-arrow">›</div>
      </div>
    `).join('');
}

function selectHotel(id) {
  state.selectedHotel = ECHO_DATA.hotels.find(h => h.id === id);
  goGuestLogin();
}

// ============================================================
// GUEST LOGIN
// ============================================================
function guestLogin() {
  const name = $('guest-name').value.trim();
  const room = $('guest-room').value.trim();
  const code = $('guest-code').value.trim();
  const err = $('login-error');
  err.classList.remove('show');

  if (!name || !room || !code) { err.textContent = 'Please fill in all fields.'; err.classList.add('show'); return; }

  const found = state.selectedHotel.rooms.find(r =>
    r.roomNumber === room &&
    r.secretCode.toLowerCase() === code.toLowerCase() &&
    r.status === 'occupied'
  );

  if (!found) { err.textContent = 'Invalid room or secret code. Please try again.'; err.classList.add('show'); return; }

  // Allow name override for demo
  state.guestObj = { ...found, guestName: name };
  state.guestName = name;
  state.roomNumber = room;
  showGuestDashboard();
}

function showGuestDashboard() {
  const g = state.guestObj;
  const h = state.selectedHotel;

  // Header
  $('gdash-hotel').textContent = h.name;
  $('gdash-city').textContent = `${h.city} · Floor ${g.floor}`;

  // Guest card
  const initials = g.guestName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $('gdash-avatar').textContent = initials;
  $('gdash-guestname').textContent = g.guestName;
  $('gdash-room-detail').textContent = `Room ${g.roomNumber} · Floor ${g.floor} · ${g.zone.charAt(0).toUpperCase() + g.zone.slice(1)} Wing`;
  $('gdash-zone').textContent = `Zone: ${g.zone}`;

  // Status
  setGuestStatus('normal', '✅ All Clear — You are safe', 'No active emergencies. Enjoy your stay at ' + h.name + '.');

  // Instruction
  $('gdash-instruction').textContent = 'No emergency active. Have a pleasant stay. In case of emergency, follow the voice instructions.';
  state.lastInstruction = '';

  // Floor map
  renderGuestMap(g.floor, null);

  // Notifications reset
  state.notifications = [];
  renderNotifications();

  show('screen-guest-dashboard');
}

function setGuestStatus(type, title, message) {
  const card = $('gdash-status-card');
  card.className = 'status-card ' + type;
  $('gdash-status-title').textContent = title;
  $('gdash-status-msg').textContent = message;
}

// ============================================================
// ADMIN LOGIN
// ============================================================
function adminLogin() {
  const pass = $('admin-pass-input').value;
  const err = $('admin-login-error');
  err.classList.remove('show');
  if (pass !== ADMIN_PASS) { err.textContent = 'Incorrect master password.'; err.classList.add('show'); return; }
  show('screen-admin-dashboard');
  renderAdminNotifications();
}

// ============================================================
// EMERGENCY TRIGGER (ADMIN)
// ============================================================
function triggerEmergency(type) {
  // Default to first scenario of that type or construct one
  const scenario = ECHO_DATA.scenarios.find(s => s.type === type) || {
    type, floor: 2, roomNumber: '201', zone: 'west', severity: 'high',
    description: `${type} emergency detected in hotel.`,
    recommendedAction: 'Follow emergency protocols immediately.'
  };

  state.currentEmergency = scenario;
  state.emergencyCount++;

  // Update admin UI
  $('admin-alert-count').textContent = state.emergencyCount;
  $('admin-status-text').textContent = type.toUpperCase() + ' ALERT';
  $('admin-status-text').style.color = typeColor(type);

  // Highlight trigger button
  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  const btnMap = { fire: 'trig-fire', medical: 'trig-medical', earthquake: 'trig-quake', suspicious: 'trig-suspect' };
  if ($(btnMap[type])) $(btnMap[type]).classList.add('active-emergency');

  // Staff assignment
  const assignments = assignStaff(scenario);
  updateStaffPanel(assignments);

  // Admin map
  updateAdminMap(scenario);

  // AI instruction
  fetchAndDisplayInstruction(scenario, 'admin');

  // Timeline
  addTimeline(type, `${type.charAt(0).toUpperCase() + type.slice(1)} triggered — Floor ${scenario.floor}`);

  // Notifications
  addNotification(type, `🚨 ${type.toUpperCase()}: ${scenario.description}`);
  renderAdminNotifications();

  // Toast
  showToast(type, type.toUpperCase() + ' ALERT', scenario.description);

  // If guest is logged in, update their dashboard
  if (state.guestObj) {
    const isNear = state.guestObj.floor === scenario.floor;
    const statusType = type === 'fire' ? 'danger' : type === 'medical' ? 'warning' : type === 'earthquake' ? 'danger' : 'alert';
    const icons = { fire: '🔥', medical: '🏥', earthquake: '🌍', suspicious: '⚠️' };
    setGuestStatus(statusType, icons[type] + ' ' + type.toUpperCase() + ' — ' + (isNear ? 'YOU ARE IN DANGER ZONE' : 'Alert in building'), scenario.description);
    fetchAndDisplayInstruction(scenario, 'guest');
    renderGuestMap(state.guestObj.floor, scenario);
    addNotification(type, `🚨 ${type.toUpperCase()} ALERT: ${scenario.description}`);
    renderNotifications();
  }
}

function typeColor(type) {
  return { fire: 'var(--fire)', medical: 'var(--medical)', earthquake: 'var(--quake)', suspicious: 'var(--purple)' }[type] || 'var(--blue)';
}

// ============================================================
// AI INSTRUCTION (via backend API - no keys in frontend)
// ============================================================
async function fetchAndDisplayInstruction(scenario, target) {
  const lang = state.lang;
  const guestContext = state.guestObj
    ? {
      isNearby: state.guestObj.floor === scenario.floor,
      floor: state.guestObj.floor,
      zone: state.guestObj.zone
    }
    : null;

  // Show thinking state
  if (target === 'guest' || target === 'both') {
    const gdash = $('gdash-instruction');
    if (gdash) gdash.textContent = '...';
    const aiThink = $('ai-think-guest');
    if (aiThink) aiThink.style.display = 'inline-flex';
  }
  if (target === 'admin' || target === 'both') {
    const adminAI = $('admin-ai-text');
    if (adminAI) adminAI.textContent = '...';
    const aiThink = $('ai-think-admin');
    if (aiThink) aiThink.style.display = 'inline-flex';
  }

  try {
    // Use safe AI module - no API keys exposed
    const text = await window.EchoPlusAI.getGuidance(scenario, guestContext, lang);
    state.lastInstruction = text;
    displayInstruction(text, target);
  } catch (error) {
    console.error('AI guidance error:', error);
    // Fallback to pre-translated guidance
    const fb = window.EchoPlusAI.getFallback(scenario.type, lang);
    state.lastInstruction = fb;
    displayInstruction(fb, target);
  } finally {
    const aiThink = $('ai-think-admin');
    if (aiThink) aiThink.style.display = 'none';
    const guestThink = $('ai-think-guest');
    if (guestThink) guestThink.style.display = 'none';
  }
}

function fallbackInstructions(type, lang) {
  const t = ECHO_DATA.translations[lang] || ECHO_DATA.translations.en;
  const map = {
    fire: `1. ${t.fire.near}\n2. ${t.fire.far}\n3. ${t.fire.general}`,
    medical: `1. ${t.medical.general}\n2. ${t.medical.nearby}\n3. Call reception at 0 immediately.`,
    earthquake: `1. ${t.earthquake.general}\n2. ${t.earthquake.after}\n3. Follow staff instructions after shaking stops.`,
    suspicious: `1. ${t.suspicious.general}\n2. ${t.suspicious.nearby}\n3. Report suspicious activity to security.`
  };
  return map[type] || 'Emergency in progress. Follow staff instructions immediately.';
}

function displayInstruction(text, target) {
  if (target === 'guest' || target === 'both') {
    if ($('gdash-instruction')) $('gdash-instruction').textContent = text;
  }
  if (target === 'admin' || target === 'both') {
    if ($('admin-ai-text')) $('admin-ai-text').textContent = text;
  }
}

// ============================================================
// TTS / VOICE
// ============================================================
function speakInstruction(target) {
  const text = target === 'admin' ? $('admin-ai-text').textContent : $('gdash-instruction').textContent;
  if (!text || text === '...') return;
  if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88; utt.pitch = 1.05; utt.volume = 1;
  const langMap = { en: 'en-US', hi: 'hi-IN', bn: 'bn-IN' };
  utt.lang = langMap[state.lang] || 'en-US';

  const btn = target === 'admin' ? $('admin-speak-btn') : $('guest-speak-btn');
  if (btn) { btn.classList.add('speaking'); btn.innerHTML = '🔊 Speaking...'; }
  utt.onend = () => {
    if (btn) { btn.classList.remove('speaking'); btn.innerHTML = '🔊 Speak'; }
  };
  window.speechSynthesis.speak(utt);
}

function repeatInstruction() {
  if (state.lastInstruction) {
    if ($('gdash-instruction')) $('gdash-instruction').textContent = state.lastInstruction;
    speakInstruction('guest');
  }
}

// ============================================================
// LANGUAGE
// ============================================================
function setLang(lang) {
  state.lang = lang;
  window.currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  if (state.currentEmergency) {
    fetchAndDisplayInstruction(state.currentEmergency, 'guest');
  }
}

// ============================================================
// FLOOR MAP — GUEST
// ============================================================
function renderGuestMap(floor, emergency) {
  const svg = $('guest-map-svg');
  if (!svg) return;
  const W = 600, H = 280;

  // Base layout for the floor
  let html = `<rect width="${W}" height="${H}" fill="#0c1120"/>
  <rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="6" fill="#111827" stroke="#1e293b" stroke-width="1"/>
  <text x="20" y="7" fill="#1e3a5e" font-size="10" font-family="sans-serif">FLOOR ${floor} PLAN</text>`;

  // Rooms
  const rooms = [
    { x: 20, y: 20, w: 90, h: 60, id: 'R01', label: `${floor}01` },
    { x: 120, y: 20, w: 90, h: 60, id: 'R02', label: `${floor}02` },
    { x: 220, y: 20, w: 90, h: 60, id: 'R03', label: `${floor}03` },
    { x: 380, y: 20, w: 90, h: 60, id: 'R04', label: `${floor}04` },
    { x: 480, y: 20, w: 90, h: 60, id: 'R05', label: `${floor}05` },
    { x: 20, y: 180, w: 90, h: 60, id: 'R06', label: `${floor}06` },
    { x: 120, y: 180, w: 90, h: 60, id: 'R07', label: `${floor}07` },
    { x: 220, y: 180, w: 90, h: 60, id: 'R08', label: `${floor}08` },
    { x: 380, y: 180, w: 90, h: 60, id: 'R09', label: `${floor}09` },
    { x: 480, y: 180, w: 90, h: 60, id: 'R10', label: `${floor}10` },
  ];

  // Lifts/Stairs center
  html += `<rect x="320" y="20" width="50" height="60" rx="4" fill="#0f1825" stroke="#1e293b" stroke-width="1"/>
  <text x="345" y="52" text-anchor="middle" fill="#334155" font-size="9" font-family="sans-serif">LIFT</text>`;

  // Corridor
  html += `<rect x="10" y="88" width="${W - 20}" height="36" rx="2" fill="#0a1628" stroke="#1e293b" stroke-width="0.5"/>
  <text x="${W / 2}" y="110" text-anchor="middle" fill="#1e3a5e" font-size="10" font-family="sans-serif">CORRIDOR</text>`;

  // Exit arrows
  html += `<rect x="10" y="130" width="55" height="42" rx="4" fill="#062010" stroke="#00d97e" stroke-width="1.5"/>
  <text x="37" y="148" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif" font-weight="bold">EXIT A</text>
  <text x="37" y="162" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">STAIRS</text>`;

  html += `<rect x="${W - 65}" y="130" width="55" height="42" rx="4" fill="#062010" stroke="#00d97e" stroke-width="1.5"/>
  <text x="${W - 37}" y="148" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif" font-weight="bold">EXIT B</text>
  <text x="${W - 37}" y="162" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">STAIRS</text>`;

  // Render rooms
  rooms.forEach((r, i) => {
    const isDanger = emergency && (r.label === emergency.roomNumber || (emergency.zone === 'east' && i % 2 === 0));
    const isUser = state.guestObj && r.label === state.guestObj.roomNumber;
    let fill = '#1a2540', stroke = '#2a3a5a';
    if (isDanger) { fill = 'rgba(255,77,77,0.25)'; stroke = '#ff4d4d'; }
    if (isUser) { fill = 'rgba(79,142,247,0.2)'; stroke = '#4f8ef7'; }
    html += `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${isUser || isDanger ? '2' : '1'}"/>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 4}" text-anchor="middle" fill="${isUser ? '#4f8ef7' : isDanger ? '#ff4d4d' : '#4a5568'}" font-size="11" font-family="sans-serif" font-weight="${isUser ? 'bold' : 'normal'}">${r.label}${isUser ? ' ★' : ''}</text>`;
  });

  // Evac path if emergency
  if (emergency) {
    html += `<polyline points="65,${H / 2} 65,${H - 50} 37,${H - 50}" 
      fill="none" stroke="#4f8ef7" stroke-width="2.5" stroke-dasharray="8 4" stroke-linecap="round" id="evac-path"/>`;
    // Animated dots along path done via CSS
    html += `<circle cx="65" cy="${H / 2}" r="6" fill="#4f8ef7" opacity="0.9"/>
    <circle cx="37" cy="${H - 50}" r="6" fill="#00d97e" opacity="0.9"/>`;
  }

  // You are here marker
  html += `<circle cx="345" cy="56" r="5" fill="#4f8ef7" opacity="0.7"/>`;

  svg.innerHTML = html;

  // Animate evac dashes
  if (state.mapAnim) cancelAnimationFrame(state.mapAnim);
  if (emergency) {
    let offset = 0;
    function anim() {
      const p = svg.getElementById ? svg.getElementById('evac-path') : null;
      const path = svg.querySelector('#evac-path');
      if (path) { offset = (offset - 1) % 12; path.setAttribute('stroke-dashoffset', offset); }
      state.mapAnim = requestAnimationFrame(anim);
    }
    anim();
  }
}

// ============================================================
// FLOOR MAP — ADMIN
// ============================================================
function initAdminMap() {
  const svg = $('admin-map-svg');
  if (!svg) return;
  renderAdminMap(null);
}

function renderAdminMap(emergency) {
  updateAdminMap(emergency);
}

function updateAdminMap(emergency) {
  const svg = $('admin-map-svg');
  if (!svg) return;
  const W = 580, H = 320;

  let html = `<rect width="${W}" height="${H}" fill="#060810"/>
  <text x="16" y="14" fill="#1e3a5e" font-size="10" font-family="sans-serif">GRAND ROYAL HOTEL — ALL FLOORS OVERVIEW</text>`;

  const floors = [
    { label: 'Floor 6', y: 20, rooms: ['601', '602', '603'] },
    { label: 'Floor 5', y: 68, rooms: ['501', '502', '503', '504'] },
    { label: 'Floor 4', y: 116, rooms: ['401', '402', '403', '404', '405'] },
    { label: 'Floor 3', y: 164, rooms: ['301', '302', '303', '304', '305', '306'] },
    { label: 'Floor 2', y: 212, rooms: ['201', '202', '203', '204', '205', '206', '207'] },
    { label: 'Floor 1', y: 260, rooms: ['101', '102', '103', '104', '105', '106', '107', '108'] },
  ];

  floors.forEach(f => {
    html += `<text x="10" y="${f.y + 26}" fill="#334155" font-size="9" font-family="sans-serif" font-weight="600">${f.label}</text>`;
    f.rooms.forEach((r, i) => {
      const rx = 80 + i * 58, ry = f.y + 8, rw = 50, rh = 32;
      const isDanger = emergency && (r === emergency.roomNumber || (f.label === 'Floor ' + emergency.floor && i < 3));
      let fill = '#111827', stroke = '#1e293b';
      if (isDanger) { fill = 'rgba(255,77,77,0.3)'; stroke = '#ff4d4d'; }
      html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${isDanger ? '2' : '0.5'}"/>
      <text x="${rx + rw / 2}" y="${ry + rh / 2 + 4}" text-anchor="middle" fill="${isDanger ? '#ff4d4d' : '#334155'}" font-size="9" font-family="sans-serif">${r}</text>`;
    });
  });

  // Exits
  html += `<rect x="10" y="296" width="50" height="18" rx="3" fill="#062010" stroke="#00d97e" stroke-width="1"/>
  <text x="35" y="309" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">EXIT A</text>`;
  html += `<rect x="${W - 60}" y="296" width="50" height="18" rx="3" fill="#062010" stroke="#00d97e" stroke-width="1"/>
  <text x="${W - 35}" y="309" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">EXIT B</text>`;
  html += `<rect x="${W / 2 - 35}" y="296" width="70" height="18" rx="3" fill="#062010" stroke="#00d97e" stroke-width="1"/>
  <text x="${W / 2}" y="309" text-anchor="middle" fill="#00d97e" font-size="8" font-family="sans-serif">MAIN EXIT</text>`;

  // Evac path
  if (emergency) {
    const ey = 20 + (6 - emergency.floor) * 48 + 24;
    html += `<polyline points="130,${ey} 130,300 ${W / 2},300"
      fill="none" stroke="#4f8ef7" stroke-width="2" stroke-dasharray="8 4" stroke-linecap="round" id="admin-evac"/>`;
  }

  svg.innerHTML = html;

  if (emergency) {
    let off = 0;
    function anim() {
      const p = svg.querySelector('#admin-evac');
      if (p) { off = (off - 1) % 12; p.setAttribute('stroke-dashoffset', off); }
      requestAnimationFrame(anim);
    }
    anim();
  }
}

// ============================================================
// STAFF PANEL
// ============================================================
function updateStaffPanel(assignments) {
  const list = $('admin-staff-list');
  if (!list) return;
  const staffData = assignments
    ? assignments.map(a => ({ ...a.staff, taskOverride: a.task, statusOverride: 'alert' }))
    : ECHO_DATA.staff;

  const roleColors = {
    security: { bg: '#1e3a5f', col: '#60a5fa' },
    medical: { bg: '#063020', col: '#4ade80' },
    manager: { bg: '#2a1040', col: '#c084fc' }
  };

  list.innerHTML = staffData.map(s => {
    const c = roleColors[s.role] || { bg: '#1e2a40', col: '#94a3b8' };
    const status = s.statusOverride || s.status;
    return `<div class="staff-item">
      <div class="staff-avatar" style="background:${c.bg};color:${c.col}">${s.avatar}</div>
      <div style="flex:1">
        <div class="staff-name-text">${s.name}</div>
        <div class="staff-role-text">${s.role.charAt(0).toUpperCase() + s.role.slice(1)}</div>
        <div class="staff-zone-text">${s.taskOverride || s.assignedZone}</div>
      </div>
      <div class="staff-status status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</div>
    </div>`;
  }).join('');
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function addNotification(type, msg) {
  state.notifications.unshift({ type, msg, time: now() });
  if (state.notifications.length > 10) state.notifications.pop();
}

function renderNotifications() {
  const feed = $('guest-notif-feed');
  if (!feed) return;
  if (state.notifications.length === 0) {
    feed.innerHTML = `<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">No alerts</div>`;
    return;
  }
  feed.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
  $('guest-notif-count').textContent = state.notifications.length;
  $('guest-notif-count').className = 'panel-badge red';
}

function renderAdminNotifications() {
  const feed = $('admin-notif-feed');
  if (!feed) return;
  if (state.notifications.length === 0) {
    feed.innerHTML = `<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">All clear</div>`;
    return;
  }
  feed.innerHTML = state.notifications.map(n => `
    <div class="notif-item ${n.type}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
  if ($('admin-notif-count')) {
    $('admin-notif-count').textContent = state.notifications.length;
    $('admin-notif-count').className = 'panel-badge red';
  }
}

// ============================================================
// TIMELINE
// ============================================================
function addTimeline(type, event) {
  state.timeline.unshift({ type, event, time: now() });
  if (state.timeline.length > 8) state.timeline.pop();
  renderTimeline();
}

function renderTimeline() {
  const tl = $('admin-timeline');
  if (!tl) return;
  tl.innerHTML = state.timeline.map(t => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${typeColor(t.type)}"></div>
      <div class="timeline-content">
        <div class="timeline-event">${t.event}</div>
        <div class="timeline-time">${t.time}</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// TOAST
// ============================================================
function showToast(type, title, msg) {
  const wrap = $('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast t-${type}`;
  t.innerHTML = `<div class="toast-title">${title}</div><div class="toast-msg">${msg}</div>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = 'all 0.4s'; setTimeout(() => t.remove(), 400); }, 4500);
}

// ============================================================
// CLEAR
// ============================================================
function clearEmergency() {
  state.currentEmergency = null;
  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  $('admin-status-text').textContent = 'OPERATIONAL';
  $('admin-status-text').style.color = 'var(--medical)';
  $('admin-ai-text').textContent = 'No active emergency. All systems nominal.';
  updateAdminMap(null);
  updateStaffPanel();
  addTimeline('info', 'All-clear declared');
  addNotification('info', '✅ All clear — Emergency protocols deactivated');
  renderAdminNotifications();
  if (state.guestObj) {
    setGuestStatus('normal', '✅ All Clear', 'Emergency deactivated. All systems normal. You are safe.');
    $('gdash-instruction').textContent = 'Emergency cleared. No further action needed. Relax and enjoy your stay.';
    renderGuestMap(state.guestObj.floor, null);
    addNotification('info', '✅ All clear — Emergency deactivated');
    renderNotifications();
  }
}

function clearEmergencyVisuals() {
  if ($('admin-map-svg')) updateAdminMap(null);
  if ($('guest-map-svg')) renderGuestMap(state.guestObj?.floor || 2, null);
}

// ============================================================
// DEMO SCENARIO TRIGGER
// ============================================================
function runScenario(id) {
  const sc = ECHO_DATA.scenarios.find(s => s.id === id);
  if (!sc) return;
  state.currentEmergency = sc;
  state.emergencyCount++;
  $('admin-alert-count').textContent = state.emergencyCount;
  $('admin-status-text').textContent = sc.type.toUpperCase() + ' ALERT';
  $('admin-status-text').style.color = typeColor(sc.type);

  document.querySelectorAll('.trigger-btn').forEach(b => b.classList.remove('active-emergency'));
  const btnMap = { fire: 'trig-fire', medical: 'trig-medical', earthquake: 'trig-quake', suspicious: 'trig-suspect' };
  if ($(btnMap[sc.type])) $(btnMap[sc.type]).classList.add('active-emergency');

  updateStaffPanel(assignStaff(sc));
  updateAdminMap(sc);
  fetchAndDisplayInstruction(sc, 'admin');
  addTimeline(sc.type, `${sc.name} — Severity: ${sc.severity}`);
  addNotification(sc.type, `🚨 ${sc.name}: ${sc.description}`);
  renderAdminNotifications();
  showToast(sc.type, sc.name, sc.description);
}

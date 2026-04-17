/**
 * ECHO+ Configuration Module
 * Handles environment settings, API endpoints, and secure credential management
 * For integration into ResQAI main system
 */

window.ECHO_CONFIG = window.ECHO_CONFIG || {

    // ============================================================
    // MODULE IDENTITY
    // ============================================================
    version: '2.0.1',
    moduleName: 'echo-plus-hotel-emergency',
    namespace: 'EchoPlus',

    // ============================================================
    // API & BACKEND CONFIGURATION
    // ============================================================
    // All sensitive keys handled by backend ONLY - NEVER in frontend
    // Frontend only stores endpoint paths (loaded from .env on server)
    api: {
        aiEndpoint: '/api/ai/emergency-guidance',
        aiHealthEndpoint: '/api/ai/health',
        authEndpoint: '/api/auth/login',
        statusEndpoint: '/api/status',
        hotelEndpoint: '/api/hotels',
        emergencyEndpoint: '/api/emergencies',
        timeout: 8000,
        retries: 2
    },

    // ============================================================
    // FRONTEND SECURITY
    // ============================================================
    // Demo credentials only - REMOVED in production
    // Production: Use backend-provided session tokens
    security: {
        isDemo: true,
        // All auth should be token-based, not hardcoded passwords
        sessionTokenKey: 'echo_session_token',
        requiresBackendAuth: true
    },

    // ============================================================
    // UI CONFIGURATION
    // ============================================================
    ui: {
        theme: 'dark',
        animationEnabled: true,
        soundEnabled: true,
        toastDuration: 4500,
        transitionSpeed: 0.3
    },

    // ============================================================
    // SUPPORTED LANGUAGES & LOCALIZATION
    // ============================================================
    i18n: {
        default: 'en',
        supported: ['en', 'hi', 'bn'],
        rtl: false
    },

    // ============================================================
    // FEATURE FLAGS
    // ============================================================
    features: {
        voiceGuidance: true,
        multiLanguage: true,
        mapRendering: true,
        adminPanel: true,
        staffCoordination: true,
        emergencyAlerts: true,
        spatialAudio: true
    },

    // ============================================================
    // INTEGRATION SETTINGS
    // ============================================================
    // Global state isolation to prevent conflicts
    stateNamespace: '__echo_plus_state__',
    eventBusNamespace: '__echo_plus_events__',

    // CSS class prefix to prevent conflicts with parent system
    cssPrefix: 'echo-',

    // Don't pollute global window object
    useWindowGlobal: false,
    useModulePattern: true,

    // ============================================================
    // LOGGING
    // ============================================================
    logging: {
        enabled: true,
        level: 'info', // 'debug', 'info', 'warn', 'error'
        logToConsole: true,
        logToServer: false,
        maxLogs: 500
    },

    // ============================================================
    // VALIDATION
    // ============================================================
    validation: {
        minPasswordLength: 6,
        maxRetries: 3,
        sessionTimeout: 3600000, // 1 hour
        minFloor: 1,
        maxFloors: 20,
        maxRoomsPerFloor: 50
    }
};

/**
 * Load environment-specific overrides
 * Example: from parent app context
 */
function initConfig(overrides) {
    if (overrides && typeof overrides === 'object') {
        Object.assign(window.ECHO_CONFIG, overrides);
        console.log('ECHO+ Config initialized with overrides');
    }
}

window.ECHO_CONFIG.init = initConfig;

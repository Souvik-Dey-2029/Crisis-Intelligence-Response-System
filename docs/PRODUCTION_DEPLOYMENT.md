# RESQAI - PRODUCTION DEPLOYMENT CHECKLIST

## Pre-Deployment

### Environment Variables
- [ ] Set `GEMINI_API_KEY`
- [ ] Set `OPENROUTER_API_KEY` if used
- [ ] Set `GROQ_API_KEY` if used
- [ ] Set `NODE_ENV=production`
- [ ] Set `PORT=3000` or use the platform default
- [ ] Keep `.env` out of version control

### Render Configuration
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Root Directory: project root
- [ ] Auto-deploy enabled

## Current Production Entry Flow

### Public Pages (Entry Points)
- **Landing**: `public/pages/landing.html` (marketing page)
- **Module Selection**: `public/pages/module-selection.html` (choose Crisis Portal / EcoPlus / Custom Builder)
- **Crisis Portal**: `public/modules/crisis-portal/pages/guest-crisis-portal.html` (emergency response)
- **EcoPlus Guest**: `public/modules/echo-plus/index.html` (hotel emergency system)
- **Custom Builder**: `public/modules/rescue-builder/index.html` (system creation)
- **Additional Pages**: `public/pages/faq.html`, `public/pages/privacy-policy.html`, `public/pages/module-guidance.html`

### Custom Builder Runtime
- Dashboard: `public/modules/rescue-builder/pages/custom-builder-dashboard.html`
- Organization Select: `public/modules/rescue-builder/pages/custom-builder-org-select.html`
- Builder Logic: `public/modules/rescue-builder/js/builder.js`
- Template System: `public/modules/rescue-builder/js/templates.js`

## Backend Checks

### Server Configuration
- `src/server.js` serves static assets from `public/`
- All routes prefixed with `/api/` go to Express handlers
- Non-API routes fall back to `public/pages/landing.html`
- CORS configured for `localhost:3000` and Render deployment

### Health Checks
```bash
# API Health
curl https://your-app.onrender.com/api/health

# Response should be:
{"status":"ok","timestamp":"2026-04-26T...","providers":{"gemini":"✓","openrouter":"?","groq":"?","free":"✓"}}
```

### Critical Endpoints to Test
```bash
# Chat API
curl -X POST https://your-app.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Fire emergency","language":"en"}'

# Emergency creation
curl -X POST https://your-app.onrender.com/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{"type":"fire","location":"test","status":"active"}'

# Custom system creation
curl -X POST https://your-app.onrender.com/api/custom-system/create \
  -H "Content-Type: application/json" \
  -d '{"org_type":"school","name":"Test School"}'
```

## Frontend Checks

### API Usage
- Use relative API paths like `/api/...`
- Avoid hardcoded `localhost` URLs in shipped pages

### Custom Builder Persistence
- Systems are saved through `/api/custom-system`
- Standalone dashboard reads the same stored systems used by the builder flow
- Reopening a system routes back into the builder with `?systemID=...`

## Smoke Test

1. Open the landing page.
2. Enter the module selection page.
3. Open Custom Builder.
4. Create a new system.
5. Confirm it appears in `custom-builder-dashboard.html`.
6. Reopen it from the dashboard.

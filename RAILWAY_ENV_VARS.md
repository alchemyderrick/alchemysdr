# Railway Environment Variables - Required Setup

These environment variables must be set in your Railway project for the multi-SDR Telegram automation to work.

## How to Set Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Add each variable below

---

## Required Variables

### API Keys

```bash
# Anthropic API key for Claude AI
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Apollo API key for contact enrichment
APOLLO_API_KEY=your-apollo-api-key-here
```

### Security & Authentication

```bash
# Session secret for web UI authentication (32-char hex string)
# Generate with: openssl rand -hex 32
SESSION_SECRET=your-session-secret-here

# Relayer API key - shared by all SDR relayer clients
# This MUST match the RELAYER_API_KEY in each SDR's .env file
RELAYER_API_KEY=898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043
```

### Server Configuration

```bash
# Environment mode
NODE_ENV=production

# Port (Railway sets this automatically, but explicit is better)
PORT=3000
```

### Puppeteer Configuration (Optional but Recommended)

```bash
# Path to Chrome on Railway's Linux environment
# Railway should auto-detect, but setting this ensures it works
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## Current Status Check

To verify the relayer can connect, test with:

```bash
curl -H "X-Employee-ID: derrick" \
     -H "X-Relayer-API-Key: 898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043" \
     https://sdr-console-production.up.railway.app/api/relayer/approved-pending
```

**Expected response**: `{"ok":true,"drafts":[],"count":0}`

**If you get 401**: RELAYER_API_KEY is not set correctly on Railway

---

## After Setting Variables

1. Railway will automatically redeploy when you change environment variables
2. Wait for deployment to complete (~2-3 minutes)
3. Test the connection again with the curl command above
4. Start your local relayer: `npm run relayer`

---

## Critical Variable

**RELAYER_API_KEY** is the most important for the relayer to work:

- **On Railway**: Set in Variables tab
- **In your local .env**: Must match exactly
- **Current value**: `898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043`

If these don't match, the relayer will get HTTP 401 (Unauthorized).

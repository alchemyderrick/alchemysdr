# Railway Production Setup Guide

This guide covers the complete setup for deploying the SDR Console to Railway.

## Architecture Overview

The SDR Console uses a **hybrid architecture**:

- **Railway Server** (Linux): Runs the Express server, handles API requests, manages databases
- **Local Relayer** (macOS): Handles Telegram automation, X authentication, and response capture

### Why This Architecture?

- **Telegram Automation**: Requires macOS AppleScript to control the desktop Telegram app
- **X Authentication**: Needs a visible browser for manual login
- **Server Features**: Can run headless on Railway (API, database, Puppeteer validation)

---

## Required Environment Variables on Railway

Set these in your Railway project's **Variables** section:

### 1. API Keys (Required)

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```
- Your Anthropic API key for Claude AI
- Used for: Draft generation, response capture, AI features
- Get from: https://console.anthropic.com/

```bash
APOLLO_API_KEY=MDI...
```
- Your Apollo.io API key
- Used for: Contact enrichment and discovery
- Get from: https://app.apollo.io/settings/integrations

### 2. Security (Required)

```bash
SESSION_SECRET=<generate-with-openssl-rand-hex-32>
```
- Secret key for session encryption
- Generate with: `openssl rand -hex 32`
- Example: `7f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a`

```bash
RELAYER_API_KEY=898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043
```
- API key for authenticating your local relayer client
- **IMPORTANT**: This must match the `RELAYER_API_KEY` in your local `.env` file
- Your current key: `898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043`

### 3. Server Configuration (Required)

```bash
NODE_ENV=production
```
- Enables production optimizations

```bash
PORT=3000
```
- Server port (Railway handles this automatically, but explicit is better)

### 4. Puppeteer Configuration (Recommended)

```bash
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```
- Path to Chrome on Railway's Linux environment
- Puppeteer should auto-detect, but setting this ensures it works
- Alternative: `/usr/bin/chromium-browser` or `/usr/bin/chromium`

**Note**: Railway should automatically install Chrome when deploying with Puppeteer. If you get Puppeteer errors, you may need to add a Nixpacks config.

### 5. Optional Variables

```bash
FRONTEND_URL=https://your-frontend-url.railway.app
```
- URL of your frontend (if separate from backend)
- Used for CORS configuration
- Optional if frontend is served from the same domain

---

## Local Relayer Setup (.env file)

Your local `.env` file should contain:

```bash
# API Keys (same as Railway)
ANTHROPIC_API_KEY=<your-anthropic-api-key>
APOLLO_API_KEY=<your-apollo-api-key>

# Server Configuration
PORT=3000

# Relayer Configuration (connects to Railway)
RENDER_URL=https://web-production-554d8.up.railway.app
RELAYER_API_KEY=<your-relayer-api-key>
POLL_INTERVAL_MS=2000
EMPLOYEE_ID=derrick
```

**IMPORTANT**:
- `RENDER_URL` should point to your Railway deployment URL
- `RELAYER_API_KEY` must match the Railway environment variable
- `EMPLOYEE_ID` should match your employee account in the database

---

## Starting the Relayer

The relayer **must be running** on your Mac for Telegram automation to work:

```bash
npm run relayer
```

The relayer will:
- ✅ Poll Railway every 2 seconds for approved drafts
- ✅ Send Telegram messages via macOS automation
- ✅ Handle X/Twitter authentication requests
- ✅ Capture Telegram responses using screenshots + Claude Vision

### macOS Permissions Required

The relayer needs **Accessibility permissions** to control Telegram:

1. Open **System Settings** (or System Preferences)
2. Go to **Privacy & Security → Privacy → Accessibility**
3. Click the lock icon to make changes
4. Add **Terminal** (or your terminal app) to the list
5. Enable the checkbox next to it

Without these permissions, the relayer cannot paste messages into Telegram.

---

## Features That Work on Railway (No Relayer Needed)

These features work entirely on Railway's server:

✅ User authentication and login
✅ Draft creation and management
✅ Target/contact management
✅ Apollo.io contact enrichment
✅ Telegram username validation (uses headless Puppeteer)
✅ Database operations
✅ All web UI features

## Features That Require Relayer (Your Mac)

These features need the relayer running on your Mac:

⚠️ Sending Telegram messages (requires macOS + desktop Telegram app)
⚠️ X/Twitter authentication (requires visible browser for manual login)
⚠️ Capturing Telegram responses (requires screenshot + Claude Vision API)

---

## Deployment Checklist

### Initial Setup

- [ ] Set all required environment variables on Railway
- [ ] Deploy your code to Railway
- [ ] Verify the server starts successfully (check Railway logs)
- [ ] Test the health endpoint: `curl https://your-railway-url.railway.app/api/health/claude`

### Local Relayer Setup

- [ ] Update `.env` file with Railway URL and credentials
- [ ] Install dependencies: `npm install`
- [ ] Start the relayer: `npm run relayer`
- [ ] Verify connection: Check for "✅ Connected to server" message
- [ ] Grant macOS Accessibility permissions if needed

### Testing

- [ ] Create a test user account via the web UI
- [ ] Add a test target with a valid Telegram handle
- [ ] Generate a draft message
- [ ] Approve the draft (it should appear in relayer logs)
- [ ] Verify the message is sent via Telegram

---

## Troubleshooting

### Relayer Can't Connect to Railway

**Error**: `❌ Cannot reach server: https://...`

**Solutions**:
1. Check `RENDER_URL` in `.env` is correct
2. Verify Railway deployment is running
3. Check Railway logs for server errors
4. Test health endpoint: `curl https://your-url.railway.app/api/health/claude`

### Relayer Authentication Failed

**Error**: `HTTP 401: Unauthorized`

**Solutions**:
1. Verify `RELAYER_API_KEY` matches between `.env` and Railway
2. Check Railway environment variables are set correctly
3. Restart Railway deployment after changing variables

### Puppeteer Errors on Railway

**Error**: `Failed to launch browser` or `Chrome not found`

**Solutions**:
1. Set `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable` on Railway
2. Add a `nixpacks.toml` file to install Chrome:

```toml
[phases.setup]
nixPkgs = ['...', 'chromium']
```

3. Alternatively, use Puppeteer's bundled Chromium (increase build size)

### Telegram Messages Not Sending

**Error**: Messages stay in "approved" status

**Solutions**:
1. Ensure relayer is running: `npm run relayer`
2. Check relayer logs for errors
3. Verify macOS Accessibility permissions are granted
4. Test Telegram app is installed and logged in
5. Check `EMPLOYEE_ID` matches between `.env` and database

---

## Database Management

Railway deployment uses SQLite with per-employee databases:

- **Location**: `databases/{employeeId}/data.db`
- **Persistence**: Railway provides persistent storage via volumes
- **Backup**: Download databases via Railway dashboard or SFTP

### Adding a Railway Volume (Recommended)

To persist databases across deployments:

1. Go to Railway project settings
2. Add a volume mounted to `/app/databases`
3. Redeploy

Without a volume, databases are reset on each deployment.

---

## Security Notes

- Never commit `.env` files to git
- Rotate `SESSION_SECRET` and `RELAYER_API_KEY` periodically
- Keep API keys secure (Anthropic, Apollo)
- Use strong passwords for employee accounts
- Consider IP whitelisting for the relayer API endpoints

---

## Performance Optimization

### Railway Server

- Use Railway's automatic scaling
- Monitor memory usage (SQLite is memory-efficient)
- Restart Puppeteer browser periodically (handled automatically)

### Local Relayer

- Runs lightweight polling (low CPU/memory)
- Handles one operation at a time
- Auto-retries failed drafts up to 2 times

---

## Support & Debugging

### Useful Commands

```bash
# Check Railway logs
railway logs

# Test health endpoint
curl https://your-url.railway.app/api/health/claude

# Start relayer with verbose logging
npm run relayer

# Check relayer logs
tail -f relayer.log

# Kill stuck Chrome processes
pkill -f "Google Chrome for Testing"
```

### Log Locations

- **Railway server logs**: Railway dashboard
- **Local relayer logs**: `relayer.log` and console output
- **Puppeteer errors**: Check server logs on Railway

---

## Summary

Your SDR Console is now configured for production!

**Railway handles**: Web server, API, database, Puppeteer validation
**Local relayer handles**: Telegram automation, X auth, response capture

Keep the relayer running on your Mac while actively sending messages. The server on Railway runs 24/7 and handles all other functionality.

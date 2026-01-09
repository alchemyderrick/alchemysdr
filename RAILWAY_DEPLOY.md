# Railway Deployment Guide

This guide covers deploying the SDR Console to Railway with all features intact.

## Prerequisites

1. Railway account (sign up at [railway.app](https://railway.app))
2. Railway CLI installed: `npm install -g @railway/cli`
3. All environment variables ready (see below)

## Features Included

✅ X (Twitter) Automation - Puppeteer-based discovery
✅ Telegram Automation - AppleScript integration (Mac only)
✅ Claude AI - Message generation and improvement
✅ Apollo API - Contact enrichment
✅ Full UI - All React components and modals
✅ Database - SQLite with persistence
✅ Multi-paragraph Telegram sending
✅ Message editing and regeneration

## Quick Deploy

### Option 1: Deploy via Railway CLI

```bash
# 1. Login to Railway
railway login

# 2. Create a new project
railway init

# 3. Link to your project
railway link

# 4. Set environment variables (see below)
railway variables set ANTHROPIC_API_KEY=your_key_here
railway variables set APOLLO_API_KEY=your_key_here
railway variables set RELAYER_API_KEY=$(openssl rand -hex 32)
# ... set all other variables

# 5. Deploy
railway up
```

### Option 2: Deploy via GitHub

1. Push your code to GitHub
2. Go to [railway.app/new](https://railway.app/new)
3. Click "Deploy from GitHub repo"
4. Select your repository
5. Configure environment variables (see below)
6. Click "Deploy"

## Required Environment Variables

Set these in Railway Dashboard → Your Project → Variables:

### Core API Keys (REQUIRED)

```bash
# Anthropic Claude API Key
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Apollo.io API Key (for contact enrichment)
APOLLO_API_KEY=xxxxx
```

### Relayer Configuration (REQUIRED for Telegram automation)

```bash
# Generate a secure API key for relayer authentication
# Use: openssl rand -hex 32
RELAYER_API_KEY=your_secure_random_key_here

# Your Railway app URL (set after first deployment)
RENDER_URL=https://your-app-name.up.railway.app
```

### Optional Configuration

```bash
# Server port (Railway sets this automatically)
PORT=3000

# Polling interval for relayer (milliseconds)
POLL_INTERVAL_MS=10000

# Paragraph send delay for Telegram (milliseconds)
PARAGRAPH_SEND_DELAY_MS=1500
```

## Post-Deployment Setup

### 1. Get Your Railway URL

After deployment, Railway will provide a URL like:
```
https://sdr-console-production-xxxx.up.railway.app
```

### 2. Update RENDER_URL

```bash
railway variables set RENDER_URL=https://your-actual-url.up.railway.app
```

### 3. Set up Local Relayer (Mac only, for Telegram)

On your local Mac machine:

```bash
# 1. Create .env.local file
cp .env.local.example .env.local

# 2. Edit .env.local with your values:
RENDER_URL=https://your-railway-url.up.railway.app
RELAYER_API_KEY=same_key_as_railway
POLL_INTERVAL_MS=10000

# 3. Run the relayer
npm run relayer
```

The relayer polls your Railway deployment and executes Telegram actions locally.

## Database Persistence

Railway uses volumes for SQLite persistence:

1. Go to Railway Dashboard → Your Project → Settings
2. Under "Volumes", click "Add Volume"
3. Mount path: `/app/data`
4. Size: 1GB (adjust as needed)

This ensures your database persists across deployments.

## Build Process

The deployment process:

1. **Install**: `npm install` in root directory
2. **Build Frontend**: `cd frontend && npm install && npm run build`
   - Creates static export in `frontend/out/`
3. **Start Server**: `node server.js`
   - Serves API on Express
   - Serves frontend from `frontend/out/`

All handled automatically by:
- `postinstall` script (runs `npm run build` in production)
- `npm start` command

## Verification

After deployment, verify all features:

### 1. Check Health Endpoint

```bash
curl https://your-railway-url.up.railway.app/
# Should return the frontend
```

### 2. Test Claude API

```bash
curl https://your-railway-url.up.railway.app/api/health/claude
# Should return: {"status":"ok","message":"Claude API is configured"}
```

### 3. Test Frontend

Visit your Railway URL in a browser. You should see:
- Add Contact card
- Discover Users card
- Send Queue card
- All UI components functional

### 4. Test Message Generation

1. Add a contact with name and company
2. Click "Create Draft"
3. Check Send Queue for generated message
4. Verify message is editable (inline textarea)
5. Click sparkle icon to test improvement modal
6. Make edits and verify "Save Manual Edits" button appears

### 5. Test Multi-Paragraph Sending (Requires Local Relayer)

1. Generate a message with multiple paragraphs (separated by double line breaks)
2. Button should show "Approve + Send (X msgs)" where X is paragraph count
3. Click approve - relayer will send each paragraph separately with delays

## Troubleshooting

### Build Fails

**Error**: "Module not found"
**Fix**: Ensure all dependencies are in `package.json`, not just `devDependencies`

**Error**: "Node version mismatch"
**Fix**: Railway uses Node 20 (configured in nixpacks.toml)

### Frontend Not Loading

**Error**: 404 on all routes
**Fix**: Check that `frontend/out/` was created during build:
```bash
railway run ls -la frontend/out
```

If missing, frontend build failed. Check logs.

### Claude API Errors

**Error**: "Invalid API key"
**Fix**: Verify `ANTHROPIC_API_KEY` is set correctly:
```bash
railway variables
```

### Telegram Not Working

**Error**: Messages not being sent
**Fix**:
1. Ensure local relayer is running: `npm run relayer`
2. Check `.env.local` has correct `RENDER_URL` and `RELAYER_API_KEY`
3. Verify Railway has same `RELAYER_API_KEY`

### Database Resets on Deploy

**Error**: Data lost after redeploy
**Fix**: Add a Railway volume (see "Database Persistence" above)

## Monitoring

### View Logs

```bash
# Real-time logs
railway logs

# Or in dashboard
# Dashboard → Your Project → Deployments → View Logs
```

### Common Log Messages

✅ **Good**:
```
✅ Console running at http://localhost:3000
📘 Loaded SDR style examples
✅ Database schema up to date
📦 Serving Next.js static export from frontend/out
```

❌ **Errors to watch**:
```
❌ ANTHROPIC_API_KEY is not set
❌ Failed to load frontend
⚠️ Target not found for company
```

## Scaling

Railway auto-scales based on usage. For heavy loads:

1. Dashboard → Settings → Resources
2. Increase memory/CPU as needed
3. Consider adding Redis for caching (optional)

## Cost Optimization

### Free Tier Limits
- $5 credit/month
- ~550 hours of runtime

### Tips to Stay in Free Tier
- Use sleep mode when not in use
- Set up webhooks instead of polling
- Optimize build process (already done)

## Support

### Railway Issues
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

### Application Issues
- Check logs: `railway logs`
- Verify environment variables
- Test locally first: `npm run dev`

## Summary

Your SDR Console is now deployed with:
✅ Full UI with all React components
✅ Claude AI integration for message generation
✅ Apollo API for contact enrichment
✅ X automation for user discovery
✅ Telegram automation via local relayer
✅ Inline message editing
✅ Multi-paragraph message sending
✅ Improve Message modal
✅ Database persistence

All features work exactly as they do locally!

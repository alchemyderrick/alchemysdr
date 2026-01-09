# Railway Deployment Guide - Updated

## Overview

This guide shows how to deploy the SDR Console to Railway with BOTH services running:
- **Backend**: Express.js API (serves HTML UI + APIs)
- **Frontend**: Next.js React app (modern shadcn UI)

You have two deployment options:

### Option A: Deploy Frontend as Primary (Recommended)
- Main URL shows React UI (localhost:3001 equivalent)
- Backend runs as separate service for API calls
- Best user experience

### Option B: Deploy Backend Only
- Main URL shows HTML UI (localhost:3000 equivalent)
- Backend handles everything
- Simpler setup, but older UI

## Option A: Deploy Both Services (Recommended)

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository: `alchemyderrick/alchemysdr`

### Step 2: Create Backend Service

1. In your Railway project, click "New Service"
2. Select "From GitHub Repo"
3. Choose the root directory (backend service)
4. Railway will auto-detect the `railway.toml` and deploy

### Step 3: Configure Backend Environment Variables

In the backend service settings, add these variables:

```
ANTHROPIC_API_KEY=sk-ant-xxx
APOLLO_API_KEY=your-apollo-key
RELAYER_API_KEY=your-random-key
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Optional automation variables:
```
X_COOKIES=[{"name":"auth_token","value":"xxx","domain":".x.com"}]
CLAY_WEBHOOK_URL=https://...
```

**Important**: Set `FRONTEND_URL` AFTER you deploy the frontend (Step 5)

### Step 4: Create Frontend Service

1. Click "New Service" again
2. Select "From GitHub Repo" (same repo)
3. In settings, set **Root Directory** to: `frontend`
4. Railway will detect Next.js and deploy automatically

### Step 5: Configure Frontend Environment Variables

In the frontend service settings, add:

```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

Get the backend URL from Step 3's deployment.

### Step 6: Update Backend with Frontend URL

Go back to backend service and add:

```
FRONTEND_URL=https://your-frontend-url.railway.app
```

This makes the backend redirect `/` to the React UI.

### Step 7: Verify Deployment

- **Frontend**: Visit https://your-frontend-url.railway.app → Should show React UI
- **Backend**: Visit https://your-backend-url.railway.app → Redirects to frontend
- **Backend API**: Visit https://your-backend-url.railway.app/api/drafts → Returns JSON
- **HTML UI**: Visit https://your-backend-url.railway.app/html → Shows old UI

## Option B: Deploy Backend Only

If you just want the HTML UI (localhost:3000):

1. Create one Railway service from root directory
2. Set environment variables (same as Option A Step 3, no FRONTEND_URL needed)
3. Visit the Railway URL → Shows HTML UI

## Automation Features on Railway

### ✅ Works on Railway

1. **Contact Search (Claude + Apollo)**
   - Uses Claude API with web search
   - Uses Apollo API for contact discovery
   - Works identically to local

2. **X Discovery (Puppeteer)**
   - Configured with Chromium via nixpacks.toml
   - X authentication via X_COOKIES environment variable
   - ⚠️ Requires you to authenticate locally first, then export cookies

3. **Message Generation**
   - Claude API works identically
   - Training file updates work

4. **Relayer Mode (Telegram)**
   - API endpoints for external relayer
   - Approves messages, relayer sends them
   - Works for remote Telegram automation

### ❌ Limitations on Railway

1. **Local Telegram Automation**
   - `openTelegramDesktop Link()`, `pasteIntoTelegram()` won't work
   - No Telegram Desktop app on cloud servers
   - Use relayer mode instead (see below)

2. **X Authentication Flow**
   - Can't open browser windows on Railway
   - Must authenticate locally, export X_COOKIES to environment variable

## Setting Up X Discovery on Railway

### Step 1: Authenticate Locally

```bash
# Run locally to authenticate with X
curl -X POST http://localhost:3000/api/x-auth/login
```

This opens a browser where you log in to X/Twitter.

### Step 2: Export Cookies

After authentication, copy cookies from `x-cookies.json`:

```bash
cat x-cookies.json | jq -c .
```

Copy the output (should be a JSON array).

### Step 3: Set Railway Environment Variable

In Railway backend service, add:

```
X_COOKIES=[{"name":"auth_token","value":"...","domain":".x.com"},...]
```

Paste the entire JSON array from Step 2.

### Step 4: Test X Discovery

Visit your Railway frontend and try "Discover Users from X". Should work!

## Telegram Automation on Railway

Railway cannot run Telegram Desktop, so you have two options:

### Option 1: Use Relayer (Recommended)

1. Run the relayer client locally:
```bash
RELAYER_API_KEY=your-key BACKEND_URL=https://your-backend.railway.app npm run relayer
```

2. The relayer will:
   - Poll Railway backend for approved messages
   - Open Telegram Desktop locally
   - Send messages automatically

3. Keep the relayer running on your local machine while Railway handles everything else

### Option 2: Manual Sending

1. Approve messages on Railway frontend
2. They appear in "Sent Messages" with Telegram links
3. Click links to open Telegram and send manually

## Environment Variables Reference

### Backend (Required)
```
ANTHROPIC_API_KEY=sk-ant-xxx
APOLLO_API_KEY=your-apollo-key
RELAYER_API_KEY=random-32-char-string
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
FRONTEND_URL=https://frontend.railway.app
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

### Backend (Optional)
```
X_COOKIES=[...]  # JSON array of cookies
CLAY_WEBHOOK_URL=https://...
AUTO_SEND_ENABLED=false  # Disable auto-send on cloud
AUTO_SEND_IDLE_SECONDS=5
```

### Frontend (Required)
```
NEXT_PUBLIC_API_URL=https://backend.railway.app
```

## Updating Your Deployment

The repository is already connected to Railway. To deploy updates:

```bash
git add -A
git commit -m "Update SDR Console"
git push origin main
```

Railway will automatically detect the push and redeploy both services.

## Troubleshooting

### Frontend shows "Failed to fetch"
- Check `NEXT_PUBLIC_API_URL` is set correctly in frontend service
- Check CORS settings allow frontend URL in backend

### X Discovery fails
- Verify `X_COOKIES` environment variable is set
- Check that cookies haven't expired (may need to re-authenticate)
- Check `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

### Backend API calls fail
- Check `ANTHROPIC_API_KEY` is set
- View logs in Railway dashboard
- Test `/api/health/claude` endpoint

### Database resets on deploy
- Railway persists volumes by default
- Check that `data.db` is not in `.railwayignore`
- Actually, `data.db` IS in `.railwayignore` by design - Railway creates fresh DB
- To persist data, use Railway's PostgreSQL addon (requires code changes)

## Cost Estimate

- **Hobby Plan**: $5/month + usage
- **Typical Usage**: $8-12/month for both services
- **Heavy Usage**: $15-20/month (lots of Puppeteer/API calls)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- GitHub Issues: https://github.com/alchemyderrick/alchemysdr/issues

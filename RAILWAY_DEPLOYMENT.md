# Railway Deployment Guide - Multi-User SDR Console

Complete guide for deploying SDR Console with multi-user authentication to Railway.

## Overview

The SDR Console deploys as a **single Railway service** that:
- Serves the React/Next.js UI with authentication at the root URL
- Handles all API endpoints with session-based auth
- Runs Puppeteer for X automation
- Manages per-employee SQLite databases
- Provides admin dashboard for team oversight
- Self-service user registration

## Prerequisites

1. Railway account at [railway.app](https://railway.app)
2. GitHub repository connected to Railway
3. Required API keys (Anthropic, Apollo)

## Quick Deploy

### Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `alchemyderrick/alchemysdr`
5. Select the `main` branch

Railway will automatically:
- Detect the `railway.toml` and `nixpacks.toml` configuration
- Install dependencies
- Build the React frontend
- Start the server

### Step 2: Configure Environment Variables

In your Railway service settings, add these variables:

#### Required
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
APOLLO_API_KEY=your-apollo-api-key
RELAYER_API_KEY=generate-random-32-char-string
SESSION_SECRET=generate-random-64-char-string
NODE_ENV=production
RAILWAY_ENVIRONMENT=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
PORT=3000
```

Generate secure secrets:
```bash
# SESSION_SECRET (for authentication)
openssl rand -hex 32

# RELAYER_API_KEY (for Mac client authentication)
openssl rand -hex 32
```

#### Optional (for X Discovery)
```
X_COOKIES=[{"name":"auth_token","value":"...","domain":".x.com"}]
```

#### Optional (for Clay Integration)
```
CLAY_WEBHOOK_URL=https://your-clay-webhook-url
```

### Step 3: Ensure Persistent Volume is Created

In Railway dashboard → Settings → Volumes:
1. Verify a volume exists mounted at `/app/databases`
2. If not, create one:
   - Click "New Volume"
   - Mount path: `/app/databases`
   - Size: 1GB (or more depending on team size)

This ensures employee databases persist across deployments.

### Step 4: Deploy

Railway will automatically deploy. Monitor the build logs:
- ✅ `npm ci` - Installing backend dependencies
- ✅ `cd frontend && npm ci` - Installing frontend dependencies
- ✅ `npm run build` - Building Next.js frontend
- ✅ `npm start` - Starting Express server

### Step 5: Create First Admin User

Once deployment is complete, you need to create the first admin user using Railway shell:

```bash
# Option A: Railway CLI
railway shell
node scripts/create-user.js

# Option B: Railway Dashboard
# Go to service → Shell tab
# Run: node scripts/create-user.js

# Follow prompts:
# Username: derrick
# Employee ID: derrick
# Is admin? y
# Password: <secure_password>
# Confirm password: <secure_password>
```

### Step 6: Verify Deployment

Visit your Railway URL (e.g., `https://sdr-console-production.up.railway.app`):
- ✅ Should see the **login page** (not home page)
- ✅ Login with admin credentials
- ✅ See Admin tab in sidebar
- ✅ Test registration: Click "Create account" and register a test user
- ✅ Verify user isolation: New user should have empty database
- ✅ Test admin dashboard: View all users and their stats

## Architecture on Railway

```
Railway Service (sdr-console)
├── Express Backend (port $PORT)
│   ├── API Routes (/api/*)
│   │   ├── /api/auth/* - Login, registration, session management
│   │   ├── /api/admin/* - Admin dashboard, impersonation
│   │   ├── /api/targets/* - Per-user target management
│   │   ├── /api/contacts/* - Per-user contact management
│   │   └── /api/drafts/* - Per-user draft management
│   ├── Authentication
│   │   ├── auth.db - User credentials (bcrypt hashed)
│   │   └── sessions.db - Active sessions (express-session)
│   ├── Per-User Databases (persistent volume)
│   │   ├── databases/derrick/data.db
│   │   ├── databases/user1/data.db
│   │   └── databases/user2/data.db
│   └── Puppeteer (Chromium)
└── Static Next.js App (frontend/out)
    ├── /login - Login page
    ├── /register - Self-service registration
    ├── /admin - Admin dashboard (admin only)
    ├── / - Home page (authenticated)
    ├── /targets - Research teams (authenticated)
    ├── /approved - Target teams (authenticated)
    └── /followups - Follow-ups (authenticated)
```

## Automation Setup

### X (Twitter) Discovery

X Discovery requires authentication. Railway can't open a browser, so you need to authenticate locally first:

1. **Authenticate Locally**:
```bash
curl -X POST http://localhost:3000/api/x-auth/login
```
This opens a browser where you log in to X/Twitter.

2. **Export Cookies**:
```bash
cat x-cookies.json | jq -c .
```
Copy the entire JSON array output.

3. **Set Railway Environment Variable**:
In Railway, add:
```
X_COOKIES=[paste the JSON array here]
```

4. **Test**: Go to your Railway URL and try "Discover Users from X"

### Contact Search

Works automatically with:
- `ANTHROPIC_API_KEY` - Claude for enrichment
- `APOLLO_API_KEY` - Apollo for employee search

### Telegram Automation

Railway can't run Telegram Desktop. Use **Relayer Mode**:

1. **Run Relayer Locally**:
```bash
RELAYER_API_KEY=your-key BACKEND_URL=https://your-railway-url.railway.app npm run relayer
```

2. **How it Works**:
   - You approve messages in Railway UI
   - Local relayer polls Railway API
   - Relayer opens Telegram Desktop locally
   - Sends messages automatically

3. **Alternative**: Manual sending via Telegram links in the UI

## Environment Variables Reference

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | ✅ | Claude API key | `sk-ant-xxx` |
| `APOLLO_API_KEY` | ✅ | Apollo contact search | `your-key` |
| `RELAYER_API_KEY` | ✅ | Relayer authentication | Random 32 chars |
| `NODE_ENV` | ✅ | Environment | `production` |
| `RAILWAY_ENVIRONMENT` | ✅ | Enables Railway mode | `true` |
| `PUPPETEER_EXECUTABLE_PATH` | ✅ | Chromium path | `/usr/bin/chromium-browser` |
| `X_COOKIES` | ❌ | X authentication | JSON array |
| `CLAY_WEBHOOK_URL` | ❌ | Clay integration | `https://...` |
| `AUTO_SEND_ENABLED` | ❌ | Auto-send approved | `false` (recommended) |

## Updating Deployment

Railway auto-deploys when you push to GitHub:

```bash
git add -A
git commit -m "Your changes"
git push origin main
```

Railway will detect the push and redeploy automatically.

## Troubleshooting

### Build Fails

**Error**: `npm run build failed`
- Check build logs for specific error
- Ensure `frontend/package.json` has all dependencies
- Verify Node version compatibility (>=18)

### React UI Not Showing

**Issue**: Still seeing old UI or errors
- Check deployment logs for "Building frontend..."
- Verify `frontend/out` directory was created
- Check `RAILWAY_ENVIRONMENT=true` is set
- Try manual redeploy in Railway dashboard

### X Discovery Fails

**Error**: "Failed to discover X users"
- Verify `X_COOKIES` environment variable is set correctly
- Check cookies haven't expired (re-authenticate if needed)
- Ensure `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

### API Calls Fail

**Error**: CORS or 403 errors
- Check `ANTHROPIC_API_KEY` is valid
- Verify API key has correct permissions
- Test `/api/health/claude` endpoint

### Database Issues

**Note**: Railway creates a fresh database on each deploy
- `data.db` is in `.railwayignore` by design
- Database resets on redeploy
- To persist data, consider Railway's PostgreSQL addon (requires code changes)

## Performance & Cost

### Typical Usage
- **Hobby Plan**: $5/month + usage
- **Light Usage**: $5-8/month (few automations)
- **Moderate Usage**: $10-15/month (regular Puppeteer/API calls)
- **Heavy Usage**: $15-25/month (lots of X discovery, message generation)

### Optimization Tips
- Use X Discovery sparingly (Puppeteer is resource-intensive)
- Batch contact searches when possible
- Set `AUTO_SEND_ENABLED=false` to prevent accidental sends
- Monitor usage in Railway dashboard

## Architecture Details

### Build Process
1. `nixpacks.toml` configures Node.js 18 + Chromium
2. `npm ci` installs backend dependencies
3. `npm run build` builds frontend:
   - `cd frontend && npm install`
   - `npm run build` (creates `frontend/out`)
4. `npm start` starts Express server

### Serving Strategy
- Static files from `frontend/out` served at root
- API routes at `/api/*`
- React app handles client-side routing
- Same-origin requests (no CORS issues)

### Database
- SQLite stored in container filesystem
- Resets on redeploy (ephemeral)
- For persistence, use Railway PostgreSQL

## Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: https://github.com/alchemyderrick/alchemysdr/issues

## Next Steps

After deployment:
1. Visit your Railway URL → Should see React UI
2. Add contacts and test message generation
3. Set up X authentication if using X Discovery
4. Configure relayer if using Telegram automation
5. Monitor usage and costs in Railway dashboard

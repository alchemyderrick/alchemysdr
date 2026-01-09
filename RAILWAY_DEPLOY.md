# Railway Deployment Guide

This guide will help you deploy the SDR Console to Railway with both the backend (Express.js) and frontend (Next.js) services.

## Prerequisites

1. [Railway CLI](https://docs.railway.app/develop/cli) installed: `npm install -g @railway/cli`
2. Railway account at [railway.app](https://railway.app)
3. Railway project created

## Architecture

The app consists of two services:
- **Backend**: Express.js API server (port 3000)
- **Frontend**: Next.js React app (port 3001)

## Step 1: Login to Railway

```bash
railway login
```

## Step 2: Deploy Backend

### 2.1 Link to Railway Project
```bash
# From the root directory
railway link
```

### 2.2 Set Environment Variables

Set these required environment variables in your Railway project:

```bash
# Anthropic API Key (required)
railway variables set ANTHROPIC_API_KEY=your-anthropic-api-key

# Apollo API Key (required for contact discovery)
railway variables set APOLLO_API_KEY=your-apollo-api-key

# Relayer API Key (for Telegram automation)
railway variables set RELAYER_API_KEY=$(openssl rand -hex 32)

# Frontend URL (will be your Railway frontend URL)
railway variables set FRONTEND_URL=https://your-frontend-url.railway.app

# Optional: Clay webhook URL
railway variables set CLAY_WEBHOOK_URL=your-clay-webhook-url

# Optional: X (Twitter) cookies for X discovery
railway variables set X_COOKIES='[{"name":"cookie_name","value":"cookie_value","domain":".x.com"}]'

# Puppeteer configuration for Railway
railway variables set PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
railway variables set NODE_ENV=production
```

### 2.3 Deploy Backend
```bash
# From the root directory
railway up
```

Railway will:
- Detect Node.js project
- Install dependencies
- Run `npm start` (starts Express server on port 3000)
- Generate a public URL like `https://sdr-console-backend.railway.app`

## Step 3: Deploy Frontend

### 3.1 Create New Service
```bash
# Navigate to frontend directory
cd frontend

# Create a new service in the same project
railway service
```

### 3.2 Set Frontend Environment Variables

```bash
# Set the backend API URL (use your Railway backend URL from Step 2)
railway variables set NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### 3.3 Deploy Frontend
```bash
# From the frontend directory
railway up
```

Railway will:
- Detect Next.js project
- Run `npm run build`
- Run `npm start`
- Generate a public URL like `https://sdr-console-frontend.railway.app`

## Step 4: Update Backend with Frontend URL

Now that you have the frontend URL, update the backend's `FRONTEND_URL`:

```bash
# From the root directory
cd ..
railway variables set FRONTEND_URL=https://your-frontend-url.railway.app
```

## Step 5: Verify Deployment

1. **Backend**: Visit `https://your-backend-url.railway.app` - should show the HTML UI (localhost:3000)
2. **Frontend**: Visit `https://your-frontend-url.railway.app` - should show the React UI (localhost:3001)
3. **API**: Test `https://your-backend-url.railway.app/api/drafts` - should return JSON

## Environment Variables Reference

### Backend (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic/Claude API key | `sk-ant-...` |
| `APOLLO_API_KEY` | Apollo API key for contact discovery | `your-apollo-key` |
| `RELAYER_API_KEY` | Random key for relayer authentication | Generated with `openssl rand -hex 32` |
| `FRONTEND_URL` | Your Railway frontend URL | `https://frontend.railway.app` |

### Backend (Optional)
| Variable | Description |
|----------|-------------|
| `CLAY_WEBHOOK_URL` | Clay webhook for sending data |
| `X_COOKIES` | X (Twitter) authentication cookies JSON |
| `AUTO_SEND_ENABLED` | Enable auto-send for approved messages (default: true) |
| `AUTO_SEND_IDLE_SECONDS` | Seconds before auto-sending (default: 5) |

### Frontend (Required)
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://backend.railway.app` |

## Database

The app uses SQLite (`data.db`). Railway will persist this file in the service's volume.

## Puppeteer on Railway

Puppeteer is configured to work in Railway's environment:
- Uses `chromium-browser` installed by Nixpacks
- Runs in headless mode
- No local browser automation features on cloud deployment

## Troubleshooting

### Backend won't start
- Check logs: `railway logs`
- Verify environment variables: `railway variables`
- Ensure all required env vars are set

### Frontend can't connect to backend
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in `server.js`
- Ensure `FRONTEND_URL` matches your frontend Railway URL

### Database issues
- Railway provides persistent storage
- Database will be created on first run
- Check logs for schema creation messages

### Puppeteer errors
- Puppeteer requires Chromium on Railway
- `PUPPETEER_EXECUTABLE_PATH` should be set to `/usr/bin/chromium-browser`
- X discovery features are disabled on cloud environments

## Updating Deployment

To deploy updates:

```bash
# Backend
railway up

# Frontend
cd frontend && railway up
```

Or push to your linked GitHub repo - Railway will auto-deploy on push.

## Cost Optimization

- **Starter Plan**: $5/month includes $5 of usage
- Both services combined typically use ~$5-10/month
- Consider using Railway's sleep feature for non-critical environments

## Support

For Railway-specific issues, check:
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

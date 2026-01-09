# Deployment Guide: SDR Console to Render

This guide will help you deploy your SDR console to Render while preserving all Telegram automation functionality via a Mac relayer client.

## Architecture Overview

```
┌─────────────────────────────────────┐
│      RENDER (Cloud Server)          │
│  - Research & Discovery             │
│  - Message Generation               │
│  - Database Storage                 │
│  - Web UI                           │
└─────────────┬───────────────────────┘
              │ HTTPS API
┌─────────────▼───────────────────────┐
│    MAC RELAYER (Your Computer)      │
│  - Polls for approved drafts        │
│  - Executes Telegram automation     │
│  - Reports back to server           │
└─────────────────────────────────────┘
```

## Prerequisites

1. GitHub account (to connect repository to Render)
2. Render account (sign up at https://render.com)
3. Mac computer for running the relayer client
4. API keys: ANTHROPIC_API_KEY, APOLLO_API_KEY

## Part 1: Deploy to Render

### Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit changes
git commit -m "Add Render deployment support"

# Create a new repository on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/sdr-console.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Service

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `sdr-console` (or your preferred name)
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter ($7/month)

### Step 3: Add Environment Variables

In the Render dashboard, add these environment variables:

```
ANTHROPIC_API_KEY=your-anthropic-api-key-here
APOLLO_API_KEY=your-apollo-api-key-here
RELAYER_API_KEY=<generate-a-secure-32-char-random-string>
NODE_ENV=production
```

To generate a secure relayer API key:
```bash
openssl rand -hex 32
```

**Important**: Save the `RELAYER_API_KEY` - you'll need it for the relayer client!

### Step 4: Add Persistent Disk

1. In Render dashboard, go to your service
2. Click "Disks" tab
3. Click "Add Disk"
4. Configure:
   - **Name**: `data`
   - **Mount Path**: `/opt/render/project/data`
   - **Size**: 1 GB (or more if needed)
5. Click "Create Disk"

### Step 5: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Wait for deployment to complete (3-5 minutes)
3. Once deployed, you'll see your app URL: `https://your-app-name.onrender.com`

### Step 6: Verify Deployment

Test your deployment:

```bash
# Test health endpoint
curl https://your-app-name.onrender.com/api/health/claude

# Should return: {"ok":true,"sample":"ok"}
```

## Part 2: Set Up Mac Relayer Client

### Step 1: Create Local Configuration

On your Mac, create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
RENDER_URL=https://your-app-name.onrender.com
RELAYER_API_KEY=your-relayer-api-key-from-render
POLL_INTERVAL_MS=10000
```

**Important**: Use the SAME `RELAYER_API_KEY` you set in Render!

### Step 2: Enable macOS Accessibility Permissions

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** → **Privacy** → **Accessibility**
3. Click the lock icon and authenticate
4. Click the **+** button
5. Navigate to `/Applications/Utilities` and add **Terminal** (or your terminal app)
6. Enable the checkbox next to Terminal

### Step 3: Test Relayer Connection

```bash
npm run relayer
```

You should see:

```
============================================================
🚀 SDR Console Relayer Client
============================================================
📡 Server: https://your-app-name.onrender.com
🔑 API Key: Configured
⏱️  Poll Interval: 10s
============================================================

✅ Connected to server: https://your-app-name.onrender.com
✅ Relayer started. Polling for approved drafts...
   Press Ctrl+C to stop.
```

### Step 4: Keep Relayer Running

**Option A: Run manually when needed**
```bash
npm run relayer
```
Leave terminal open while working. Telegram automation will run when you approve drafts.

**Option B: Auto-start on Mac boot (recommended)**

Create a launchd service:

```bash
# Create plist file
cat > ~/Library/LaunchAgents/com.sdr.relayer.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sdr.relayer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/PATH/TO/YOUR/sdr-console/relayer-client.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/PATH/TO/YOUR/sdr-console</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/PATH/TO/YOUR/sdr-console/relayer.log</string>
    <key>StandardErrorPath</key>
    <string>/PATH/TO/YOUR/sdr-console/relayer.log</string>
</dict>
</plist>
EOF

# Update paths in the plist file
# Replace /PATH/TO/YOUR/sdr-console with actual path

# Load the service
launchctl load ~/Library/LaunchAgents/com.sdr.relayer.plist

# Check status
launchctl list | grep relayer
```

## Part 3: Usage

### Using the Deployed Application

1. **Access the web UI**: Visit `https://your-app-name.onrender.com`
2. **Research targets**: Works exactly as before
3. **Discover contacts**: Works exactly as before
4. **Generate drafts**: Works exactly as before
5. **Approve drafts**: Click approve in the UI
6. **Telegram automation**: The relayer on your Mac will automatically:
   - Detect the approved draft (within 10 seconds)
   - Open Telegram to the contact
   - Paste the message
   - Wait for you to press Enter

### Running Locally (No Changes!)

You can still run everything locally on your Mac:

```bash
npm run dev
```

Everything works exactly as it did before! The code automatically detects it's running locally and enables all features.

## Part 4: Data Migration

### Initial Setup: Upload Existing Database

If you have existing data in your local database:

```bash
# 1. Create a backup
cp data.db data-backup.db

# 2. Use Render's disk SSH access or API to upload
# Visit: https://dashboard.render.com/YOUR_SERVICE/disk
# Follow instructions to upload data.db to /opt/render/project/data/
```

### Ongoing: Two-Way Sync (Optional)

If you want to sync data between local and Render:

**Option 1: Use Render as primary**
- Always work through the Render URL
- Don't use local server for production data

**Option 2: Periodic backups**
```bash
# Download database from Render periodically
# (Requires setting up Render disk SSH access)
```

## Troubleshooting

### Relayer Can't Connect to Server

**Error**: `Cannot reach server`

**Solutions**:
1. Check `RENDER_URL` in `.env.local` matches your Render app URL
2. Verify Render app is running (check dashboard)
3. Check `RELAYER_API_KEY` matches between Render and `.env.local`
4. Test manually: `curl https://your-app-name.onrender.com/api/health/claude`

### Telegram Automation Not Working

**Error**: `Telegram paste automation only available on local Mac`

**Solutions**:
1. Make sure you're running `npm run relayer` on your Mac
2. Check macOS Accessibility permissions (see Step 2 above)
3. Verify Telegram desktop app is installed
4. Test manually by approving a draft and watching relayer output

### Puppeteer Fails on Render

**Error**: Browser launch errors in Render logs

**Solutions**:
1. Render includes Chromium - should work automatically
2. If issues persist, check Render logs for specific error
3. Verify `render.yaml` is in repository

### Database Not Persisting

**Error**: Data disappears after deployment

**Solutions**:
1. Verify persistent disk is created (check Render dashboard → Disks)
2. Confirm `DB_PATH=/opt/render/project/data/data.db` in environment variables
3. Check disk is mounted correctly (see Render logs on startup)

## Monitoring

### Check Relayer Status

```bash
# View relayer logs
tail -f relayer.log

# If using launchd
tail -f /PATH/TO/YOUR/sdr-console/relayer.log
```

### Check Server Status

- Visit Render dashboard: https://dashboard.render.com
- View logs in real-time
- Set up email alerts for service downtime

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Render Web Service | $7/month | Starter plan |
| Render Persistent Disk | ~$1-3/month | Based on size |
| **Total** | **~$10/month** | |

## Security Best Practices

1. **Rotate API keys** monthly:
   - Generate new `RELAYER_API_KEY`
   - Update in both Render and `.env.local`

2. **Monitor logs** for unauthorized access attempts

3. **Keep .env.local private** - never commit to git

4. **Use strong API keys** - minimum 32 random characters

## Support

- **Render Documentation**: https://render.com/docs
- **GitHub Issues**: Report bugs in your repository
- **Logs**: Check Render dashboard logs and local `relayer.log`

---

## Quick Reference

**Deploy to Render**:
```bash
git push origin main
# Render auto-deploys from main branch
```

**Run relayer locally**:
```bash
npm run relayer
```

**Run server locally**:
```bash
npm run dev
```

**Check relayer logs**:
```bash
tail -f relayer.log
```

**Test relayer connection**:
```bash
curl $RENDER_URL/api/health/claude
```

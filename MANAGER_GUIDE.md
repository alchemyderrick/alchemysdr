# Manager's Guide: Setting Up SDRs with Telegram Automation

This guide is for SDR managers to onboard new team members to use the Telegram automation system.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Railway Server (Linux)                  │
│  - Web UI (React + Next.js)                                 │
│  - API Server (Express)                                     │
│  - Database (SQLite, per-employee)                          │
│  - AI features (Claude, Apollo)                             │
│  - Telegram validation (headless Puppeteer)                 │
└─────────────────────────────────────────────────────────────┘
                             ▲
                             │ HTTPS API calls
                             │ (polling every 2s)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Each SDR's Mac (Local Relayer)                 │
│  - Polls Railway for approved drafts                        │
│  - Controls Telegram Desktop via AppleScript                │
│  - Handles X/Twitter authentication                         │
│  - Captures responses via screenshots                       │
└─────────────────────────────────────────────────────────────┘
```

**Why this architecture?**
- **Railway**: Scales for multiple SDRs, handles all data and AI
- **Local Mac**: Required for macOS-specific automation (Telegram Desktop, AppleScript)

---

## Prerequisites for Each SDR

Each SDR needs:

1. ✅ **Mac computer** (any macOS version 10.14+)
2. ✅ **Telegram Desktop app** (free, installed from telegram.org)
3. ✅ **Node.js 20+** installed (`node --version` to check)
4. ✅ **Terminal access** (built into macOS)

---

## One-Time Setup for New SDR

### Step 1: Create Employee Account on Railway

```bash
# SSH into Railway or use Railway CLI
# Or create account via the web UI at /register

# Via API (if you have direct database access):
curl -X POST https://sdr-console-production.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "sarah",
    "password": "SecurePassword123!",
    "name": "Sarah Johnson"
  }'
```

Or via web UI:
1. Go to https://sdr-console-production.up.railway.app/register
2. Create account with their employee ID as username
3. Note their credentials

**Important**: The username becomes their `EMPLOYEE_ID` for the relayer.

### Step 2: Share Required Credentials

Send the new SDR:

1. **RELAYER_API_KEY**: `898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043`
   - This is shared by all SDRs
   - It's safe to share within your team
   - Rotate it periodically for security

2. **RENDER_URL**: `https://sdr-console-production.up.railway.app`
   - Your Railway deployment URL

3. **EMPLOYEE_ID**: Their username (e.g., "sarah", "john")
   - Must match their account exactly

4. **ANTHROPIC_API_KEY**: Your company's Anthropic API key
   - Used for response capture feature
   - Can be shared or individual per SDR

5. **Web UI credentials**: Their username and password

### Step 3: Provide Access to Relayer Code

**Option A: Send them the relayer package** (recommended)

```bash
# Create a distributable package
cd sdr-console
tar -czf relayer-package.tar.gz \
  relayer-client.js \
  package.json \
  package-lock.json \
  .env.local.example \
  SDR_ONBOARDING.md \
  README.md

# Send relayer-package.tar.gz to the SDR
```

**Option B: Give them repo access** (if using git)

```bash
# SDR clones the repo
git clone https://github.com/your-company/sdr-console.git
cd sdr-console
npm install
```

### Step 4: Guide Them Through Setup

Send them the [SDR_ONBOARDING.md](SDR_ONBOARDING.md) guide and:

1. Help them create their `.env.local` file
2. Verify they can run `npm run relayer`
3. Test sending one message

---

## Railway Configuration (Already Set)

Your Railway deployment should have these environment variables:

```bash
# API Keys (required)
ANTHROPIC_API_KEY=sk-ant-api03-...
APOLLO_API_KEY=MDI...

# Security (required)
SESSION_SECRET=<32-char-hex-string>
RELAYER_API_KEY=898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043

# Server config
NODE_ENV=production
PORT=3000

# Puppeteer (recommended)
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

**To rotate the RELAYER_API_KEY**:
1. Generate new key: `openssl rand -hex 32`
2. Update on Railway
3. Update all SDRs' `.env.local` files
4. Restart all relayers

---

## Monitoring & Management

### Check Active SDRs

```bash
# Check Railway logs for relayer connections
railway logs --filter "relayer"

# Look for: "✅ Relayer authenticated for employee: {employee_id}"
```

### View SDR Activity

```sql
-- Check recent message activity per SDR
SELECT
  employee_id,
  COUNT(*) as messages_sent,
  MAX(prepared_at) as last_message
FROM drafts
WHERE status = 'prepared'
  AND prepared_at > datetime('now', '-7 days')
GROUP BY employee_id;
```

### Database Per Employee

Each SDR gets their own database:
- **Location**: `databases/{employeeId}/data.db`
- **Created automatically** when they first login
- **Isolated**: SDRs can't see each other's data

### Performance Limits

- **Polling frequency**: Each relayer polls every 2 seconds (configurable via `POLL_INTERVAL_MS`)
- **Telegram rate limits**: ~30 messages per minute per account
- **Server capacity**: Railway can handle 10+ concurrent SDRs easily

---

## Troubleshooting Common Issues

### SDR Can't Connect to Railway

**Symptoms**: "Cannot reach server" error

**Check**:
1. Railway deployment is running: `railway status`
2. Health endpoint works: `curl https://your-url.railway.app/api/health`
3. SDR's `RENDER_URL` in `.env.local` is correct

### SDR's Messages Not Sending

**Symptoms**: Drafts stay in "approved" status

**Check**:
1. SDR's relayer is running
2. SDR granted macOS Accessibility permissions
3. Telegram Desktop is installed and logged in
4. `EMPLOYEE_ID` matches their username exactly

### Wrong Employee ID

**Symptoms**: SDR sees drafts for someone else or no drafts at all

**Fix**: Check `.env.local` file has correct `EMPLOYEE_ID` matching their username

### Multiple Failures

**Symptoms**: Relayer shows "Failed to send draft" repeatedly

**Check**:
1. Invalid Telegram handles (typos in @username)
2. Contact doesn't have Telegram
3. Telegram Desktop crashed or logged out

---

## Scaling to More SDRs

### Hardware Requirements Per SDR

- **Mac**: Any Mac from 2015+ works fine
- **RAM**: 4GB minimum (relayer uses ~100MB)
- **CPU**: Minimal usage when idle, brief spikes when sending
- **Network**: Stable internet connection required

### Cost Considerations

- **Railway server**: Scales with usage (database size, API calls)
- **Anthropic API**: Pay per AI message generated
- **Apollo API**: Based on your plan/credits
- **Per-SDR costs**: Just their Mac + Telegram account (free)

### Best Practices

1. **Standardize setup**: Use the same `.env.local` template for all SDRs
2. **Centralized credentials**: Store shared keys in a password manager
3. **Monitor usage**: Check Railway metrics and API usage regularly
4. **Backup databases**: Download databases from Railway periodically
5. **Rotate keys**: Update `RELAYER_API_KEY` quarterly

---

## Security Considerations

### Access Control

- ✅ Each SDR has their own login (username/password)
- ✅ Each SDR has isolated database (can't see others' data)
- ✅ Shared `RELAYER_API_KEY` for team convenience
- ⚠️ Consider IP whitelisting if SDRs work from fixed locations

### API Keys

- **RELAYER_API_KEY**: Shared, but only works with valid `EMPLOYEE_ID`
- **ANTHROPIC_API_KEY**: Can be shared or individual
- **APOLLO_API_KEY**: Usually shared company resource

### Data Privacy

- **Messages**: Stored per-employee, not shared
- **Contacts**: Per-employee, not shared
- **X/Twitter cookies**: Stored per-employee in Railway database
- **Logs**: Relayer logs are local to each Mac

---

## Offboarding an SDR

When an SDR leaves:

1. **Disable their account** on Railway:
   ```sql
   UPDATE users SET active = 0 WHERE username = 'former_employee';
   ```

2. **Archive their database**:
   ```bash
   # Download from Railway
   railway run sqlite3 databases/former_employee/data.db .dump > backup.sql
   ```

3. **Revoke access**:
   - Remove from any shared repositories
   - They can no longer connect even with the relayer API key (no matching EMPLOYEE_ID)

4. **Optional**: Rotate `RELAYER_API_KEY` for all remaining SDRs

---

## Support Workflow

When an SDR reports an issue:

### Step 1: Check Basics
- [ ] Relayer running? (`ps aux | grep relayer`)
- [ ] Telegram Desktop installed and logged in?
- [ ] macOS Accessibility permissions granted?

### Step 2: Check Logs
```bash
# SDR's local logs
tail -f ~/Downloads/sdr-console/relayer.log

# Railway server logs
railway logs --filter "{employee_id}"
```

### Step 3: Common Fixes
- **Restart relayer**: Ctrl+C, then `npm run relayer`
- **Restart Telegram**: Quit and reopen Telegram Desktop
- **Re-grant permissions**: System Settings → Privacy & Security → Accessibility
- **Check config**: Verify `.env.local` has correct values

### Step 4: Escalate
- If issue persists, check Railway deployment health
- Review Railway logs for server errors
- Test with your own relayer to isolate the issue

---

## Quick Setup Checklist for New SDR

Send them this checklist:

- [ ] Mac computer ready
- [ ] Telegram Desktop installed and logged in
- [ ] Node.js 20+ installed (`node --version`)
- [ ] Received credentials (RELAYER_API_KEY, EMPLOYEE_ID, login, etc.)
- [ ] Downloaded relayer code
- [ ] Created `.env.local` file with credentials
- [ ] Ran `npm install`
- [ ] Granted macOS Accessibility permissions to Terminal
- [ ] Successfully ran `npm run relayer`
- [ ] Logged into web UI: https://sdr-console-production.up.railway.app
- [ ] Sent test message successfully

**Estimated setup time**: 15-30 minutes for technical users

---

## Resources for SDRs

Provide these documents:
- **[SDR_ONBOARDING.md](SDR_ONBOARDING.md)** - Complete setup guide
- **[QUICK_START.md](QUICK_START.md)** - Quick reference
- **[TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md)** - Testing guide

---

## Summary

**To add a new SDR**:
1. Create their account on Railway
2. Send them credentials (RELAYER_API_KEY, EMPLOYEE_ID, login)
3. Give them the relayer code + onboarding doc
4. Help them run `npm run relayer` successfully
5. Test with one message

**Each SDR works independently** with their own:
- Database on Railway
- Relayer on their Mac
- Telegram account
- Contact list and message queue

**You manage**:
- Railway deployment (server, shared API keys)
- Employee accounts
- Shared relayer API key
- Support and troubleshooting

The system is designed to scale to dozens of SDRs with minimal management overhead!

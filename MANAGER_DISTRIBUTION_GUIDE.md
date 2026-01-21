# Manager's Guide: Distributing the Relayer to SDRs

Quick guide for onboarding new SDRs with self-service setup.

---

## Overview

Each SDR sets up the relayer on **their own Mac** following the self-service guide. As a manager, you just need to:

1. Create their account
2. Send them the package + credentials
3. Let them follow the guide (takes ~15 minutes)

---

## Step 1: Create Employee Account

### Option A: Via Web UI (Recommended)

1. Go to: https://web-production-554d8.up.railway.app/register
2. Create account with:
   - **Username**: Their employee ID (e.g., "sarah") - lowercase, no spaces
   - **Password**: A secure temporary password
   - **Name**: Their full name

3. Give them their login credentials:
   - Username: `sarah`
   - Password: `[temporary password]`
   - URL: https://web-production-554d8.up.railway.app

### Option B: Via API

```bash
curl -X POST https://web-production-554d8.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "sarah",
    "password": "TempPassword123!",
    "name": "Sarah Johnson"
  }'
```

**Important**: The username becomes their `EMPLOYEE_ID` for the relayer.

---

## Step 2: Create Relayer Package

Run this command in the sdr-console directory:

```bash
./scripts/create-relayer-package.sh
```

This creates: `relayer-package.tar.gz` (~56KB)

---

## Step 3: Send Package + Credentials

### Email Template

```
Subject: Welcome to Alchemy SDR Console - Setup Instructions

Hi [SDR Name],

Welcome to the team! I've set up your access to our SDR automation system.

ATTACHED FILES:
- relayer-package.tar.gz (the automation software)

YOUR CREDENTIALS:
- Web UI: https://web-production-554d8.up.railway.app
- Username: [their_employee_id]
- Password: [temporary_password]
- Employee ID: [their_employee_id]
- Relayer API Key: 898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043
- Anthropic API Key: [your_anthropic_key]

SETUP INSTRUCTIONS:
1. Download the attached relayer-package.tar.gz
2. Save it to your Downloads folder
3. Extract it and follow the README.md file
4. The setup guide (SDR_SELF_SETUP.md) will walk you through everything

WHAT YOU NEED:
- Mac computer (any recent macOS version)
- Telegram Desktop (https://desktop.telegram.org/)
- Node.js 20+ (https://nodejs.org/)

SETUP TIME: About 15 minutes

Once you're set up, you can start sending automated Telegram messages!

Let me know if you run into any issues.

[Your name]
```

### Credentials to Include

1. **RELAYER_API_KEY**: `898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043`
   - This is shared by all SDRs
   - Same key for everyone

2. **EMPLOYEE_ID**: Their username (e.g., "sarah")
   - Must match their account username exactly
   - Used to identify which drafts are theirs

3. **ANTHROPIC_API_KEY**: Your company's Anthropic API key
   - Can be shared or individual per SDR
   - Used for AI response capture feature

4. **Web UI Login**:
   - URL: https://web-production-554d8.up.railway.app
   - Username: Their employee ID
   - Password: Temporary password (they can change it later)

---

## Step 4: SDR Self-Setup

The SDR follows **SDR_SELF_SETUP.md** (included in the package):

1. Extract package → `~/Downloads/relayer-package`
2. Run `npm install`
3. Create `.env.local` from template
4. Fill in credentials you sent
5. Grant macOS Accessibility permissions
6. Run `npm run relayer`
7. Test with one message

**Typical setup time**: 15-30 minutes for non-technical users

---

## Step 5: Verify Setup

Have the SDR send you a screenshot showing:

```
✅ Connected to server: https://web-production-554d8.up.railway.app
👤 Employee: their_name
🔄 Polling every 2000ms for drafts...
⏳ Idle - waiting for approved drafts...
```

Then have them:
1. Login to the web UI
2. Approve a test draft
3. Confirm the message sent via Telegram

If all works, they're ready! 🎉

---

## Troubleshooting Common Issues

### "Can't connect to server"

**Cause**: Wrong `RENDER_URL` or Railway is down

**Fix**:
1. Verify Railway deployment is running
2. Check they have correct URL in `.env.local`
3. Test: `curl https://web-production-554d8.up.railway.app/api/health`

### "Invalid API key"

**Cause**: Wrong `RELAYER_API_KEY`

**Fix**: Double-check they copied the key exactly (no extra spaces)

### "EMPLOYEE_ID not set"

**Cause**: Didn't configure `.env.local`

**Fix**: Walk them through creating `.env.local` from template

### "Telegram doesn't send"

**Cause**: macOS permissions not granted

**Fix**:
1. System Settings → Privacy & Security → Accessibility
2. Add Terminal, enable it
3. Restart relayer

### "Shows wrong employee's drafts"

**Cause**: Wrong `EMPLOYEE_ID` in `.env.local`

**Fix**: Make sure `EMPLOYEE_ID` matches their username exactly

---

## Managing Multiple SDRs

### Rotate API Keys (Quarterly)

When rotating `RELAYER_API_KEY`:

1. Generate new key: `openssl rand -hex 32`
2. Update Railway environment variable
3. Email all SDRs with new key
4. They update `.env.local` and restart relayer

### Monitor Activity

**Check who's active**:

```bash
# Railway logs show relayer connections
railway logs | grep "Relayer authenticated"
```

**Check message volume per SDR**:

```sql
SELECT
  employee_id,
  COUNT(*) as messages_sent,
  MAX(prepared_at) as last_message
FROM drafts
WHERE status = 'prepared'
  AND prepared_at > datetime('now', '-7 days')
GROUP BY employee_id;
```

### Offboard an SDR

When an SDR leaves:

1. Disable their account (they can't login to web UI)
2. Their relayer will fail to authenticate (no need to notify)
3. Optional: Archive their database for records
4. Optional: Rotate `RELAYER_API_KEY` for remaining team

---

## Quick Reference

### Create Package
```bash
./scripts/create-relayer-package.sh
```

### Required Info for New SDR
- Web UI login (username/password)
- EMPLOYEE_ID (their username)
- RELAYER_API_KEY (shared)
- ANTHROPIC_API_KEY (shared or individual)
- Package file: relayer-package.tar.gz

### Railway Environment Variables (Already Set)
```bash
RELAYER_API_KEY=898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043
ANTHROPIC_API_KEY=sk-ant-api03-...
APOLLO_API_KEY=MDI...
SESSION_SECRET=[your-secret]
NODE_ENV=production
PORT=3000
```

### Support Escalation

If SDR can't resolve an issue:

1. Check their `.env.local` configuration
2. Review their `relayer.log` file
3. Check Railway logs for server errors
4. Test with your own relayer to isolate the issue

---

## Cost Tracking

**Per SDR costs**:
- Railway server: Shared (scales automatically)
- Anthropic API: ~$0.001-0.01 per message generated
- Apollo API: Based on your company plan
- Telegram: Free
- Mac hardware: SDR's own computer

**Estimated monthly cost per SDR**: $3-10 (mostly API usage)

---

## Security Best Practices

### Credential Management

- Store `RELAYER_API_KEY` in password manager (1Password, LastPass)
- Use strong temporary passwords for new accounts
- Encourage SDRs to change password on first login
- Rotate `RELAYER_API_KEY` quarterly

### Access Control

- Each SDR can only see their own data (enforced by Railway)
- Shared `RELAYER_API_KEY` + unique `EMPLOYEE_ID` = secure multi-tenant
- Sessions are per-employee (can't access others' sessions)

---

## Summary

**To onboard a new SDR**:

1. ✅ Create account (web UI or API) - 2 minutes
2. ✅ Create package: `./scripts/create-relayer-package.sh` - 1 minute
3. ✅ Email package + credentials - 2 minutes
4. ✅ SDR follows self-setup guide - 15 minutes (their time)
5. ✅ Verify it works - 5 minutes

**Total manager time**: ~10 minutes
**Total SDR time**: ~15-30 minutes (self-service)

**The system is designed for minimal manager involvement!**

SDRs can troubleshoot most issues themselves using the included documentation.

---

## Files for Reference

- **[SDR_SELF_SETUP.md](SDR_SELF_SETUP.md)** - What SDRs follow
- **[MANAGER_GUIDE.md](MANAGER_GUIDE.md)** - Detailed technical guide
- **[SYSTEM_DIAGRAM.md](SYSTEM_DIAGRAM.md)** - Architecture overview
- **[MULTI_SDR_SETUP_SUMMARY.md](MULTI_SDR_SETUP_SUMMARY.md)** - Complete system docs

---

**Ready to onboard your first SDR?** Create their account and send them the package! 🚀

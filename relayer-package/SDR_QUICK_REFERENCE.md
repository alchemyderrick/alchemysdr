# SDR Telegram Automation - Quick Reference Card

**Print this or keep it handy!** 📋

---

## Daily Startup (2 Minutes)

```bash
# 1. Open Terminal
cd ~/Downloads/sdr-console  # Or wherever you installed it

# 2. Start the relayer
npm run relayer

# 3. Keep this terminal window open all day
```

**Also**: Make sure Telegram Desktop is running and logged in!

---

## Web Interface

**URL**: https://sdr-console-production.up.railway.app

**Login**: Your employee username and password

**Pages**:
- 📋 **Send Queue** - Approve messages to send
- ✉️ **Sent Messages** - See what you've sent
- 👥 **Contacts** - Manage your contacts
- 🎯 **Targets** - Companies to prospect

---

## Sending a Message

1. Go to **Send Queue** in the web UI
2. Review the AI-generated message
3. Click **"Approve"** (or edit first if needed)
4. Watch your terminal - message sends within 2 seconds!
5. Check Telegram Desktop to verify

---

## What You'll See in Terminal

### When Idle
```
⏳ Idle - waiting for approved drafts...
```

### When Sending
```
🔄 Processing draft abc123 for John Doe (@johndoe)
📱 Opened Telegram chat with @johndoe
📤 Sending 3 paragraph(s) as separate messages
✅ All 3 message(s) sent to John Doe
```

### When Error
```
❌ Failed to send draft abc123: [error details]
```

---

## Common Issues & Quick Fixes

### "Cannot reach server"
**Fix**: Check your internet connection, verify RENDER_URL in `.env.local`

### "Telegram opens but nothing happens"
**Fix**: Grant Accessibility permissions
1. System Settings → Privacy & Security → Accessibility
2. Add Terminal, enable checkbox ✅
3. Restart relayer (Ctrl+C, then `npm run relayer`)

### "Wrong employee drafts showing"
**Fix**: Check `EMPLOYEE_ID` in `.env.local` matches your username exactly

### "No drafts processing"
**Check**:
- Did you approve drafts in the web UI?
- Does contact have a valid @telegram_handle?
- Is Telegram Desktop running?

---

## Keyboard Shortcuts

**Stop the relayer**: `Ctrl+C`

**Check logs**: `tail -f relayer.log` (in another terminal)

---

## Important Files

### `.env.local` - Your Configuration
```bash
RENDER_URL=https://sdr-console-production.up.railway.app
RELAYER_API_KEY=your-key-here
EMPLOYEE_ID=your_name_here
ANTHROPIC_API_KEY=your-key-here
POLL_INTERVAL_MS=2000
```

**Location**: Same folder as `relayer-client.js`

### `relayer.log` - Activity Log
All relayer activity is logged here. Check it when troubleshooting.

---

## Best Practices

✅ **Keep relayer running** while actively sending messages
✅ **Review AI messages** before approving (edit if needed)
✅ **Don't spam** - Telegram has rate limits
✅ **Check for responses** regularly in Telegram Desktop
✅ **Personalize when possible** - AI is good but not perfect

---

## Support Contact

**Your SDR Manager**: [Your manager's name/email]

**Documentation**:
- [SDR_ONBOARDING.md](SDR_ONBOARDING.md) - Full setup guide
- [TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md) - Testing guide
- [RELAYER_README.md](RELAYER_README.md) - Daily usage guide

---

## Checklist for a Successful Day

Morning:
- [ ] Start relayer: `npm run relayer`
- [ ] Open Telegram Desktop
- [ ] Login to web UI
- [ ] Terminal shows "✅ Connected to server"

Throughout Day:
- [ ] Review and approve drafts in Send Queue
- [ ] Watch terminal for successful sends
- [ ] Check Telegram for responses
- [ ] Handle any errors promptly

End of Day:
- [ ] Stop relayer: `Ctrl+C`
- [ ] (Optional) Close Telegram Desktop
- [ ] Your progress auto-saves!

---

## Emergency Contacts

**If relayer won't start**: Check `.env.local` has all required values

**If messages won't send**:
1. Restart relayer (Ctrl+C, `npm run relayer`)
2. Restart Telegram Desktop
3. Check Accessibility permissions
4. Ask your manager

**If you see someone else's drafts**: Wrong EMPLOYEE_ID in `.env.local`

---

## Quick Commands

```bash
# Start relayer
npm run relayer

# Stop relayer
Ctrl+C

# View logs
tail -f relayer.log

# Check your config
cat .env.local

# Test server connection
curl https://sdr-console-production.up.railway.app/api/health
```

---

## Remember

🎯 **Goal**: Automate Telegram outreach efficiently
📱 **Requirement**: Mac + Telegram Desktop + Relayer running
⚡ **Speed**: Messages send within 2 seconds of approval
🔒 **Privacy**: Your messages and data are isolated to your account

---

**Questions?** Check [SDR_ONBOARDING.md](SDR_ONBOARDING.md) or ask your manager!

**Happy selling!** 🚀

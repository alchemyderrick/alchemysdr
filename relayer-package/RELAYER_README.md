# Telegram Relayer for Alchemy SDRs

This is the local automation client that sends Telegram messages from your Mac.

## What This Does

- 🔄 Polls the Railway server every 2 seconds for approved drafts
- 📱 Opens Telegram Desktop automatically
- ✍️ Pastes and sends messages
- ✅ Updates message status on the server

## Quick Setup (5 Minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Your Credentials

Copy the template and fill in your values:

```bash
cp .env.local.template .env.local
# Then edit .env.local with your credentials
```

Required values (ask your manager):
- `RELAYER_API_KEY` - Shared team authentication key
- `EMPLOYEE_ID` - Your username (e.g., "derrick")
- `ANTHROPIC_API_KEY` - API key for AI features

### 3. Grant macOS Permissions

The relayer needs permission to control Telegram:

1. Open **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the **lock** 🔒 and enter your password
3. Click **+** and add **Terminal** (or your terminal app)
4. Make sure it's **enabled** ✅

**Why?** This lets the automation paste messages into Telegram and press Enter.

### 4. Start the Relayer

```bash
npm run relayer
```

**Keep this running** while sending messages!

You should see:
```
✅ Connected to server: https://web-production-554d8.up.railway.app
👤 Employee: your_name
🔄 Polling every 2000ms for drafts...
⏳ Idle - waiting for approved drafts...
```

## Daily Usage

### Morning Routine

1. Open **Telegram Desktop** and login
2. Open **Terminal** and run:
   ```bash
   cd ~/path/to/sdr-console
   npm run relayer
   ```
3. Keep this terminal open all day
4. Go to the web UI and start approving messages!

### When a Message Sends

You'll see in the terminal:
```
🔄 Processing draft abc123 for John Doe (@johndoe)
📱 Opened Telegram chat with @johndoe
📤 Sending 3 paragraph(s) as separate messages
✅ All 3 message(s) sent to John Doe
```

And in Telegram Desktop:
- Chat opens automatically
- Messages send automatically
- Done!

## Troubleshooting

### "Cannot reach server"

**Fix**: Check your `.env.local` file:
- Is `RENDER_URL` correct?
- Can you access it in a browser?

### "Invalid API key"

**Fix**: Check your `.env.local` file:
- Is `RELAYER_API_KEY` correct?
- Ask your manager for the current key

### "No drafts processing"

**Check**:
1. Did you approve drafts in the web UI?
2. Is your `EMPLOYEE_ID` correct in `.env.local`?
3. Do the contacts have valid Telegram handles?

### "Telegram opens but nothing happens"

**Fix**: Grant Accessibility permissions (see step 3 above)

1. System Settings → Privacy & Security → Accessibility
2. Add Terminal to the list
3. Enable it ✅
4. **Restart the relayer** (Ctrl+C, then `npm run relayer`)

### "EMPLOYEE_ID not set"

**Fix**: Edit `.env.local` and add:
```bash
EMPLOYEE_ID=your_name_here
```

## Getting Help

1. Check the [SDR_ONBOARDING.md](SDR_ONBOARDING.md) guide
2. Look at [TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md)
3. Ask your SDR manager
4. Check the logs: `tail -f relayer.log`

## Files in This Package

- `relayer-client.js` - The automation script
- `package.json` - Dependencies list
- `.env.local.template` - Configuration template
- `SDR_ONBOARDING.md` - Complete setup guide
- `RELAYER_README.md` - This file

## What You Need

- ✅ Mac computer (macOS 10.14+)
- ✅ Node.js 20+ installed
- ✅ Telegram Desktop app
- ✅ Your employee credentials
- ✅ Accessibility permissions granted

## Web UI

Login at: **https://web-production-554d8.up.railway.app**

Use your employee username and password.

## Support

Your SDR manager can help with:
- Getting credentials
- Account issues
- Server problems
- Advanced features

You can troubleshoot yourself:
- Relayer connection issues (check `.env.local`)
- macOS permissions (System Settings)
- Telegram Desktop (make sure it's installed and logged in)

---

**Ready to start?**

```bash
npm run relayer
```

Then approve a draft in the web UI and watch the magic happen! ✨

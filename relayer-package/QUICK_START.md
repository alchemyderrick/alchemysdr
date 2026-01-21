# Quick Start Guide

## 🚀 Start the Relayer

```bash
npm run relayer
```

Keep this running while sending messages.

---

## 📱 Send a Message

1. Open: https://web-production-554d8.up.railway.app
2. Login as: `derrick`
3. Go to **Send Queue**
4. Click **Approve** on a draft
5. Watch it send automatically!

---

## 🔍 Check Status

```bash
# Watch relayer activity
tail -f relayer.log

# Run full verification
./verify-production.sh
```

---

## ⚙️ Railway Environment Variables

Set these on Railway (if not already done):

```bash
ANTHROPIC_API_KEY=<your-anthropic-api-key>
APOLLO_API_KEY=<your-apollo-api-key>
SESSION_SECRET=<GENERATE: openssl rand -hex 32>
RELAYER_API_KEY=<your-relayer-api-key>
NODE_ENV=production
PORT=3000
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

---

## 📚 Documentation

- **Full Setup**: [RAILWAY_SETUP.md](RAILWAY_SETUP.md)
- **Testing**: [TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md)
- **Status**: [PRODUCTION_READY_SUMMARY.md](PRODUCTION_READY_SUMMARY.md)
- **Env Vars**: [railway-env-checklist.txt](railway-env-checklist.txt)

---

## ⚠️ Don't Forget

1. Grant Terminal **Accessibility permissions** in System Settings
2. Keep **Telegram Desktop** running
3. Keep **relayer running** while sending messages

---

## ✅ You're Ready!

Current status:
- ✅ Relayer connected
- ✅ Railway server online
- ✅ 126 contacts ready
- ✅ Telegram automation working

**Just approve a draft and watch it send!**

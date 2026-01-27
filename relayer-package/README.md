# Alchemy SDR Telegram Automation

Welcome! This package lets you automate Telegram messaging from your Mac.

## 🚀 Start Here

**Follow this guide**: [SDR_SELF_SETUP.md](SDR_SELF_SETUP.md)

It will walk you through:
1. Installing dependencies (2 minutes)
2. Configuring your credentials (5 minutes)
3. Granting macOS permissions (2 minutes)
4. Testing your first message (5 minutes)

**Total setup time: ~15 minutes**

## Quick Setup (If You Know What You're Doing)

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.template .env.local
# Edit .env.local with your credentials

# 3. Grant permissions
# System Settings → Privacy & Security → Accessibility → Add Terminal

# 4. Run
npm run relayer
```

## What You Need

- Mac computer (macOS 10.14+)
- Node.js 20+ ([download](https://nodejs.org/))
- Telegram Desktop ([download](https://desktop.telegram.org/))
- Your credentials from your manager:
  - RELAYER_API_KEY
  - EMPLOYEE_ID
  - ANTHROPIC_API_KEY
  - Web UI login

## Documentation

- **[SDR_SELF_SETUP.md](SDR_SELF_SETUP.md)** ⭐ **START HERE** - Step-by-step setup guide
- **[SDR_QUICK_REFERENCE.md](SDR_QUICK_REFERENCE.md)** - Daily usage cheat sheet
- **[RELAYER_README.md](RELAYER_README.md)** - Technical reference
- **[TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md)** - Testing guide

## Web Interface

https://sdr-console-production.up.railway.app

Login with your username and password (from your manager).

## Getting Help

1. **Check the troubleshooting section** in SDR_SELF_SETUP.md
2. **Read the logs**: `tail -f relayer.log`
3. **Ask your manager** with a screenshot of any errors

## Daily Workflow

```bash
# Morning: Start the relayer
cd ~/Downloads/relayer-package
npm run relayer
# Keep this running all day!

# Throughout the day: Approve drafts in the web UI
# The relayer automatically sends them via Telegram

# End of day: Stop the relayer
Ctrl+C
```

---

**Ready to get started?** Open [SDR_SELF_SETUP.md](SDR_SELF_SETUP.md) and follow along! 🚀

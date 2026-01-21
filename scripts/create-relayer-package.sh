#!/bin/bash
# Create a distributable package for new SDRs
# This includes only the files needed to run the relayer

set -e

echo "📦 Creating SDR Relayer Package..."

# Create temporary directory
PACKAGE_DIR="relayer-package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy essential files
echo "📋 Copying files..."
cp relayer-client.js "$PACKAGE_DIR/"
cp package.json "$PACKAGE_DIR/"
cp package-lock.json "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No package-lock.json found"
cp .env.local.template "$PACKAGE_DIR/"

# Copy documentation
cp SDR_SELF_SETUP.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No self-setup guide found"
cp SDR_ONBOARDING.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No onboarding guide found"
cp RELAYER_README.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No relayer README found"
cp SDR_QUICK_REFERENCE.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No quick reference found"
cp TEST_TELEGRAM_AUTOMATION.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No test guide found"
cp QUICK_START.md "$PACKAGE_DIR/" 2>/dev/null || echo "ℹ️ No quick start found"

# Create a simple README for the package
cat > "$PACKAGE_DIR/README.md" << 'EOF'
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

https://web-production-554d8.up.railway.app

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
EOF

# Create archive
echo "🗜️  Creating archive..."
tar -czf relayer-package.tar.gz "$PACKAGE_DIR"

# Calculate size
SIZE=$(du -h relayer-package.tar.gz | cut -f1)

echo "✅ Package created successfully!"
echo ""
echo "📦 relayer-package.tar.gz ($SIZE)"
echo ""
echo "📤 Send this to new SDRs along with:"
echo "   - RELAYER_API_KEY"
echo "   - EMPLOYEE_ID"
echo "   - ANTHROPIC_API_KEY"
echo "   - Web UI login credentials"
echo ""
echo "SDR can unpack with:"
echo "   tar -xzf relayer-package.tar.gz"
echo "   cd relayer-package"
echo "   npm install"
echo "   cp .env.local.template .env.local"
echo "   # Edit .env.local with credentials"
echo "   npm run relayer"

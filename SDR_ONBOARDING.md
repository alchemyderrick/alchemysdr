# SDR Telegram Automation - Onboarding Guide

Welcome to the Alchemy SDR Console! This guide will help you set up Telegram automation on your Mac.

## What You'll Get

✅ Automated Telegram message sending
✅ AI-powered message drafting with Claude
✅ Contact discovery and enrichment
✅ Message queue management
✅ Response tracking and follow-ups

---

## Prerequisites

Before you begin, make sure you have:

- [ ] **macOS computer** (required for Telegram automation)
- [ ] **Telegram Desktop app** installed and logged in
- [ ] **Your employee ID** (ask your manager - e.g., "derrick", "sarah", etc.)
- [ ] **Access to the Railway deployment** (https://web-production-554d8.up.railway.app)

---

## Step 1: Get Your Credentials

Contact your SDR manager to get:

1. **RELAYER_API_KEY** - Shared authentication key for all SDRs
2. **Your employee account** - Username and password for the web UI
3. **EMPLOYEE_ID** - Your unique identifier (usually your first name, lowercase)

---

## Step 2: Install the Relayer on Your Mac

### Download the Project

```bash
# Clone or download the project
cd ~/Downloads
# (Your manager will provide access to the repository)
```

### Install Dependencies

```bash
cd sdr-console
npm install
```

### Create Your Local Configuration

Create a file called `.env.local` in the project folder:

```bash
# Your Railway deployment URL (ask your manager if different)
RENDER_URL=https://web-production-554d8.up.railway.app

# API key for relayer authentication (get from your manager)
RELAYER_API_KEY=your-shared-relayer-api-key-here

# How often to check for new messages (2 seconds = very responsive)
POLL_INTERVAL_MS=2000

# Your unique employee ID (IMPORTANT: Must match your account)
EMPLOYEE_ID=your_employee_id_here

# Your Anthropic API key (for response capture feature)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**Example `.env.local` file:**

```bash
RENDER_URL=https://web-production-554d8.up.railway.app
RELAYER_API_KEY=898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043
POLL_INTERVAL_MS=2000
EMPLOYEE_ID=sarah
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

---

## Step 3: Grant macOS Permissions

The relayer needs permission to control Telegram Desktop.

### Enable Accessibility Permissions

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** → **Privacy** → **Accessibility**
3. Click the **lock icon** 🔒 to make changes (enter your Mac password)
4. Click the **+** button
5. Navigate to **Applications** → **Utilities** → **Terminal**
6. Select **Terminal** and click **Open**
7. Make sure the checkbox next to **Terminal** is **enabled** ✅

**Alternative**: If you use a different terminal app (iTerm, Warp, etc.), add that app instead.

**Why?** This allows the automation to paste messages into Telegram and press Enter.

---

## Step 4: Start the Relayer

### First Time Setup

```bash
# Make sure you're in the sdr-console directory
cd ~/Downloads/sdr-console

# Start the relayer
npm run relayer
```

### What You Should See

```
🚀 Starting Relayer Client for Railway...
✅ Platform check: macOS detected
✅ Connected to server: https://web-production-554d8.up.railway.app
👤 Employee: sarah
🔄 Polling every 2000ms for drafts...
⏳ Idle - waiting for approved drafts...
```

**Keep this terminal window open** while you're sending messages!

### Troubleshooting

**Error: "EMPLOYEE_ID not set"**
- Check your `.env.local` file includes `EMPLOYEE_ID=your_name`

**Error: "Cannot reach server"**
- Check `RENDER_URL` is correct
- Ask your manager if the Railway deployment is running

**Error: "HTTP 401: Unauthorized"**
- Check `RELAYER_API_KEY` matches the shared key

---

## Step 5: Login to the Web Interface

1. Open your browser to: **https://web-production-554d8.up.railway.app**
2. Login with your employee username and password
3. You'll see the main dashboard with:
   - 📋 **Targets** - Companies to prospect
   - 👥 **Contacts** - People to reach out to
   - ✉️ **Send Queue** - Drafted messages ready to send

---

## Step 6: Send Your First Message

### Quick Test

1. Go to **Send Queue** (or Drafts page)
2. Find a draft message with status **"pending"** or **"queued"**
3. Click the **"Approve"** button
4. Watch your terminal - the relayer will:
   - 🔄 Detect the approved draft (within 2 seconds)
   - 📱 Open Telegram Desktop to the contact's chat
   - ✍️ Paste and send the message
   - ✅ Mark the draft as "sent"

### What Success Looks Like

**In your terminal:**
```
🔄 Processing draft abc123 for John Doe (@johndoe)
📱 Opened Telegram chat with @johndoe
📤 Sending 3 paragraph(s) as separate messages
  → Sending paragraph 1/3
  → Sending paragraph 2/3
  → Sending paragraph 3/3
✅ All 3 message(s) sent to John Doe
✅ Successfully prepared draft abc123
```

**In Telegram Desktop:**
- The chat with the contact opens automatically
- Your message(s) are sent
- You can see them in the conversation

**In the web UI:**
- The draft status changes to **"sent"** or **"prepared"**
- It moves from the Send Queue to Sent Messages

---

## Daily Workflow

### Morning Setup (5 minutes)

1. Open **Telegram Desktop** and make sure you're logged in
2. Open **Terminal** and navigate to the project:
   ```bash
   cd ~/Downloads/sdr-console
   npm run relayer
   ```
3. Keep this terminal window open all day
4. Open the **web interface** in your browser

### Throughout the Day

1. **Review drafts** in the Send Queue
2. **Edit messages** if needed (regenerate, customize, etc.)
3. **Approve drafts** you want to send
4. **Watch the relayer** automatically send them via Telegram
5. **Check responses** in Telegram Desktop

### End of Day

- Press **Ctrl+C** in the terminal to stop the relayer
- You can close Telegram Desktop
- Your progress is saved - pick up where you left off tomorrow!

---

## Tips & Best Practices

### Performance
- **Keep the relayer running** while actively sending messages
- The relayer checks every 2 seconds for new approved drafts
- Each message takes ~1.5 seconds per paragraph to send

### Message Quality
- **Review AI-generated messages** before approving
- Use the **"Regenerate"** button if the message isn't quite right
- **Edit messages** directly in the web UI if needed

### Telegram Best Practices
- **Don't spam** - Telegram will rate-limit you
- **Personalize messages** - The AI does this, but review them
- **Check for responses** - The system can capture responses automatically

### Multi-Paragraph Messages
- Messages are split by blank lines
- Each paragraph sends as a separate Telegram message
- This looks more natural and conversational

---

## Troubleshooting

### Messages Aren't Sending

**Check 1**: Is the relayer running?
```bash
# Should see "⏳ Idle - waiting for approved drafts..." or processing messages
```

**Check 2**: Is Telegram Desktop open and logged in?
```bash
# Open Telegram Desktop manually to verify
```

**Check 3**: Did you approve the draft in the web UI?
```bash
# Check the Send Queue - status should be "approved"
```

**Check 4**: Does the contact have a valid Telegram handle?
```bash
# Contact must have a @username in their profile
```

### Telegram Opens But Nothing Happens

**Issue**: Telegram opens the chat but the message doesn't paste

**Solution**: Grant Accessibility permissions (see Step 3)

1. Go to System Settings → Privacy & Security → Accessibility
2. Make sure Terminal (or your terminal app) is in the list
3. Make sure it's **enabled** ✅
4. **Restart the relayer** after granting permissions

### Relayer Can't Connect

**Error**: "Cannot reach server"

**Solutions**:
1. Check your internet connection
2. Verify `RENDER_URL` in `.env.local` is correct
3. Ask your manager if the Railway server is down
4. Test the server: `curl https://web-production-554d8.up.railway.app/api/health`

### Wrong Employee ID

**Error**: "Drafts showing up for someone else"

**Solution**: Check your `.env.local` file:
```bash
# Make sure EMPLOYEE_ID matches your account
EMPLOYEE_ID=your_name_here
```

### Auto-Send Not Working

**Check your settings**:
- Auto-send is controlled per-employee in the database
- Ask your manager to enable auto-send for your account if needed

---

## Advanced Features

### X/Twitter Authentication

Some workflows require X/Twitter access for discovering contacts:

1. Go to **Settings** → **X Authentication** in the web UI
2. Click **"Authenticate with X"**
3. The relayer will open a browser window
4. **Manually login to X/Twitter**
5. The relayer captures your session and uploads it to Railway
6. Now X discovery workflows will work!

### Response Capture

The relayer can automatically capture responses from Telegram:

1. When a contact replies, you'll see a notification
2. The relayer can take a screenshot and extract the response using AI
3. Responses are saved to the database for follow-up tracking

This feature is still in beta - ask your manager for details.

---

## Getting Help

### Common Questions

**Q: Can I use Telegram Web instead of Desktop?**
A: No, the automation requires the macOS Desktop app.

**Q: Can I run the relayer on Windows or Linux?**
A: No, it requires macOS for AppleScript automation.

**Q: What if I close my laptop?**
A: The relayer will stop. Restart it when you open your laptop again.

**Q: Can multiple SDRs share one Mac?**
A: No, each SDR should have their own Mac with their own relayer.

**Q: What happens if the relayer crashes?**
A: Just restart it with `npm run relayer` - it will pick up where it left off.

### Contact Support

If you're stuck:

1. **Check the logs**: `tail -f relayer.log` in the project folder
2. **Ask your manager**: They can check the Railway server logs
3. **Restart everything**: Stop relayer (Ctrl+C), restart Telegram Desktop, run `npm run relayer` again

---

## Summary Checklist

By the end of this setup, you should have:

- [ ] Relayer installed and running on your Mac
- [ ] `.env.local` file configured with your credentials
- [ ] macOS Accessibility permissions granted
- [ ] Telegram Desktop installed and logged in
- [ ] Successfully sent at least one test message
- [ ] Web UI open and logged in to your account

**You're ready to start automating your outreach!** 🚀

---

## Quick Reference Card

### Start Relayer
```bash
cd ~/Downloads/sdr-console
npm run relayer
```

### Stop Relayer
Press **Ctrl+C** in the terminal

### Check Logs
```bash
tail -f relayer.log
```

### Web Interface
https://web-production-554d8.up.railway.app

### Required Apps
- ✅ Telegram Desktop (always running)
- ✅ Terminal (relayer running)
- ✅ Web browser (for the UI)

### Support
- 📧 Your SDR manager
- 📖 [TEST_TELEGRAM_AUTOMATION.md](TEST_TELEGRAM_AUTOMATION.md) - Detailed testing guide
- 📖 [RAILWAY_SETUP.md](RAILWAY_SETUP.md) - Technical setup details

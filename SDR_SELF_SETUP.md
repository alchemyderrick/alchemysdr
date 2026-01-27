# Self-Service Setup for Alchemy SDRs

**Welcome!** This guide will help you set up Telegram automation on your Mac in about 15 minutes.

---

## What You're Setting Up

You'll install a small program (called the "relayer") on your Mac that:
- 🔄 Checks the Alchemy server every 2 seconds for messages you approved
- 📱 Opens Telegram Desktop automatically
- ✍️ Sends your approved messages
- ✅ Updates the status on the server

**The relayer runs on YOUR Mac** because Telegram automation requires macOS.

---

## What You Need

Before starting, make sure you have:

- ✅ **Mac computer** (any macOS 10.14 or newer)
- ✅ **Telegram Desktop** ([download here](https://desktop.telegram.org/))
  - Install it and login with your Telegram account
- ✅ **Node.js 20+** ([download here](https://nodejs.org/))
  - Click "Download" and install the LTS version
- ✅ **Your credentials** (from your manager):
  - Employee ID (e.g., "sarah")
  - Relayer API key
  - Anthropic API key
  - Web UI login (username/password)

---

## Step 1: Download the Relayer Package

Your manager should have sent you a file called **`relayer-package.tar.gz`**.

Save it to your Downloads folder.

---

## Step 2: Extract and Install

Open **Terminal** (it's in Applications → Utilities):

```bash
# Go to Downloads
cd ~/Downloads

# Extract the package
tar -xzf relayer-package.tar.gz

# Go into the folder
cd relayer-package

# Install dependencies (takes 1-2 minutes)
npm install
```

You should see it download and install packages. This is normal!

---

## Step 3: Configure Your Credentials

Still in Terminal:

```bash
# Copy the template
cp .env.local.template .env.local

# Open it in TextEdit
open -a TextEdit .env.local
```

Now fill in these values (get them from your manager):

```bash
# 1. Server URL (should already be correct)
RENDER_URL=https://sdr-console-production.up.railway.app

# 2. Relayer API Key (from your manager)
RELAYER_API_KEY=paste-the-key-here

# 3. Your Employee ID (from your manager - usually your first name)
EMPLOYEE_ID=your_name_here

# 4. Anthropic API Key (from your manager)
ANTHROPIC_API_KEY=sk-ant-api03-paste-key-here

# 5. Polling interval (leave as-is)
POLL_INTERVAL_MS=2000
```

**Save the file** (Cmd+S) and close TextEdit.

---

## Step 4: Grant macOS Permissions

The relayer needs permission to control Telegram.

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** → **Privacy** → **Accessibility**
3. Click the **lock icon** 🔒 at the bottom (enter your Mac password)
4. Click the **+** button
5. Navigate to: **Applications → Utilities → Terminal**
6. Select Terminal and click **Open**
7. Make sure the checkbox next to Terminal is **enabled** ✅

**Why?** This lets the relayer paste messages into Telegram and press Enter to send them.

---

## Step 5: Start the Relayer

Back in Terminal:

```bash
npm run relayer
```

You should see:

```
🚀 Starting Relayer Client for Railway...
✅ Platform check: macOS detected
✅ Connected to server: https://sdr-console-production.up.railway.app
👤 Employee: your_name
🔄 Polling every 2000ms for drafts...
⏳ Idle - waiting for approved drafts...
```

**🎉 Success!** Your relayer is running.

**Keep this Terminal window open** while you're working.

---

## Step 6: Test It!

1. Open your web browser and go to:
   **https://sdr-console-production.up.railway.app**

2. Login with your username and password (from your manager)

3. Go to the **"Send Queue"** page

4. Find a draft message and click **"Approve"**

5. Watch your Terminal window - within 2 seconds you should see:
   ```
   🔄 Processing draft abc123 for John Doe (@johndoe)
   📱 Opened Telegram chat with @johndoe
   📤 Sending message...
   ✅ Message sent!
   ```

6. Check **Telegram Desktop** - the message should be sent!

**If it worked, you're all set!** 🚀

---

## Daily Usage

### Every Morning

1. Open **Telegram Desktop** (make sure you're logged in)
2. Open **Terminal** and run:
   ```bash
   cd ~/Downloads/relayer-package
   npm run relayer
   ```
3. Keep this Terminal window open all day
4. Go to the web UI and start approving messages!

### Throughout the Day

- Review and approve drafts in the web UI
- The relayer automatically sends them via Telegram
- Check Telegram for responses from your contacts

### End of Day

- Press **Ctrl+C** in the Terminal window to stop the relayer
- You can close Telegram Desktop
- Your progress is saved automatically!

---

## Troubleshooting

### "EMPLOYEE_ID not set"

**Problem**: You didn't configure `.env.local` correctly

**Fix**:
```bash
cd ~/Downloads/relayer-package
open -a TextEdit .env.local
# Make sure EMPLOYEE_ID=your_name is filled in
# Save and try again
```

### "Cannot reach server"

**Problem**: Can't connect to Railway

**Fix**:
1. Check your internet connection
2. Make sure `RENDER_URL` in `.env.local` is correct
3. Try opening https://sdr-console-production.up.railway.app in your browser
4. If it doesn't load, contact your manager

### "Invalid API key"

**Problem**: Wrong `RELAYER_API_KEY`

**Fix**:
1. Double-check the API key from your manager
2. Make sure you copied it exactly (no extra spaces)
3. Update `.env.local` and try again

### "Telegram opens but nothing happens"

**Problem**: macOS permissions not granted

**Fix**:
1. Go back to Step 4 and grant Accessibility permissions
2. Make sure Terminal is in the list and **enabled** ✅
3. **Restart the relayer**: Press Ctrl+C, then run `npm run relayer` again

### "No drafts processing"

**Check**:
1. Did you approve drafts in the web UI?
2. Is your `EMPLOYEE_ID` correct in `.env.local`?
3. Does the contact have a valid Telegram handle (@username)?
4. Is Telegram Desktop open and logged in?

### "Message failed to send"

**Common causes**:
- Contact's Telegram handle is wrong or doesn't exist
- Telegram Desktop crashed or logged out
- Network connection issues

**Fix**: Check Telegram Desktop is working, then re-approve the draft in the web UI

---

## Advanced Tips

### Run Relayer in Background

If you want the relayer to keep running even when you close Terminal:

```bash
# Install pm2 (process manager)
npm install -g pm2

# Start relayer with pm2
pm2 start npm --name "relayer" -- run relayer

# Stop it
pm2 stop relayer

# Check status
pm2 status
```

### Check Logs

If something goes wrong, check the logs:

```bash
tail -f relayer.log
```

This shows all relayer activity and errors.

### Update Your Relayer

If your manager sends you an updated package:

```bash
cd ~/Downloads
tar -xzf relayer-package-new.tar.gz
cd relayer-package
npm install
# Copy your old .env.local to the new folder
cp ../relayer-package-old/.env.local .
npm run relayer
```

---

## Getting Help

### Self-Service Troubleshooting

1. Check this guide's Troubleshooting section
2. Read the logs: `tail -f relayer.log`
3. Try restarting everything:
   - Stop relayer (Ctrl+C)
   - Quit and reopen Telegram Desktop
   - Run `npm run relayer` again

### Contact Your Manager

If you're still stuck:
1. Take a screenshot of the Terminal error
2. Check your `.env.local` file (hide the API keys in the screenshot!)
3. Send both to your manager with a description of the problem

---

## Quick Reference

### Start Relayer
```bash
cd ~/Downloads/relayer-package
npm run relayer
```

### Stop Relayer
Press **Ctrl+C**

### Web UI
https://sdr-console-production.up.railway.app

### Required Apps Running
- ✅ Telegram Desktop (logged in)
- ✅ Terminal (relayer running)
- ✅ Web browser (for the UI)

### Config File Location
`~/Downloads/relayer-package/.env.local`

---

## Success Checklist

Before you finish setup, make sure:

- [ ] Node.js 20+ is installed (`node --version`)
- [ ] Telegram Desktop is installed and logged in
- [ ] Relayer package is extracted to `~/Downloads/relayer-package`
- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env.local` file created and filled in with your credentials
- [ ] macOS Accessibility permissions granted to Terminal
- [ ] Relayer starts successfully (`npm run relayer` works)
- [ ] You can login to https://sdr-console-production.up.railway.app
- [ ] You successfully sent at least one test message

**All checked?** You're ready to start automating your outreach! 🎉

---

## What's Next?

Now that your relayer is set up:

1. **Learn the web UI**: Explore the Send Queue, Contacts, and Targets pages
2. **Create contacts**: Add people you want to reach out to
3. **Generate drafts**: Use the AI to create personalized messages
4. **Approve and send**: Watch the automation in action!
5. **Track responses**: Check Telegram for replies and follow up

**Questions?** Ask your manager or check the other documentation files that came with your relayer package.

**Happy selling!** 🚀

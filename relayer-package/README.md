# SDR Console Relayer Client

Telegram automation client for the SDR Console multi-employee system.

## What This Does

This relayer client runs on your Mac and automatically:
1. Polls the Railway server for approved messages
2. Opens Telegram Desktop to the contact
3. Pastes and sends the message
4. Reports success back to the server

## Prerequisites

### 1. Install Node.js

Download and install Node.js v20+ from [nodejs.org](https://nodejs.org/)

To verify installation:
```bash
node --version  # Should show v20 or higher
```

### 2. Install Telegram Desktop

If you don't have it already, download from [telegram.org](https://telegram.org/)

## Setup Instructions

### Step 1: Extract and Navigate

```bash
# Extract the relayer-package.zip file
# Then navigate to the directory
cd ~/sdr-relayer  # or wherever you extracted it
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Your Settings

```bash
# Copy the template
cp .env.template .env

# Edit the .env file
nano .env  # or use any text editor
```

Update these values in `.env`:

```env
# Your unique employee ID (provided by admin)
EMPLOYEE_ID=your_name

# Server URL (same for everyone - provided by admin)
RENDER_URL=https://sdr-console-production.up.railway.app

# API key (same for everyone - provided by admin)
RELAYER_API_KEY=your_api_key_here
```

**IMPORTANT:** Your `EMPLOYEE_ID` must match the username your admin created for you.

### Step 4: Enable macOS Accessibility Permissions

The relayer needs permission to control Telegram:

1. Open **System Settings** (or System Preferences on older macOS)
2. Go to **Privacy & Security** → **Privacy** → **Accessibility**
3. Click the **lock icon** at the bottom to make changes
4. Add **Terminal** (or iTerm, or whichever terminal app you use)
5. **Enable the checkbox** next to it

More help: [Apple Support - Accessibility](https://support.apple.com/guide/mac-help/allow-accessibility-apps-mh43185)

### Step 5: Start the Relayer

```bash
npm start
```

You should see:
```
============================================================
🚀 SDR Console Relayer Client
============================================================
👤 Employee: your_name
📡 Server: https://sdr-console-production.up.railway.app
🔑 API Key: Configured
⏱️  Poll Interval: 10s
============================================================

✅ Relayer started. Polling for approved drafts...
   Press Ctrl+C to stop.
```

## How It Works

1. The relayer polls the server every 10 seconds for approved messages
2. When a message is found:
   - It copies the message to your clipboard
   - Opens Telegram Desktop to the contact's chat
   - Pastes the message and sends it
   - Reports success to the server
3. The message is marked as "sent" in your SDR Console

## Troubleshooting

### "EMPLOYEE_ID not set in .env file"
- Make sure you copied `.env.template` to `.env`
- Make sure you edited `.env` and set your employee ID

### "Invalid EMPLOYEE_ID format"
- Employee ID can only contain letters, numbers, underscores, and dashes
- No spaces or special characters

### "Relayer must run on macOS"
- This tool only works on Mac due to Telegram automation
- Contact your admin if you need Windows/Linux support

### "Authentication failed" or "Invalid API key"
- Check that your `RELAYER_API_KEY` in `.env` matches what admin provided
- Make sure there are no extra spaces or quotes around the key

### Telegram doesn't open or message doesn't send
- Verify Accessibility permissions (Step 4 above)
- Make sure Telegram Desktop is installed (not just mobile app)
- Try quitting and reopening Telegram Desktop

### "No Telegram handle for contact"
- Some contacts may not have Telegram handles
- These will be skipped automatically
- Check the contact in your SDR Console web UI

## Running in the Background

### Option 1: Keep Terminal Window Open
Just leave the terminal window running

### Option 2: Use nohup (runs in background)
```bash
nohup npm start > relayer.log 2>&1 &
```

To stop it later:
```bash
ps aux | grep relayer-client
kill <process_id>
```

### Option 3: Create a Launch Agent (auto-start on login)

Create `~/Library/LaunchAgents/com.sdr-relayer.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sdr-relayer</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/YOUR_USERNAME/sdr-relayer/relayer-client.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/YOUR_USERNAME/sdr-relayer</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/YOUR_USERNAME/sdr-relayer/relayer.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/YOUR_USERNAME/sdr-relayer/relayer-error.log</string>
</dict>
</plist>
```

Replace `YOUR_USERNAME` with your Mac username, then:

```bash
launchctl load ~/Library/LaunchAgents/com.sdr-relayer.plist
launchctl start com.sdr-relayer
```

## Logs

Logs are written to `relayer.log` in the same directory.

To view logs:
```bash
tail -f relayer.log
```

## Getting Help

Contact your admin or check the main SDR Console documentation.

## Security Notes

- Never share your `.env` file - it contains your API key
- The API key is shared among all employees but still should be kept private
- Your employee ID identifies which messages are yours

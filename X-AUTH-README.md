# X/Twitter Authentication for SDR Console

This guide helps you authenticate your X/Twitter account to use the X discovery features in the SDR Console.

## Prerequisites

- Node.js installed (v18 or higher)
- Your SDR Console username and password
- An X/Twitter account

## Quick Start

### Step 1: Download the Script

Download `authenticate-x.js` to your computer.

### Step 2: Install Dependencies

Open Terminal and navigate to the folder containing the script:

```bash
cd /path/to/folder/with/script
npm install puppeteer
```

### Step 3: Run the Script

```bash
node authenticate-x.js
```

### Step 4: Follow the Prompts

The script will:
1. Ask for your SDR Console username and password
2. Open a Chrome browser window
3. Navigate to X/Twitter login page
4. Wait for you to log in
5. Capture your authentication cookies
6. Upload them securely to your employee account

### Step 5: Verify

1. Go to https://web-production-554d8.up.railway.app
2. Look at the sidebar (bottom)
3. You should see "X Authenticated ✓"

## Troubleshooting

### "Puppeteer not found"
Run: `npm install puppeteer`

### "Login failed"
Check your SDR Console username and password are correct.

### "Browser doesn't open"
Make sure Chrome is installed. Puppeteer will download Chromium automatically if needed.

### "Authentication Failed"
- Make sure you fully logged into X (not just on the login screen)
- Wait for the X home page to load before pressing Enter
- Try running the script again

## How Often Do I Need to Do This?

Only once! Your X authentication cookies are saved to your employee account.

You may need to re-authenticate if:
- X logs you out (usually after 30-60 days)
- You see "Failed to discover X users" errors in the console

## Security

- Your X password is never stored (only authentication cookies)
- Cookies are stored securely in your employee database
- Each employee has their own X account credentials

## Need Help?

Contact your SDR Console administrator or check the main documentation.

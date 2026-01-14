================================================================================
                         SDR CONSOLE - SETUP GUIDE
================================================================================

This guide will help you set up the SDR Console on your Mac computer.
No coding experience required - just follow each step carefully.

--------------------------------------------------------------------------------
WHAT YOU'LL NEED
--------------------------------------------------------------------------------

1. A Mac computer (this app uses Mac-specific features for Telegram automation)
2. An internet connection
3. About 30 minutes for the initial setup

--------------------------------------------------------------------------------
STEP 1: INSTALL HOMEBREW (Package Manager)
--------------------------------------------------------------------------------

Homebrew is a tool that helps install other programs on your Mac.

1. Open the "Terminal" app on your Mac:
   - Press Command + Space to open Spotlight
   - Type "Terminal" and press Enter

2. Copy and paste this entire command into Terminal, then press Enter:

   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

3. Follow the prompts (you may need to enter your Mac password)

4. When it's done, it will show some commands to run. Copy and run those
   commands (they add Homebrew to your system path).

--------------------------------------------------------------------------------
STEP 2: INSTALL NODE.JS
--------------------------------------------------------------------------------

Node.js is what runs the application.

1. In Terminal, run this command:

   brew install node

2. Verify it installed correctly by running:

   node --version

   You should see a version number like "v20.x.x" or similar.

--------------------------------------------------------------------------------
STEP 3: INSTALL TELEGRAM DESKTOP
--------------------------------------------------------------------------------

The app automates Telegram, so you need the desktop app installed.

1. Download Telegram Desktop from: https://desktop.telegram.org/
2. Install it by dragging to your Applications folder
3. Open Telegram and log in to your account
4. IMPORTANT: Keep Telegram running in the background while using SDR Console

--------------------------------------------------------------------------------
STEP 4: CONFIGURE MAC PRIVACY & SECURITY SETTINGS
--------------------------------------------------------------------------------

The SDR Console uses automation features that require special permissions on Mac.
You MUST enable these settings or the app won't work properly.

1. Open System Settings (click Apple menu > System Settings)

2. Click "Privacy & Security" in the left sidebar

3. Enable ACCESSIBILITY permissions:
   - Scroll down and click "Accessibility"
   - Click the "+" button at the bottom
   - Navigate to Applications > Utilities > Terminal
   - Add Terminal to the list and make sure it's toggled ON
   - If you use a different terminal (like iTerm), add that instead

4. Enable SCREEN RECORDING permissions (required for response capture):
   - Go back to Privacy & Security
   - Click "Screen Recording"
   - Click the "+" button
   - Add Terminal (or your terminal app)
   - Toggle it ON
   - You may need to restart Terminal after enabling this

5. Enable AUTOMATION permissions:
   - Go back to Privacy & Security
   - Click "Automation"
   - Find Terminal in the list
   - Make sure "Telegram" is toggled ON under Terminal
   - (This may appear automatically after first use)

6. Enable FULL DISK ACCESS (optional, but recommended):
   - Go back to Privacy & Security
   - Click "Full Disk Access"
   - Add Terminal if you want the app to access files anywhere

IMPORTANT NOTES:
- If a permission window pops up while using the app, always click "Allow"
- You may need to restart Terminal after changing these settings
- On newer macOS versions, go to: Apple menu > System Settings > Privacy & Security
- On older macOS versions, go to: Apple menu > System Preferences > Security & Privacy > Privacy

--------------------------------------------------------------------------------
STEP 5: GET YOUR API KEYS
--------------------------------------------------------------------------------

You need an API key from Anthropic (the company that makes Claude AI).

1. Go to: https://console.anthropic.com/
2. Create an account or log in
3. Go to "API Keys" in the dashboard
4. Click "Create Key"
5. Copy the key and save it somewhere safe (you'll need it in the next step)

Optional (for company research features):
- Apollo.io API key: https://app.apollo.io/ (for contact discovery)

--------------------------------------------------------------------------------
STEP 6: SET UP THE APPLICATION
--------------------------------------------------------------------------------

1. Open Terminal and navigate to the sdr-console folder:

   cd /path/to/sdr-console

   (Replace "/path/to/sdr-console" with the actual path where you saved the folder.
   For example: cd ~/Downloads/sdr-console)

2. Create a file called ".env.local" with your API keys:

   In Terminal, run:

   nano .env.local

   Then type the following (replace YOUR_KEY_HERE with your actual API key):

   ANTHROPIC_API_KEY=YOUR_KEY_HERE

   To save and exit nano:
   - Press Control + X
   - Press Y to confirm
   - Press Enter

3. Install the backend dependencies:

   npm install

4. Navigate to the frontend folder and install its dependencies:

   cd frontend
   npm install
   cd ..

--------------------------------------------------------------------------------
STEP 7: START THE APPLICATION
--------------------------------------------------------------------------------

We've included a simple start script that runs everything with one command!

1. Open Terminal
2. Navigate to the sdr-console folder:

   cd /path/to/sdr-console

   (Replace "/path/to/sdr-console" with the actual path, e.g., cd ~/Downloads/sdr-console)

3. Run the start script:

   ./start.sh

4. You should see:
   - "Starting backend server..."
   - "Starting frontend server..."
   - "SDR Console is running!"
   - "Open your browser to: http://localhost:3001"

5. Open your web browser (Safari, Chrome, etc.) and go to:

   http://localhost:3001

6. To stop the application, press Control + C in the Terminal window

--------------------------------------------------------------------------------
DAILY USAGE
--------------------------------------------------------------------------------

Every time you want to use the SDR Console:

1. Make sure Telegram Desktop is running and logged in
2. Open Terminal
3. Navigate to the sdr-console folder and run the start script:

   cd /path/to/sdr-console && ./start.sh

4. Open http://localhost:3001 in your browser

To stop the application:
- Press Control + C in the Terminal window

--------------------------------------------------------------------------------
TROUBLESHOOTING
--------------------------------------------------------------------------------

PROBLEM: "command not found: node"
SOLUTION: Make sure Node.js is installed (Step 2). Try closing and reopening Terminal.

PROBLEM: "ANTHROPIC_API_KEY is not set"
SOLUTION: Make sure you created the .env.local file with your API key (Step 5).

PROBLEM: Page won't load or shows infinite loading
SOLUTION:
1. Stop both servers (Control + C in both Terminal windows)
2. In the frontend folder, delete the .next folder:
   rm -rf /path/to/sdr-console/frontend/.next
3. Restart both servers

PROBLEM: Telegram automation isn't working
SOLUTION:
1. Make sure Telegram Desktop is running (not just the web version)
2. Make sure you're logged in to Telegram
3. Make sure ALL privacy permissions are enabled (see Step 4):
   - Accessibility: Terminal must be added and toggled ON
   - Automation: Telegram must be toggled ON under Terminal
4. Restart Terminal after enabling permissions

PROBLEM: "Responded" button says "Failed to capture response"
SOLUTION:
1. Enable Screen Recording permission for Terminal (see Step 4)
2. Restart Terminal after enabling the permission
3. Make sure Telegram is open and the chat is visible

PROBLEM: "Port 3000 is in use"
SOLUTION: Another program is using that port. Either close it, or stop any
running node processes:
   pkill -f "node server.js"

--------------------------------------------------------------------------------
FEATURES OVERVIEW
--------------------------------------------------------------------------------

HOME PAGE:
- See stats on your outreach campaigns
- View companies that need follow-up

FOLLOW-UPS TAB:
- See messages you've sent
- Send follow-ups to contacts
- Use "Responded" button to capture Telegram responses automatically

RESEARCH TEAMS TAB:
- Research new Web3 companies to reach out to
- Import teams manually

ACTIVE OUTREACH TAB:
- View contacts you're actively reaching out to
- Generate and send personalized messages

TARGET TEAMS TAB:
- View approved teams for future outreach

--------------------------------------------------------------------------------
NEED HELP?
--------------------------------------------------------------------------------

If you run into issues:
1. Make sure all steps were followed in order
2. Try restarting the application (stop and start both servers)
3. Check that your API keys are correct

================================================================================

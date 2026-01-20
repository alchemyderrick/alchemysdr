import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class PuppeteerManager {
  constructor() {
    this.browser = null;
    this.activeTabs = 0;
    this.maxTabs = 10;
    this.operationCount = 0;
    this.maxOperationsBeforeRestart = 50;
  }

  /**
   * Remove browser lock files that prevent new instances from starting
   */
  removeBrowserLock() {
    const userDataDir = process.env.PUPPETEER_USER_DATA_DIR || "./puppeteer-data";
    const lockFile = path.join(userDataDir, "SingletonLock");

    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log("[PUPPETEER] Removed stale browser lock file");
      }
    } catch (error) {
      console.log(`[PUPPETEER] Could not remove lock file: ${error.message}`);
    }
  }

  /**
   * Kill any orphaned Chrome processes using the puppeteer-data directory
   */
  async killOrphanedChromeProcesses() {
    if (process.platform !== 'darwin') return; // Only on Mac for now

    try {
      const { execSync } = await import('child_process');
      // Find and kill Chrome for Testing processes using our userDataDir
      execSync('pkill -f "chrome-mac.*Google Chrome for Testing" 2>/dev/null || true');
      console.log("[PUPPETEER] Cleaned up orphaned Chrome processes");
    } catch (error) {
      // Ignore errors - process might not exist
    }
  }

  /**
   * Get or create browser instance
   */
  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[PUPPETEER] Launching browser...");

      // Kill any orphaned Chrome processes first
      await this.killOrphanedChromeProcesses();

      // Remove any stale lock files
      this.removeBrowserLock();

      // Detect environment
      const IS_RENDER = !!process.env.RENDER;
      const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL;
      const IS_PRODUCTION = process.env.NODE_ENV === 'production';
      const IS_MAC = process.platform === 'darwin';
      const IS_CLOUD = IS_RENDER || IS_RAILWAY;

      // Add a small delay on cloud environments to let system settle
      if (IS_CLOUD) {
        console.log("[PUPPETEER] Cloud environment detected, adding startup delay...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Force headless on cloud/production, allow visible on local Mac
      const headless = IS_CLOUD || (IS_PRODUCTION && !IS_MAC) ? true : false;

      // Minimal args for Railway - too many flags can cause crashes
      let launchArgs;
      if (IS_CLOUD) {
        // Railway-optimized args: minimal set to prevent crashes
        launchArgs = [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--disable-background-networking",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-breakpad",
          "--disable-component-extensions-with-background-pages",
          "--disable-features=TranslateUI,BlinkGenPropertyTrees",
          "--disable-ipc-flooding-protection",
          "--disable-renderer-backgrounding",
          "--enable-features=NetworkService,NetworkServiceInProcess",
          "--force-color-profile=srgb",
          "--hide-scrollbars",
          "--metrics-recording-only",
          "--mute-audio",
          "--no-first-run",
        ];
        console.log(`[PUPPETEER] Using Railway-optimized launch arguments (Railway: ${IS_RAILWAY}, Render: ${IS_RENDER})`);
      } else {
        // Local Mac args
        launchArgs = [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--window-size=1920,1080",
          "--disable-blink-features=AutomationControlled",
          "--disable-popup-blocking",
          "--no-first-run",
          "--no-default-browser-check",
          "--disable-features=TranslateUI",
        ];
        console.log(`[PUPPETEER] Running on Mac with visible browser for X authentication`);
      }

      const launchOptions = {
        headless: headless,
        args: launchArgs,
        // Don't activate the browser window on launch
        ignoreDefaultArgs: ["--enable-automation"],
      };

      // On cloud environments, find Chromium executable
      if (IS_CLOUD) {
        const { execSync } = await import('child_process');
        let chromiumPath = null;

        // Try environment variable first
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          const fs = await import('fs');
          if (fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
            chromiumPath = process.env.PUPPETEER_EXECUTABLE_PATH;
            console.log(`[PUPPETEER] Using Chromium from env var: ${chromiumPath}`);
          } else {
            console.warn(`[PUPPETEER] PUPPETEER_EXECUTABLE_PATH points to non-existent file: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
          }
        }

        // If env var didn't work, try to find chromium
        if (!chromiumPath) {
          console.log('[PUPPETEER] PUPPETEER_EXECUTABLE_PATH not set or invalid, searching for Chromium...');

          // Try which chromium
          try {
            chromiumPath = execSync('which chromium 2>/dev/null').toString().trim();
            if (chromiumPath) {
              console.log(`[PUPPETEER] ✅ Found chromium via 'which': ${chromiumPath}`);
              // Verify it's executable
              try {
                execSync(`test -x "${chromiumPath}"`);
              } catch (e) {
                console.warn(`[PUPPETEER] ⚠️ Chromium found but not executable: ${chromiumPath}`);
                chromiumPath = null;
              }
            }
          } catch (e) {
            console.log('[PUPPETEER] ❌ which chromium failed');
          }

          // Try which chromium-browser
          if (!chromiumPath) {
            try {
              chromiumPath = execSync('which chromium-browser 2>/dev/null').toString().trim();
              if (chromiumPath) {
                console.log(`[PUPPETEER] ✅ Found chromium-browser via 'which': ${chromiumPath}`);
                try {
                  execSync(`test -x "${chromiumPath}"`);
                } catch (e) {
                  console.warn(`[PUPPETEER] ⚠️ Chromium found but not executable: ${chromiumPath}`);
                  chromiumPath = null;
                }
              }
            } catch (e) {
              console.log('[PUPPETEER] ❌ which chromium-browser failed');
            }
          }

          // Try finding in Nix store (with timeout to prevent hanging)
          if (!chromiumPath) {
            console.log('[PUPPETEER] Searching /nix/store (this may take a moment)...');
            try {
              chromiumPath = execSync('find /nix/store -maxdepth 3 -name chromium -type f -executable 2>/dev/null | grep -E "bin/chromium$" | head -1', {
                timeout: 10000 // 10 second timeout
              }).toString().trim();
              if (chromiumPath) {
                console.log(`[PUPPETEER] ✅ Found chromium in Nix store: ${chromiumPath}`);
              } else {
                console.log('[PUPPETEER] ❌ No chromium found in /nix/store');
              }
            } catch (e) {
              console.log(`[PUPPETEER] ❌ Nix store search failed: ${e.message}`);
            }
          }

          // Last resort: check common locations
          if (!chromiumPath) {
            console.log('[PUPPETEER] Checking common installation paths...');
            const commonPaths = [
              '/usr/bin/chromium',
              '/usr/bin/chromium-browser',
              '/usr/bin/google-chrome',
              '/usr/bin/google-chrome-stable',
              '/usr/bin/google-chrome-unstable'
            ];

            const fs = await import('fs');
            for (const path of commonPaths) {
              if (fs.existsSync(path)) {
                chromiumPath = path;
                console.log(`[PUPPETEER] ✅ Found Chromium at common path: ${chromiumPath}`);
                break;
              }
            }
          }
        }

        if (chromiumPath) {
          launchOptions.executablePath = chromiumPath;
          console.log(`[PUPPETEER] Will use Chromium at: ${chromiumPath}`);
        } else {
          console.warn('[PUPPETEER] ⚠️ Could not find system Chromium, will try Puppeteer bundled Chromium');
          // Try to provide helpful debug info
          try {
            console.log('[PUPPETEER] Available executables in PATH:');
            console.log(execSync('which -a chromium chromium-browser google-chrome 2>&1 || echo "None found"').toString());
          } catch (e) {
            console.error('[PUPPETEER] Could not get diagnostic info:', e.message);
          }

          // Try to find Puppeteer's bundled Chromium
          console.log('[PUPPETEER] Will let Puppeteer use its default bundled Chromium');
          console.log('[PUPPETEER] Note: This requires Puppeteer to have downloaded Chromium during npm install');
          // Don't set executablePath - let puppeteer use its bundled version
          // If Puppeteer doesn't have Chromium, the launch will fail with a clear error
        }

        // Don't use persistent userDataDir on cloud to avoid profile lock issues
        console.log(`[PUPPETEER] Skipping userDataDir on cloud environment to avoid profile locks`);
      } else {
        // On local Mac, use persistent userDataDir for cookies/state
        launchOptions.userDataDir = process.env.PUPPETEER_USER_DATA_DIR || "./puppeteer-data";
      }

      try {
        console.log(`[PUPPETEER] Attempting to launch browser with options:`, JSON.stringify({
          headless,
          executablePath: launchOptions.executablePath,
          args: launchOptions.args.slice(0, 5), // Show first 5 args
          platform: process.platform
        }));

        this.browser = await puppeteer.launch(launchOptions);
        console.log(`[PUPPETEER] ✅ Browser launched successfully (headless: ${headless}, platform: ${process.platform})`);

        // Verify browser is actually connected
        if (!this.browser.isConnected()) {
          throw new Error('Browser launched but immediately disconnected');
        }

        // Wait a moment to ensure it's stable
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!this.browser.isConnected()) {
          throw new Error('Browser disconnected shortly after launch');
        }

        console.log(`[PUPPETEER] ✅ Browser connection verified`);
      } catch (error) {
        console.error("[PUPPETEER] ❌ Failed to launch browser:", error.message);
        console.error("[PUPPETEER] Full error:", error);

        // Log more diagnostic info on cloud
        if (IS_CLOUD) {
          console.error("[PUPPETEER] Cloud environment diagnostic info:");
          console.error("  - RAILWAY_ENVIRONMENT:", !!process.env.RAILWAY_ENVIRONMENT);
          console.error("  - RAILWAY_STATIC_URL:", !!process.env.RAILWAY_STATIC_URL);
          console.error("  - executablePath:", launchOptions.executablePath);
          console.error("  - Platform:", process.platform);
          console.error("  - Node version:", process.version);
        }

        // If launch failed due to profile lock, try one more time after cleanup
        if (error.message.includes("existing browser session") || error.message.includes("profile")) {
          console.log("[PUPPETEER] Retrying after more aggressive cleanup...");
          await this.killOrphanedChromeProcesses();
          this.removeBrowserLock();

          // Wait a bit for processes to fully die
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            this.browser = await puppeteer.launch(launchOptions);
            console.log(`[PUPPETEER] ✅ Browser launched on retry (headless: ${headless}, platform: ${process.platform})`);
          } catch (retryError) {
            console.error("[PUPPETEER] ❌ Failed to launch browser after retry:", retryError.message);
            throw new Error(`Failed to launch browser: ${retryError.message}. Try closing all Chrome windows and running again.`);
          }
        } else {
          // Provide more helpful error message for cloud environments
          if (IS_CLOUD) {
            throw new Error(`Browser failed to launch on Railway: ${error.message}. Check Railway logs for details. This may indicate Chromium is not properly installed.`);
          }
          throw error;
        }
      }

      // Setup cleanup on browser disconnect
      this.browser.on("disconnected", () => {
        console.log("[PUPPETEER] Browser disconnected");
        this.browser = null;
        this.activeTabs = 0;
      });
    }

    return this.browser;
  }

  /**
   * Create a new page with stealth settings
   */
  async newPage() {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    this.activeTabs++;
    this.operationCount++;

    console.log(`[PUPPETEER] New page created (active tabs: ${this.activeTabs}, operations: ${this.operationCount})`);

    // Check if we need to restart browser
    if (this.operationCount >= this.maxOperationsBeforeRestart) {
      console.log(`[PUPPETEER] Reached ${this.maxOperationsBeforeRestart} operations, will restart browser after cleanup`);
    }

    return page;
  }

  /**
   * Close a page and track tabs
   */
  async closePage(page) {
    if (page && !page.isClosed()) {
      await page.close();
      this.activeTabs = Math.max(0, this.activeTabs - 1);
      console.log(`[PUPPETEER] Page closed (active tabs: ${this.activeTabs})`);
    }
  }

  /**
   * Cleanup and close browser
   */
  async cleanup() {
    if (this.browser) {
      console.log("[PUPPETEER] Closing browser...");
      await this.browser.close();
      this.browser = null;
      this.activeTabs = 0;
      console.log("[PUPPETEER] Browser closed");
    }
  }

  /**
   * Restart browser (for memory management)
   */
  async restart() {
    console.log("[PUPPETEER] Restarting browser...");
    await this.cleanup();
    this.operationCount = 0;
    await this.getBrowser();
    console.log("[PUPPETEER] Browser restarted");
  }

  /**
   * Check if restart is needed
   */
  shouldRestart() {
    return this.operationCount >= this.maxOperationsBeforeRestart;
  }
}

// Singleton instance
const puppeteerManager = new PuppeteerManager();

// Cleanup on process exit
process.on("exit", () => {
  console.log("[PUPPETEER] Process exiting, cleaning up...");
});

process.on("SIGINT", async () => {
  console.log("[PUPPETEER] Received SIGINT, cleaning up...");
  await puppeteerManager.cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[PUPPETEER] Received SIGTERM, cleaning up...");
  await puppeteerManager.cleanup();
  process.exit(0);
});

export default puppeteerManager;

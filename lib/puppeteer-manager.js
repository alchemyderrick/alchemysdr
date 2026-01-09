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
   * Get or create browser instance
   */
  async getBrowser() {
    if (!this.browser || !this.browser.isConnected()) {
      console.log("[PUPPETEER] Launching browser...");

      // Remove any stale lock files
      this.removeBrowserLock();

      // Detect environment
      const IS_RENDER = !!process.env.RENDER;
      const IS_RAILWAY = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL;
      const IS_PRODUCTION = process.env.NODE_ENV === 'production';
      const IS_MAC = process.platform === 'darwin';
      const IS_CLOUD = IS_RENDER || IS_RAILWAY;

      // Force headless on cloud/production, allow visible on local Mac
      const headless = IS_CLOUD || (IS_PRODUCTION && !IS_MAC) ? true : false;

      const launchArgs = [
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

      // Add Linux-specific args for cloud environments
      if (IS_CLOUD || !IS_MAC) {
        launchArgs.push(
          "--disable-gpu",
          "--disable-software-rasterizer",
          "--single-process" // For limited memory environments
        );
        console.log(`[PUPPETEER] Running in cloud/Linux mode with headless (Railway: ${IS_RAILWAY}, Render: ${IS_RENDER})`);
      } else {
        // Mac-specific: position off-screen so it doesn't steal focus
        launchArgs.push("--window-position=9999,9999");
      }

      const launchOptions = {
        headless: headless,
        args: launchArgs,
        // Don't activate the browser window on launch
        ignoreDefaultArgs: ["--enable-automation"],
      };

      // On cloud environments, explicitly set Chrome executable path and skip userDataDir
      if (IS_CLOUD && process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        console.log(`[PUPPETEER] Using Chrome at: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
        // Don't use persistent userDataDir on cloud to avoid profile lock issues
        console.log(`[PUPPETEER] Skipping userDataDir on cloud environment to avoid profile locks`);
      } else {
        // On local Mac, use persistent userDataDir for cookies/state
        launchOptions.userDataDir = process.env.PUPPETEER_USER_DATA_DIR || "./puppeteer-data";
      }

      this.browser = await puppeteer.launch(launchOptions);

      console.log(`[PUPPETEER] Browser launched (headless: ${headless}, platform: ${process.platform})`);

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

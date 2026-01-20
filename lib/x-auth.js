import puppeteerManager from "./puppeteer-manager.js";
import fs from "fs";
import path from "path";

const COOKIES_FILE = "./x-cookies.json";

/**
 * Check if we have valid X authentication cookies
 * @param {Database} db - Optional employee database instance
 */
export async function isAuthenticated(db = null) {
  // Check if we have cookies either in database, env var, or file
  let hasCookies = process.env.X_COOKIES || fs.existsSync(COOKIES_FILE);
  if (db) {
    const config = db.prepare("SELECT value FROM employee_config WHERE key = 'x_cookies'").get();
    hasCookies = hasCookies || !!config;
  }

  if (!hasCookies) {
    return false;
  }

  const page = await puppeteerManager.newPage();

  try {
    // Load cookies (from database, env var, or file)
    await loadAuthCookies(page, db);

    // Check if we can access a protected page
    await page.goto("https://x.com/home", { waitUntil: "networkidle2", timeout: 10000 });

    // If we see the home timeline, we're authenticated
    const isAuth = await page.evaluate(() => {
      return !document.body.textContent.includes("Sign in to X");
    });

    console.log(`[X-AUTH] Authentication status: ${isAuth ? "AUTHENTICATED" : "NOT AUTHENTICATED"}`);
    return isAuth;
  } catch (error) {
    console.log(`[X-AUTH] Auth check failed: ${error.message}`);
    return false;
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Authenticate to X by opening a visible browser for manual login
 * Saves cookies to employee database
 * Only works on Mac - throws error on cloud environments
 * @param {Database} db - The employee's database instance
 */
export async function authenticate(db) {
  // Check if running on cloud (Railway/Render)
  const IS_CLOUD = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL || !!process.env.RENDER;

  if (IS_CLOUD) {
    throw new Error("Manual X authentication not supported on cloud environments. Please set X_COOKIES environment variable with your authenticated cookies.");
  }

  console.log(`[X-AUTH] Starting authentication flow...`);

  // Force headless=false for login by temporarily setting env var
  const originalHeadless = process.env.PUPPETEER_HEADLESS;
  process.env.PUPPETEER_HEADLESS = "false";

  // Restart browser to apply headless=false
  await puppeteerManager.cleanup();

  const page = await puppeteerManager.newPage();

  // Restore original headless setting
  if (originalHeadless !== undefined) {
    process.env.PUPPETEER_HEADLESS = originalHeadless;
  } else {
    delete process.env.PUPPETEER_HEADLESS;
  }

  try {
    // Go to X login page
    await page.goto("https://x.com/login", { waitUntil: "networkidle2", timeout: 30000 });

    console.log("\n🔑 X AUTHENTICATION REQUIRED!");
    console.log("   Please login in the browser window.");
    console.log("   After logging in, the cookies will be saved automatically.\n");

    // Wait for the user to complete login by checking for home page
    let authenticated = false;
    const maxAttempts = 60; // Wait up to 2 minutes

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const currentUrl = page.url();
      const bodyText = await page.evaluate(() => document.body.textContent || "");

      // Check if we're on the home page or if login succeeded
      if (currentUrl.includes("/home") || bodyText.includes("What's happening")) {
        authenticated = true;
        console.log("[X-AUTH] ✅ Login detected!");
        break;
      }
    }

    if (!authenticated) {
      throw new Error("Login timeout - please try again");
    }

    // Save cookies to database (primary) and file (backward compatibility)
    const cookies = await page.cookies();
    const ts = new Date().toISOString();

    // Save to employee database
    db.prepare(`
      INSERT OR REPLACE INTO employee_config (key, value, updated_at)
      VALUES ('x_cookies', ?, ?)
    `).run(JSON.stringify(cookies), ts);
    console.log(`[X-AUTH] ✅ Cookies saved to employee database`);

    // Also save to file for backward compatibility
    try {
      fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
      console.log(`[X-AUTH] ✅ Cookies also saved to ${COOKIES_FILE} for backward compatibility`);
    } catch (err) {
      console.warn(`[X-AUTH] Could not save to file (non-critical): ${err.message}`);
    }

    return true;
  } catch (error) {
    console.error(`[X-AUTH] Authentication failed: ${error.message}`);
    return false;
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Load saved cookies into a page
 * Priority: 1) Employee database, 2) X_COOKIES env var, 3) Local file
 * @param {Page} page - Puppeteer page
 * @param {Database} db - The employee's database instance
 */
export async function loadAuthCookies(page, db) {
  let cookies;
  let source = "unknown";

  // Priority 1: Employee database (per-employee cookies)
  if (db) {
    const config = db.prepare("SELECT value FROM employee_config WHERE key = 'x_cookies'").get();
    if (config) {
      console.log(`[X-AUTH] Loading cookies from employee database`);
      console.log(`[X-AUTH] Cookie data size: ${config.value.length} bytes`);
      try {
        cookies = JSON.parse(config.value);
        source = "employee_database";
        console.log(`[X-AUTH] Successfully parsed ${cookies.length} cookies from database`);
      } catch (error) {
        console.warn(`[X-AUTH] Failed to parse database cookies: ${error.message}`);
      }
    } else {
      console.log(`[X-AUTH] No cookies found in employee database (employee_config table)`);
    }
  } else {
    console.log(`[X-AUTH] No database provided, skipping employee database check`);
  }

  // Priority 2: Environment variable (Railway deployment fallback)
  if (!cookies && process.env.X_COOKIES) {
    console.log(`[X-AUTH] Loading cookies from X_COOKIES environment variable`);
    try {
      cookies = JSON.parse(process.env.X_COOKIES);
      source = "X_COOKIES env var";
    } catch (error) {
      throw new Error(`Failed to parse X_COOKIES environment variable: ${error.message}`);
    }
  }
  // Priority 3: Local file (Mac development fallback)
  else if (!cookies && fs.existsSync(COOKIES_FILE)) {
    console.log(`[X-AUTH] Loading cookies from ${COOKIES_FILE}`);
    cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf8"));
    source = COOKIES_FILE;
  }

  if (!cookies) {
    throw new Error("No authentication cookies found. Please authenticate via X login first.");
  }

  await page.setCookie(...cookies);
  console.log(`[X-AUTH] Loaded ${cookies.length} authentication cookies from ${source}`);
}

/**
 * Ensure we're authenticated before performing X operations
 * If not authenticated, prompt for login (Mac only) or show error (cloud)
 * @param {Database} db - Optional employee database instance
 */
export async function ensureAuthenticated(db = null) {
  const isAuth = await isAuthenticated(db);
  const IS_CLOUD = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL || !!process.env.RENDER;

  if (!isAuth) {
    if (IS_CLOUD) {
      throw new Error("X authentication required. Please use 'Login to X' button in the sidebar to authenticate.");
    }

    console.log("[X-AUTH] Not authenticated. Starting login flow...");
    const success = await authenticate(db);

    if (!success) {
      throw new Error("X authentication failed");
    }
  }

  return true;
}

/**
 * Parse browser cookie string (from document.cookie) into Puppeteer cookie format
 * @param {string} cookieString - Cookie string from document.cookie (e.g., "cookie1=value1; cookie2=value2")
 * @returns {Array} Array of cookie objects in Puppeteer format
 */
export function parseBrowserCookies(cookieString) {
  if (!cookieString || typeof cookieString !== 'string') {
    throw new Error('Invalid cookie string');
  }

  const cookies = [];
  const pairs = cookieString.split('; ');

  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split('=');
    const value = valueParts.join('='); // Handle values with = in them

    if (name && value) {
      cookies.push({
        name: name.trim(),
        value: value.trim(),
        domain: '.x.com', // X.com cookies use .x.com domain
        path: '/',
        httpOnly: false, // document.cookie only shows non-httpOnly cookies
        secure: true,
        sameSite: 'None'
      });
    }
  }

  return cookies;
}

/**
 * Validate that X cookies are functional by testing them
 * @param {Array} cookies - Array of cookie objects
 * @param {Database} db - Optional employee database instance
 * @returns {Promise<boolean>} True if cookies are valid
 */
export async function validateCookies(cookies, db = null) {
  if (!cookies || cookies.length === 0) {
    return false;
  }

  try {
    const page = await puppeteerManager.newPage();

    // Set cookies
    await page.setCookie(...cookies);

    // Try to load X home page
    await page.goto('https://x.com/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Check if we're logged in (not redirected to login page)
    const currentUrl = page.url();
    const isLoggedIn = currentUrl.includes('/home') || currentUrl.includes('/timeline');

    await puppeteerManager.closePage(page);

    return isLoggedIn;
  } catch (error) {
    console.error('[X-AUTH] Cookie validation failed:', error.message);
    return false;
  }
}

export default { isAuthenticated, authenticate, loadAuthCookies, ensureAuthenticated, parseBrowserCookies, validateCookies };

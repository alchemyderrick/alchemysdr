import puppeteerManager from "./puppeteer-manager.js";
import fs from "fs";
import path from "path";

const COOKIES_FILE = "./x-cookies.json";

/**
 * Check if we have valid X authentication cookies
 */
export async function isAuthenticated() {
  if (!fs.existsSync(COOKIES_FILE)) {
    return false;
  }

  const page = await puppeteerManager.newPage();

  try {
    // Load cookies
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf8"));
    await page.setCookie(...cookies);

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
 * Saves cookies for future use
 */
export async function authenticate() {
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

    // Save cookies
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_FILE, JSON.stringify(cookies, null, 2));
    console.log(`[X-AUTH] ✅ Cookies saved to ${COOKIES_FILE}`);

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
 */
export async function loadAuthCookies(page) {
  if (!fs.existsSync(COOKIES_FILE)) {
    throw new Error("No authentication cookies found. Please run authenticate() first.");
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, "utf8"));
  await page.setCookie(...cookies);
  console.log(`[X-AUTH] Loaded ${cookies.length} authentication cookies`);
}

/**
 * Ensure we're authenticated before performing X operations
 * If not authenticated, prompt for login
 */
export async function ensureAuthenticated() {
  const isAuth = await isAuthenticated();

  if (!isAuth) {
    console.log("[X-AUTH] Not authenticated. Starting login flow...");
    const success = await authenticate();

    if (!success) {
      throw new Error("X authentication failed");
    }
  }

  return true;
}

export default { isAuthenticated, authenticate, loadAuthCookies, ensureAuthenticated };

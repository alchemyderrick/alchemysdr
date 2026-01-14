import puppeteerManager from "./puppeteer-manager.js";
import { scrapeCompanyWebsiteForTeam, getCompanyWebsiteFromX } from "./company-scraper.js";
import { ensureAuthenticated, loadAuthCookies } from "./x-auth.js";

/**
 * Random delay to appear more human-like and avoid rate limiting
 * Increased delays to be more conservative
 */
function randomDelay(min = 3000, max = 6000) {
  return new Promise((resolve) => setTimeout(resolve, Math.random() * (max - min) + min));
}

/**
 * Search Google for "person name x" or "company name x" to find X profiles
 * @param {string} companyHandle - Company X handle
 * @param {number} maxUsers - Maximum number of users to return
 * @param {number} offset - Offset to skip existing contacts (default 0)
 * @param {Database} db - Employee database instance for loading cookies
 */
async function searchGoogleForXProfiles(companyHandle, maxUsers = 5, offset = 0, db = null) {
  console.log(`[X-SEARCH] Searching for users associated with @${companyHandle} (offset: ${offset})`);

  // Ensure we're authenticated to X
  // Note: ensureAuthenticated doesn't need db for read-only check
  await ensureAuthenticated();

  const page = await puppeteerManager.newPage();

  try {
    const cleanHandle = companyHandle.replace("@", "").trim();

    // Load authentication cookies (passing db for per-employee cookies)
    await loadAuthCookies(page, db);

    // Strategy: Search X directly using the search page with authentication
    // Simple search for company name/handle - X will show people who mention it in bio
    const searchQuery = `@${cleanHandle}`;
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(searchQuery)}&src=typed_query&f=user`;

    console.log(`[X-SEARCH] Searching X for: ${searchQuery}`);

    try {
      // Use domcontentloaded instead of networkidle2 to avoid hanging
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    } catch (error) {
      console.log(`[X-SEARCH] Navigation timeout, but continuing anyway: ${error.message}`);
    }

    console.log(`[X-SEARCH] Waiting for results to load...`);
    await randomDelay(6000, 8000); // Longer wait for X to fully load

    // Check if page actually loaded and detect error states
    const pageStatus = await page.evaluate(() => {
      const body = document.body;
      const html = body ? body.innerHTML : "";
      const text = body ? body.textContent : "";

      return {
        hasContent: html.length > 1000,
        isLoginPage: text.includes("Sign in to X") || text.includes("Log in to X"),
        isRateLimited: text.includes("Something went wrong") || text.includes("Try again"),
        isLoading: text.trim().length < 100, // Very little text = loading screen
      };
    });

    if (pageStatus.isLoading) {
      console.log(`[X-SEARCH] Page stuck on loading screen. X may be rate limiting or blocking automation.`);
      throw new Error("X page stuck on loading screen - likely rate limited. Please wait 60+ seconds and try again.");
    }

    if (pageStatus.isLoginPage) {
      console.log(`[X-SEARCH] X is showing login page. Authentication cookies may be expired.`);
      throw new Error("X authentication expired - please delete x-cookies.json and run workflow again to re-authenticate.");
    }

    if (pageStatus.isRateLimited) {
      console.log(`[X-SEARCH] X is showing error/rate limit message.`);
      throw new Error("X is rate limiting - please wait a few minutes before trying again.");
    }

    if (!pageStatus.hasContent) {
      console.log(`[X-SEARCH] Page appears blank or not loaded properly.`);
      throw new Error("X page did not load properly - unknown issue");
    }

    // Take a screenshot for debugging
    const timestamp = Date.now();
    await page.screenshot({ path: `/tmp/x-search-${timestamp}.png` });
    console.log(`[X-SEARCH] Screenshot saved to /tmp/x-search-${timestamp}.png`);

    // Get authenticated user's username to exclude from results
    const authenticatedUsername = await page.evaluate(() => {
      try {
        // Try to get username from the navigation bar or profile button
        const profileLink = document.querySelector('a[href*="/"][data-testid="AppTabBar_Profile_Link"]');
        if (profileLink) {
          const href = profileLink.getAttribute('href');
          const match = href?.match(/\/([a-zA-Z0-9_]+)$/);
          if (match) return match[1];
        }

        // Alternative: look for profile image alt text or aria-label
        const profileButton = document.querySelector('[aria-label*="Profile"]');
        if (profileButton) {
          const ariaLabel = profileButton.getAttribute('aria-label');
          // Extract username if format is like "Profile / @username"
          const match = ariaLabel?.match(/@([a-zA-Z0-9_]+)/);
          if (match) return match[1];
        }
      } catch (e) {
        console.log('Could not detect authenticated user:', e.message);
      }
      return null;
    });

    if (authenticatedUsername) {
      console.log(`[X-SEARCH] Detected authenticated user: @${authenticatedUsername} (will be excluded from results)`);
    }

    // Scroll enough to load the first 30-40 profiles (to support offset)
    // But don't scroll too much to avoid losing track of the top results
    console.log(`[X-SEARCH] Scrolling to load first 30-40 profiles...`);
    for (let i = 0; i < 3; i++) {
      try {
        await page.evaluate(() => window.scrollBy(0, 800));
        await randomDelay(1000, 1500);
      } catch (scrollError) {
        console.log(`[X-SEARCH] Scroll error: ${scrollError.message}`);
        break;
      }
    }

    // Scroll back to top to ensure we capture profiles in order
    await page.evaluate(() => window.scrollTo(0, 0));
    await randomDelay(500, 1000);

    // Extract usernames from search results
    const extractionResult = await page.evaluate((companyHandle, authUser) => {
      const usernames = [];
      const debugInfo = [];

      // Look for user profile links in search results
      // X search results have user cells with specific structure
      // Only get the main profile link (avatar or display name), not @mentions in bio
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');

      debugInfo.push(`Found ${userCells.length} UserCell elements`);

      userCells.forEach((cell, index) => {
        // Within each user cell, find the main profile link (usually the avatar or display name link)
        // These typically have role="link" and point to /username
        const profileLink = cell.querySelector('a[role="link"][href^="/"]');

        if (profileLink) {
          const href = profileLink.getAttribute("href");
          if (href) {
            // Match username pattern: /username (but not /username/status/... or other paths)
            const match = href.match(/^\/([a-zA-Z0-9_]+)$/);
            if (match && match[1]) {
              const username = match[1];

              // Filter out generic pages and the company itself
              const excluded = [
                'home', 'explore', 'notifications', 'messages', 'i', 'compose',
                'search', 'settings', 'login', 'signup', 'intent', 'hashtag',
                'tos', 'privacy', 'rules', 'verified', 'premium'
              ];

              const usernameLower = username.toLowerCase();
              const companyLower = companyHandle.toLowerCase();

              // Exclude:
              // 1. Generic pages
              // 2. Exact company handle
              // 3. Company name variants (e.g., CoinbaseSupport, CoinbaseMarkets, etc.)
              const isCompanyAccount = usernameLower.includes(companyLower) ||
                                      usernameLower === companyLower ||
                                      usernameLower.startsWith(companyLower) ||
                                      usernameLower.endsWith(companyLower);

              // Exclude authenticated user's own profile
              const isAuthUser = authUser && usernameLower === authUser.toLowerCase();

              if (!excluded.includes(usernameLower) && !isCompanyAccount && !isAuthUser) {
                debugInfo.push(`Cell ${index}: Found username @${username}`);
                usernames.push(username);
              } else {
                debugInfo.push(`Cell ${index}: Excluded @${username} (company: ${isCompanyAccount}, auth: ${isAuthUser}, generic: ${excluded.includes(usernameLower)})`);
              }
            }
          }
        } else {
          debugInfo.push(`Cell ${index}: No profile link found`);
        }
      });

      // Remove duplicates but keep order
      const uniqueUsernames = [...new Set(usernames)];
      debugInfo.push(`Final usernames (${uniqueUsernames.length}): ${uniqueUsernames.slice(0, 10).join(', ')}`);

      return { usernames: uniqueUsernames, debug: debugInfo };
    }, cleanHandle, authenticatedUsername);

    const foundUsernames = extractionResult.usernames;

    // Log debug info
    console.log(`[X-SEARCH] Extraction debug info:`);
    extractionResult.debug.forEach(line => console.log(`  ${line}`));

    console.log(`[X-SEARCH] Found ${foundUsernames.length} unique profiles from X search`);
    if (foundUsernames.length > 0) {
      console.log(`[X-SEARCH] Top 10 usernames:`, foundUsernames.slice(0, 10));
    }

    if (foundUsernames.length === 0) {
      console.log(`[X-SEARCH] No profiles found from X search`);
      return [];
    }

    // Check if we have enough profiles to skip offset
    if (foundUsernames.length <= offset) {
      console.log(`[X-SEARCH] Not enough profiles (${foundUsernames.length}) to skip offset ${offset}`);
      return [];
    }

    // Now verify each profile actually has the company in their bio
    // Skip first 'offset' profiles and check next 10
    const startIndex = offset;
    const endIndex = Math.min(foundUsernames.length, offset + 10);
    const checkCount = endIndex - startIndex;

    console.log(`[X-SEARCH] Offset: ${offset}, checking profiles ${startIndex + 1}-${endIndex} of ${foundUsernames.length} total`);
    console.log(`[X-SEARCH] Profiles to check: ${foundUsernames.slice(startIndex, endIndex).map(u => '@' + u).join(', ')}`);
    console.log(`[X-SEARCH] Verifying bios for ${checkCount} profiles...`);
    const usersWithCompanyInBio = [];

    for (let i = startIndex; i < endIndex; i++) {
      const username = foundUsernames[i];

      try {
        // Visit the profile page with delay to avoid rate limiting
        await page.goto(`https://x.com/${username}`, { waitUntil: "domcontentloaded", timeout: 10000 });
        await randomDelay(2000, 4000); // Longer delay between profile checks

        // Extract bio
        const bioData = await page.evaluate(() => {
          const bioEl = document.querySelector('[data-testid="UserDescription"]');
          const nameEl = document.querySelector('[data-testid="UserName"] span');

          return {
            bio: bioEl ? bioEl.textContent.trim() : "",
            displayName: nameEl ? nameEl.textContent.trim() : ""
          };
        });

        const bioLower = bioData.bio.toLowerCase();
        const handleLower = cleanHandle.toLowerCase();

        // Check if bio contains @company or company name
        if (bioLower.includes(`@${handleLower}`) || bioLower.includes(handleLower)) {
          console.log(`[X-SEARCH] ✅ @${username} has "${cleanHandle}" in bio`);
          usersWithCompanyInBio.push({
            x_username: username,
            display_name: bioData.displayName || username,
            x_bio: bioData.bio,
            x_profile_url: `https://x.com/${username}`,
          });
        } else {
          console.log(`[X-SEARCH] ❌ @${username} - no "${cleanHandle}" in bio`);
        }
      } catch (error) {
        console.log(`[X-SEARCH] ⚠️ Error checking @${username}: ${error.message}`);
        continue;
      }
    }

    console.log(`[X-SEARCH] Found ${usersWithCompanyInBio.length} profiles with company in bio (checked ${checkCount} profiles)`);

    // Return up to maxUsers
    const results = usersWithCompanyInBio.slice(0, maxUsers);
    console.log(`[X-SEARCH] Returning ${results.length} profiles`);
    return results;
  } catch (error) {
    console.error("[X-SEARCH] Search error:", error.message);
    throw error;
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Alternative: Search by individual names
 * Useful when you have specific names to look up
 */
async function searchGoogleForPerson(personName, companyName = "") {
  console.log(`[X-SEARCH] Searching for ${personName}${companyName ? " at " + companyName : ""}`);

  const page = await puppeteerManager.newPage();

  try {
    // Search Google for "[name] [company] x" or "[name] [company] twitter"
    const searchQuery = `"${personName}"${companyName ? ' "' + companyName + '"' : ""} site:x.com OR site:twitter.com`;
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

    console.log(`[X-SEARCH] Google search: ${searchQuery}`);
    await page.goto(googleUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await randomDelay(2000, 3000);

    // Extract the first X/Twitter profile link
    const xUsername = await page.evaluate(() => {
      const anchors = document.querySelectorAll("a");

      for (const anchor of anchors) {
        const href = anchor.getAttribute("href");
        if (href) {
          let actualUrl = href;

          // Handle Google redirect URLs
          if (href.includes("/url?q=")) {
            try {
              const url = new URL(href, window.location.origin);
              actualUrl = url.searchParams.get("q") || href;
            } catch (e) {
              continue;
            }
          }

          if (actualUrl && (actualUrl.includes("x.com/") || actualUrl.includes("twitter.com/"))) {
            const match = actualUrl.match(/(?:x\.com|twitter\.com)\/([a-zA-Z0-9_]+)/);
            if (match && match[1]) {
              const username = match[1];
              if (
                username !== "home" &&
                username !== "login" &&
                username !== "signup" &&
                username !== "explore" &&
                username !== "i" &&
                username !== "intent" &&
                username !== "search"
              ) {
                return username;
              }
            }
          }
        }
      }
      return null;
    });

    if (!xUsername) {
      console.log(`[X-SEARCH] ❌ No X profile found for ${personName}`);
      return null;
    }

    console.log(`[X-SEARCH] Found X profile: @${xUsername}`);

    // Visit profile to get bio
    await page.goto(`https://x.com/${xUsername}`, { waitUntil: "networkidle2", timeout: 30000 });
    await randomDelay(2000, 3000);

    const userData = await page.evaluate(() => {
      const nameEl = document.querySelector('[data-testid="UserName"] span');
      const displayName = nameEl ? nameEl.textContent.trim() : "";

      const bioEl = document.querySelector('[data-testid="UserDescription"]');
      const bio = bioEl ? bioEl.textContent.trim() : "";

      return { displayName, bio };
    });

    return {
      x_username: xUsername,
      display_name: userData.displayName || personName,
      x_bio: userData.bio || "",
      x_profile_url: `https://x.com/${xUsername}`,
    };
  } catch (error) {
    console.error(`[X-SEARCH] Error searching for ${personName}:`, error.message);
    return null;
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Main function: Search for users with company in bio
 * Uses Google to find X profiles, then verifies on X
 * @param {string} companyHandle - Company X handle
 * @param {number} maxUsers - Maximum number of users to return
 * @param {number} offset - Offset to skip existing contacts (default 0)
 * @param {Database} db - Employee database instance for loading cookies
 */
export async function searchUsersWithCompanyInBio(companyHandle, maxUsers = 5, offset = 0, db = null) {
  return await searchGoogleForXProfiles(companyHandle, maxUsers, offset, db);
}

export { searchGoogleForPerson };
export default { searchUsersWithCompanyInBio, searchGoogleForPerson };

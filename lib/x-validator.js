import puppeteerManager from "./puppeteer-manager.js";

/**
 * Validate that an X/Twitter username exists by checking the profile page
 * Valid = profile loads without "doesn't exist" or "suspended" message
 * Invalid = shows error message
 */
export async function validateXUsername(username) {
  const cleanUsername = username.replace("@", "").trim();
  const url = `https://x.com/${cleanUsername}`;

  console.log(`[X-VAL] Validating @${cleanUsername}...`);

  const page = await puppeteerManager.newPage();

  try {
    // Navigate to X profile page
    await page.goto(url, { waitUntil: "networkidle2", timeout: 10000 });

    // Wait for content to load
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Check if profile exists
    const profileStatus = await page.evaluate(() => {
      const bodyText = document.body.textContent || "";

      // Check for error messages
      const doesntExist = bodyText.includes("This account doesn't exist") || bodyText.includes("Account suspended");

      // Check for profile elements that indicate valid profile
      const hasProfileName = document.querySelector('[data-testid="UserName"]') !== null;
      const hasFollowButton = document.querySelector('[data-testid="placementTracking"]') !== null;

      return {
        exists: !doesntExist && (hasProfileName || hasFollowButton),
        suspended: bodyText.includes("Account suspended"),
        notFound: bodyText.includes("This account doesn't exist"),
      };
    });

    const isValid = profileStatus.exists && !profileStatus.suspended && !profileStatus.notFound;

    const result = {
      username: cleanUsername,
      valid: isValid,
      url: url,
      checked_at: new Date().toISOString(),
      details: profileStatus,
    };

    console.log(`[X-VAL] @${cleanUsername}: ${isValid ? "VALID ✅" : "INVALID ❌"}`);

    return result;
  } catch (error) {
    console.error(`[X-VAL] Error validating @${cleanUsername}:`, error.message);

    return {
      username: cleanUsername,
      valid: false,
      url: url,
      checked_at: new Date().toISOString(),
      error: error.message,
      validation_failed: true,
    };
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Validate multiple X usernames concurrently
 */
export async function validateXUsernames(usernames, maxConcurrent = 5) {
  console.log(`[X-VAL] Validating ${usernames.length} X usernames (max ${maxConcurrent} concurrent)...`);

  const results = [];

  // Process in batches
  for (let i = 0; i < usernames.length; i += maxConcurrent) {
    const batch = usernames.slice(i, i + maxConcurrent);
    console.log(`[X-VAL] Processing batch ${Math.floor(i / maxConcurrent) + 1} (${batch.length} users)`);

    const batchPromises = batch.map((username) => validateXUsername(username));
    const batchResults = await Promise.all(batchPromises);

    results.push(...batchResults);

    // Small delay between batches
    if (i + maxConcurrent < usernames.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const validCount = results.filter((r) => r.valid).length;
  const invalidCount = results.filter((r) => !r.valid && !r.validation_failed).length;
  const failedCount = results.filter((r) => r.validation_failed).length;

  console.log(`[X-VAL] Validation complete: ${validCount} valid, ${invalidCount} invalid, ${failedCount} failed`);

  return results;
}

export default { validateXUsername, validateXUsernames };

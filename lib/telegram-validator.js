import puppeteerManager from "./puppeteer-manager.js";

/**
 * Validate a Telegram username by checking the profile page
 * Valid = has profile picture and actual profile content
 * Invalid = shows "If you have Telegram, you can contact" message
 */
export async function validateTelegramUsername(username) {
  // Clean username
  const cleanUsername = username.replace("@", "").trim();
  const url = `https://t.me/${cleanUsername}`;

  console.log(`[TELEGRAM-VAL] Validating @${cleanUsername}...`);

  const page = await puppeteerManager.newPage();

  try {
    // Navigate to Telegram profile page
    await page.goto(url, { waitUntil: "networkidle2", timeout: 10000 });

    // Wait a bit for content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple validation: if profile picture appears, it's valid
    const profileData = await page.evaluate(() => {
      const bodyText = document.body.textContent || "";

      // Check for profile picture (only reliable indicator)
      const hasProfilePicture = !!document.querySelector("img.tgme_page_photo_image");

      // Check for invalid text (for logging purposes)
      const hasInvalidText = bodyText.includes("If you have Telegram, you can contact") &&
                            bodyText.includes("right away.");

      return {
        hasProfilePicture,
        hasInvalidText,
      };
    });

    // Valid = has profile picture
    const isValid = profileData.hasProfilePicture;

    const result = {
      username: cleanUsername,
      valid: isValid,
      url: url,
      checked_at: new Date().toISOString(),
      details: {
        has_profile_picture: profileData.hasProfilePicture,
        has_invalid_text: profileData.hasInvalidText,
      },
    };

    console.log(
      `[TELEGRAM-VAL] @${cleanUsername}: ${isValid ? "VALID ✅" : "INVALID ❌"} (has profile picture: ${profileData.hasProfilePicture})`
    );

    return result;
  } catch (error) {
    console.error(`[TELEGRAM-VAL] Error validating @${cleanUsername}:`, error.message);

    // On error, mark as validation failed (not definitively invalid)
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
 * Validate multiple Telegram usernames concurrently
 * Limited to maxConcurrent parallel validations
 */
export async function validateTelegramUsernames(usernames, maxConcurrent = 5) {
  console.log(`[TELEGRAM-VAL] Validating ${usernames.length} usernames (max ${maxConcurrent} concurrent)...`);

  const results = [];

  // Process in batches
  for (let i = 0; i < usernames.length; i += maxConcurrent) {
    const batch = usernames.slice(i, i + maxConcurrent);
    console.log(`[TELEGRAM-VAL] Processing batch ${Math.floor(i / maxConcurrent) + 1} (${batch.length} users)`);

    const batchPromises = batch.map((username) => validateTelegramUsername(username));
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

  console.log(
    `[TELEGRAM-VAL] Validation complete: ${validCount} valid, ${invalidCount} invalid, ${failedCount} failed`
  );

  return results;
}

export default { validateTelegramUsername, validateTelegramUsernames };

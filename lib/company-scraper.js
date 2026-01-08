import puppeteerManager from "./puppeteer-manager.js";

/**
 * Scrape a company's website to find team members and their X/Twitter handles
 */
export async function scrapeCompanyWebsiteForTeam(websiteUrl, companyXHandle) {
  console.log(`[COMPANY-SCRAPER] Scraping ${websiteUrl} for team members`);

  const page = await puppeteerManager.newPage();
  const foundMembers = [];

  try {
    // Common team page paths
    const teamPaths = ['/team', '/about', '/people', '/about-us', '/our-team', '/leadership', '/company'];

    // Try to find team page
    let teamPageFound = false;
    let teamPageUrl = null;

    for (const path of teamPaths) {
      try {
        const testUrl = new URL(path, websiteUrl).href;
        console.log(`[COMPANY-SCRAPER] Trying ${testUrl}...`);

        const response = await page.goto(testUrl, { waitUntil: "networkidle2", timeout: 15000 });

        if (response && response.status() === 200) {
          // Check if page has team-related content
          const hasTeamContent = await page.evaluate(() => {
            const bodyText = document.body.textContent.toLowerCase();
            return bodyText.includes('team') || bodyText.includes('employee') ||
                   bodyText.includes('founder') || bodyText.includes('ceo') ||
                   bodyText.includes('engineer') || bodyText.includes('developer');
          });

          if (hasTeamContent) {
            teamPageFound = true;
            teamPageUrl = testUrl;
            console.log(`[COMPANY-SCRAPER] Found team page: ${testUrl}`);
            break;
          }
        }
      } catch (e) {
        // Page not found, continue
        continue;
      }
    }

    if (!teamPageFound) {
      console.log(`[COMPANY-SCRAPER] No team page found, trying homepage`);
      await page.goto(websiteUrl, { waitUntil: "networkidle2", timeout: 15000 });
      teamPageUrl = websiteUrl;
    }

    // Take screenshot
    const timestamp = Date.now();
    await page.screenshot({ path: `/tmp/company-scrape-${timestamp}.png` });
    console.log(`[COMPANY-SCRAPER] Screenshot saved to /tmp/company-scrape-${timestamp}.png`);

    // Extract social media links (X/Twitter)
    const socialLinks = await page.evaluate(() => {
      const links = [];
      const anchors = document.querySelectorAll('a[href]');

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href');
        if (href && (href.includes('twitter.com/') || href.includes('x.com/'))) {
          // Extract username from URL
          const match = href.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);
          if (match && match[1]) {
            const username = match[1];
            // Filter out generic pages
            if (username !== 'intent' && username !== 'share' && username !== 'home') {
              // Try to get associated name from nearby text
              let name = '';
              let parent = anchor.parentElement;
              for (let i = 0; i < 3; i++) {
                if (parent) {
                  const text = parent.textContent.trim();
                  // Look for name patterns (capitalized words)
                  const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
                  if (nameMatch) {
                    name = nameMatch[1];
                    break;
                  }
                  parent = parent.parentElement;
                }
              }
              links.push({ username, name, url: href });
            }
          }
        }
      });

      return links;
    });

    console.log(`[COMPANY-SCRAPER] Found ${socialLinks.length} X/Twitter links on website`);

    for (const link of socialLinks) {
      foundMembers.push({
        x_username: link.username,
        display_name: link.name || link.username,
        source: 'company_website',
        source_url: teamPageUrl,
      });
    }

    return foundMembers;
  } catch (error) {
    console.error(`[COMPANY-SCRAPER] Error scraping website:`, error.message);
    return [];
  } finally {
    await puppeteerManager.closePage(page);
  }
}

/**
 * Get company website URL from their X profile
 */
export async function getCompanyWebsiteFromX(companyXHandle) {
  console.log(`[COMPANY-SCRAPER] Getting website for @${companyXHandle}`);

  const page = await puppeteerManager.newPage();

  try {
    const cleanHandle = companyXHandle.replace('@', '').trim();
    const profileUrl = `https://x.com/${cleanHandle}`;

    await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract website URL from profile
    const websiteUrl = await page.evaluate(() => {
      // Look for website link in bio
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href');
        // X wraps external links in t.co redirects, but we can get the display text
        const text = link.textContent;
        if (text && (text.includes('.com') || text.includes('.io') || text.includes('.co'))) {
          // It's likely a website URL
          return text.startsWith('http') ? text : `https://${text}`;
        }
      }
      return null;
    });

    console.log(`[COMPANY-SCRAPER] Found website: ${websiteUrl || 'none'}`);
    return websiteUrl;
  } catch (error) {
    console.error(`[COMPANY-SCRAPER] Error getting website:`, error.message);
    return null;
  } finally {
    await puppeteerManager.closePage(page);
  }
}

export default { scrapeCompanyWebsiteForTeam, getCompanyWebsiteFromX };

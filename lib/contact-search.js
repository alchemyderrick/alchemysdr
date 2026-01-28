import { nowISO } from "./helpers.js";

/**
 * Search for all employees at a company using Apollo API + Claude + web search
 * @param {Object} target - Target company object with team_name, website
 * @param {Function} anthropic - Anthropic client
 * @param {Object} db - Database connection
 * @param {Function} nanoid - ID generator
 * @param {Function} nowISO - ISO timestamp function
 * @param {Object} apolloClient - Apollo API client (optional)
 * @returns {Promise<Object>} - { contacts, stored }
 */
export async function searchCompanyContacts(target, anthropic, db, nanoid, nowISO, apolloClient) {
  console.log(`[CONTACT-SEARCH] Searching for contacts at ${target.team_name}`);

  // Check if target needs enrichment (missing website, notes, x_handle, or funding data)
  const needsEnrichment = !target.website || !target.notes || !target.x_handle || !target.raised_usd || target.raised_usd === 0;
  console.log(`[CONTACT-SEARCH] Enrichment check - website: ${target.website}, notes: ${target.notes}, raised_usd: ${target.raised_usd}, needsEnrichment: ${needsEnrichment}`);

  if (needsEnrichment) {
    console.log(`[CONTACT-SEARCH] Target needs enrichment - gathering company data for ${target.team_name}${target.x_handle ? ' (@' + target.x_handle + ')' : ''}...`);

    let apolloOrgData = null;
    let enrichData = {};

    // Step 1: Try Apollo organization enrichment first
    if (apolloClient && apolloClient.isEnabled()) {
      try {
        apolloOrgData = await apolloClient.enrichOrganization(target.team_name, null);
        if (apolloOrgData) {
          console.log(`[CONTACT-SEARCH] Apollo org data:`, apolloOrgData);

          // Use Apollo data
          if (apolloOrgData.website) enrichData.website = apolloOrgData.website;
          if (apolloOrgData.description) enrichData.notes = apolloOrgData.description;
        }
      } catch (apolloError) {
        console.warn(`[CONTACT-SEARCH] Apollo org enrichment failed:`, apolloError.message);
      }
    }

    // Step 2: Use Claude to get funding/revenue data (which Apollo doesn't provide)
    try {
      // Build enrichment prompt based on available data
      const companyIdentifier = target.x_handle
        ? `with Twitter/X handle @${target.x_handle}`
        : `named "${target.team_name}"`;

      const websiteInstructions = target.x_handle
        ? "Check the Twitter/X profile's bio/website link first, then search the web"
        : "Search the web and the company's public information";

      const enrichPrompt = `Research the company ${companyIdentifier} and provide:

1. Company website URL - ${websiteInstructions}
2. Company Twitter/X handle (e.g., @company) - check their website footer, social links, or search directly
3. Total funding raised in USD (if publicly available from press releases, Crunchbase, PitchBook, news articles, etc.)
4. Estimated monthly revenue in USD (if publicly available)
5. A single sentence description of what the company does

IMPORTANT: Always provide the website, Twitter/X handle, and description. Only provide funding/revenue if you find reliable public sources.

Return ONLY a JSON object with this exact structure:
{
  "website": "https://example.com" or null,
  "x_handle": "companyname" or null,
  "raised_usd": 50000000 or null,
  "monthly_revenue_usd": 1000000 or null,
  "notes": "One sentence describing what the company does"
}`;

      const enrichResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: "You are a research assistant. Always respond with valid JSON only.",
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{ role: "user", content: enrichPrompt }]
      });

      // Extract JSON from Claude response
      console.log(`[CONTACT-SEARCH] Claude response received, processing...`);
      let claudeData = null;
      for (const block of enrichResponse.content) {
        if (block.type === "text") {
          console.log(`[CONTACT-SEARCH] Text block:`, block.text.substring(0, 200));
          const match = block.text.match(/\{[\s\S]*\}/);
          if (match) {
            try {
              claudeData = JSON.parse(match[0]);
              console.log(`[CONTACT-SEARCH] Successfully parsed Claude enrichment data`);
              break;
            } catch (parseError) {
              console.warn(`[CONTACT-SEARCH] Failed to parse JSON:`, parseError.message);
            }
          }
        }
      }

      // Merge Claude data with Apollo data (Claude takes priority for funding/revenue, Apollo for description if not set)
      if (claudeData) {
        console.log(`[CONTACT-SEARCH] Claude data:`, claudeData);

        // Prefer Claude's website if Apollo didn't provide one
        if (claudeData.website && !enrichData.website) {
          enrichData.website = claudeData.website;
        }

        // Use Claude for X handle
        if (claudeData.x_handle) {
          // Normalize: remove @ prefix if present
          enrichData.x_handle = claudeData.x_handle.replace(/^@/, '');
        }

        // Use Claude for funding/revenue (Apollo doesn't provide this)
        if (claudeData.raised_usd) enrichData.raised_usd = claudeData.raised_usd;
        if (claudeData.monthly_revenue_usd) enrichData.monthly_revenue_usd = claudeData.monthly_revenue_usd;

        // Prefer Claude's description if Apollo didn't provide one
        if (claudeData.notes && !enrichData.notes) {
          enrichData.notes = claudeData.notes;
        }
      }
    } catch (enrichError) {
      console.warn(`[CONTACT-SEARCH] Failed to enrich target with Claude:`, enrichError.message);
      console.warn(`[CONTACT-SEARCH] Error stack:`, enrichError.stack);
    }

    // Step 3: Update database with merged enrichment data (only update missing fields)
    try {
      const updates = [];
      const params = [];

      // Only update website if currently missing
      if (enrichData.website && !target.website) {
        updates.push("website = ?");
        params.push(enrichData.website);
      }

      // Only update funding if currently missing or zero
      if (enrichData.raised_usd && enrichData.raised_usd > 0 && (!target.raised_usd || target.raised_usd === 0)) {
        updates.push("raised_usd = ?");
        params.push(enrichData.raised_usd);
      }

      // Only update revenue if currently missing or zero
      if (enrichData.monthly_revenue_usd && enrichData.monthly_revenue_usd > 0 && (!target.monthly_revenue_usd || target.monthly_revenue_usd === 0)) {
        updates.push("monthly_revenue_usd = ?");
        params.push(enrichData.monthly_revenue_usd);
      }

      // Only update notes if currently missing
      if (enrichData.notes && !target.notes) {
        updates.push("notes = ?");
        params.push(enrichData.notes);
      }

      // Only update x_handle if currently missing
      if (enrichData.x_handle && !target.x_handle) {
        updates.push("x_handle = ?");
        params.push(enrichData.x_handle);
      }

      if (updates.length > 0) {
        updates.push("updated_at = ?");
        params.push(nowISO());
        params.push(target.id);

        const updateQuery = `UPDATE targets SET ${updates.join(", ")} WHERE id = ?`;
        db.prepare(updateQuery).run(...params);

        console.log(`[CONTACT-SEARCH] ✅ Enriched target with ${updates.length - 1} fields (Apollo + Claude)`);

        // Refresh target object
        Object.assign(target, enrichData);
      } else {
        console.log(`[CONTACT-SEARCH] No enrichment data to save`);
      }
    } catch (dbError) {
      console.warn(`[CONTACT-SEARCH] Failed to save enrichment data:`, dbError.message);
    }
  }

  // Get existing contacts from X discovery
  const existingContacts = db.prepare(`
    SELECT name, title, telegram_handle, x_username, x_bio
    FROM contacts
    WHERE company = ?
  `).all(target.team_name);

  console.log(`[CONTACT-SEARCH] Found ${existingContacts.length} existing contacts from X discovery`);

  // Run Apollo API and Claude in parallel for maximum coverage
  let apolloContacts = [];
  let claudeContacts = [];

  // Try Apollo API if available
  const apolloPromise = (async () => {
    if (apolloClient && apolloClient.isEnabled()) {
      try {
        const contacts = await apolloClient.searchContacts(target.team_name, target.website);
        console.log(`[CONTACT-SEARCH] Apollo found ${contacts.length} contacts`);
        return contacts;
      } catch (apolloError) {
        console.warn("[CONTACT-SEARCH] Apollo API error:", apolloError.message);
        return [];
      }
    }
    return [];
  })();

  // Use Claude with web search to find employees
  const claudePromise = (async () => {
    const searchPrompt = `Find all employees at ${target.team_name} (website: ${target.website || "unknown"}).

Search Google and LinkedIn for:
1. Current employees at this company
2. Their names (first and last)
3. Their titles/roles
4. Email addresses if available
5. Phone numbers if available
6. LinkedIn profile URLs

Return a JSON array with this structure:
[
  {
    "name": "John Doe",
    "title": "CTO",
    "email": "john@company.com",
    "phone": "+1-555-0100",
    "linkedin": "https://linkedin.com/in/johndoe"
  }
]

Include at least 10-20 employees if you can find them. Focus on leadership, engineering, product, and business development roles.

IMPORTANT: Respond with ONLY valid JSON, no other text.`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: "You are a research assistant. Always respond with valid JSON only.",
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: searchPrompt }]
    });

    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    // Extract JSON from response
    let contacts = [];
    const cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        contacts = JSON.parse(jsonMatch[0]);
        console.log(`[CONTACT-SEARCH] Parsed ${contacts.length} contacts from Claude response`);
      } catch (e) {
        console.error("[CONTACT-SEARCH] Failed to parse JSON:", e);
        console.error("[CONTACT-SEARCH] Response text:", responseText.substring(0, 500));
        contacts = [];
      }
    } else {
      console.warn("[CONTACT-SEARCH] No JSON array found in response");
      console.log("[CONTACT-SEARCH] Response text:", responseText.substring(0, 500));
    }

    return contacts.map(c => ({ ...c, source: 'web_search' }));
  })();

  // Wait for both Apollo and Claude to complete
  [apolloContacts, claudeContacts] = await Promise.all([apolloPromise, claudePromise]);

  // Merge Apollo + Claude + X discovery contacts with deduplication by name
  const allContacts = [];
  const seenNames = new Map(); // Map of normalized name -> contact

  // Helper function to normalize name for comparison
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Add Apollo contacts first (highest priority for email/phone data)
  for (const contact of apolloContacts) {
    const normalizedName = normalizeName(contact.name);
    if (normalizedName && !seenNames.has(normalizedName)) {
      seenNames.set(normalizedName, contact);
      allContacts.push({ ...contact, source: 'apollo' });
    }
  }

  // Add Claude contacts (merge data if name matches, otherwise add new)
  for (const contact of claudeContacts) {
    const normalizedName = normalizeName(contact.name);
    if (!normalizedName) continue;

    if (seenNames.has(normalizedName)) {
      // Name exists - merge data (prioritize Apollo data, but fill in missing fields)
      const existing = allContacts.find(c => normalizeName(c.name) === normalizedName);
      if (existing) {
        // Fill in missing fields from Claude
        if (!existing.email && contact.email) existing.email = contact.email;
        if (!existing.phone && contact.phone) existing.phone = contact.phone;
        if (!existing.linkedin && contact.linkedin) existing.linkedin = contact.linkedin;
        if (!existing.title && contact.title) existing.title = contact.title;
      }
    } else {
      // New contact from Claude
      seenNames.set(normalizedName, contact);
      allContacts.push({ ...contact, source: 'web_search' });
    }
  }

  // Add X discovery contacts (dedupe by name)
  for (const existing of existingContacts) {
    const normalizedName = normalizeName(existing.name);
    if (!normalizedName) continue;

    if (!seenNames.has(normalizedName)) {
      seenNames.set(normalizedName, existing);
      allContacts.push({
        name: existing.name,
        title: existing.title || "",
        email: "",
        phone: "",
        linkedin: "",
        telegram_handle: existing.telegram_handle || existing.x_username,
        x_username: existing.x_username,
        x_bio: existing.x_bio,
        source: "x_discovery"
      });
    }
  }

  console.log(`[CONTACT-SEARCH] Total unique contacts: ${allContacts.length} (Apollo: ${apolloContacts.length}, Claude: ${claudeContacts.length}, X: ${existingContacts.length})`);

  // Store contacts in database
  const insertContact = db.prepare(`
    INSERT OR REPLACE INTO discovered_contacts
    (id, target_id, name, title, email, phone, linkedin, telegram_handle, apollo_id, apollo_confidence_score, source, discovered_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = nowISO();
  let stored = 0;

  for (const contact of allContacts) {
    try {
      const contactId = nanoid();
      insertContact.run(
        contactId,
        target.id,
        contact.name,
        contact.title || null,
        contact.email || null,
        contact.phone || null,
        contact.linkedin || null,
        contact.telegram_handle || null,
        contact.apollo_id || null,
        contact.apollo_confidence_score || null,
        contact.source || 'web_search',
        timestamp
      );
      stored++;
    } catch (err) {
      // Ignore duplicates or other insert errors
      if (!err.message.includes('UNIQUE constraint')) {
        console.error(`[CONTACT-SEARCH] Error inserting contact ${contact.name}:`, err.message);
      }
    }
  }

  console.log(`[CONTACT-SEARCH] Stored ${stored} contacts in database for ${target.team_name}`);

  return { contacts: allContacts, stored };
}

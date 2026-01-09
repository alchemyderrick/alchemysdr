import "dotenv/config";
import express from "express";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import { WorkflowEngine } from "./lib/workflow-engine.js";
import { initializeDatabase } from "./lib/database.js";
import { getHtmlTemplate } from "./lib/html-template.js";
import {
  nowISO,
  tgLinks,
  xLink,
  qualifiesTarget,
  setClipboardMac,
  openTelegramDesktopLink,
  pasteIntoTelegram,
  scheduleTelegramAutoSend,
  cancelTelegramAutoSend,
  generateOutbound,
  generateFollowUp,
  anthropic,
  CLAUDE_MODEL,
} from "./lib/helpers.js";
import { createWorkflowRoutes } from "./routes/workflow.js";
import { createTargetRoutes } from "./routes/targets.js";
import { createContactRoutes } from "./routes/contacts.js";
import { createDraftRoutes } from "./routes/drafts.js";
import { createApolloClient } from "./lib/apollo-search.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(process.cwd()));

// Initialize database
const db = initializeDatabase();

// Initialize Apollo API client
const apolloApiKey = process.env.APOLLO_API_KEY;
const apolloClient = createApolloClient(apolloApiKey);

if (apolloApiKey) {
  console.log("✅ Apollo API client initialized");
} else {
  console.log("⚠️ Apollo API key not configured (will use Claude fallback only)");
}

// Serve main HTML UI
app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(getHtmlTemplate());
});

app.get("/api/targets/approved", (req, res) => {
  const rows = db.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT CASE
        WHEN d.status IN ('sent', 'dismissed', 'followup') THEN d.id
        ELSE NULL
      END) as messages_sent
    FROM targets t
    LEFT JOIN contacts c ON c.company = t.team_name
    LEFT JOIN drafts d ON d.contact_id = c.id
    WHERE t.status = 'approved'
      AND t.is_web3 = 1
      AND (
        t.raised_usd >= 10000000
        OR t.monthly_revenue_usd >= 500000
        OR (t.raised_usd = 0 OR t.raised_usd IS NULL)
      )
    GROUP BY t.id
    ORDER BY t.updated_at DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

app.post("/api/targets/:id/approve", (req, res) => {
  const { id } = req.params;
  const info = db.prepare(`UPDATE targets SET status = 'approved', updated_at = ? WHERE id = ?`).run(nowISO(), id);
  if (info.changes === 0) return res.status(404).json({ error: "target not found" });
  res.json({ ok: true });
});

app.get("/api/targets", (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM targets
    WHERE status = 'pending'
      AND is_web3 = 1
      AND raised_usd >= 10000000
      AND monthly_revenue_usd >= 500000
      AND id NOT IN (
        SELECT t1.id FROM targets t1
        INNER JOIN targets t2 ON (
          t2.status IN ('approved', 'dismissed')
          AND (
            (t1.x_handle IS NOT NULL AND t1.x_handle = t2.x_handle)
            OR (t1.website IS NOT NULL AND t1.website = t2.website)
            OR (LOWER(TRIM(t1.team_name)) = LOWER(TRIM(t2.team_name)))
          )
        )
        WHERE t1.status = 'active'
      )
    ORDER BY monthly_revenue_usd DESC, raised_usd DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

app.post("/api/targets/:id/find-contacts", async (req, res) => {
  try {
    const { id } = req.params;
    const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding contacts for ${target.team_name}...`);

    // Step 1: Search for team members and their X profiles
    const searchPrompt = `Search the web to find team members at ${target.team_name} who would be relevant for discussing blockchain infrastructure services.

Look for:
- Founders, Co-founders, CEO
- CTO, VP Engineering, Head of Engineering
- Head of Product, Head of Infrastructure
- Technical decision makers

For EACH person you find, you MUST locate their X/Twitter profile and get their X username (the @handle).

Search strategies:
1. Search "${target.team_name} founder twitter" or "${target.team_name} CTO twitter"
2. Visit the company website ${target.website || ''} and look for team pages with social links
3. Search "${target.team_name} team members"
4. Look at the company's X account ${target.x_handle ? '@' + target.x_handle : ''} followers/following for team members

For each person, you must find their X username by visiting their X profile.

CRITICAL: Only include people where you have successfully found their X username.

Respond with ONLY valid JSON:
[
  {
    "name": "Full Name",
    "x_username": "theirusername",
    "title": "Their role/title",
    "notes": "Why they're relevant"
  }
]

Find 5-10 key team members. If you can't find anyone with X usernames, return: []`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: "You are a research assistant. Always respond with valid JSON only, no additional text.",
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
    
    console.log("Raw search response:", responseText.substring(0, 800));
    
    let contacts = [];
    let cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        contacts = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed ${contacts.length} contacts from initial search`);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        console.error("Attempted to parse:", jsonMatch[0].substring(0, 500));
        return res.status(500).json({ 
          error: "Failed to parse contact data",
          details: e.message,
          sample: jsonMatch[0].substring(0, 300)
        });
      }
    } else {
      console.log("⚠️ No JSON array found in response");
      console.log("Full response:", cleanText.substring(0, 1000));
    }

    if (!Array.isArray(contacts)) {
      contacts = [];
    }

    console.log(`📊 Found ${contacts.length} team members with X usernames`);

    // Step 2: For each contact, try to find their Telegram handle
    // Try multiple patterns: X username, firstname+lastname, firstname_lastname, etc.
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (!contact.x_username) continue;
      
      const xUsername = contact.x_username.replace('@', '');
      const xUrl = `https://x.com/${xUsername}`;
      
      try {
        console.log(`🔍 Verifying ${contact.name} (@${xUsername})...`);
        
        // Verify this person actually works at the company by checking their X bio
        const verifyPrompt = `Visit ${xUrl} and check if this person's X profile bio or description mentions ${target.team_name} or @${target.x_handle || target.team_name}.

Respond with ONLY:
VERIFIED - if their bio clearly indicates they work at ${target.team_name}
NOT_VERIFIED - if there's no mention of the company`;

        const verifyMsg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 20,
          tools: [{
            type: "web_search_20250305",
            name: "web_search"
          }],
          messages: [{ role: "user", content: verifyPrompt }]
        });

        let verifyResponse = "";
        for (const block of verifyMsg.content) {
          if (block.type === "text") {
            verifyResponse += block.text;
          }
        }

        const isVerified = verifyResponse.trim().toUpperCase().includes("VERIFIED");
        
        if (!isVerified) {
          console.log(`❌ Could not verify ${contact.name} works at ${target.team_name}`);
          contact.verified = false;
          continue;
        }
        
        console.log(`✅ Verified ${contact.name} works at ${target.team_name}`);
        contact.verified = true;
        
        // Generate possible Telegram usernames to try
        const possibleHandles = [xUsername]; // Start with X username
        
        // Add various name combinations
        const nameParts = contact.name.toLowerCase().split(' ').filter(p => p.length > 0);
        if (nameParts.length >= 2) {
          const first = nameParts[0];
          const last = nameParts[nameParts.length - 1];
          
          // Common patterns
          possibleHandles.push(first + last);           // derrickyen
          possibleHandles.push(first + '_' + last);     // derrick_yen
          possibleHandles.push(first + '.' + last);     // derrick.yen
          possibleHandles.push(last + first);           // yenderrick
          possibleHandles.push(last + '_' + first);     // yen_derrick
          possibleHandles.push(last + '.' + first);     // yen.derrick
          possibleHandles.push(first + last.charAt(0)); // derricky
          possibleHandles.push(first.charAt(0) + last); // dyen
          
          // If there's a middle name or multiple parts, try first + last ignoring middle
          if (nameParts.length > 2) {
            possibleHandles.push(nameParts[0] + nameParts[nameParts.length - 1]);
            possibleHandles.push(nameParts[0] + '_' + nameParts[nameParts.length - 1]);
            possibleHandles.push(nameParts[0] + '.' + nameParts[nameParts.length - 1]);
          }
        }
        
        // Remove duplicates
        const uniqueHandles = [...new Set(possibleHandles)];
        console.log(`📋 Will try ${uniqueHandles.length} possible handles for ${contact.name}: ${uniqueHandles.slice(0, 5).join(', ')}...`);
        
        // Try each possible handle
        let foundTelegram = false;
        for (const handle of uniqueHandles) {
          const tgUrl = `https://t.me/${handle}`;
          console.log(`🔍 Trying Telegram: ${tgUrl}...`);
          
          try {
            const tgCheckPrompt = `Check if ${tgUrl} exists and shows a valid Telegram user profile.

Respond with ONLY:
EXISTS - if you can see a Telegram profile page
NOT_FOUND - if you see an error or "user not found"`;

            const tgMsg = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 20,
              tools: [{
                type: "web_search_20250305",
                name: "web_search"
              }],
              messages: [{ role: "user", content: tgCheckPrompt }]
            });

            let tgResponse = "";
            for (const block of tgMsg.content) {
              if (block.type === "text") {
                tgResponse += block.text;
              }
            }

            const tgExists = tgResponse.trim().toUpperCase().includes("EXISTS");
            if (tgExists) {
              contact.telegram_handle = handle;
              console.log(`✅ Telegram found: @${handle} for ${contact.name}`);
              foundTelegram = true;
              break; // Stop trying once we find one
            } else {
              console.log(`❌ No Telegram at @${handle}`);
            }
            
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            console.error(`Error checking @${handle}:`, e.message);
          }
        }
        
        if (!foundTelegram) {
          console.log(`⚠️ No Telegram found for ${contact.name} after trying ${possibleHandles.length} patterns`);
        }
        
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`Error processing ${contact.name}:`, e.message);
        contact.verified = false;
      }
    }

    // Filter to only verified contacts
    const verifiedContacts = contacts.filter(c => c.verified !== false);
    
    console.log(`✅ Returning ${verifiedContacts.length} verified contacts, ${verifiedContacts.filter(c => c.telegram_handle).length} with Telegram`);
    res.json({ ok: true, contacts: verifiedContacts });

  } catch (e) {
    console.error("find-contacts error:", e);
    res.status(500).json({ error: "failed to find contacts", message: e.message });
  }
});

app.post("/api/targets/:id/find-website", async (req, res) => {
  try {
    const { id } = req.params;
    const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding website for ${target.team_name}...`);

    const searchPrompt = `Find the official website URL for ${target.team_name}. This is a web3/crypto company.

Search for their official website and respond with ONLY the full URL including https://.
If you cannot find an official website, respond with just the word "none".

Example responses:
- "https://uniswap.org" (for Uniswap)
- "https://aave.com" (for Aave)
- "none" (if not found)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
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

    const website = responseText.trim().toLowerCase();
    
    if (website && website !== "none" && (website.startsWith("http://") || website.startsWith("https://"))) {
      db.prepare("UPDATE targets SET website = ?, updated_at = ? WHERE id = ?").run(website, nowISO(), id);
      console.log(`✅ Found website for ${target.team_name}: ${website}`);
      res.json({ ok: true, website });
    } else {
      console.log(`❌ No website found for ${target.team_name}`);
      res.json({ ok: true, website: null });
    }

  } catch (e) {
    console.error("find-website error:", e);
    res.status(500).json({ error: "failed to find website", message: e.message });
  }
});

app.post("/api/targets/:id/find-x-handle", async (req, res) => {
  try {
    const { id } = req.params;
    const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding X handle for ${target.team_name}...`);

    const searchPrompt = `Find the official X (Twitter) handle for ${target.team_name}. This is a web3/crypto company.

Search for their official X/Twitter account and respond with ONLY the handle (without the @ symbol).
If you cannot find a verified official account, respond with just the word "none".

Example responses:
- "ethereum" (for Ethereum Foundation)
- "uniswap" (for Uniswap)
- "none" (if not found)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
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

    const handle = responseText.trim().toLowerCase().replace("@", "");
    
    if (handle && handle !== "none" && handle.length > 0 && handle.length < 50) {
      db.prepare("UPDATE targets SET x_handle = ?, updated_at = ? WHERE id = ?").run(handle, nowISO(), id);
      console.log(`✅ Found X handle for ${target.team_name}: @${handle}`);
      res.json({ ok: true, x_handle: handle });
    } else {
      console.log(`❌ No X handle found for ${target.team_name}`);
      res.json({ ok: true, x_handle: null });
    }

  } catch (e) {
    console.error("find-x-handle error:", e);
    res.status(500).json({ error: "failed to find X handle", message: e.message });
  }
});

app.post("/api/targets/research", async (req, res) => {
  try {
    const { auto_discover_x_users = false, max_users_per_team = 5 } = req.body;

    console.log("🔍 Starting autonomous team research...");
    if (auto_discover_x_users) {
      console.log("🔍 Auto-discovery enabled: will search for X users after research");
    }

    // Get existing teams to avoid duplicates
    const existingTeams = db.prepare("SELECT team_name FROM targets").all().map(t => t.team_name);
    console.log(`📋 Found ${existingTeams.length} existing teams in database`);

    // Fetch real project data from AlphaGrowth and DeFiLlama
    console.log("📊 Fetching project data from AlphaGrowth and DeFiLlama...");
    let projectsContext = "";

    try {
      const [alphaGrowthProjects, defiLlamaFees] = await Promise.all([
        fetch("https://alphagrowth.io/projects").then(r => r.text()).catch(() => null),
        fetch("https://defillama.com/fees").then(r => r.text()).catch(() => null)
      ]);

      if (alphaGrowthProjects || defiLlamaFees) {
        projectsContext = `\n\nI've fetched real project data for you to analyze:\n\n`;

        if (alphaGrowthProjects) {
          projectsContext += `AlphaGrowth Projects (excerpt):\n${alphaGrowthProjects.substring(0, 10000)}\n\n`;
        }

        if (defiLlamaFees) {
          projectsContext += `DeFiLlama Top Revenue Projects (excerpt):\n${defiLlamaFees.substring(0, 10000)}\n\n`;
        }

        console.log("✅ Fetched external project data");
      }
    } catch (fetchError) {
      console.log("⚠️ Failed to fetch external project data:", fetchError.message);
    }

    // Add existing teams to context so Claude avoids them
    const existingTeamsContext = existingTeams.length > 0
      ? `\n\nEXISTING TEAMS TO AVOID (do not include any of these):\n${existingTeams.join(", ")}\n\n`
      : "";

    const researchPrompt = `Find 15-20 web3/crypto companies that meet ALL of these criteria:
- Raised at least $10M in total funding
- Generating at least $1M in monthly revenue (or have strong revenue metrics)
- Active and well-known in 2024-2026

Search for top and trending DeFi protocols, Wallets, NFT platforms, gaming projects, etc. within web3 that Alchemy, the infrastructure company can support. Focus on applications and protocols that would benefit from blockchain infrastructure services.

DO NOT include L1/L2 chains or infrastructure companies themselves.

CRITICAL: Find NEW and DIFFERENT companies. Look for emerging projects, rising protocols, and growing platforms. Don't just return the most obvious choices.${existingTeamsContext}

IMPORTANT: You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON.

Format (copy this structure exactly):
[
  {
    "team_name": "Uniswap",
    "raised_usd": 165000000,
    "monthly_revenue_usd": 15000000,
    "x_handle": "uniswap",
    "website": "https://uniswap.org",
    "notes": "Leading DEX protocol"
  }
]

Include 15-20 companies. Focus on DeFi protocols (DEXs, lending, derivatives), wallet companies, NFT platforms, gaming projects, and other web3 applications that use blockchain infrastructure.${projectsContext}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: "You are a research assistant. Always respond with valid JSON only, no additional text.",
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: researchPrompt }]
    });

    console.log("📊 Claude research complete, parsing results...");
    
    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }
    
    console.log("Raw response:", responseText.substring(0, 500));
    
    // Try to extract and clean JSON
    let teams = [];
    
    // Remove markdown code blocks if present
    let cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to find JSON array
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        teams = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        console.error("Attempted to parse:", jsonMatch[0].substring(0, 200));
        return res.status(500).json({ 
          error: "Failed to parse Claude's response as JSON",
          details: e.message,
          sample: jsonMatch[0].substring(0, 200)
        });
      }
    } else {
      console.error("No JSON array found in response");
      return res.status(500).json({ 
        error: "No JSON array found in Claude's response",
        sample: cleanText.substring(0, 300)
      });
    }

    if (!Array.isArray(teams)) {
      return res.status(500).json({ error: "Response is not an array" });
    }

    if (teams.length === 0) {
      return res.status(500).json({ error: "No teams found in response" });
    }

    console.log(`Found ${teams.length} teams from research`);

    let inserted = 0;
    let skipped = 0;
    const ins = db.prepare(`INSERT INTO targets (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`);
    const ts = nowISO();

    for (const raw of teams) {
      const norm = {
        team_name: raw?.team_name ? String(raw.team_name).trim() : "",
        raised_usd: Number(raw?.raised_usd),
        monthly_revenue_usd: Number(raw?.monthly_revenue_usd),
        is_web3: 1,
        x_handle: raw?.x_handle ? String(raw.x_handle).replace("@", "").trim() : null,
        website: raw?.website ? String(raw.website).trim() : null,
        notes: raw?.notes ? String(raw.notes) : null,
        sources_json: JSON.stringify({ source: "claude_research", date: ts }),
      };

      if (!norm.team_name) { skipped++; continue; }
      if (!qualifiesTarget(norm)) { skipped++; continue; }

      // Check if team already exists (by name, x_handle, or website)
      const existingCheck = db.prepare(`
        SELECT id FROM targets
        WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))
        OR (? IS NOT NULL AND LOWER(TRIM(x_handle)) = LOWER(TRIM(?)))
        OR (? IS NOT NULL AND LOWER(TRIM(website)) = LOWER(TRIM(?)))
        LIMIT 1
      `).get(norm.team_name, norm.x_handle, norm.x_handle, norm.website, norm.website);

      if (existingCheck) {
        console.log(`⚠️ Skipped duplicate: ${norm.team_name} (already exists in database)`);
        skipped++;
        continue;
      }

      try {
        ins.run(nanoid(), norm.team_name, Math.trunc(norm.raised_usd), Math.trunc(norm.monthly_revenue_usd), norm.is_web3, norm.x_handle, norm.website, norm.notes, norm.sources_json, ts, ts);
        inserted++;
        console.log(`✅ Imported: ${norm.team_name}${norm.x_handle ? ' (@' + norm.x_handle + ')' : ''}${norm.website ? ' - ' + norm.website : ''}`);
      } catch (e) {
        console.log(`⚠️ Skipped duplicate (insert error): ${norm.team_name}`);
        skipped++;
      }
    }

    console.log(`✅ Research complete: ${inserted} imported, ${skipped} skipped`);

    // Auto-search contacts for newly inserted teams
    const auto_search_contacts = req.body.auto_search_contacts !== false; // Default to true

    if (auto_search_contacts && inserted > 0) {
      console.log("🔍 Starting auto-search of contacts for imported teams...");

      // Get all newly inserted teams (check by timestamp to identify recently created)
      const newlyInsertedTeams = [];
      for (const raw of teams) {
        const teamName = raw?.team_name ? String(raw.team_name).trim() : "";
        if (!teamName) continue;

        // Check if this team was just inserted (has matching timestamp)
        const target = db.prepare(`
          SELECT * FROM targets
          WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))
          AND created_at = ?
          LIMIT 1
        `).get(teamName, ts);

        if (target) {
          newlyInsertedTeams.push(target);
        }
      }

      console.log(`🔍 Will search contacts for ${newlyInsertedTeams.length} teams`);

      if (newlyInsertedTeams.length > 0) {
        // Import the helper dynamically
        import("./lib/contact-search.js").then(({ searchCompanyContacts }) => {
          // Start contact search in background (non-blocking)
          Promise.all(
            newlyInsertedTeams.map(async (target) => {
              try {
                console.log(`🔍 Searching contacts for ${target.team_name}`);
                const result = await searchCompanyContacts(target, anthropic, db, nanoid);
                console.log(`✅ Found ${result.stored} contacts for ${target.team_name}`);
              } catch (error) {
                console.error(`❌ Contact search failed for ${target.team_name}:`, error.message);
              }
            })
          ).then(() => {
            console.log("✅ Auto-contact-search completed for all teams");
          }).catch((error) => {
            console.error("❌ Auto-contact-search error:", error);
          });
        }).catch((error) => {
          console.error("❌ Failed to load contact-search module:", error);
        });
      }
    }

    // Auto-discover X users if enabled
    if (auto_discover_x_users && inserted > 0) {
      console.log("🔍 Starting auto-discovery of X users for imported teams...");

      // Get all inserted teams with x_handle
      const teamsWithXHandle = teams
        .filter(t => t.x_handle && qualifiesTarget({ ...t, is_web3: 1 }))
        .slice(0, 10); // Limit to 10 teams to avoid overwhelming

      if (teamsWithXHandle.length > 0) {
        console.log(`🔍 Will discover users for ${teamsWithXHandle.length} teams`);

        // Start discovery workflows in background
        // Don't await - let them run async to not block the response
        Promise.all(
          teamsWithXHandle.map(async (team) => {
            try {
              // Find the target ID we just created
              const target = db.prepare("SELECT id FROM targets WHERE team_name = ? ORDER BY created_at DESC LIMIT 1").get(team.team_name);

              if (target) {
                console.log(`🔍 Starting discovery for ${team.team_name} (@${team.x_handle})`);
                await workflowEngine.executeXDiscovery({
                  x_handle: team.x_handle,
                  target_id: target.id,
                  max_users: Number(max_users_per_team) || 5,
                });
              }
            } catch (error) {
              console.error(`❌ Discovery failed for ${team.team_name}:`, error.message);
            }
          })
        ).then(() => {
          console.log("✅ Auto-discovery workflows completed");
        }).catch((error) => {
          console.error("❌ Auto-discovery error:", error);
        });

        // Return immediately with discovery status
        return res.json({
          ok: true,
          found: teams.length,
          inserted,
          skipped,
          auto_discovery: {
            enabled: true,
            teams_queued: teamsWithXHandle.length,
            max_users_per_team: Number(max_users_per_team) || 5,
            message: "X user discovery running in background. Check contacts and queue in a few minutes.",
          },
        });
      } else {
        console.log("ℹ️ No teams with X handles to discover users from");
      }
    }

    res.json({ ok: true, found: teams.length, inserted, skipped });

  } catch (e) {
    console.error("Research error:", e);
    res.status(500).json({ error: "Research failed", message: e.message, details: e.toString() });
  }
});

app.post("/api/targets/import", (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  if (!items) return res.status(400).json({ error: "items must be an array" });
  let inserted = 0;
  let skipped = 0;
  const ins = db.prepare(`INSERT INTO targets (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`);
  const ts = nowISO();
  for (const raw of items) {
    const norm = {
      team_name: raw?.team_name ? String(raw.team_name).trim() : "",
      raised_usd: Number(raw?.raised_usd),
      monthly_revenue_usd: Number(raw?.monthly_revenue_usd),
      is_web3: (raw?.is_web3 === 1 || raw?.is_web3 === true || raw?.is_web3 === "1" || raw?.is_web3 === "true") ? 1 : 0,
      x_handle: raw?.x_handle ? String(raw.x_handle).replace("@", "").trim() : null,
      website: raw?.website ? String(raw.website).trim() : null,
      notes: raw?.notes ? String(raw.notes) : null,
      sources_json: raw?.sources ? JSON.stringify(raw.sources) : (raw?.sources_json || null),
    };
    if (!norm.team_name) { skipped++; continue; }
    if (!qualifiesTarget(norm)) { skipped++; continue; }
    try {
      ins.run(nanoid(), norm.team_name, Math.trunc(norm.raised_usd), Math.trunc(norm.monthly_revenue_usd), norm.is_web3, norm.x_handle, norm.website, norm.notes, norm.sources_json, ts, ts);
      inserted++;
    } catch (e) {
      skipped++;
    }
  }
  res.json({ ok: true, inserted, skipped });
});

app.post("/api/targets/:id/dismiss", (req, res) => {
  const { id } = req.params;
  const info = db.prepare(`UPDATE targets SET status = 'dismissed', updated_at = ? WHERE id = ?`).run(nowISO(), id);
  if (info.changes === 0) return res.status(404).json({ error: "target not found" });
  res.json({ ok: true });
});

app.patch("/api/targets/:id", (req, res) => {
  const { id } = req.params;
  const { x_handle, website, notes, raised_usd, monthly_revenue_usd } = req.body;

  const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "target not found" });

  try {
    db.prepare(`
      UPDATE targets
      SET x_handle = ?,
          website = ?,
          notes = ?,
          raised_usd = ?,
          monthly_revenue_usd = ?,
          updated_at = ?
      WHERE id = ?
    `).run(x_handle, website, notes, raised_usd, monthly_revenue_usd, nowISO(), id);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/targets/:id", (req, res) => {
  const { id } = req.params;

  // Get target first to find associated data
  const target = db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "target not found" });

  try {
    // Delete associated drafts first (to avoid foreign key constraint)
    const contactIds = db.prepare(`
      SELECT id FROM contacts WHERE company = ?
      UNION
      SELECT id FROM discovered_contacts WHERE target_id = ?
    `).all(target.team_name, id).map(r => r.id);

    for (const contactId of contactIds) {
      db.prepare("DELETE FROM drafts WHERE contact_id = ?").run(contactId);
    }

    // Delete discovered contacts
    db.prepare("DELETE FROM discovered_contacts WHERE target_id = ?").run(id);

    // Delete contacts by company name
    db.prepare("DELETE FROM contacts WHERE company = ?").run(target.team_name);

    // Finally delete the target
    const info = db.prepare("DELETE FROM targets WHERE id = ?").run(id);

    console.log(`🗑️ Deleted target ${target.team_name} (id: ${id})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete target error:", e);
    res.status(500).json({ error: "Failed to delete target", message: e.message });
  }
});

app.get("/api/health/claude", async (req, res) => {
  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 12,
      system: "Respond with exactly: ok",
      messages: [{ role: "user", content: "say ok" }],
    });
    res.json({ ok: true, sample: msg.content?.[0]?.text || null });
  } catch (e) {
    console.error("claude health error:", e?.status, e?.name, e?.message);
    res.status(500).json({ ok: false, status: e?.status, name: e?.name, message: e?.message });
  }
});

// Draft approval endpoint for relayer mode
app.post("/api/drafts/:id/approve", (req, res) => {
  const { id } = req.params;

  try {
    // Update draft to approved status, clear prepared_at so relayer can pick it up
    const info = db.prepare(`
      UPDATE drafts
      SET status = 'approved',
          prepared_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    console.log(`✅ Draft ${id} approved for relayer`);
    res.json({ ok: true, message: "Draft approved, relayer will process it" });
  } catch (e) {
    console.error("approve error:", e);
    res.status(500).json({ error: "Failed to approve draft", message: e.message });
  }
});

// Relayer authentication middleware
function authenticateRelayer(req, res, next) {
  const relayerApiKey = process.env.RELAYER_API_KEY;

  // Skip auth if no key configured (local development)
  if (!relayerApiKey) {
    return next();
  }

  const providedKey = req.headers['x-relayer-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!providedKey || providedKey !== relayerApiKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid relayer API key" });
  }

  next();
}

// Relayer API endpoints
app.get("/api/relayer/approved-pending", authenticateRelayer, (req, res) => {
  try {
    // Find approved drafts that haven't been prepared yet
    const rows = db.prepare(`
      SELECT
        d.id,
        d.message_text,
        d.status,
        d.updated_at,
        c.id as contact_id,
        c.name,
        c.telegram_handle,
        c.company
      FROM drafts d
      JOIN contacts c ON c.id = d.contact_id
      WHERE d.status = 'approved'
        AND (d.prepared_at IS NULL OR d.prepared_at = '')
      ORDER BY d.updated_at DESC
      LIMIT 50
    `).all();

    res.json({ ok: true, drafts: rows, count: rows.length });
  } catch (e) {
    console.error("relayer/approved-pending error:", e);
    res.status(500).json({ error: "Failed to fetch pending drafts", message: e.message });
  }
});

app.post("/api/relayer/mark-prepared/:id", authenticateRelayer, (req, res) => {
  const { id } = req.params;

  try {
    const info = db.prepare(`
      UPDATE drafts
      SET prepared_at = ?, updated_at = ?, status = 'sent'
      WHERE id = ?
    `).run(nowISO(), nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    console.log(`✅ Relayer marked draft ${id} as sent`);
    res.json({ ok: true, message: "Draft marked as sent" });
  } catch (e) {
    console.error("relayer/mark-prepared error:", e);
    res.status(500).json({ error: "Failed to mark draft as prepared", message: e.message });
  }
});

app.post("/api/relayer/mark-failed/:id", authenticateRelayer, (req, res) => {
  const { id } = req.params;
  const { error: errorMessage } = req.body;

  try {
    // Clear prepared_at to allow retry
    const info = db.prepare(`
      UPDATE drafts
      SET prepared_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    console.log(`⚠️ Relayer reported failure for draft ${id}: ${errorMessage || 'Unknown error'}`);
    res.json({ ok: true, message: "Draft reset for retry" });
  } catch (e) {
    console.error("relayer/mark-failed error:", e);
    res.status(500).json({ error: "Failed to mark draft as failed", message: e.message });
  }
});

// Get draft queue (standalone route for backward compatibility)
app.get("/api/queue", (req, res) => {
  const rows = db.prepare(
    `SELECT d.*, c.name, c.company, c.title, c.telegram_handle FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.status IN ('queued','approved') ORDER BY d.created_at ASC`
  ).all();
  res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
});

// Mount contact and draft routes
app.use("/api/contacts", createContactRoutes(db, nanoid, nowISO));
app.use("/api/drafts", createDraftRoutes(
  db,
  nanoid,
  nowISO,
  tgLinks,
  generateOutbound,
  generateFollowUp,
  setClipboardMac,
  openTelegramDesktopLink,
  pasteIntoTelegram,
  scheduleTelegramAutoSend,
  cancelTelegramAutoSend
));

// Initialize WorkflowEngine
const workflowEngine = new WorkflowEngine(db, anthropic, generateOutbound, nowISO, nanoid);

// Mount workflow routes (must come BEFORE other target routes)
app.use("/api/workflow", createWorkflowRoutes(workflowEngine));

// Note: createTargetRoutes adds routes to /api/targets/:id/discover-x-users
// This must be registered AFTER other /api/targets routes to avoid conflicts
const targetDiscoveryRouter = createTargetRoutes(db, workflowEngine, anthropic, nanoid, nowISO, qualifiesTarget, apolloClient);
app.use("/api/targets", targetDiscoveryRouter);

(async () => {
  // Fetch Alchemy Data API documentation
  let ALCHEMY_DATA_INFO = "";
  try {
    console.log("🔍 Fetching Alchemy Data API documentation...");
    const response = await fetch("https://alchemy.com/docs/data.md");
    if (response.ok) {
      ALCHEMY_DATA_INFO = await response.text();
      console.log("📘 Loaded Alchemy Data API documentation");
      
      // Save to cache for offline use
      try {
        fs.writeFileSync(path.join(process.cwd(), "alchemy_data_cache.md"), ALCHEMY_DATA_INFO, "utf8");
      } catch (e) {
        // Ignore cache errors
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn("⚠️ Could not fetch Data API docs:", e.message);
    // Try loading from cache
    try {
      ALCHEMY_DATA_INFO = fs.readFileSync(path.join(process.cwd(), "alchemy_data_cache.md"), "utf8");
      console.log("📘 Loaded Data API docs from cache");
    } catch (e2) {
      console.warn("⚠️ No cached Data API docs available");
    }
  }

  // Fetch Alchemy Node API documentation
  let ALCHEMY_NODE_INFO = "";
  try {
    console.log("🔍 Fetching Alchemy Node API documentation...");
    const response = await fetch("https://alchemy.com/docs/node.md");
    if (response.ok) {
      ALCHEMY_NODE_INFO = await response.text();
      console.log("📘 Loaded Alchemy Node API documentation");
      
      // Save to cache for offline use
      try {
        fs.writeFileSync(path.join(process.cwd(), "alchemy_node_cache.md"), ALCHEMY_NODE_INFO, "utf8");
      } catch (e) {
        // Ignore cache errors
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn("⚠️ Could not fetch Node API docs:", e.message);
    // Try loading from cache
    try {
      ALCHEMY_NODE_INFO = fs.readFileSync(path.join(process.cwd(), "alchemy_node_cache.md"), "utf8");
      console.log("📘 Loaded Node API docs from cache");
    } catch (e2) {
      console.warn("⚠️ No cached Node API docs available");
    }
  }

  // Make available globally
  global.ALCHEMY_DATA_INFO = ALCHEMY_DATA_INFO;
  global.ALCHEMY_NODE_INFO = ALCHEMY_NODE_INFO;

  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`✅ Console running at http://localhost:${port}`);
  });
})();
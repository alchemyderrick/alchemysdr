import { searchUsersWithCompanyInBio } from "./x-search.js";
import { validateTelegramUsernames } from "./telegram-validator.js";
import puppeteerManager from "./puppeteer-manager.js";

/**
 * WorkflowEngine orchestrates the X → Telegram → Contact/Draft workflow
 */
export class WorkflowEngine {
  static lastExecutionTime = 0;
  static COOLDOWN_MS = 5000; // 5 seconds between workflows

  constructor(db, anthropic, generateOutboundFn, nowISOFn, nanoidFn) {
    this.db = db;
    this.anthropic = anthropic;
    this.generateOutbound = generateOutboundFn;
    this.nowISO = nowISOFn;
    this.nanoid = nanoidFn;
  }

  /**
   * Execute X discovery workflow
   * @param {Object} options - { x_handle, target_id?, max_users, sessionId? }
   * @returns {Object} - { valid, invalid, contacts_created, drafts_generated, users }
   */
  async executeXDiscovery(options) {
    const { x_handle, target_id = null, max_users = 5, sessionId = null } = options;

    // Rate limiting: enforce cooldown between workflows
    const now = Date.now();
    const timeSinceLastExecution = now - WorkflowEngine.lastExecutionTime;

    if (timeSinceLastExecution < WorkflowEngine.COOLDOWN_MS && WorkflowEngine.lastExecutionTime > 0) {
      const waitTime = WorkflowEngine.COOLDOWN_MS - timeSinceLastExecution;
      console.log(`[WORKFLOW] Rate limiting: waiting ${Math.ceil(waitTime / 1000)}s before starting...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    WorkflowEngine.lastExecutionTime = Date.now();

    console.log(`[WORKFLOW] Starting X discovery for @${x_handle} (max: ${max_users})`);

    try {
      // Check how many X discovery contacts already exist for this company
      const companyName = target_id ?
        this.db.prepare("SELECT team_name FROM targets WHERE id = ?").get(target_id)?.team_name || x_handle.replace("@", "") :
        x_handle.replace("@", "");

      // Only use pagination offset when triggered from target card (has target_id)
      // Manual "Discover Users" button always searches first 10 results
      let offset = 0;

      if (target_id) {
        const existingCount = this.db.prepare(`
          SELECT COUNT(*) as count
          FROM contacts
          WHERE company = ? AND source = 'x_discovery'
        `).get(companyName)?.count || 0;

        console.log(`[WORKFLOW] Found ${existingCount} existing X discovery contacts for ${companyName}`);
        offset = existingCount;
      } else {
        console.log(`[WORKFLOW] Manual X discovery - searching first 10 results`);
      }

      // Step 1: Search X for users with company in bio (with offset)
      console.log(`[WORKFLOW] Step 1/4: Searching X for users (starting from result ${offset + 1})...`);
      const xUsers = await searchUsersWithCompanyInBio(x_handle, max_users, offset, sessionId);

      if (xUsers.length === 0) {
        console.log("[WORKFLOW] No users found with company in bio");
        return {
          valid: 0,
          invalid: 0,
          contacts_created: 0,
          drafts_generated: 0,
          message: "No users found with company in bio",
          users: [],
        };
      }

      console.log(`[WORKFLOW] Found ${xUsers.length} users with company in bio`);

      // Step 2: Validate Telegram usernames
      console.log("[WORKFLOW] Step 2/4: Validating Telegram accounts...");
      const usernames = xUsers.map((u) => u.x_username);
      const telegramValidations = await validateTelegramUsernames(usernames, 5);

      // Map validations back to users
      const usersWithValidation = xUsers.map((user) => {
        const validation = telegramValidations.find((v) => v.username === user.x_username);
        return { ...user, telegram_validation: validation };
      });

      // Split into valid and invalid
      const validUsers = usersWithValidation.filter((u) => u.telegram_validation?.valid === true);
      const invalidUsers = usersWithValidation.filter((u) => u.telegram_validation?.valid !== true);

      console.log(`[WORKFLOW] Telegram validation: ${validUsers.length} valid, ${invalidUsers.length} invalid`);

      // Step 3: Get or create target information
      let targetInfo = null;
      let finalTargetId = target_id;

      if (target_id) {
        // Target ID provided (triggered from target card)
        targetInfo = this.db.prepare("SELECT * FROM targets WHERE id = ?").get(target_id);
      } else {
        // No target ID (manual X discovery) - create or find target
        console.log("[WORKFLOW] No target provided, creating/finding target for X discovery...");

        // Try to find existing target by X handle
        const cleanHandle = x_handle.replace("@", "");
        const existing = this.db.prepare(`
          SELECT * FROM targets
          WHERE x_handle = ? OR LOWER(x_handle) = LOWER(?)
          LIMIT 1
        `).get(cleanHandle, cleanHandle);

        if (existing) {
          console.log(`[WORKFLOW] Found existing target: ${existing.team_name}`);
          targetInfo = existing;
          finalTargetId = existing.id;
        } else {
          // Create new target for this X handle
          const newTargetId = this.nanoid();
          const teamName = companyName.charAt(0).toUpperCase() + companyName.slice(1); // Capitalize

          this.db.prepare(`
            INSERT INTO targets
            (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, status, created_at, updated_at)
            VALUES (?, ?, 0, 0, 1, ?, 'approved', ?, ?)
          `).run(
            newTargetId,
            teamName,
            cleanHandle,
            this.nowISO(),
            this.nowISO()
          );

          console.log(`[WORKFLOW] Created new target: ${teamName} (@${cleanHandle})`);

          targetInfo = {
            id: newTargetId,
            team_name: teamName,
            x_handle: cleanHandle,
            status: 'approved'
          };
          finalTargetId = newTargetId;
        }
      }

      // Step 4: Create contacts and drafts
      // Use target's team_name for contacts (not the X handle) to ensure proper matching
      const finalCompanyName = targetInfo ? targetInfo.team_name : companyName;
      console.log("[WORKFLOW] Step 3/4: Creating contacts for valid users...");
      let draftsGenerated = 0;

      for (const user of validUsers) {
        try {
          // Check if contact already exists
          const existing = this.db.prepare(`
            SELECT id FROM contacts
            WHERE company = ?
            AND (x_username = ? OR telegram_handle = ?)
            LIMIT 1
          `).get(finalCompanyName, user.x_username, user.telegram_validation.username);

          if (existing) {
            console.log(`[WORKFLOW] ⚠️ Skipped duplicate contact for @${user.x_username} (already exists)`);
            continue;
          }

          const contactId = this.nanoid();

          // Create contact
          this.db
            .prepare(
              `
            INSERT INTO contacts
            (id, name, company, title, telegram_handle, notes, x_username, x_bio, source, telegram_validated, telegram_validation_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'x_discovery', 1, ?, ?)
          `
            )
            .run(
              contactId,
              user.display_name,
              finalCompanyName,
              "Discovered via X",
              user.telegram_validation.username,
              `Found via X bio: "${user.x_bio}"`,
              user.x_username,
              user.x_bio,
              user.telegram_validation.checked_at,
              this.nowISO()
            );

          console.log(`[WORKFLOW] ✅ Created contact for @${user.x_username} (Telegram: @${user.telegram_validation.username})`);

          // Generate draft message
          const contact = {
            id: contactId,
            name: user.display_name,
            company: finalCompanyName,
            title: "Discovered via X",
            telegram_handle: user.telegram_validation.username,
            notes: `Found via X bio: "${user.x_bio}"`,
          };

          const messageText = await this.generateOutbound(contact);

          // Create draft
          const draftId = this.nanoid();
          this.db
            .prepare(
              `
            INSERT INTO drafts
            (id, contact_id, channel, message_text, status, created_at, updated_at)
            VALUES (?, ?, 'telegram', ?, 'queued', ?, ?)
          `
            )
            .run(draftId, contactId, messageText, this.nowISO(), this.nowISO());

          console.log(`[WORKFLOW] ✅ Generated draft for @${user.x_username}`);
          draftsGenerated++;
        } catch (error) {
          console.error(`[WORKFLOW] Error creating contact/draft for @${user.x_username}:`, error.message);
        }
      }

      // Step 4b: Create contacts for invalid users (no Telegram)
      console.log("[WORKFLOW] Step 4/4: Creating contacts for invalid users...");

      for (const user of invalidUsers) {
        try {
          // Check if contact already exists
          const existing = this.db.prepare(`
            SELECT id FROM contacts
            WHERE company = ?
            AND x_username = ?
            LIMIT 1
          `).get(finalCompanyName, user.x_username);

          if (existing) {
            console.log(`[WORKFLOW] ⚠️ Skipped duplicate contact for @${user.x_username} (already exists)`);
            continue;
          }

          const contactId = this.nanoid();

          // Create contact with note about no Telegram
          this.db
            .prepare(
              `
            INSERT INTO contacts
            (id, name, company, title, telegram_handle, notes, x_username, x_bio, source, telegram_validated, telegram_validation_date, created_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?, ?, 'x_discovery', -1, ?, ?)
          `
            )
            .run(
              contactId,
              user.display_name,
              finalCompanyName,
              "Discovered via X (No Telegram)",
              `No TG contact found. X: @${user.x_username}, Bio: "${user.x_bio}"`,
              user.x_username,
              user.x_bio,
              user.telegram_validation?.checked_at || this.nowISO(),
              this.nowISO()
            );

          console.log(`[WORKFLOW] ℹ️ Created contact for @${user.x_username} (no Telegram)`);
        } catch (error) {
          console.error(`[WORKFLOW] Error creating contact for @${user.x_username}:`, error.message);
        }
      }

      // Update target's updated_at timestamp to keep it visible in Active Outreach
      if (finalTargetId) {
        this.db.prepare(`
          UPDATE targets
          SET updated_at = ?
          WHERE id = ?
        `).run(this.nowISO(), finalTargetId);
      }

      // Final results
      const result = {
        valid: validUsers.length,
        invalid: invalidUsers.length,
        contacts_created: validUsers.length + invalidUsers.length,
        drafts_generated: draftsGenerated,
        users: usersWithValidation,
      };

      console.log(
        `[WORKFLOW] ✅ Workflow complete: ${result.valid} valid, ${result.invalid} invalid, ${result.drafts_generated} drafts generated`
      );

      // Restart browser if needed
      if (puppeteerManager.shouldRestart()) {
        console.log("[WORKFLOW] Browser restart needed, cleaning up...");
        await puppeteerManager.restart();
      }

      return result;
    } catch (error) {
      console.error("[WORKFLOW] Workflow error:", error.message);
      throw error;
    }
  }

  /**
   * Execute X discovery for multiple companies (batch mode)
   */
  async executeXDiscoveryBatch(companies, maxUsersPerCompany = 5) {
    console.log(`[WORKFLOW-BATCH] Starting batch discovery for ${companies.length} companies`);

    const results = [];

    for (const company of companies) {
      try {
        const result = await this.executeXDiscovery({
          x_handle: company.x_handle,
          target_id: company.id,
          max_users: maxUsersPerCompany,
        });

        results.push({
          company: company.x_handle,
          target_id: company.id,
          ...result,
        });

        // Delay between companies to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`[WORKFLOW-BATCH] Error processing ${company.x_handle}:`, error.message);
        results.push({
          company: company.x_handle,
          target_id: company.id,
          error: error.message,
        });
      }
    }

    console.log(`[WORKFLOW-BATCH] Batch complete: processed ${results.length} companies`);
    return results;
  }
}

export default WorkflowEngine;

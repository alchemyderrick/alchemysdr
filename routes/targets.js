import { Router } from "express";
import { searchCompanyContacts } from "../lib/contact-search.js";

/**
 * Target routes
 * Handles target management and discovery workflows
 * NOTE: db is now accessed via req.db (set by authentication middleware)
 */
export function createTargetRoutes(workflowEngine, anthropic, nanoid, nowISO, qualifiesTarget, apolloClient, generateOutbound) {
  const router = Router();

  // Target-triggered X discovery: discover users for a specific target
  router.post("/:id/discover-x-users", async (req, res) => {
    try {
      const { id } = req.params;
      const { max_users = 5 } = req.body;

      // Get target
      const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);

      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }

      if (!target.x_handle) {
        return res.status(400).json({ error: "Target has no X handle" });
      }

      console.log(`[API] Starting X discovery for target ${target.team_name} (@${target.x_handle})`);

      const result = await workflowEngine.executeXDiscovery({
        x_handle: target.x_handle,
        target_id: id,
        max_users: Number(max_users) || 5,
        employeeDb: req.db, // Pass employee-specific database
      });

      res.json(result);
    } catch (error) {
      console.error("[API] Target X discovery error:", error);
      res.status(500).json({
        error: "Workflow failed",
        message: error.message,
      });
    }
  });

  // Find all contacts at a company via Google and LinkedIn
  router.post("/:id/all-contacts", async (req, res) => {
    try {
      const { id } = req.params;

      // Get target
      const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);

      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }

      console.log(`[API] Searching for all contacts at ${target.team_name}`);

      // Use the contact search helper
      const result = await searchCompanyContacts(target, anthropic, req.db, nanoid, nowISO, apolloClient);

      // Generate drafts for contacts with Telegram handles
      let draftsGenerated = 0;
      const now = nowISO();

      for (const contact of result.contacts) {
        // Only generate drafts for contacts with Telegram handles
        if (contact.telegram_handle) {
          try {
            // Check if contact already exists in contacts table (from discovered_contacts)
            const existingContact = req.db.prepare(`
              SELECT id FROM contacts WHERE company = ? AND name = ?
            `).get(target.team_name, contact.name);

            let contactId;
            if (existingContact) {
              contactId = existingContact.id;
              console.log(`[API] Using existing contact ${contactId} for ${contact.name}`);
            } else {
              // Create contact entry
              contactId = nanoid();
              req.db.prepare(`
                INSERT INTO contacts (id, name, company, title, telegram_handle, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                contactId,
                contact.name,
                target.team_name,
                contact.title || null,
                contact.telegram_handle,
                `Discovered via ${contact.source}`,
                now
              );
              console.log(`[API] Created contact ${contactId} for ${contact.name}`);
            }

            // Check if draft already exists for this contact
            const existingDraft = req.db.prepare(`
              SELECT id FROM drafts WHERE contact_id = ?
            `).get(contactId);

            if (!existingDraft) {
              // Get the full contact record to pass to generateOutbound
              const fullContact = req.db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(contactId);

              // Generate message text
              const messageText = await generateOutbound(fullContact, false);

              // Create draft
              const draftId = nanoid();
              req.db.prepare(`
                INSERT INTO drafts (id, contact_id, channel, message_text, status, prepared_at, created_at, updated_at)
                VALUES (?, ?, 'telegram', ?, 'queued', NULL, ?, ?)
              `).run(draftId, contactId, messageText, now, now);

              draftsGenerated++;
              console.log(`[API] Generated draft ${draftId} for ${contact.name}`);
            } else {
              console.log(`[API] Draft already exists for ${contact.name}, skipping`);
            }
          } catch (draftError) {
            console.error(`[API] Error generating draft for ${contact.name}:`, draftError.message);
            // Continue with other contacts even if one fails
          }
        }
      }

      console.log(`[API] Generated ${draftsGenerated} drafts from ${result.contacts.length} contacts`);

      res.json({
        contacts: result.contacts,
        stored: result.stored,
        drafts_generated: draftsGenerated,
        message: result.stored === 0 ? "All contacts already stored" : `Found ${result.contacts.length} contacts`
      });
    } catch (error) {
      console.error("[API] All contacts search error:", error);
      res.status(500).json({
        error: "Search failed",
        message: error.message,
      });
    }
  });

  // Delete a contact
  router.delete("/:id/contacts/:contact_id", async (req, res) => {
    try {
      const { id, contact_id } = req.params;

      // Get target
      const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);

      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }

      // Delete associated drafts first (to avoid foreign key constraint)
      const draftsDeleted = req.db.prepare("DELETE FROM drafts WHERE contact_id = ?").run(contact_id);

      // Delete from discovered_contacts table
      const result1 = req.db.prepare("DELETE FROM discovered_contacts WHERE id = ? AND target_id = ?").run(contact_id, id);

      // Delete from contacts table
      const result2 = req.db.prepare("DELETE FROM contacts WHERE id = ? AND company = ?").run(contact_id, target.team_name);

      console.log(`[API] Deleted contact ${contact_id} for ${target.team_name} (drafts: ${draftsDeleted.changes}, discovered: ${result1.changes}, contacts: ${result2.changes})`);

      res.json({ success: true });
    } catch (error) {
      console.error("[API] Delete contact error:", error);
      res.status(500).json({
        error: "Failed to delete contact",
        message: error.message,
      });
    }
  });

  // View previously discovered contacts
  router.get("/:id/view-contacts", async (req, res) => {
    try {
      const { id } = req.params;

      // Get target
      const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);

      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }

      // Get stored contacts from discovered_contacts table
      const webContacts = req.db.prepare(`
        SELECT * FROM discovered_contacts
        WHERE target_id = ?
        ORDER BY discovered_at DESC
      `).all(id);

      // Get X discovery contacts from contacts table
      const xContacts = req.db.prepare(`
        SELECT id, name, title, telegram_handle, x_username, x_bio, created_at
        FROM contacts
        WHERE company = ?
        ORDER BY created_at DESC
      `).all(target.team_name);

      // Merge both sources
      const allContacts = [
        ...webContacts,
        ...xContacts.map(c => ({
          id: c.id,
          name: c.name,
          title: c.title || "",
          email: "",
          phone: "",
          linkedin: "",
          telegram_handle: c.telegram_handle,
          x_username: c.x_username,
          source: "x_discovery",
          discovered_at: c.created_at
        }))
      ];

      // Deduplicate contacts by Telegram username and first name
      const seenTelegram = new Set();
      const seenFirstNames = new Set();
      const uniqueContacts = [];

      for (const contact of allContacts) {
        let isDuplicate = false;

        // Check for duplicate Telegram username
        if (contact.telegram_handle) {
          const cleanTelegram = contact.telegram_handle.replace(/^@/, '').toLowerCase();
          if (seenTelegram.has(cleanTelegram)) {
            isDuplicate = true;
          } else {
            seenTelegram.add(cleanTelegram);
          }
        }

        // Check for duplicate first name (only if name has one word)
        if (!isDuplicate && contact.name) {
          const nameParts = contact.name.trim().split(/\s+/);
          if (nameParts.length === 1) {
            // Only one name (first name only)
            const firstName = nameParts[0].toLowerCase();
            if (seenFirstNames.has(firstName)) {
              isDuplicate = true;
            } else {
              seenFirstNames.add(firstName);
            }
          }
        }

        if (!isDuplicate) {
          uniqueContacts.push(contact);
        } else {
          console.log(`[API] Skipped duplicate contact: ${contact.name} (Telegram: ${contact.telegram_handle || 'none'})`);
        }
      }

      console.log(`[API] Deduplication: ${allContacts.length} contacts -> ${uniqueContacts.length} unique contacts`);

      // Sort contacts by priority: Telegram (any source) > Twitter > Apollo > Web
      const sortedContacts = uniqueContacts.sort((a, b) => {
        const getPriority = (contact) => {
          const hasTelegram = !!contact.telegram_handle;

          // Priority 1: ANY contact with Telegram handle (regardless of source)
          if (hasTelegram) return 1;

          // Priority 2: Twitter/X contacts (without Telegram)
          if (contact.source === "x_discovery") return 2;

          // Priority 3: Apollo contacts (without Telegram)
          if (contact.source === "apollo") return 3;

          // Priority 4: Web search contacts (without Telegram)
          if (contact.source === "web_search") return 4;

          // Priority 5: Everything else (manual without Telegram, etc.)
          return 5;
        };

        const priorityA = getPriority(a);
        const priorityB = getPriority(b);

        return priorityA - priorityB;
      });

      console.log(`[API] Retrieved ${webContacts.length} web contacts + ${xContacts.length} X contacts = ${allContacts.length} total for ${target.team_name}`);

      res.json({ contacts: sortedContacts });
    } catch (error) {
      console.error("[API] View contacts error:", error);
      res.status(500).json({
        error: "Failed to retrieve contacts",
        message: error.message,
      });
    }
  });

  return router;
}

export default createTargetRoutes;

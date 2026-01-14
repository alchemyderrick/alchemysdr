import { Router } from "express";

/**
 * Contact routes
 * NOTE: db is now accessed via req.db (set by authentication middleware)
 */
export function createContactRoutes(nanoid, nowISO, generateOutbound) {
  const router = Router();

  // Create a new contact
  router.post("/", (req, res) => {
    const { name, company, title, telegram_handle, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!company) return res.status(400).json({ error: "company is required" });
    const id = nanoid();
    req.db.prepare(`INSERT INTO contacts (id, name, company, title, telegram_handle, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id,
      name,
      company || null,
      title || null,
      telegram_handle || null,
      notes || null,
      nowISO()
    );
    res.json({ id });
  });

  // Add contact and generate draft (used by frontend Add Contact card)
  router.post("/add-generate", async (req, res) => {
    try {
      const { name, company, title, telegram_handle, notes, has_question } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });
      if (!company) return res.status(400).json({ error: "company is required" });

      const contactId = nanoid();
      req.db.prepare(`INSERT INTO contacts (id, name, company, title, telegram_handle, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        contactId,
        name,
        company || null,
        title || null,
        telegram_handle || null,
        notes || null,
        nowISO()
      );

      // Get the contact we just created
      const contact = req.db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(contactId);

      // Generate the message text using AI
      const messageText = await generateOutbound(contact, false);

      // Create a draft with the generated message
      const draftId = nanoid();
      const now = nowISO();
      req.db.prepare(`
        INSERT INTO drafts (id, contact_id, channel, message_text, status, prepared_at, created_at, updated_at)
        VALUES (?, ?, 'telegram', ?, 'queued', ?, ?, ?)
      `).run(draftId, contactId, messageText, now, now, now);

      res.json({ contact_id: contactId, draft_id: draftId, message: messageText });
    } catch (error) {
      console.error('Error in add-generate:', error);
      res.status(500).json({ error: error.message || 'Failed to generate draft' });
    }
  });

  // Update a contact
  router.patch("/:id", (req, res) => {
    const { id } = req.params;
    const { name, company, telegram_handle } = req.body;

    // Validate that at least one field is provided
    if (!name && !company && !telegram_handle) {
      return res.status(400).json({ error: "At least one field (name, company, telegram_handle) is required" });
    }

    // Check if contact exists
    const contact = req.db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id);
    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push("name = ?");
      values.push(name);
    }
    if (company !== undefined) {
      updates.push("company = ?");
      values.push(company);
    }
    if (telegram_handle !== undefined) {
      updates.push("telegram_handle = ?");
      values.push(telegram_handle);
    }

    values.push(id);

    req.db.prepare(`UPDATE contacts SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    // Return updated contact
    const updatedContact = req.db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id);
    res.json(updatedContact);
  });

  return router;
}

export default createContactRoutes;

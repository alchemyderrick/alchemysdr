import { Router } from "express";

/**
 * Contact routes
 */
export function createContactRoutes(db, nanoid, nowISO, generateOutbound) {
  const router = Router();

  // Create a new contact
  router.post("/", (req, res) => {
    const { name, company, title, telegram_handle, notes } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    if (!company) return res.status(400).json({ error: "company is required" });
    const id = nanoid();
    db.prepare(`INSERT INTO contacts (id, name, company, title, telegram_handle, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
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
      db.prepare(`INSERT INTO contacts (id, name, company, title, telegram_handle, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
        contactId,
        name,
        company || null,
        title || null,
        telegram_handle || null,
        notes || null,
        nowISO()
      );

      // Get the contact we just created
      const contact = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(contactId);

      // Generate the message text using AI
      const messageText = await generateOutbound(contact, false);

      // Create a draft with the generated message
      const draftId = nanoid();
      const now = nowISO();
      db.prepare(`
        INSERT INTO drafts (id, contact_id, channel, message_text, status, prepared_at, created_at, updated_at)
        VALUES (?, ?, 'telegram', ?, 'queued', ?, ?, ?)
      `).run(draftId, contactId, messageText, now, now, now);

      res.json({ contact_id: contactId, draft_id: draftId, message: messageText });
    } catch (error) {
      console.error('Error in add-generate:', error);
      res.status(500).json({ error: error.message || 'Failed to generate draft' });
    }
  });

  return router;
}

export default createContactRoutes;

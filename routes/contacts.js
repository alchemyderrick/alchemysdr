import { Router } from "express";

/**
 * Contact routes
 */
export function createContactRoutes(db, nanoid, nowISO) {
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

  return router;
}

export default createContactRoutes;

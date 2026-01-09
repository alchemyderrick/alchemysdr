import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

/**
 * Draft routes
 */
export function createDraftRoutes(
  db,
  nanoid,
  nowISO,
  tgLinks,
  generateOutbound,
  generateOutboundWithFeedback,
  generateFollowUp,
  setClipboardMac,
  openTelegramDesktopLink,
  pasteIntoTelegram,
  scheduleTelegramAutoSend,
  cancelTelegramAutoSend,
  splitIntoParagraphs,
  sendMultiParagraphMessage
) {
  const router = Router();

  const SDR_STYLE_FILE = path.join(process.cwd(), "Successful SDR Messaging.txt");
  const AUTO_SEND_ENABLED = String(process.env.AUTO_SEND_ENABLED || "true").toLowerCase() !== "false";
  const AUTO_SEND_IDLE_SECONDS = Number(process.env.AUTO_SEND_IDLE_SECONDS || 5);

  // Get all drafts with contact information
  router.get("/", (req, res) => {
    const rows = db.prepare(`
      SELECT d.*, c.name, c.company, c.title, c.telegram_handle
      FROM drafts d
      JOIN contacts c ON c.id = d.contact_id
      ORDER BY d.created_at DESC
    `).all();
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Generate a draft message for a contact
  router.post("/generate", async (req, res) => {
    try {
      const { contact_id } = req.body;
      if (!contact_id) return res.status(400).json({ error: "contact_id is required" });
      const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(contact_id);
      if (!contact) return res.status(404).json({ error: "contact not found" });
      const message_text = await generateOutbound(contact);
      const id = nanoid();
      const ts = nowISO();
      db.prepare(
        `INSERT INTO drafts (id, contact_id, channel, message_text, status, prepared_at, created_at, updated_at) VALUES (?, ?, 'telegram', ?, 'queued', NULL, ?, ?)`
      ).run(id, contact_id, message_text, ts, ts);
      res.json({ id, message_text });
    } catch (e) {
      console.error("generate draft error:", e?.status, e?.name, e?.message);
      res.status(500).json({
        error: "failed to generate draft",
        status: e?.status,
        name: e?.name,
        message: e?.message,
      });
    }
  });

  // Regenerate a draft message
  router.post("/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;

      const draft = db.prepare(
        `SELECT d.*, c.* FROM drafts d JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?`
      ).get(id);
      if (!draft) return res.status(404).json({ error: "draft not found" });

      console.log(`🔄 Regenerating message for ${draft.name} at ${draft.company}`);
      if (feedback) {
        console.log(`📝 User feedback: "${feedback}"`);
      }

      // Store previous message for feedback history
      const previousMessage = draft.message_text;

      // Generate new message (with or without feedback)
      const message_text = feedback
        ? await generateOutboundWithFeedback(draft, feedback)
        : await generateOutbound(draft, true);

      // Update the draft with new message
      const ts = nowISO();
      db.prepare(
        `UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`
      ).run(message_text, ts, id);

      // If feedback was provided, save to feedback history
      if (feedback) {
        const feedbackId = nanoid();
        db.prepare(
          `INSERT INTO draft_feedback (id, draft_id, feedback_text, previous_message, regenerated_message, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(feedbackId, id, feedback, previousMessage, message_text, ts);
        console.log(`✅ Saved feedback history (ID: ${feedbackId})`);
      }

      res.json({ message_text });
    } catch (e) {
      console.error("regenerate draft error:", e?.status, e?.name, e?.message);
      res.status(500).json({
        error: "failed to regenerate draft",
        status: e?.status,
        name: e?.name,
        message: e?.message,
      });
    }
  });

  // Get follow-up drafts
  router.get("/followups", (req, res) => {
    const rows = db.prepare(
      `SELECT d.*, c.name, c.company, c.title, c.telegram_handle FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.status = 'followup' ORDER BY d.updated_at DESC LIMIT 50`
    ).all();
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Get full conversation history for a contact (original sent + all follow-ups)
  router.get("/contact/:contact_id/history", (req, res) => {
    const { contact_id } = req.params;
    const rows = db.prepare(
      `SELECT d.*, c.name, c.company, c.title, c.telegram_handle
       FROM drafts d
       JOIN contacts c ON c.id = d.contact_id
       WHERE d.contact_id = ?
       AND d.status IN ('sent', 'followup')
       ORDER BY d.updated_at ASC`
    ).all(contact_id);
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Get sent drafts (exclude contacts that have follow-ups)
  router.get("/sent", (req, res) => {
    const rows = db.prepare(
      `SELECT d.*, c.name, c.company, c.title, c.telegram_handle
       FROM drafts d
       JOIN contacts c ON c.id = d.contact_id
       WHERE d.status = 'sent'
       AND NOT EXISTS (
         SELECT 1 FROM drafts d2
         WHERE d2.contact_id = d.contact_id
         AND d2.status = 'followup'
       )
       ORDER BY d.updated_at DESC
       LIMIT 50`
    ).all();
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Update draft message
  router.post("/:id/update", (req, res) => {
    const { id } = req.params;
    const { message_text } = req.body;
    if (!message_text) return res.status(400).json({ error: "message_text is required" });
    const info = db.prepare(`UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`).run(
      message_text,
      nowISO(),
      id
    );
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  // Approve a draft
  router.post("/:id/approve", (req, res) => {
    const { id } = req.params;

    // Get draft with contact info for saving to style file
    const row = db.prepare(
      `SELECT d.*, c.name, c.company FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`
    ).get(id);
    if (!row) return res.status(404).json({ error: "draft not found" });

    const info = db.prepare(`UPDATE drafts SET status = 'approved', updated_at = ? WHERE id = ?`).run(nowISO(), id);
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });

    // Save approved message to SDR style file for future learning
    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const entry = `\n\n--- Message approved ${timestamp} ---\nContact: ${row.name} at ${row.company}\nMessage:\n${row.message_text}\n---`;
      fs.appendFileSync(SDR_STYLE_FILE, entry, "utf8");
      console.log(`✅ Saved approved message to ${SDR_STYLE_FILE}`);
    } catch (e) {
      console.error("Failed to save approved message to style file:", e.message);
      // Don't fail the request if file append fails
    }

    res.json({ ok: true });
  });

  // Update draft message
  router.patch("/:id", (req, res) => {
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text || typeof message_text !== "string") {
      return res.status(400).json({ error: "message_text is required" });
    }

    const info = db.prepare(`UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`)
      .run(message_text.trim(), nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "draft not found" });
    }

    res.json({ ok: true, message_text: message_text.trim() });
  });

  // Approve, open Telegram, and paste message
  router.post("/:id/approve-open-telegram", async (req, res) => {
    try {
      if (process.platform !== "darwin")
        return res.status(400).json({ error: "Telegram automation only on macOS" });
      const { id } = req.params;
      const overrideText =
        req.body && typeof req.body.message_text === "string" ? req.body.message_text : null;
      const row = db.prepare(
        `SELECT d.*, c.telegram_handle, c.name, c.company, c.x_username, c.email FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`
      ).get(id);
      if (!row) return res.status(404).json({ error: "draft not found" });

      // Mark as sent immediately (instead of just approved)
      const info = db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`).run(nowISO(), id);
      if (info.changes === 0) return res.status(404).json({ error: "draft not found" });

      const textToSend = overrideText ?? row.message_text;

      // Append successful message to SDR style file
      try {
        const timestamp = new Date().toISOString().split("T")[0];
        const entry = `\n\n--- Message sent ${timestamp} ---\nContact: ${row.name} at ${row.company}\nMessage:\n${textToSend}\n---`;
        fs.appendFileSync(SDR_STYLE_FILE, entry, "utf8");
        console.log(`✅ Saved successful message to ${SDR_STYLE_FILE}`);
      } catch (e) {
        console.error("Failed to save message to style file:", e.message);
        // Don't fail the request if file append fails
      }

      // Send data to Clay webhook
      try {
        const target = db.prepare("SELECT team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website FROM targets WHERE team_name = ?").get(row.company);

        const webhookUrl = process.env.CLAY_WEBHOOK_URL || "https://api.clay.com/v3/sources/webhook/pull-in-data-from-a-webhook-c4374a91-d3c7-4a84-905c-9069c0d4a514";

        const webhookPayload = {
          team_name: target?.team_name || row.company || null,
          raised_usd: target?.raised_usd || 0,
          monthly_revenue_usd: target?.monthly_revenue_usd || 0,
          is_web3: target?.is_web3 === 1,
          x_handle: target?.x_handle || null,
          website: target?.website || null,
          timestamp: new Date().toISOString(),
          contact_name: row.name,
          contact_email: row.email || null,
          contact_telegram_handle: row.telegram_handle || null,
          contact_x_username: row.x_username || null,
          message_text: textToSend,
          message_type: "outreach"
        };

        if (!target) {
          console.warn(`⚠️ Target not found for company: ${row.company}, sending webhook with default values`);
        }

        console.log(`📤 Sending to Clay webhook: ${JSON.stringify(webhookPayload)}`);

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          console.log(`✅ Successfully sent data to Clay webhook`);
        } else {
          const errorText = await webhookResponse.text();
          console.warn(`⚠️ Clay webhook returned status ${webhookResponse.status}: ${errorText}`);
        }
      } catch (e) {
        console.error("Failed to send to Clay webhook:", e.message);
        // Don't fail the request if webhook fails
      }

      // LOCAL MAC AUTOMATION BEGINS HERE
      openTelegramDesktopLink(row.telegram_handle);
      await new Promise((r) => setTimeout(r, 1000)); // Slightly longer wait for Telegram to fully load

      // Split message into paragraphs and send each separately
      const paragraphs = splitIntoParagraphs(textToSend);
      console.log(`📝 Message has ${paragraphs.length} paragraph(s)`);

      if (paragraphs.length === 0) {
        throw new Error("No paragraphs found in message");
      }

      if (paragraphs.length === 1) {
        // Single paragraph: use original flow for simplicity
        console.log("📤 Sending single paragraph message");
        setClipboardMac(textToSend);
        await pasteIntoTelegram();
        scheduleTelegramAutoSend(id);
      } else {
        // Multiple paragraphs: send each separately
        console.log(`📤 Sending ${paragraphs.length} paragraphs as separate messages`);
        await sendMultiParagraphMessage(paragraphs);
        // No scheduleTelegramAutoSend() needed - each paragraph sent immediately
      }

      res.json({
        ok: true,
        paragraph_count: paragraphs.length,
        auto_send: paragraphs.length === 1 ? AUTO_SEND_ENABLED : false,
        auto_send_after_seconds: paragraphs.length === 1 ? AUTO_SEND_IDLE_SECONDS : 0
      });
    } catch (e) {
      console.error("approve-open-telegram error:", e?.message || e, e?.stderr || "");
      res.status(500).json({
        error: "failed to open Telegram and paste",
        message: e?.message,
        stderr: e?.stderr,
      });
    }
  });

  // Generate a follow-up message
  router.post("/generate-followup", async (req, res) => {
    try {
      const { contact_name, company, original_message } = req.body;
      if (!contact_name || !company || !original_message) {
        return res.status(400).json({ error: "contact_name, company, and original_message are required" });
      }

      console.log(`✍️ Generating follow-up for ${contact_name} at ${company}...`);

      const message_text = await generateFollowUp(contact_name, company, original_message);

      res.json({ message_text });
    } catch (e) {
      console.error("generate follow-up error:", e?.status, e?.name, e?.message);
      res.status(500).json({
        error: "failed to generate follow-up",
        status: e?.status,
        name: e?.name,
        message: e?.message,
      });
    }
  });

  // Send a follow-up message
  router.post("/send-followup", async (req, res) => {
    try {
      const { contact_id, telegram_handle, message_text, original_message, contact_name, company } = req.body;

      if (!telegram_handle || !message_text) {
        return res.status(400).json({ error: "telegram_handle and message_text are required" });
      }

      console.log(`📤 Sending follow-up to ${contact_name}...`);

      // Create a follow-up draft record in the database
      const followUpId = nanoid();
      const ts = nowISO();
      const IS_MAC = process.platform === "darwin";

      // If on Mac, set prepared_at so we can do local automation immediately
      // If not on Mac (Railway), set prepared_at=NULL so relayer picks it up
      db.prepare(
        `INSERT INTO drafts (id, contact_id, channel, message_text, status, prepared_at, created_at, updated_at) VALUES (?, ?, 'telegram', ?, 'followup', ?, ?, ?)`
      ).run(followUpId, contact_id, message_text, IS_MAC ? ts : null, ts, ts);

      // Save to SDR style file
      try {
        const timestamp = new Date().toISOString().split("T")[0];
        const entry = `\n\n--- Follow-up sent ${timestamp} ---\nContact: ${contact_name} at ${company}\nOriginal message:\n${original_message}\n\nFollow-up:\n${message_text}\n---`;
        fs.appendFileSync(SDR_STYLE_FILE, entry, "utf8");
        console.log(`✅ Saved follow-up message to ${SDR_STYLE_FILE}`);
      } catch (e) {
        console.error("Failed to save follow-up to style file:", e.message);
      }

      // Send data to Clay webhook
      try {
        const target = db.prepare("SELECT team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website FROM targets WHERE team_name = ?").get(company);

        // Get contact's x_username and email from database
        const contact = db.prepare("SELECT x_username, email FROM contacts WHERE id = ?").get(contact_id);

        const webhookUrl = process.env.CLAY_WEBHOOK_URL || "https://api.clay.com/v3/sources/webhook/pull-in-data-from-a-webhook-c4374a91-d3c7-4a84-905c-9069c0d4a514";

        const webhookPayload = {
          team_name: target?.team_name || company || null,
          raised_usd: target?.raised_usd || 0,
          monthly_revenue_usd: target?.monthly_revenue_usd || 0,
          is_web3: target?.is_web3 === 1,
          x_handle: target?.x_handle || null,
          website: target?.website || null,
          timestamp: new Date().toISOString(),
          contact_name: contact_name,
          contact_email: contact?.email || null,
          contact_telegram_handle: telegram_handle || null,
          contact_x_username: contact?.x_username || null,
          message_text: message_text,
          message_type: "followup",
          original_message: original_message
        };

        if (!target) {
          console.warn(`⚠️ Target not found for company: ${company}, sending webhook with default values`);
        }

        console.log(`📤 Sending to Clay webhook: ${JSON.stringify(webhookPayload)}`);

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          console.log(`✅ Successfully sent data to Clay webhook`);
        } else {
          const errorText = await webhookResponse.text();
          console.warn(`⚠️ Clay webhook returned status ${webhookResponse.status}: ${errorText}`);
        }
      } catch (e) {
        console.error("Failed to send to Clay webhook:", e.message);
        // Don't fail the request if webhook fails
      }

      // If on Mac, do local automation
      // If on Railway, relayer will handle it
      if (IS_MAC) {
        // Copy to clipboard
        setClipboardMac(message_text);

        // Open Telegram
        openTelegramDesktopLink(telegram_handle);
        await new Promise((r) => setTimeout(r, 700));

        // Paste
        await pasteIntoTelegram();

        // Schedule auto-send
        scheduleTelegramAutoSend(followUpId);

        res.json({ ok: true, auto_send: AUTO_SEND_ENABLED, auto_send_after_seconds: AUTO_SEND_IDLE_SECONDS });
      } else {
        // On Railway - relayer will pick it up
        console.log(`✅ Follow-up draft created for relayer (ID: ${followUpId})`);
        res.json({ ok: true, relayer_mode: true, message: "Follow-up queued for relayer" });
      }
    } catch (e) {
      console.error("send-followup error:", e?.message || e, e?.stderr || "");
      res.status(500).json({ error: "failed to send follow-up", message: e?.message, stderr: e?.stderr });
    }
  });

  // Mark draft as sent
  router.post("/:id/mark-sent", (req, res) => {
    const { id } = req.params;
    cancelTelegramAutoSend(id);
    const info = db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`).run(nowISO(), id);
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  // Skip a draft
  router.post("/:id/skip", (req, res) => {
    const { id } = req.params;
    cancelTelegramAutoSend(id);
    const info = db.prepare(`UPDATE drafts SET status = 'skipped', updated_at = ? WHERE id = ?`).run(nowISO(), id);
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  return router;
}

export default createDraftRoutes;

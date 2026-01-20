import { Router } from "express";
import fs from "node:fs";
import path from "node:path";

/**
 * Draft routes
 * NOTE: db is now accessed via req.db (set by authentication middleware)
 */
export function createDraftRoutes(
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
  sendMultiParagraphMessage,
  captureTelegramWindow,
  extractResponseFromScreenshot
) {
  const router = Router();

  const SDR_STYLE_FILE = path.join(process.cwd(), "Successful SDR Messaging.txt");
  const AUTO_SEND_ENABLED = String(process.env.AUTO_SEND_ENABLED || "true").toLowerCase() !== "false";
  const AUTO_SEND_IDLE_SECONDS = Number(process.env.AUTO_SEND_IDLE_SECONDS || 5);

  // Get all drafts with contact information
  router.get("/", (req, res) => {
    const rows = req.db.prepare(`
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
      const contact = req.db.prepare("SELECT * FROM contacts WHERE id = ?").get(contact_id);
      if (!contact) return res.status(404).json({ error: "contact not found" });
      const message_text = await generateOutbound(contact);
      const id = nanoid();
      const ts = nowISO();
      req.db.prepare(
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

      const draft = req.db.prepare(
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
      req.db.prepare(
        `UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`
      ).run(message_text, ts, id);

      // If feedback was provided, save to feedback history
      if (feedback) {
        const feedbackId = nanoid();
        req.db.prepare(
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

  // Get follow-up drafts (only contacts that have actual follow-up messages)
  router.get("/followups", (req, res) => {
    // Only show contacts where at least one message has status='followup'
    // This excludes contacts that only have initial sent messages
    const rows = req.db.prepare(
      `SELECT d.*, c.name, c.company, c.title, c.telegram_handle
       FROM drafts d
       JOIN contacts c ON c.id = d.contact_id
       WHERE d.contact_id IN (
         SELECT DISTINCT contact_id FROM drafts WHERE status = 'followup'
       )
       AND d.status IN ('followup', 'sent')
       ORDER BY d.updated_at DESC
       LIMIT 100`
    ).all();
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Get full conversation history for a contact (original sent + all follow-ups)
  router.get("/contact/:contact_id/history", (req, res) => {
    const { contact_id } = req.params;
    const rows = req.db.prepare(
      `SELECT d.*, c.name, c.company, c.title, c.telegram_handle
       FROM drafts d
       JOIN contacts c ON c.id = d.contact_id
       WHERE d.contact_id = ?
       AND d.status IN ('sent', 'followup')
       ORDER BY d.updated_at DESC`
    ).all(contact_id);
    res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
  });

  // Get sent drafts (exclude contacts that have follow-ups)
  router.get("/sent", (req, res) => {
    const rows = req.db.prepare(
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
    const info = req.db.prepare(`UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`).run(
      message_text,
      nowISO(),
      id
    );
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  // Approve a draft
  router.post("/:id/approve", (req, res) => {
    try {
      const { id } = req.params;
      const { message_text } = req.body;

      console.log(`[APPROVE] Draft ID: ${id}, Has message_text: ${!!message_text}`);
      console.log(`[APPROVE] req.db exists: ${!!req.db}, req.employeeId: ${req.employeeId}`);

      // Get draft with contact info for saving to style file
      const row = req.db.prepare(
        `SELECT d.*, c.name, c.company FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`
      ).get(id);
      if (!row) {
        console.error(`[APPROVE] Draft not found: ${id}`);
        return res.status(404).json({ error: "draft not found" });
      }

      // Update message text if provided, then approve
      let updateQuery = `UPDATE drafts SET status = 'approved', updated_at = ?`;
      let updateParams = [nowISO()];

      if (message_text && typeof message_text === 'string') {
        updateQuery += `, message_text = ?`;
        updateParams.push(message_text.trim());
        console.log(`[APPROVE] Updating message text`);
      }

      updateQuery += ` WHERE id = ?`;
      updateParams.push(id);

      console.log(`[APPROVE] Executing SQL: ${updateQuery}`);
      const info = req.db.prepare(updateQuery).run(...updateParams);
      console.log(`[APPROVE] SQL result: ${info.changes} rows changed`);

      if (info.changes === 0) {
        console.error(`[APPROVE] No rows updated for draft: ${id}`);
        return res.status(404).json({ error: "draft not found" });
      }

      // Save approved message to SDR style file for future learning
      try {
        const timestamp = new Date().toISOString().split("T")[0];
        const finalMessage = message_text && typeof message_text === 'string' ? message_text.trim() : row.message_text;
        const entry = `\n\n--- Message approved ${timestamp} ---\nContact: ${row.name} at ${row.company}\nMessage:\n${finalMessage}\n---`;
        fs.appendFileSync(SDR_STYLE_FILE, entry, "utf8");
        console.log(`✅ Saved approved message to ${SDR_STYLE_FILE}`);
      } catch (e) {
        console.error("Failed to save approved message to style file:", e.message);
        // Don't fail the request if file append fails
      }

      console.log(`[APPROVE] Success! Returning ok:true`);
      res.json({ ok: true });
    } catch (error) {
      console.error(`[APPROVE] ERROR:`, error);
      return res.status(500).json({ error: "failed to approve draft", message: error.message });
    }
  });

  // Update draft message
  router.patch("/:id", (req, res) => {
    const { id } = req.params;
    const { message_text } = req.body;

    if (!message_text || typeof message_text !== "string") {
      return res.status(400).json({ error: "message_text is required" });
    }

    const info = req.db.prepare(`UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`)
      .run(message_text.trim(), nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "draft not found" });
    }

    res.json({ ok: true, message_text: message_text.trim() });
  });

  // Approve, open Telegram, and paste message
  router.post("/:id/approve-open-telegram", async (req, res) => {
    try {
      const { id } = req.params;
      const overrideText =
        req.body && typeof req.body.message_text === "string" ? req.body.message_text : null;
      const row = req.db.prepare(
        `SELECT d.*, c.telegram_handle, c.name, c.company, c.x_username, c.email FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.id = ?`
      ).get(id);
      if (!row) return res.status(404).json({ error: "draft not found" });

      // If not on macOS (Railway/Linux), mark as sent (no Telegram automation available)
      if (process.platform !== "darwin") {
        // Update message text if provided
        if (overrideText) {
          req.db.prepare(`UPDATE drafts SET message_text = ?, updated_at = ? WHERE id = ?`)
            .run(overrideText.trim(), nowISO(), id);
        }

        // Mark as sent (Railway has no Telegram automation, but users can manually send)
        const info = req.db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`).run(nowISO(), id);
        if (info.changes === 0) return res.status(404).json({ error: "draft not found" });

        // Save to SDR style file
        try {
          const textToSave = overrideText || row.message_text;
          const timestamp = new Date().toISOString().split("T")[0];
          const entry = `\n\n--- Message approved ${timestamp} (Railway) ---\nContact: ${row.name} at ${row.company}\nMessage:\n${textToSave}\n---`;
          fs.appendFileSync(SDR_STYLE_FILE, entry, "utf8");
          console.log(`✅ Saved approved message to ${SDR_STYLE_FILE}`);
        } catch (e) {
          console.error("Failed to save message to style file:", e.message);
        }

        console.log(`✅ Draft ${id} marked as sent (Railway - manual Telegram send required)`);
        return res.json({ ok: true, message: "Draft approved! Please manually send via Telegram." });
      }

      // On macOS: Mark as sent immediately (direct Telegram automation)
      const info = req.db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`).run(nowISO(), id);
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
        const target = req.db.prepare("SELECT team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website FROM targets WHERE team_name = ?").get(row.company);

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
      const { contact_name, company, original_message, feedback, current_followup, their_response } = req.body;
      if (!contact_name || !company || !original_message) {
        return res.status(400).json({ error: "contact_name, company, and original_message are required" });
      }

      console.log(`✍️ Generating follow-up for ${contact_name} at ${company}...`);
      if (their_response) {
        console.log(`📨 Their response: "${their_response.substring(0, 100)}..."`);
      }

      const message_text = await generateFollowUp(contact_name, company, original_message, {
        feedback,
        currentFollowup: current_followup,
        theirResponse: their_response,
      });

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
      req.db.prepare(
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
        const target = req.db.prepare("SELECT team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website FROM targets WHERE team_name = ?").get(company);

        // Get contact's x_username and email from database
        const contact = req.db.prepare("SELECT x_username, email FROM contacts WHERE id = ?").get(contact_id);

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
        // Open Telegram
        openTelegramDesktopLink(telegram_handle);
        await new Promise((r) => setTimeout(r, 1000)); // Slightly longer wait for Telegram to fully load

        // Split message into paragraphs and send each separately
        const paragraphs = splitIntoParagraphs(message_text);
        console.log(`📝 Follow-up has ${paragraphs.length} paragraph(s)`);

        if (paragraphs.length === 0) {
          throw new Error("No paragraphs found in message");
        }

        if (paragraphs.length === 1) {
          // Single paragraph: use original flow for simplicity
          console.log("📤 Sending single paragraph follow-up");
          setClipboardMac(message_text);
          await pasteIntoTelegram();
          scheduleTelegramAutoSend(followUpId);
          res.json({ ok: true, paragraph_count: 1, auto_send: AUTO_SEND_ENABLED, auto_send_after_seconds: AUTO_SEND_IDLE_SECONDS });
        } else {
          // Multiple paragraphs: send each separately
          console.log(`📤 Sending ${paragraphs.length} paragraphs as separate messages`);
          await sendMultiParagraphMessage(paragraphs);
          // No scheduleTelegramAutoSend() needed - each paragraph sent immediately
          res.json({ ok: true, paragraph_count: paragraphs.length, auto_send: false, auto_send_after_seconds: 0 });
        }
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
    const info = req.db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`).run(nowISO(), id);
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  // Skip a draft
  router.post("/:id/skip", (req, res) => {
    const { id } = req.params;
    cancelTelegramAutoSend(id);
    const info = req.db.prepare(`UPDATE drafts SET status = 'skipped', updated_at = ? WHERE id = ?`).run(nowISO(), id);
    if (info.changes === 0) return res.status(404).json({ error: "draft not found" });
    res.json({ ok: true });
  });

  // Capture response from Telegram
  router.post("/capture-response", async (req, res) => {
    try {
      const { telegram_handle } = req.body;

      if (!telegram_handle) {
        return res.status(400).json({ error: "telegram_handle is required" });
      }

      // Check if running on macOS (required for direct Telegram automation)
      if (process.platform !== "darwin") {
        console.log(`📸 Creating response capture request for @${telegram_handle} (non-Mac, using relayer)...`);

        // Create a capture request in the database for relayer to process
        const requestId = nanoid();
        const now = nowISO();

        req.db.prepare(`
          INSERT INTO response_capture_requests (id, telegram_handle, status, created_at)
          VALUES (?, ?, 'pending', ?)
        `).run(requestId, telegram_handle, now);

        console.log(`✅ Created capture request ${requestId}, waiting for relayer...`);

        // Poll for completion (wait up to 30 seconds)
        const maxWaitTime = 30000; // 30 seconds
        const pollInterval = 1000; // 1 second
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          // Check if request is completed
          const request = req.db.prepare(`
            SELECT * FROM response_capture_requests WHERE id = ?
          `).get(requestId);

          if (request.status === 'completed') {
            if (request.captured_response === 'NO_RESPONSE' || !request.captured_response) {
              console.log("❌ No response found from contact");
              return res.status(404).json({ error: "no_response", message: "No response found from the contact" });
            }
            console.log(`✅ Response captured: "${request.captured_response.substring(0, 100)}..."`);
            return res.json({ response: request.captured_response });
          }

          if (request.status === 'failed') {
            console.log(`❌ Capture failed: ${request.error_message}`);
            return res.status(500).json({ error: "capture_failed", message: request.error_message || "Failed to capture response" });
          }

          // Wait before next poll
          await new Promise(r => setTimeout(r, pollInterval));
        }

        // Timeout - mark as failed
        req.db.prepare(`
          UPDATE response_capture_requests
          SET status = 'failed', error_message = 'Timeout waiting for relayer', completed_at = ?
          WHERE id = ?
        `).run(nowISO(), requestId);

        console.log("❌ Timeout waiting for relayer to capture response");
        return res.status(408).json({
          error: "timeout",
          message: "Timeout waiting for relayer. Make sure relayer is running on your Mac."
        });
      }

      // On macOS: Use direct Telegram automation
      console.log(`📸 Capturing response from Telegram for @${telegram_handle} (direct Mac automation)...`);

      // 1. Open Telegram to the contact's chat
      openTelegramDesktopLink(telegram_handle);

      // 2. Wait for Telegram to open and load the chat
      await new Promise(r => setTimeout(r, 2000));

      // 3. Capture screenshot of Telegram window
      console.log("📷 Taking screenshot of Telegram window...");
      const screenshotPath = await captureTelegramWindow();

      // 4. Extract response using Claude Vision
      console.log("🔍 Extracting response using Claude Vision...");
      const extractedResponse = await extractResponseFromScreenshot(screenshotPath);

      // 5. Check if no response was found
      if (extractedResponse === "NO_RESPONSE" || extractedResponse.toUpperCase().includes("NO_RESPONSE")) {
        console.log("❌ No response found from contact");
        return res.status(404).json({ error: "no_response", message: "No response found from the contact" });
      }

      console.log(`✅ Extracted response: "${extractedResponse.substring(0, 100)}..."`);

      res.json({ response: extractedResponse });
    } catch (e) {
      console.error("capture-response error:", e?.message || e);
      res.status(500).json({ error: "failed to capture response", message: e?.message });
    }
  });

  return router;
}

export default createDraftRoutes;

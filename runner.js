import Database from "better-sqlite3";
import clipboardy from "clipboardy";
import open from "open";
import { exec } from "child_process";

const db = new Database("data.db");
db.pragma("journal_mode = WAL");

let busy = false;
const processed = new Set(); // prevents any weird double-trigger per run

function nowISO() {
  return new Date().toISOString();
}

function tgDeepLink(handleRaw) {
  if (!handleRaw) return null;
  const handle = handleRaw.replace("@", "").trim();
  if (!handle) return null;
  return `tg://resolve?domain=${handle}`;
}

function autoPasteTelegram() {
  return new Promise((resolve, reject) => {
    // Brings Telegram to front and pastes clipboard (Cmd+V)
    const script = `
      tell application "Telegram" to activate
      delay 0.35
      tell application "System Events"
        keystroke "v" using command down
      end tell
    `;
    exec(`osascript -e '${script.replace(/\n/g, " ")}'`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function prepareSend(draft) {
  // Copy message to clipboard
  await clipboardy.write(draft.message_text);

  const link = tgDeepLink(draft.telegram_handle);
  if (!link) {
    console.log(`⚠️ Approved draft has no Telegram handle: ${draft.id} (${draft.name})`);
    return;
  }

  // Open TG to the convo
  await open(link);

  // Wait a moment so the chat loads
  await new Promise((r) => setTimeout(r, 700));

  // Paste into chat input
  await autoPasteTelegram();

  console.log(`✅ Pasted message for ${draft.name} (@${draft.telegram_handle}) — SDR press Enter`);
}

async function loop() {
  if (busy) return;

  // Find the next approved draft that has NOT been prepared yet
  const draft = db.prepare(`
    SELECT d.id, d.message_text, d.updated_at,
           c.name, c.telegram_handle
    FROM drafts d
    JOIN contacts c ON c.id = d.contact_id
    WHERE d.status = 'approved'
      AND (d.prepared_at IS NULL OR d.prepared_at = '')
    ORDER BY d.updated_at DESC
    LIMIT 1
  `).get();

  if (!draft) return;
  if (processed.has(draft.id)) return;

  busy = true;
  processed.add(draft.id);

  // IMPORTANT: mark prepared FIRST so it never re-triggers
  db.prepare(`
    UPDATE drafts
    SET prepared_at = ?, updated_at = ?
    WHERE id = ?
  `).run(nowISO(), nowISO(), draft.id);

  try {
    await prepareSend(draft);
  } catch (e) {
    console.error("runner error:", e);

    // If paste/open failed, allow retry by clearing prepared_at
    db.prepare(`
      UPDATE drafts
      SET prepared_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(nowISO(), draft.id);

    processed.delete(draft.id);
  } finally {
    busy = false;
  }
}

console.log("🟢 Runner started. Will open Telegram ONLY when a draft is approved.");


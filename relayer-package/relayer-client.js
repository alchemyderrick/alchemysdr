import "dotenv/config";
import clipboardy from "clipboardy";
import open from "open";
import { exec } from "child_process";
import fs from "fs";

// Configuration from environment
const RENDER_URL = process.env.RENDER_URL || "http://localhost:3000";
const RELAYER_API_KEY = process.env.RELAYER_API_KEY || "";
const EMPLOYEE_ID = process.env.EMPLOYEE_ID;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 10000);

// Validate EMPLOYEE_ID
if (!EMPLOYEE_ID) {
  console.error("❌ ERROR: EMPLOYEE_ID not set in .env file");
  console.error("Please add EMPLOYEE_ID=your_name to your .env file");
  process.exit(1);
}

if (!/^[a-zA-Z0-9_-]+$/.test(EMPLOYEE_ID)) {
  console.error("❌ ERROR: Invalid EMPLOYEE_ID format");
  console.error("EMPLOYEE_ID must contain only letters, numbers, underscores, and dashes");
  process.exit(1);
}

// State management
let busy = false;
const processed = new Set();
const failedDrafts = new Map(); // Track failures: draftId -> failureCount
const MAX_RETRIES_PER_DRAFT = 2; // Stop retrying after 2 failures
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

// Logging
const LOG_FILE = "relayer.log";

function log(message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(message);
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    // Ignore logging errors
  }
}

function checkMacOS() {
  if (process.platform !== "darwin") {
    log("❌ ERROR: Relayer must run on macOS for Telegram automation");
    process.exit(1);
  }
}

function checkAccessibilityPermissions() {
  log("\n⚠️  Telegram Automation Requires System Permissions\n");
  log("To enable automatic Telegram messaging, please:\n");
  log("1. Open System Settings (or System Preferences)");
  log("2. Go to Privacy & Security → Privacy → Accessibility");
  log("3. Click the lock icon to make changes");
  log("4. Add Terminal (or your terminal app) to the list");
  log("5. Enable the checkbox next to it\n");
  log("If you've already done this, you can ignore this message.");
  log("More help: https://support.apple.com/guide/mac-help/allow-accessibility-apps-mh43185\n");
}

function tgDeepLink(handleRaw) {
  if (!handleRaw) return null;
  const handle = handleRaw.replace("@", "").trim();
  if (!handle) return null;
  return `tg://resolve?domain=${handle}`;
}

function autoPasteTelegram() {
  return new Promise((resolve, reject) => {
    const script = [
      'tell application "Telegram" to activate',
      'delay 0.35',
      'tell application "System Events"',
      '  keystroke "v" using command down',
      '  delay 0.2',
      '  key code 36',
      'end tell'
    ];

    const args = script.flatMap(line => ['-e', line]);

    exec(`osascript ${args.map(a => `'${a}'`).join(' ')}`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function prepareSend(draft) {
  try {
    // Copy message to clipboard
    await clipboardy.write(draft.message_text);
    log(`📋 Copied message to clipboard for ${draft.name}`);

    const link = tgDeepLink(draft.telegram_handle);
    if (!link) {
      throw new Error(`No Telegram handle for ${draft.name}`);
    }

    // Open TG to the conversation
    await open(link);
    log(`📱 Opened Telegram chat with @${draft.telegram_handle}`);

    // Wait for chat to load
    await new Promise((r) => setTimeout(r, 700));

    // Paste into chat input and send
    await autoPasteTelegram();
    log(`✅ Message sent to ${draft.name} (@${draft.telegram_handle})`);

    return true;
  } catch (error) {
    log(`❌ Error preparing send for ${draft.name}: ${error.message}`);
    throw error;
  }
}

async function fetchPendingDrafts() {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/approved-pending`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.drafts || [];
}

async function markPrepared(draftId) {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/mark-prepared/${draftId}`, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function markFailed(draftId, errorMessage) {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/mark-failed/${draftId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ error: errorMessage }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function processNextDraft() {
  if (busy) return;

  try {
    const drafts = await fetchPendingDrafts();

    if (drafts.length === 0) {
      return;
    }

    // Find first draft we haven't processed or haven't exceeded retries
    const draft = drafts.find((d) => {
      if (processed.has(d.id)) return false;
      const failures = failedDrafts.get(d.id) || 0;
      return failures < MAX_RETRIES_PER_DRAFT;
    });

    if (!draft) {
      return;
    }

    busy = true;
    const failureCount = failedDrafts.get(draft.id) || 0;

    log(`\n🔄 Processing draft ${draft.id} for ${draft.name} (@${draft.telegram_handle}) (attempt ${failureCount + 1}/${MAX_RETRIES_PER_DRAFT})`);

    try {
      await prepareSend(draft);
      await markPrepared(draft.id);
      log(`✅ Successfully prepared draft ${draft.id}`);
      processed.add(draft.id);
      failedDrafts.delete(draft.id); // Clear failure count on success
      consecutiveErrors = 0;
    } catch (error) {
      log(`❌ Failed to prepare draft ${draft.id}: ${error.message}`);
      const newFailureCount = failureCount + 1;
      failedDrafts.set(draft.id, newFailureCount);

      if (newFailureCount >= MAX_RETRIES_PER_DRAFT) {
        log(`⚠️ Draft ${draft.id} failed ${MAX_RETRIES_PER_DRAFT} times. Giving up.`);
        processed.add(draft.id); // Mark as processed to stop retrying
      } else {
        log(`⏳ Will retry draft ${draft.id} on next poll`);
        await markFailed(draft.id, error.message); // Clear prepared_at for retry
      }
      consecutiveErrors++;
    }
  } catch (error) {
    log(`❌ Error fetching drafts: ${error.message}`);
    consecutiveErrors++;

    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      log(`\n❌ CRITICAL: ${MAX_CONSECUTIVE_ERRORS} consecutive errors. Server may be unreachable.`);
      log(`   Check your RENDER_URL: ${RENDER_URL}`);
      log(`   Check your internet connection.`);
      log(`   Retrying in ${POLL_INTERVAL_MS / 1000} seconds...\n`);
    }
  } finally {
    busy = false;
  }
}

async function healthCheck() {
  try {
    const response = await fetch(`${RENDER_URL}/api/health/claude`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    log(`✅ Connected to server: ${RENDER_URL}`);
    return true;
  } catch (error) {
    log(`❌ Cannot reach server: ${RENDER_URL}`);
    log(`   Error: ${error.message}`);
    log(`   Make sure the server is running and RENDER_URL is correct in .env.local`);
    return false;
  }
}

async function main() {
  log("=".repeat(60));
  log("🚀 SDR Console Relayer Client");
  log("=".repeat(60));
  log(`👤 Employee: ${EMPLOYEE_ID}`);
  log(`📡 Server: ${RENDER_URL}`);
  log(`🔑 API Key: ${RELAYER_API_KEY ? "Configured" : "Not configured (local dev mode)"}`);
  log(`⏱️  Poll Interval: ${POLL_INTERVAL_MS / 1000}s`);
  log("=".repeat(60));

  // Pre-flight checks
  checkMacOS();
  checkAccessibilityPermissions();

  // Health check
  log("\n🔍 Checking server connection...");
  const connected = await healthCheck();

  if (!connected) {
    log("\n❌ Initial connection failed. Will keep trying...\n");
  }

  log("\n✅ Relayer started. Polling for approved drafts...");
  log("   Press Ctrl+C to stop.\n");

  // Start polling loop
  setInterval(async () => {
    await processNextDraft();
  }, POLL_INTERVAL_MS);

  // Also run immediately
  await processNextDraft();
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("\n\n⏹️  Relayer stopped by user");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("\n\n⏹️  Relayer stopped");
  process.exit(0);
});

// Start the relayer
main().catch((error) => {
  log(`❌ Fatal error: ${error.message}`);
  process.exit(1);
});

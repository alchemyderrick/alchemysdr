import "dotenv/config";
import clipboardy from "clipboardy";
import open from "open";
import { exec } from "child_process";
import fs from "fs";
import Database from "better-sqlite3";

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

// Check for ANTHROPIC_API_KEY
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ ERROR: ANTHROPIC_API_KEY not set in .env file");
  console.error("Please add ANTHROPIC_API_KEY=your_key to your .env file");
  console.error("This is required for response capture feature");
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
    const link = tgDeepLink(draft.telegram_handle);
    if (!link) {
      throw new Error(`No Telegram handle for ${draft.name}`);
    }

    // Open TG to the conversation first
    await open(link);
    log(`📱 Opened Telegram chat with @${draft.telegram_handle}`);

    // Wait for chat to load
    await new Promise((r) => setTimeout(r, 700));

    // Split message into paragraphs (by double line breaks)
    const paragraphs = draft.message_text
      .split(/\n\n+|\r\n\r\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (paragraphs.length === 0) {
      throw new Error('Message has no content');
    }

    log(`📤 Sending ${paragraphs.length} paragraph(s) as separate messages`);

    // Send each paragraph as a separate message
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      log(`  → Sending paragraph ${i + 1}/${paragraphs.length}`);

      // Copy paragraph to clipboard
      await clipboardy.write(paragraph);

      // Paste into chat input and send
      await autoPasteTelegram();

      // Wait between messages (except after the last one)
      if (i < paragraphs.length - 1) {
        await new Promise((r) => setTimeout(r, 1500)); // 1.5 second delay between paragraphs
      }
    }

    log(`✅ All ${paragraphs.length} message(s) sent to ${draft.name} (@${draft.telegram_handle})`);

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

async function fetchCaptureRequests() {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/capture-requests`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.requests || [];
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

async function completeCaptureRequest(requestId, capturedResponse, errorMessage = null) {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/capture-complete/${requestId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      captured_response: capturedResponse,
      error_message: errorMessage,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

function captureTelegramScreenshot() {
  return new Promise((resolve, reject) => {
    const tempPath = `/tmp/telegram-capture-${Date.now()}.png`;

    exec(`screencapture -x "${tempPath}"`, (err) => {
      if (err) reject(err);
      else resolve(tempPath);
    });
  });
}

async function extractResponseFromScreenshot(imagePath) {
  const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageData
            }
          },
          {
            type: "text",
            text: `This is a screenshot of a Telegram chat conversation.

Your task: Extract ONLY the messages from the OTHER person (the contact) - these are the messages aligned to the LEFT side of the chat.

CRITICAL - How to identify which messages to extract:
- LEFT-ALIGNED messages (gray/dark bubbles on the LEFT): These are from the contact - EXTRACT THESE
- RIGHT-ALIGNED messages (blue bubbles on the RIGHT): These are from me/the user - DO NOT EXTRACT THESE

Rules:
- ONLY extract LEFT-ALIGNED messages (incoming messages from the contact)
- NEVER include RIGHT-ALIGNED messages (those are my outgoing messages, ignore them completely)
- Extract ALL left-aligned messages visible in the screenshot
- If they sent multiple separate messages, include ALL of them in chronological order (oldest first)
- Separate each distinct message with TWO blank lines (double newline) between them
- Preserve the original formatting and line breaks within each individual message
- If no LEFT-ALIGNED messages are visible (only right-aligned outgoing messages), return exactly: NO_RESPONSE

Return ONLY the extracted message text from LEFT-ALIGNED bubbles, nothing else. Do not add any commentary or labels.`
          }
        ]
      }]
    })
  });

  const data = await response.json();
  const extractedText = data.content[0].text.trim();

  // Clean up screenshot
  try {
    fs.unlinkSync(imagePath);
  } catch (e) {
    // Ignore cleanup errors
  }

  return extractedText;
}

async function processCaptureRequest(request) {
  log(`\n📸 Processing capture request ${request.id} for @${request.telegram_handle}`);

  try {
    // Open Telegram to the conversation
    const link = tgDeepLink(request.telegram_handle);
    if (!link) {
      throw new Error(`Invalid Telegram handle: ${request.telegram_handle}`);
    }

    await open(link);
    log(`📱 Opened Telegram chat with @${request.telegram_handle}`);

    // Wait for chat to load
    await new Promise(r => setTimeout(r, 3000));

    // Capture screenshot
    log("📷 Taking screenshot...");
    const screenshotPath = await captureTelegramScreenshot();

    // Extract response using Claude Vision
    log("🔍 Extracting response using Claude Vision...");
    const extractedResponse = await extractResponseFromScreenshot(screenshotPath);

    // Check if no response was found
    if (extractedResponse === "NO_RESPONSE" || extractedResponse.toUpperCase().includes("NO_RESPONSE")) {
      log("❌ No response found from contact");
      await completeCaptureRequest(request.id, "NO_RESPONSE");
      return;
    }

    log(`✅ Extracted response: "${extractedResponse.substring(0, 100)}..."`);
    await completeCaptureRequest(request.id, extractedResponse);
  } catch (error) {
    log(`❌ Failed to capture response: ${error.message}`);
    await completeCaptureRequest(request.id, null, error.message);
  }
}

async function fetchXAuthRequests() {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/x-auth-requests`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.requests || [];
}

async function completeXAuthRequest(requestId, success, errorMessage = null, cookies = null) {
  const headers = {
    "Content-Type": "application/json",
    "X-Employee-ID": EMPLOYEE_ID,
  };

  if (RELAYER_API_KEY) {
    headers["X-Relayer-API-Key"] = RELAYER_API_KEY;
  }

  const response = await fetch(`${RENDER_URL}/api/relayer/x-auth-complete/${requestId}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      success,
      error_message: errorMessage,
      cookies,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

async function processXAuthRequest(request) {
  log(`\n🔑 Processing X authentication request ${request.id}`);

  try {
    // Import the authentication function from local lib/x-auth.js
    const { authenticate } = await import("./lib/x-auth.js");

    // Open employee database to save cookies
    const dbPath = `./databases/${EMPLOYEE_ID}/data.db`;
    const db = new Database(dbPath);

    log("🌐 Opening X login page in browser...");
    log("⏳ Please login to X - will auto-detect when complete");
    log("   Browser will close automatically after successful login");

    // Call the authenticate function which properly waits for login
    const success = await authenticate(db);

    if (success) {
      // Read the cookies that were just saved
      const cookieRow = db.prepare("SELECT value FROM employee_config WHERE key = 'x_cookies'").get();
      const cookies = cookieRow ? JSON.parse(cookieRow.value) : null;

      db.close();

      log("✅ X authentication successful!");
      log(`🍪 Uploading ${cookies?.length || 0} cookies to Railway...`);

      // Send cookies to Railway
      await completeXAuthRequest(request.id, true, null, cookies);
      log("✅ Cookies uploaded - X search will now work on Railway");
      log(`✅ X authentication request ${request.id} completed`);
    } else {
      db.close();
      throw new Error("Authentication failed - login timeout or error");
    }
  } catch (error) {
    log(`❌ Failed to complete X auth: ${error.message}`);
    await completeXAuthRequest(request.id, false, error.message, null);
  }
}

async function processNextDraft() {
  if (busy) return;

  try {
    // Check for X auth requests first (highest priority)
    const xAuthRequests = await fetchXAuthRequests();
    if (xAuthRequests.length > 0) {
      busy = true;
      await processXAuthRequest(xAuthRequests[0]);
      busy = false;
      return;
    }

    // Check for capture requests second (high priority)
    const captureRequests = await fetchCaptureRequests();
    if (captureRequests.length > 0) {
      busy = true;
      await processCaptureRequest(captureRequests[0]);
      busy = false;
      return;
    }

    // Then check for drafts to send
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

  log("\n✅ Relayer started. Polling for X auth, capture requests, and approved drafts...");
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

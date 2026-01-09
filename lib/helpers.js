import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

// Environment detection
const IS_MAC = process.platform === "darwin";
const IS_RENDER = !!process.env.RENDER;
const ENABLE_LOCAL_TELEGRAM = IS_MAC && !IS_RENDER;

if (!ENABLE_LOCAL_TELEGRAM) {
  console.log("ℹ️ Telegram automation disabled (not running on local Mac)");
}

/**
 * Get current time in ISO format
 */
export function nowISO() {
  return new Date().toISOString();
}

/**
 * Generate Telegram links from handle
 */
export function tgLinks(handleRaw) {
  const handle = (handleRaw || "").replace("@", "").trim();
  if (!handle) return { web: null, desktop: null };
  return {
    web: `https://t.me/${handle}`,
    desktop: `tg://resolve?domain=${handle}`,
  };
}

/**
 * Generate X (Twitter) link from handle
 */
export function xLink(handleRaw) {
  const handle = (handleRaw || "").replace("@", "").trim();
  if (!handle) return null;
  return `https://x.com/${handle}`;
}

/**
 * Check if target qualifies (raised >= $10M and revenue >= $500k)
 */
export function qualifiesTarget(t) {
  const raised = Number(t?.raised_usd);
  const rev = Number(t?.monthly_revenue_usd);
  const isWeb3 = t?.is_web3 === 1 || t?.is_web3 === true || t?.is_web3 === "1" || t?.is_web3 === "true";
  return Number.isFinite(raised) && Number.isFinite(rev) && raised >= 10_000_000 && rev >= 500_000 && isWeb3;
}

/**
 * Set clipboard on macOS (Mac-only)
 */
export function setClipboardMac(text) {
  if (!ENABLE_LOCAL_TELEGRAM) {
    throw new Error("Clipboard automation only available on local Mac");
  }
  execFileSync("pbcopy", { input: String(text ?? "") });
}

/**
 * Open Telegram desktop app with link (Mac-only)
 */
export function openTelegramDesktopLink(handleRaw) {
  if (!ENABLE_LOCAL_TELEGRAM) {
    throw new Error("Telegram desktop automation only available on local Mac");
  }
  const { desktop } = tgLinks(handleRaw);
  if (!desktop) return;
  execFile("open", [desktop], (err) => {
    if (err) console.error("open tg link error:", err);
  });
}

/**
 * Run AppleScript commands (Mac-only)
 */
export function runAppleScriptLines(lines) {
  if (!ENABLE_LOCAL_TELEGRAM) {
    return Promise.reject(new Error("AppleScript automation only available on local Mac"));
  }
  return new Promise((resolve, reject) => {
    const args = [];
    for (const line of lines) args.push("-e", line);
    execFile("osascript", args, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

// Telegram automation
const AUTO_SEND_IDLE_SECONDS = Number(process.env.AUTO_SEND_IDLE_SECONDS || 5);
const AUTO_SEND_ENABLED = String(process.env.AUTO_SEND_ENABLED || "true").toLowerCase() !== "false";
const pendingAutoSends = new Map();

export function scheduleTelegramAutoSend(draftId) {
  if (!AUTO_SEND_ENABLED) return;
  if (!Number.isFinite(AUTO_SEND_IDLE_SECONDS) || AUTO_SEND_IDLE_SECONDS <= 0) return;
  const existing = pendingAutoSends.get(draftId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    try {
      await pressEnterToSendInTelegram();
    } catch (e) {
      console.error("auto-send error:", e?.message || e, e?.stderr || "");
    } finally {
      pendingAutoSends.delete(draftId);
    }
  }, AUTO_SEND_IDLE_SECONDS * 1000);
  pendingAutoSends.set(draftId, t);
}

export function cancelTelegramAutoSend(draftId) {
  const existing = pendingAutoSends.get(draftId);
  if (existing) clearTimeout(existing);
  pendingAutoSends.delete(draftId);
}

async function activateTelegram() {
  const lines = [
    'tell application "Telegram" to activate',
    'delay 0.6',
    'tell application "System Events" to tell process "Telegram" to set frontmost to true',
    'delay 0.2'
  ];
  await runAppleScriptLines(lines);
}

export async function pasteIntoTelegram() {
  if (!ENABLE_LOCAL_TELEGRAM) {
    throw new Error("Telegram paste automation only available on local Mac");
  }
  await activateTelegram();
  const lines = ['tell application "System Events" to keystroke "v" using command down'];
  await runAppleScriptLines(lines);
}

async function pressEnterToSendInTelegram() {
  await activateTelegram();
  const lines = ['tell application "System Events" to key code 36'];
  await runAppleScriptLines(lines);
}

// Load SDR style examples and product information
const SDR_STYLE_FILE = path.join(process.cwd(), "Successful SDR Messaging.txt");
let SDR_STYLE_EXAMPLES = "";
try {
  SDR_STYLE_EXAMPLES = fs.readFileSync(SDR_STYLE_FILE, "utf8");
  console.log("📘 Loaded SDR style examples");
} catch (e) {
  console.warn("⚠️ Could not load SDR style examples:", e.message);
}

const ALCHEMY_PRODUCT_FILE = path.join(process.cwd(), "Alchemy_Product_Info.txt");
let ALCHEMY_PRODUCT_INFO = "";
try {
  ALCHEMY_PRODUCT_INFO = fs.readFileSync(ALCHEMY_PRODUCT_FILE, "utf8");
  console.log("📘 Loaded Alchemy product information");
} catch (e) {
  console.warn("⚠️ Could not load Alchemy product info:", e.message);
}

const ALCHEMY_DATA_FILE = path.join(process.cwd(), "alchemy_data.md");
let ALCHEMY_DATA_INFO = "";
try {
  ALCHEMY_DATA_INFO = fs.readFileSync(ALCHEMY_DATA_FILE, "utf8");
  console.log("📘 Loaded Alchemy Data documentation");
} catch (e) {
  console.warn("⚠️ Could not load Alchemy Data docs:", e.message);
}

// Initialize Anthropic client
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ Missing ANTHROPIC_API_KEY");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_MODEL = "claude-3-haiku-20240307";

const OUTBOUND_SYSTEM = `You are an Alchemy SDR writing a first Telegram DM.

Below are REAL successful outbound messages previously sent.
Use them as inspiration for tone, phrasing, structure, and technical depth.
Do not copy them verbatim — follow their patterns.

--- BEGIN SUCCESSFUL SDR MESSAGE EXAMPLES ---
${SDR_STYLE_EXAMPLES}
--- END SUCCESSFUL SDR MESSAGE EXAMPLES ---

--- BEGIN ALCHEMY PRODUCT INFORMATION ---
${ALCHEMY_PRODUCT_INFO}
--- END ALCHEMY PRODUCT INFORMATION ---

--- BEGIN ALCHEMY DATA API DOCUMENTATION ---
${global.ALCHEMY_DATA_INFO || ''}
--- END ALCHEMY DATA API DOCUMENTATION ---

--- BEGIN ALCHEMY NODE API DOCUMENTATION ---
${global.ALCHEMY_NODE_INFO || ''}
--- END ALCHEMY NODE API DOCUMENTATION ---

You have access to comprehensive Alchemy documentation above including:
- Data API: For querying blockchain data, transactions, NFTs, tokens, etc.
- Node API: For blockchain node services, enhanced APIs, webhooks, etc.

You have access to comprehensive Alchemy product information and Data API documentation above.
Use this knowledge to:
- Reference specific Alchemy products/features when relevant to the prospect's needs
- Mention Data API capabilities if the prospect works with blockchain data
- Show technical understanding of their challenges and how Alchemy solves them

Constraints:
- The FIRST line must be exactly: "Hey {Name}, congrats on the success over at {Company}!"
- 1–3 short lines total.
- Mention ONE specific reason to reach out (use Notes).
- Ask EXACTLY one question.
- No links.
- No pricing/credits/security commitments.

Tone: human, brief, crypto-native.`;

const FOLLOWUP_SYSTEM = `You are an Alchemy SDR writing a follow-up Telegram message.

Below are REAL successful outbound messages previously sent (including follow-ups).
Use them as inspiration for tone, phrasing, and approach.

--- BEGIN SUCCESSFUL SDR MESSAGE EXAMPLES ---
${SDR_STYLE_EXAMPLES}
--- END SUCCESSFUL SDR MESSAGE EXAMPLES ---

--- BEGIN ALCHEMY PRODUCT INFORMATION ---
${ALCHEMY_PRODUCT_INFO}
--- END ALCHEMY PRODUCT INFORMATION ---

--- BEGIN ALCHEMY DATA API DOCUMENTATION ---
${global.ALCHEMY_DATA_INFO || ''}
--- END ALCHEMY DATA API DOCUMENTATION ---

--- BEGIN ALCHEMY NODE API DOCUMENTATION ---
${global.ALCHEMY_NODE_INFO || ''}
--- END ALCHEMY NODE API DOCUMENTATION ---

You have access to comprehensive Alchemy documentation above including:
- Data API: For querying blockchain data, transactions, NFTs, tokens, etc.
- Node API: For blockchain node services, enhanced APIs, webhooks, etc.

You have access to comprehensive Alchemy product information and Data API documentation above.
Use this knowledge if relevant to provide value in the follow-up.

Follow-up Constraints:
- Keep it VERY brief - 1-2 short lines maximum
- Be friendly and non-pushy
- Reference the original message context naturally
- Provide value or ask a gentle question
- Examples: "Just checking in - any thoughts?", "Curious if you had a chance to think about this?", "Would love to hear your perspective when you have a sec"

Tone: casual, friendly, respectful of their time.`;

/**
 * Generate outbound message using Claude
 * @param {Object} contact - Contact information
 * @param {boolean} isRegenerate - If true, adds variety instructions to prompt
 */
export async function generateOutbound(contact, isRegenerate = false) {
  console.log(`🔧 generateOutbound called for ${contact.name} ${isRegenerate ? '(REGENERATE)' : ''}`);
  console.log(`   Notes: "${contact.notes}"`);

  // Add timestamp seed for variety when regenerating
  const varietySeed = isRegenerate ? `\n\nVARIETY SEED: ${Date.now()} - Generate a COMPLETELY DIFFERENT message from any previous attempts. Use different angles, different Alchemy features, different phrasing. Take inspiration from the successful examples but create something unique.` : '';

  // Check if notes end with a question mark
  const hasQuestion = contact.notes && contact.notes.trim().endsWith('?');
  console.log(`   Has question: ${hasQuestion}`);

  if (hasQuestion) {
    console.log(`📝 Question detected: "${contact.notes}"`);

    // Use Claude to answer the question directly using the documentation
    console.log(`🤖 Asking Claude to answer question with documentation`);

    const userPrompt = `You are an Alchemy SDR writing a cold outreach message to answer this specific question from a prospect:

QUESTION: "${contact.notes}"

Contact: ${contact.name} at ${contact.company}

CRITICAL INSTRUCTIONS:
1. Line 1 MUST be: "Hey ${contact.name}, congrats on the success over at ${contact.company}!"
2. Line 2 MUST directly answer their question using the Alchemy documentation in your system prompt
   - Start with "Yes" or a direct answer
   - Include specific details (numbers, chain names, features, etc.)
   - Be technically accurate using the docs
3. Line 3 MUST be a simple call-to-action question

DO NOT write generic phrases like:
- "I noticed you might be interested"
- "Would you be open to learning more"
- "I wanted to reach out about"

ANSWER THE QUESTION DIRECTLY with specific information from the documentation.

Example for "What chains does the node API support?":
Hey ${contact.name}, congrats on the success over at ${contact.company}!

Alchemy's Node API supports 80+ chains including Ethereum, Polygon, Arbitrum, Optimism, Base, Solana, and all major L1s/L2s - all accessible through one integration.

Want to chat about your multi-chain infrastructure needs?${varietySeed}`;

    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 400,
      system: OUTBOUND_SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    let text = msg?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
    console.log(`📤 Claude response: ${text}`);

    // Check if Claude is still being vague
    const vaguePatterns = [
      "interested in learning",
      "I noticed",
      "might be interested",
      "wanted to reach out",
      "exploring ways",
      "curious if you",
      "open to discussing"
    ];

    const isVague = vaguePatterns.some(pattern => text.toLowerCase().includes(pattern));

    if (isVague) {
      console.warn(`⚠️ Claude response is vague, regenerating with stronger prompt`);

      // Try one more time with an even more explicit prompt
      const forcedPrompt = `Answer this question in a cold outreach message: "${contact.notes}"

Format:
Line 1: Hey ${contact.name}, congrats on the success over at ${contact.company}!
Line 2: [Direct answer with specific facts from Alchemy documentation - start with "Yes" or the answer]
Line 3: [One question as CTA]

Use the Alchemy Data API and Node API documentation in your system to provide accurate details.${varietySeed}`;

      const msg2 = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 400,
        system: OUTBOUND_SYSTEM,
        messages: [{ role: "user", content: forcedPrompt }],
      });

      text = msg2?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
      console.log(`📤 Second attempt: ${text}`);
    }

    return text;
  }

  // Regular outreach (no question)
  console.log(`📧 Generating regular outreach (no question)`);
  const userPrompt = `Contact:
Name: ${contact.name}
Company: ${contact.company || "Unknown"}
Title: ${contact.title || "Unknown"}
Telegram: ${contact.telegram_handle || "Unknown"}
Notes (signals/angle): ${contact.notes || ""}

Write the first outbound Telegram DM using the Alchemy product information and documentation.${varietySeed}`;

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: OUTBOUND_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  return text || "Quick question—are you open to chatting this week?";
}

/**
 * Generate follow-up message using Claude
 */
export async function generateFollowUp(contactName, company, originalMessage) {
  const userPrompt = `Contact: ${contactName} at ${company}

Original message sent:
"${originalMessage}"

They haven't responded yet. Write a brief, friendly follow-up message.`;

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 150,
    system: FOLLOWUP_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  return text || "Just wanted to follow up - any thoughts?";
}

export { anthropic, CLAUDE_MODEL };

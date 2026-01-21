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
 * Check if target qualifies (raised >= $10M OR revenue >= $500k, must be web3)
 */
export function qualifiesTarget(t) {
  const raised = Number(t?.raised_usd) || 0;
  const rev = Number(t?.monthly_revenue_usd) || 0;
  const isWeb3 = t?.is_web3 === 1 || t?.is_web3 === true || t?.is_web3 === "1" || t?.is_web3 === "true";
  return (raised >= 10_000_000 || rev >= 500_000) && isWeb3;
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

/**
 * Split message text into paragraphs
 * Paragraphs are separated by double line breaks (\n\n)
 * @param {string} text - The full message text
 * @returns {string[]} Array of paragraph strings
 */
export function splitIntoParagraphs(text) {
  if (!text || typeof text !== 'string') return [];

  // Split by double line breaks (handles both \n\n and \r\n\r\n)
  const paragraphs = text
    .split(/\n\n+|\r\n\r\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs;
}

const PARAGRAPH_SEND_DELAY_MS = Number(process.env.PARAGRAPH_SEND_DELAY_MS || 1500);

/**
 * Send multiple paragraphs as separate Telegram messages
 * @param {string[]} paragraphs - Array of paragraph strings
 * @param {number} delayBetweenMs - Delay between sending each paragraph (default 1500ms)
 */
export async function sendMultiParagraphMessage(paragraphs, delayBetweenMs = PARAGRAPH_SEND_DELAY_MS) {
  if (!ENABLE_LOCAL_TELEGRAM) {
    throw new Error("Telegram automation only available on local Mac");
  }

  if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
    throw new Error("paragraphs must be a non-empty array");
  }

  console.log(`📤 Sending ${paragraphs.length} paragraphs as separate messages`);

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue; // Skip empty paragraphs

    console.log(`  → Sending paragraph ${i + 1}/${paragraphs.length}`);

    // Copy paragraph to clipboard
    setClipboardMac(paragraph);

    // Paste into Telegram
    await activateTelegram();
    await runAppleScriptLines(['tell application "System Events" to keystroke "v" using command down']);

    // Small delay to ensure paste completes
    await new Promise(r => setTimeout(r, 300));

    // Press Enter to send immediately
    await runAppleScriptLines(['tell application "System Events" to key code 36']);

    // Wait before sending next paragraph (except for the last one)
    if (i < paragraphs.length - 1) {
      console.log(`  ⏱️  Waiting ${delayBetweenMs}ms before next paragraph...`);
      await new Promise(r => setTimeout(r, delayBetweenMs));
    }
  }

  console.log(`✅ All ${paragraphs.length} paragraphs sent successfully`);
}

/**
 * Capture a screenshot of the Telegram window (Mac-only)
 * @returns {Promise<string>} Path to the captured screenshot
 */
export async function captureTelegramWindow() {
  if (!ENABLE_LOCAL_TELEGRAM) {
    throw new Error("Screenshot capture only available on local Mac");
  }

  const tempPath = `/tmp/telegram-capture-${Date.now()}.png`;

  // First activate Telegram to ensure it's frontmost
  await activateTelegram();

  // Wait longer for the chat to fully load (Telegram needs time to switch to the conversation)
  console.log("⏳ Waiting for Telegram chat to load...");
  await new Promise(r => setTimeout(r, 2500));

  // Capture the entire screen (Telegram is frontmost so the chat will be visible)
  console.log("📸 Capturing screenshot...");
  return new Promise((resolve, reject) => {
    execFile("screencapture", ["-x", tempPath], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ Screenshot saved to ${tempPath}`);
        resolve(tempPath);
      }
    });
  });
}

/**
 * Extract the contact's response from a Telegram screenshot using Claude Vision
 * @param {string} imagePath - Path to the screenshot image
 * @returns {Promise<string>} The extracted response text or "NO_RESPONSE"
 */
export async function extractResponseFromScreenshot(imagePath) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Screenshot file not found: ${imagePath}`);
  }

  const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: imageData
          }
        },
        {
          type: 'text',
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
  });

  const extractedText = response.content[0].text.trim();

  // Clean up the temporary screenshot file
  try {
    fs.unlinkSync(imagePath);
  } catch (e) {
    console.warn("Could not delete temp screenshot:", e.message);
  }

  return extractedText;
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

CRITICAL FORMATTING:
- Use double line breaks (blank lines) between paragraphs, exactly like the examples
- Example format:
  Hey Name, congrats on the success over at Company!


  [paragraph 2 with specific reason/feature]


  [question paragraph]

Constraints:
- The FIRST line must be exactly: "Hey {Name}, congrats on the success over at {Company}!"
- 2-3 short paragraphs total separated by double newlines
- Mention ONE specific reason to reach out (use Notes)
- Ask EXACTLY one question
- No links
- No pricing/credits/security commitments

VARIETY REQUIREMENT:
- Every message MUST be completely unique
- Use different Alchemy features/angles each time
- Vary sentence structure, phrasing, and examples
- Never repeat the same message pattern twice

Tone: human, brief, crypto-native.

OUTPUT FORMAT: Return ONLY the message text itself. No introductory phrases like "Here is a unique first outbound Telegram DM" or "Here's the message". Just output the raw message starting with "Hey".`;

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

FORMATTING:
- If message has multiple paragraphs, use double line breaks (blank lines) between them
- Follow the same spacing pattern as the successful examples

Follow-up Constraints:
- Keep it VERY brief - 1-2 short lines maximum (can be split into paragraphs with double newlines if needed)
- Be friendly and non-pushy
- Reference the original message context naturally
- Provide value or ask a gentle question
- Examples: "Just checking in - any thoughts?", "Curious if you had a chance to think about this?", "Would love to hear your perspective when you have a sec"

Tone: casual, friendly, respectful of their time.

OUTPUT FORMAT: Return ONLY the message text itself. No introductory phrases like "Here is a follow-up message" or "Here's the message". Just output the raw message directly.`;

/**
 * Generate outbound message using Claude
 * @param {Object} contact - Contact information
 * @param {boolean} isRegenerate - If true, adds variety instructions to prompt
 */
export async function generateOutbound(contact, isRegenerate = false) {
  console.log(`🔧 generateOutbound called for ${contact.name} ${isRegenerate ? '(REGENERATE)' : ''}`);
  console.log(`   Notes: "${contact.notes}"`);

  // Always add timestamp and random seed for maximum variety
  const randomSeed = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const varietySeed = `\n\nVARIETY SEED: ${timestamp}-${randomSeed} - Generate a COMPLETELY UNIQUE message. Use different angles, different Alchemy features, different phrasing, and different sentence structures. Take inspiration from the successful examples but create something fresh and original. No two messages should ever be similar.`;

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
2. Add TWO blank lines (double newline)
3. Line 2 MUST directly answer their question using the Alchemy documentation in your system prompt
   - Start with "Yes" or a direct answer
   - Include specific details (numbers, chain names, features, etc.)
   - Be technically accurate using the docs
4. Add TWO blank lines (double newline)
5. Line 3 MUST be a simple call-to-action question

FORMATTING: Use double line breaks between paragraphs (blank lines), exactly like the successful examples.

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

Format (MUST use double line breaks between paragraphs):
Line 1: Hey ${contact.name}, congrats on the success over at ${contact.company}!
[blank line]
[blank line]
Line 2: [Direct answer with specific facts from Alchemy documentation - start with "Yes" or the answer]
[blank line]
[blank line]
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
 * Generate improved outbound message with user feedback
 * Uses approved examples from "Successful SDR Messaging.txt" as inspiration
 * @param {Object} contact - Contact information (includes current message_text)
 * @param {string} feedback - User feedback on how to improve the message
 */
export async function generateOutboundWithFeedback(contact, feedback) {
  console.log(`🔧 generateOutboundWithFeedback called for ${contact.name}`);
  console.log(`   Feedback: "${feedback}"`);

  const currentMessage = contact.message_text;

  // Build enhanced system prompt that includes feedback context
  const FEEDBACK_SYSTEM = `You are an Alchemy SDR improving a Telegram outreach message based on specific feedback.

Below are REAL successful outbound messages previously sent.
Use them as inspiration for tone, phrasing, structure, and technical depth.

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

DEFAULT GUIDELINES (can be overridden by user feedback):
- Use double line breaks (blank lines) between paragraphs
- Start with: "Hey {Name}, congrats on the success over at {Company}!"
- Keep it brief and conversational
- Mention specific Alchemy products/features
- Ask one question
- No links, no pricing/credits/security commitments

Tone: human, brief, crypto-native.`;

  const userPrompt = `Contact: ${contact.name} at ${contact.company || "Unknown"}
Title: ${contact.title || "Unknown"}
Notes: ${contact.notes || ""}

CURRENT MESSAGE:
"""
${currentMessage}
"""

⚠️⚠️⚠️ MANDATORY USER FEEDBACK - FOLLOW EXACTLY ⚠️⚠️⚠️
"""
${feedback}
"""

INTERPRETATION RULES:
- "3 lines" = exactly 3 lines total (greeting + 2 more lines)
- "2 paragraphs" = exactly 2 paragraphs (greeting paragraph + 1 more)
- "shorter" = cut length by at least 50%
- "more technical" = add specific API/product names (e.g., "Alchemy Data API", "getTransactionReceipts", "Cortex")
- "different angle" = completely change which product you're pitching

The feedback above OVERRIDES ALL default guidelines. Follow it literally and precisely.
DO NOT write a standard message format if the feedback requests something different.

OUTPUT FORMAT: Return ONLY the message text itself. No "Here's the improved message:", no "Thank you", no preamble or explanation. Just the raw Telegram message starting with "Hey ${contact.name}..."`;

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL, // Use Haiku with stronger prompting
    max_tokens: 400,
    system: FEEDBACK_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  console.log(`📤 Improved message: ${text.substring(0, 100)}...`);

  return text || currentMessage; // Fallback to current message if generation fails
}

/**
 * Generate follow-up message using Claude
 */
export async function generateFollowUp(contactName, company, originalMessage, options = {}) {
  const { feedback, currentFollowup, theirResponse } = options;

  // Always add timestamp and random seed for maximum variety
  const randomSeed = Math.random().toString(36).substring(7);
  const timestamp = Date.now();
  const varietySeed = `\n\nVARIETY SEED: ${timestamp}-${randomSeed} - Generate a COMPLETELY UNIQUE follow-up. Use different phrasing, different approach, different tone. Every follow-up should be distinct and original.`;

  let userPrompt;

  // If we have their response, create a reply to their message
  if (theirResponse) {
    userPrompt = `Contact: ${contactName} at ${company}

Your original message:
"${originalMessage}"

Their response:
"${theirResponse}"

Write a brief, friendly reply to their response. Acknowledge what they said and continue the conversation naturally.`;

    if (feedback && currentFollowup) {
      userPrompt = `Contact: ${contactName} at ${company}

Your original message:
"${originalMessage}"

Their response:
"${theirResponse}"

Current reply draft:
"${currentFollowup}"

FEEDBACK FOR IMPROVEMENT: ${feedback}

Rewrite the reply based on the feedback above. Make sure to incorporate the requested changes while keeping it brief and friendly.`;
    } else if (feedback) {
      userPrompt += `\n\nADDITIONAL GUIDANCE: ${feedback}`;
    }
  } else {
    // No response - standard follow-up
    userPrompt = `Contact: ${contactName} at ${company}

Original message sent:
"${originalMessage}"

They haven't responded yet. Write a brief, friendly follow-up message.`;

    // If regenerating with feedback, include the current followup and feedback
    if (feedback && currentFollowup) {
      userPrompt = `Contact: ${contactName} at ${company}

Original message sent:
"${originalMessage}"

Current follow-up draft:
"${currentFollowup}"

FEEDBACK FOR IMPROVEMENT: ${feedback}

Rewrite the follow-up message based on the feedback above. Make sure to incorporate the requested changes while keeping it brief and friendly.`;
    } else if (feedback) {
      userPrompt += `\n\nADDITIONAL GUIDANCE: ${feedback}`;
    }
  }

  userPrompt += varietySeed;

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

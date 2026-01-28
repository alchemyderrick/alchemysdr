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
  if (!desktop) return Promise.resolve();

  return new Promise((resolve, reject) => {
    execFile("open", [desktop], (err) => {
      if (err) {
        console.error("open tg link error:", err);
        reject(err);
      } else {
        resolve();
      }
    });
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
 * @param {string} [originalMessage] - The original outbound message to help filter it out
 * @returns {Promise<string>} The extracted response text or "NO_RESPONSE"
 */
export async function extractResponseFromScreenshot(imagePath, originalMessage = null) {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Screenshot file not found: ${imagePath}`);
  }

  const imageData = fs.readFileSync(imagePath, { encoding: 'base64' });

  // Build the prompt with optional original message context
  let promptText = `This is a screenshot of a Telegram chat conversation. Your task is to extract ONLY the response messages from the contact (the other person).

CRITICAL VISUAL IDENTIFICATION:
- In Telegram, MY messages (the user/sender) appear on the RIGHT side with BLUE bubbles
- The CONTACT'S messages (their responses) appear on the LEFT side with GRAY/DARK bubbles
- The contact's profile photo/avatar may appear next to their messages on the left

WHAT TO EXTRACT:
- ONLY messages in LEFT-ALIGNED GRAY/DARK bubbles (these are from the contact)
- These are incoming messages - the responses we want to capture

WHAT TO IGNORE COMPLETELY:
- ALL RIGHT-ALIGNED BLUE bubbles (these are MY outgoing messages - ignore them entirely)
- Any quoted/forwarded message previews shown inside bubbles
- System messages, timestamps, date separators
- Any text that appears in blue bubbles, even if it looks like it could be a response`;

  // Add original message context if provided
  if (originalMessage) {
    promptText += `

IMPORTANT - HERE IS MY ORIGINAL OUTBOUND MESSAGE (DO NOT INCLUDE THIS TEXT):
"""
${originalMessage}
"""
If you see any text similar to the above in the screenshot, that is MY message - DO NOT extract it. Only extract the OTHER person's response.`;
  }

  promptText += `

STRICT RULES:
1. NEVER extract text from blue bubbles - those are my messages, not theirs
2. If you see the same text in both a gray bubble AND a blue bubble, only extract from the gray bubble
3. If no gray/left-aligned messages exist, return exactly: NO_RESPONSE
4. Extract messages in chronological order (oldest first)
5. Separate multiple messages with double newlines

Return ONLY the raw message text from LEFT-ALIGNED GRAY bubbles. No labels, no commentary, no explanations.`;

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
          text: promptText
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

// Hardcoded SDR style examples (previously loaded from file)
const SDR_STYLE_EXAMPLES = `Successful Messaging:

1. hey team! noticing a pretty big increase in usage this month


curious if all of your infra is on alchemy? would love to see how we can help consolidate!


i know we were also chatting about gasless txn's previously, happy to continue the convo there as well


2. wanted to mention Alchemy recently announced our new Transaction Engine, enabling gasless transactions + txn bundling through EIP-7702 (we actually power 70% of ALL bundled UserOps across all of EVM!)

3. Hey Chuck! I know Dexari is mostly on Hypercore currently, curious if you guys are expanding more into HyperEVM in the near future?


we recently shipped our first full infra revamp improving latency by up to 5x for teams like Opensea, Phantom, Uniswap, etc.


would love to chat with your team to learn more about what your current infra setup looks like

4. we been working with Phygitals, CollectorCrypt, Phantom, etc. on trials and seen improvements of up to 5x in terms of latency


Would you be open to a 24h trial (free CU's) with us to see what we've built out?


benchmarks here: https://alchemyinsights.grafana.net/public-dashboards/2e1b5ccc97dd4e438dc4e5c6bba29781

5. For context:


Alchemy is the leading infra provider across the Web3 space — currently powering infrastructure for over 70% of the top EVM dapps including Opensea, Uniswap, Phantom, etc.


We recently shipped our first full infra revamp improving latency by up to 5x for teams like Opensea, Phantom, Uniswap, etc. and I'd love to chat over what your current infra setup looks like!


Site: https://www.alchemy.com/


Docs: https://www.alchemy.com/docs/

6. hm gotcha, i'd love to jump on a call with one of my solutions engineers to
diagnose the usage increase here
typically we should be cheaper than running your own node especially if
you're providing global support

we have bare metal servers in data centers across the world to ensure the
lowest latency

depending on your usage, we'd most likely be able to give
credits+decreased rates as well

Solana Messaging:

1. we actually completely revamped our Solana architecture recently and acquired Dexter Lab, making us the leader in archival data in the space


we actually helped teams increase user transactions increase by up to 5x on some Solana dapps, dont want to take up too much of your time, but would love to show a demo here




just touching base again as we've been partnering with teams like Opensea, Phantom, and Phygitals in trialing our new Solana offering where our benchmarks have proved to be the most performant amongst competitors


happy to chat moreover what this looks like for Definitive early next week 🙂



I noticed your usage has gone up pretty massively this month on Alchemy
and would love to learn more about what you're building today

Happy to also trade some notes on how we can improve your latency and
potentially provide cheaper rates depending on your overall usage

Let me know if you'd be free for a quick 15 min call next week!

(benchmarks here: https://alchemyinsights.grafana.net/public-
dashboards/bddf9388a79f436ea0994cfbebb37a5a)

---

1. Latency
Hey xyz!
[Line on what they're doing in DeFi - that ties in the message]
We recently announced Cortex and been working with top DeFi teams (Aave, Uniswap, Polymarket) to help them improve latency by up to 5x—making Alchemy the fastest across every chain. With our revamped architecture - faster data = snappier trading, less slippage/MEV.
Open to a quick chat on how we can help your team cut latency by up to 5x?

2. Follow Up (Polymarket)
Don't just take it from us, we've started to transition our top partners to our new infra - check out early feedback from Polymarket as they've seen 3x reduced latency and users were experiencing a 2.5x improvement in transaction speed!

Let's look to book some time next week! :)

3. Throughput
Excited to follow up as we continue to make improvements on our side — our new architecture now reaches up to 90k RPS with no change in error rate.
At Alchemy, we know high throughput and low latency are key during volatile events. Our goal is to remove the stress of scaling infra, while helping you capitalize during these key scaling events.
Free to chat this week on how we can help you scale?

4. Multi-region
Not sure if you're aware, our revamped infra now has improved multi-region support, serving users across the globe while keeping speeds consistently fast regardless of location!
Round-trip times have now reduced, improving responsiveness for both bots and human traders. Running nodes, relays, and APIs in multiple regions (e.g., North America, Europe, Asia) brings infrastructure physically closer to:
* Validators and sequencers submitting transactions
* End-users interacting with dApps
* Oracles publishing data
One of the largest wallet teams in all of web3 reported >10x faster P50s due to our revamped infra.
Happy to sync and take a look at how your setup's handling global traffic lately!

5. Reliability
99.9% reliability is simply not enough and at Alchemy, we understand this.
Our infra now auto-detects issues and redirects requests in real time to keep things running smoothly. If a region experiences an outage or degradation, traffic automatically shifts to a healthy region, preserving both performance and data integrity.
Let's find time this week to see how we can improve reliability and remove the need for multiple providers as backups :)

6. Chains
Hey name, noticed you guys are currently on 5 chains over at XXX!
Over the past year, Alchemy has went from 5-80 chains supported across the platform. The idea is to simplify multi-chain development: one integration gets you access to dozens of networks, with consistent tooling across the board.
As teams juggle deployments across L1s and L2s, extended chain support leads to easier liquidity expansion, less overhead managing different environments.
Let me know if it makes sense to walk through your plans for chain support and what Alchemy supports today

7. Wrap-up
Hey team, wanted to check in here as things are moving along on your side!
We're working closely with a handful of high-growth teams in DeFi right now, helping them scale infra as they enter new markets, launch new products, or prep for more volume.
If you're thinking about what the next 6–12 months looks like from an infra lens — happy to connect and see if there's a fit to go deeper together.
No pressure at all, just wanted to get this on your radar as we've seen these convos open up a lot of value when timed right`;
console.log("📘 Loaded SDR style examples (hardcoded)");

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

/**
 * Generate a support response using Claude and Alchemy documentation
 * @param {string} supportMessage - The customer's support message
 * @param {Object} options - Optional parameters
 * @param {string} options.feedback - Feedback on how to improve the current response
 * @param {string} options.currentResponse - The current response to improve
 */
export async function generateSupportResponse(supportMessage, options = {}) {
  const { feedback, currentResponse } = options;

  // Build the system prompt with Alchemy documentation
  const SUPPORT_SYSTEM = `You are an Alchemy support representative helping customers with their questions about Alchemy products and services.

--- BEGIN ALCHEMY PRODUCT INFORMATION ---
${ALCHEMY_PRODUCT_INFO}
--- END ALCHEMY PRODUCT INFORMATION ---

--- BEGIN ALCHEMY DATA API DOCUMENTATION ---
${global.ALCHEMY_DATA_INFO || ALCHEMY_DATA_INFO || ''}
--- END ALCHEMY DATA API DOCUMENTATION ---

--- BEGIN ALCHEMY NODE API DOCUMENTATION ---
${global.ALCHEMY_NODE_INFO || ''}
--- END ALCHEMY NODE API DOCUMENTATION ---

GUIDELINES:
- Be helpful, professional, and friendly
- Use the Alchemy documentation above to provide accurate, specific answers
- Include relevant API endpoints, code examples, or documentation links when helpful
- If the question is about something not covered in the documentation, acknowledge this and provide general guidance
- Keep responses concise but complete
- If asking for clarification would help, do so politely
- Always sign off in a friendly way

OUTPUT FORMAT: Return ONLY the support response text. No labels, no "Here's the response:", just the message itself.`;

  let userPrompt;

  if (feedback && currentResponse) {
    // Regenerating with feedback
    userPrompt = `Customer's support message:
"""
${supportMessage}
"""

Current response draft:
"""
${currentResponse}
"""

FEEDBACK FOR IMPROVEMENT: ${feedback}

Rewrite the support response based on the feedback above. Make sure to incorporate the requested changes while maintaining a helpful and professional tone.`;
  } else if (currentResponse) {
    // Regenerating without specific feedback (just want a different version)
    const randomSeed = Math.random().toString(36).substring(7);
    userPrompt = `Customer's support message:
"""
${supportMessage}
"""

Current response draft:
"""
${currentResponse}
"""

Generate a different version of this support response. Use a different approach, different examples, or different phrasing while still accurately addressing the customer's question.

VARIETY SEED: ${randomSeed}`;
  } else {
    // Initial generation
    userPrompt = `Customer's support message:
"""
${supportMessage}
"""

Write a helpful support response to address the customer's question or issue. Use the Alchemy documentation to provide accurate and specific information.`;
  }

  const msg = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
    system: SUPPORT_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = msg?.content?.map((c) => (c.type === "text" ? c.text : "")).join("").trim();
  return text || "I apologize, but I wasn't able to generate a response. Please try again or reach out to our support team directly.";
}

export { anthropic, CLAUDE_MODEL };

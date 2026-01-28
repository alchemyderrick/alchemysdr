import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import SqliteStore from "better-sqlite3-session-store";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import fs from "node:fs";
import path from "node:path";
import { WorkflowEngine } from "./lib/workflow-engine.js";
import { initializeDatabase, getDatabaseForEmployee, closeAllDatabases, getDatabaseDir } from "./lib/database.js";
import { createUser, verifyUser, getUserByEmployeeId, getAllUsers, resetUserPassword, getAuthDatabase } from "./lib/auth.js";
import {
  nowISO,
  tgLinks,
  xLink,
  qualifiesTarget,
  setClipboardMac,
  openTelegramDesktopLink,
  pasteIntoTelegram,
  scheduleTelegramAutoSend,
  cancelTelegramAutoSend,
  splitIntoParagraphs,
  sendMultiParagraphMessage,
  captureTelegramWindow,
  extractResponseFromScreenshot,
  generateOutbound,
  generateOutboundWithFeedback,
  generateFollowUp,
  anthropic,
  CLAUDE_MODEL,
} from "./lib/helpers.js";
import { createWorkflowRoutes } from "./routes/workflow.js";
import { createTargetRoutes } from "./routes/targets.js";
import { createContactRoutes } from "./routes/contacts.js";
import { createDraftRoutes } from "./routes/drafts.js";
import { createApolloClient } from "./lib/apollo-search.js";
import { parseBrowserCookies } from "./lib/x-auth.js";

const app = express();

// Trust Railway proxy for secure cookies
app.set('trust proxy', 1);

// Helper to strip citation tags from text (e.g., <cite index="46-3,46-4">)
function stripCiteTags(text) {
  if (!text) return text;
  return String(text).replace(/<cite[^>]*>/gi, '').replace(/<\/cite>/gi, '').trim();
}

// CORS configuration - allow same origin and credentials
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.) or from allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://sdr-console-production.up.railway.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins for now (can restrict later)
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Session setup for authentication (BEFORE request logging)
// Store sessions in databases/ folder for Railway persistent volume support
const dbDir = getDatabaseDir();
const sessionsDbPath = path.join(dbDir, 'sessions.db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const SessionStore = SqliteStore(session);
app.use(session({
  store: new SessionStore({
    client: new Database(sessionsDbPath),
    expired: {
      clear: true,
      intervalMs: 900000 // 15 minutes
    }
  }),
  secret: process.env.SESSION_SECRET || 'change-this-in-production-please',
  resave: false,
  saveUninitialized: false,
  proxy: true, // Trust proxy for secure cookies
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production (HTTPS required)
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site bookmarklet on Railway, 'lax' for local dev
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  }
}));

// Request logging middleware (for debugging) - AFTER session middleware
app.use((req, res, next) => {
  if (req.path.includes('/api/drafts')) {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    console.log(`[REQUEST] Body:`, req.body);
    console.log(`[REQUEST] Session:`, req.session?.employeeId || 'NO SESSION');
    console.log(`[REQUEST] Cookies:`, req.cookies);
  }
  next();
});

// Serve static files from current directory
app.use(express.static(process.cwd()));

// Serve Next.js static export (both dev and production)
const frontendOutPath = path.join(process.cwd(), 'frontend', 'out');

// Check if Next.js static export exists
if (fs.existsSync(frontendOutPath)) {
  console.log("📦 Serving Next.js static export from frontend/out");

  // List files to verify build
  const files = fs.readdirSync(frontendOutPath);
  console.log("📄 Frontend files:", files.slice(0, 10).join(', '), files.length > 10 ? `... (${files.length} total)` : '');

  // Serve Next.js static files with priority
  app.use(express.static(frontendOutPath, { index: false }));
} else {
  console.log("⚠️ Next.js static export not found at frontend/out");
  console.log("💡 Run 'npm run build' to generate frontend");
  console.log("📂 Current directory:", process.cwd());
  console.log("📂 Directory contents:", fs.readdirSync(process.cwd()));
}

// Initialize database
const db = initializeDatabase();

// Initialize Apollo API client
const apolloApiKey = process.env.APOLLO_API_KEY;
const apolloClient = createApolloClient(apolloApiKey);

if (apolloApiKey) {
  console.log("✅ Apollo API client initialized");
} else {
  console.log("⚠️ Apollo API key not configured (will use Claude fallback only)");
}

// ============================================
// Authentication Middleware & Endpoints
// ============================================

/**
 * Authentication middleware - protects routes that require login
 */
function requireAuth(req, res, next) {
  if (!req.session.employeeId) {
    // For API calls, return 401
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    // For page requests, redirect to login
    return res.redirect('/login');
  }

  // If admin is impersonating, use impersonated employee's database
  const activeEmployeeId = req.session.impersonating || req.session.employeeId;

  req.employeeId = activeEmployeeId;
  req.username = req.session.username;
  req.isAdmin = req.session.isAdmin || false;
  req.impersonating = req.session.impersonating || null;
  req.db = getDatabaseForEmployee(activeEmployeeId);

  next();
}

/**
 * Relayer authentication middleware - for Mac client API access
 */
function authenticateRelayer(req, res, next) {
  const apiKey = req.headers['x-relayer-api-key'];
  const employeeId = req.headers['x-employee-id'];

  if (!employeeId) {
    return res.status(400).json({ error: 'x-employee-id header required' });
  }

  if (apiKey !== process.env.RELAYER_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.employeeId = employeeId;
  req.db = getDatabaseForEmployee(employeeId);

  next();
}

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Validate username (alphanumeric, underscore, dash only)
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and dashes' });
  }

  // Validate password length
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Use username as employee_id for self-registration
  const result = await createUser(username, password, username, false);

  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Automatically log them in after registration
  req.session.employeeId = username;
  req.session.username = username;
  req.session.isAdmin = false;
  req.session.impersonating = null;

  // Explicitly save session before responding
  req.session.save((err) => {
    if (err) {
      console.error('[REGISTRATION] Session save error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({
      success: true,
      username: username,
      employeeId: username,
      isAdmin: false
    });
  });
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = await verifyUser(username, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  // Set session
  req.session.employeeId = result.employeeId;
  req.session.username = result.username;
  req.session.isAdmin = result.isAdmin;
  req.session.impersonating = null;

  // Explicitly save session before responding
  req.session.save((err) => {
    if (err) {
      console.error('[LOGIN] Session save error:', err);
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({
      success: true,
      username: result.username,
      employeeId: result.employeeId,
      isAdmin: result.isAdmin
    });
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Bootstrap endpoint - Create first admin user (only works if no users exist)
app.post('/api/auth/bootstrap-admin', async (req, res) => {
  try {
    // Check if any users exist
    const users = getAllUsers();

    if (users.length > 0) {
      return res.status(403).json({
        error: 'Bootstrap disabled',
        message: 'Admin user already exists. Use login instead.'
      });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 6 characters'
      });
    }

    // Create admin user: derrick/derrick
    const result = await createUser('derrick', password, 'derrick', true);

    if (result.success) {
      res.json({
        success: true,
        message: 'Admin user created successfully',
        username: 'derrick',
        employeeId: 'derrick',
        loginUrl: '/login'
      });
    } else {
      res.status(400).json({
        error: 'Failed to create admin',
        message: result.error
      });
    }
  } catch (error) {
    console.error('[BOOTSTRAP] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Admin password reset endpoint - requires SESSION_SECRET as authorization
// Usage: curl -X POST https://your-app.railway.app/api/auth/reset-admin -H "Authorization: Bearer YOUR_SESSION_SECRET" -H "Content-Type: application/json" -d '{"password":"newpassword"}'
app.post('/api/auth/reset-admin', async (req, res) => {
  const authHeader = req.headers.authorization;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret || sessionSecret === 'change-this-in-production-please') {
    return res.status(500).json({ error: 'SESSION_SECRET not configured' });
  }

  if (!authHeader || authHeader !== `Bearer ${sessionSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const result = await resetUserPassword('derrick', password, true);

  if (result.success) {
    res.json({ success: true, message: 'Admin password reset successfully' });
  } else {
    res.status(400).json({ error: result.error });
  }
});

// Healthcheck endpoint - verify frontend is built and served
app.get('/api/health', (req, res) => {
  const frontendExists = fs.existsSync(path.join(process.cwd(), 'frontend', 'out'));
  const indexExists = fs.existsSync(path.join(process.cwd(), 'frontend', 'out', 'index.html'));

  res.json({
    status: 'ok',
    frontend: {
      built: frontendExists,
      indexHtml: indexExists,
      path: path.join(process.cwd(), 'frontend', 'out')
    },
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Relayer Installer Endpoints
// ============================================

// Serve the one-click installer script
app.get('/install.sh', (req, res) => {
  const scriptPath = path.join(process.cwd(), 'scripts', 'install-relayer.sh');
  if (fs.existsSync(scriptPath)) {
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(scriptPath);
  } else {
    res.status(404).send('Install script not found');
  }
});

// Serve the relayer package tarball
app.get('/relayer-package.tar.gz', (req, res) => {
  const packagePath = path.join(process.cwd(), 'relayer-package.tar.gz');
  if (fs.existsSync(packagePath)) {
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', 'attachment; filename="relayer-package.tar.gz"');
    res.sendFile(packagePath);
  } else {
    res.status(404).json({
      error: 'Package not found',
      message: 'Run "npm run create-package" to generate the relayer package'
    });
  }
});

// Check auth status endpoint
app.get('/api/auth/status', (req, res) => {
  console.log('[AUTH STATUS] Session ID:', req.sessionID);
  console.log('[AUTH STATUS] Session data:', req.session);
  console.log('[AUTH STATUS] Cookies:', req.cookies);
  console.log('[AUTH STATUS] Headers:', req.headers.cookie);

  if (req.session.employeeId) {
    res.json({
      authenticated: true,
      username: req.session.username,
      employeeId: req.session.employeeId,
      isAdmin: req.session.isAdmin || false,
      impersonating: req.session.impersonating || null,
      sessionId: req.sessionID
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Admin: Impersonate employee
app.post('/api/admin/impersonate', requireAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).json({ error: 'employeeId required' });
  }

  // Validate employee exists
  const user = getUserByEmployeeId(employeeId);
  if (!user) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  // Set impersonation
  req.session.impersonating = employeeId;

  res.json({
    success: true,
    impersonating: employeeId,
    message: `Now viewing as ${user.username}`
  });
});

// Admin: Stop impersonating
app.post('/api/admin/stop-impersonate', requireAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.session.impersonating = null;

  res.json({
    success: true,
    message: 'Stopped impersonating'
  });
});

// Admin: Get all employees
app.get('/api/admin/employees', requireAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const users = getAllUsers();
  res.json({ users });
});

// Admin: Get employee activity summary
app.get('/api/admin/employees/:employeeId/stats', requireAuth, (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { employeeId } = req.params;
  const empDb = getDatabaseForEmployee(employeeId);

  const stats = {
    targets: empDb.prepare("SELECT COUNT(*) as count FROM targets WHERE status = 'approved'").get(),
    contacts: empDb.prepare('SELECT COUNT(*) as count FROM contacts').get(),
    drafts: empDb.prepare('SELECT COUNT(*) as count FROM drafts').get(),
    sent: empDb.prepare("SELECT COUNT(*) as count FROM drafts WHERE status = 'sent'").get(),
    pending: empDb.prepare("SELECT COUNT(*) as count FROM drafts WHERE status IN ('queued', 'approved')").get(),
    recentActivity: empDb.prepare(`
      SELECT 'draft' as type, status, updated_at
      FROM drafts
      ORDER BY updated_at DESC
      LIMIT 10
    `).all()
  };

  res.json({ employeeId, stats });
});

// Admin: Create new user or admin
app.post('/api/admin/create-user', requireAuth, async (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { username, password, employeeId, isAdmin } = req.body;

  // Validate inputs
  if (!username || !password || !employeeId) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Username, password, and employee ID are required'
    });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Weak password',
      message: 'Password must be at least 6 characters long'
    });
  }

  try {
    const result = await createUser(username, password, employeeId, isAdmin || false);

    if (result.success) {
      res.json({
        success: true,
        message: `${isAdmin ? 'Admin' : 'User'} created successfully`,
        username,
        employeeId,
        isAdmin: isAdmin || false
      });
    } else {
      res.status(400).json({
        error: 'User creation failed',
        message: result.error
      });
    }
  } catch (error) {
    console.error('[API] Error creating user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Graceful shutdown - close all database connections
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing databases...');
  closeAllDatabases();
  process.exit(0);
});

// ============================================
// Shared W Messaging API (Public Database)
// ============================================

// Get all shared successful messages (requires auth, shows all users' data)
app.get('/api/shared/successful-messages', requireAuth, (req, res) => {
  try {
    const authDb = getAuthDatabase();
    const rows = authDb.prepare(`
      SELECT * FROM shared_successful_messages
      ORDER BY created_at DESC
      LIMIT 200
    `).all();
    res.json(rows);
  } catch (e) {
    console.error("get shared successful messages error:", e?.message || e);
    res.status(500).json({ error: "failed to get shared successful messages", message: e?.message });
  }
});

// Save a successful message to the shared database
app.post('/api/shared/successful-messages', requireAuth, (req, res) => {
  try {
    const { contact_name, company, telegram_handle, message_text, message_type, their_response } = req.body;

    if (!contact_name || !company || !message_text || !message_type) {
      return res.status(400).json({
        error: "contact_name, company, message_text, and message_type are required"
      });
    }

    const authDb = getAuthDatabase();
    const id = nanoid();
    const ts = nowISO();

    authDb.prepare(`
      INSERT INTO shared_successful_messages
      (id, submitted_by, contact_name, company, telegram_handle, message_text, message_type, their_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.username, contact_name, company, telegram_handle || null, message_text, message_type, their_response || null, ts);

    console.log(`✅ Saved shared successful message by ${req.username} for ${contact_name} at ${company}`);

    res.json({ ok: true, id });
  } catch (e) {
    console.error("save shared successful message error:", e?.message || e);
    res.status(500).json({ error: "failed to save shared successful message", message: e?.message });
  }
});

// Delete a shared successful message (only submitter or admin)
app.delete('/api/shared/successful-messages/:id', requireAuth, (req, res) => {
  try {
    const { id } = req.params;
    const authDb = getAuthDatabase();

    // Check if message exists and who submitted it
    const message = authDb.prepare(`SELECT submitted_by FROM shared_successful_messages WHERE id = ?`).get(id);

    if (!message) {
      return res.status(404).json({ error: "message not found" });
    }

    // Only allow deletion if user is the submitter or an admin
    if (message.submitted_by !== req.username && !req.isAdmin) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    authDb.prepare(`DELETE FROM shared_successful_messages WHERE id = ?`).run(id);

    console.log(`🗑️ Deleted shared successful message ${id} by ${req.username}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("delete shared successful message error:", e?.message || e);
    res.status(500).json({ error: "failed to delete shared successful message", message: e?.message });
  }
});

// ============================================
// End Authentication Section
// ============================================

// Serve React UI - Note: catch-all route at end of file handles other pages
app.get("/", (req, res) => {
  const nextIndexPath = path.join(process.cwd(), 'frontend', 'out', 'index.html');

  if (fs.existsSync(nextIndexPath)) {
    return res.sendFile(nextIndexPath);
  }

  // If static export not found but FRONTEND_URL is set, redirect
  if (process.env.FRONTEND_URL) {
    return res.redirect(process.env.FRONTEND_URL);
  }

  // No React UI available
  return res.status(503).send('React UI not built. Please run: npm run build');
});

app.get("/api/targets/approved", requireAuth, (req, res) => {
  const rows = req.db.prepare(`
    SELECT
      t.*,
      COUNT(DISTINCT CASE
        WHEN d.status IN ('sent', 'dismissed', 'followup') THEN d.id
        ELSE NULL
      END) as messages_sent
    FROM targets t
    LEFT JOIN contacts c ON c.company = t.team_name
    LEFT JOIN drafts d ON d.contact_id = c.id
    WHERE t.status = 'approved'
      AND t.is_web3 = 1
      AND (
        t.raised_usd >= 10000000
        OR t.monthly_revenue_usd >= 500000
        OR (t.raised_usd = 0 OR t.raised_usd IS NULL)
      )
    GROUP BY t.id
    ORDER BY t.updated_at DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

app.post("/api/targets/:id/approve", requireAuth, (req, res) => {
  const { id } = req.params;
  const info = req.db.prepare(`UPDATE targets SET status = 'approved', updated_at = ? WHERE id = ?`).run(nowISO(), id);
  if (info.changes === 0) return res.status(404).json({ error: "target not found" });
  res.json({ ok: true });
});

app.get("/api/targets", requireAuth, (req, res) => {
  const rows = req.db.prepare(`
    SELECT * FROM targets
    WHERE status = 'pending'
      AND is_web3 = 1
      AND raised_usd >= 10000000
      AND monthly_revenue_usd >= 500000
      AND id NOT IN (
        SELECT t1.id FROM targets t1
        INNER JOIN targets t2 ON (
          t2.status IN ('approved', 'dismissed')
          AND (
            (t1.x_handle IS NOT NULL AND t1.x_handle = t2.x_handle)
            OR (t1.website IS NOT NULL AND t1.website = t2.website)
            OR (LOWER(TRIM(t1.team_name)) = LOWER(TRIM(t2.team_name)))
          )
        )
        WHERE t1.status = 'active'
      )
    ORDER BY monthly_revenue_usd DESC, raised_usd DESC
    LIMIT 50
  `).all();
  res.json(rows);
});

app.post("/api/targets/:id/find-contacts", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding contacts for ${target.team_name}...`);

    // Step 1: Search for team members and their X profiles
    const searchPrompt = `Search the web to find team members at ${target.team_name} who would be relevant for discussing blockchain infrastructure services.

Look for:
- Founders, Co-founders, CEO
- CTO, VP Engineering, Head of Engineering
- Head of Product, Head of Infrastructure
- Technical decision makers

For EACH person you find, you MUST locate their X/Twitter profile and get their X username (the @handle).

Search strategies:
1. Search "${target.team_name} founder twitter" or "${target.team_name} CTO twitter"
2. Visit the company website ${target.website || ''} and look for team pages with social links
3. Search "${target.team_name} team members"
4. Look at the company's X account ${target.x_handle ? '@' + target.x_handle : ''} followers/following for team members

For each person, you must find their X username by visiting their X profile.

CRITICAL: Only include people where you have successfully found their X username.

Respond with ONLY valid JSON:
[
  {
    "name": "Full Name",
    "x_username": "theirusername",
    "title": "Their role/title",
    "notes": "Why they're relevant"
  }
]

Find 5-10 key team members. If you can't find anyone with X usernames, return: []`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: "You are a research assistant. Always respond with valid JSON only, no additional text.",
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: searchPrompt }]
    });

    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }
    
    console.log("Raw search response:", responseText.substring(0, 800));
    
    let contacts = [];
    let cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        contacts = JSON.parse(jsonMatch[0]);
        console.log(`✅ Parsed ${contacts.length} contacts from initial search`);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        console.error("Attempted to parse:", jsonMatch[0].substring(0, 500));
        return res.status(500).json({ 
          error: "Failed to parse contact data",
          details: e.message,
          sample: jsonMatch[0].substring(0, 300)
        });
      }
    } else {
      console.log("⚠️ No JSON array found in response");
      console.log("Full response:", cleanText.substring(0, 1000));
    }

    if (!Array.isArray(contacts)) {
      contacts = [];
    }

    console.log(`📊 Found ${contacts.length} team members with X usernames`);

    // Step 2: For each contact, try to find their Telegram handle
    // Try multiple patterns: X username, firstname+lastname, firstname_lastname, etc.
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (!contact.x_username) continue;
      
      const xUsername = contact.x_username.replace('@', '');
      const xUrl = `https://x.com/${xUsername}`;
      
      try {
        console.log(`🔍 Verifying ${contact.name} (@${xUsername})...`);
        
        // Verify this person actually works at the company by checking their X bio
        const verifyPrompt = `Visit ${xUrl} and check if this person's X profile bio or description mentions ${target.team_name} or @${target.x_handle || target.team_name}.

Respond with ONLY:
VERIFIED - if their bio clearly indicates they work at ${target.team_name}
NOT_VERIFIED - if there's no mention of the company`;

        const verifyMsg = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 20,
          tools: [{
            type: "web_search_20250305",
            name: "web_search"
          }],
          messages: [{ role: "user", content: verifyPrompt }]
        });

        let verifyResponse = "";
        for (const block of verifyMsg.content) {
          if (block.type === "text") {
            verifyResponse += block.text;
          }
        }

        const isVerified = verifyResponse.trim().toUpperCase().includes("VERIFIED");
        
        if (!isVerified) {
          console.log(`❌ Could not verify ${contact.name} works at ${target.team_name}`);
          contact.verified = false;
          continue;
        }
        
        console.log(`✅ Verified ${contact.name} works at ${target.team_name}`);
        contact.verified = true;
        
        // Generate possible Telegram usernames to try
        const possibleHandles = [xUsername]; // Start with X username
        
        // Add various name combinations
        const nameParts = contact.name.toLowerCase().split(' ').filter(p => p.length > 0);
        if (nameParts.length >= 2) {
          const first = nameParts[0];
          const last = nameParts[nameParts.length - 1];
          
          // Common patterns
          possibleHandles.push(first + last);           // derrickyen
          possibleHandles.push(first + '_' + last);     // derrick_yen
          possibleHandles.push(first + '.' + last);     // derrick.yen
          possibleHandles.push(last + first);           // yenderrick
          possibleHandles.push(last + '_' + first);     // yen_derrick
          possibleHandles.push(last + '.' + first);     // yen.derrick
          possibleHandles.push(first + last.charAt(0)); // derricky
          possibleHandles.push(first.charAt(0) + last); // dyen
          
          // If there's a middle name or multiple parts, try first + last ignoring middle
          if (nameParts.length > 2) {
            possibleHandles.push(nameParts[0] + nameParts[nameParts.length - 1]);
            possibleHandles.push(nameParts[0] + '_' + nameParts[nameParts.length - 1]);
            possibleHandles.push(nameParts[0] + '.' + nameParts[nameParts.length - 1]);
          }
        }
        
        // Remove duplicates
        const uniqueHandles = [...new Set(possibleHandles)];
        console.log(`📋 Will try ${uniqueHandles.length} possible handles for ${contact.name}: ${uniqueHandles.slice(0, 5).join(', ')}...`);
        
        // Try each possible handle
        let foundTelegram = false;
        for (const handle of uniqueHandles) {
          const tgUrl = `https://t.me/${handle}`;
          console.log(`🔍 Trying Telegram: ${tgUrl}...`);
          
          try {
            const tgCheckPrompt = `Check if ${tgUrl} exists and shows a valid Telegram user profile.

Respond with ONLY:
EXISTS - if you can see a Telegram profile page
NOT_FOUND - if you see an error or "user not found"`;

            const tgMsg = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 20,
              tools: [{
                type: "web_search_20250305",
                name: "web_search"
              }],
              messages: [{ role: "user", content: tgCheckPrompt }]
            });

            let tgResponse = "";
            for (const block of tgMsg.content) {
              if (block.type === "text") {
                tgResponse += block.text;
              }
            }

            const tgExists = tgResponse.trim().toUpperCase().includes("EXISTS");
            if (tgExists) {
              contact.telegram_handle = handle;
              console.log(`✅ Telegram found: @${handle} for ${contact.name}`);
              foundTelegram = true;
              break; // Stop trying once we find one
            } else {
              console.log(`❌ No Telegram at @${handle}`);
            }
            
            await new Promise(r => setTimeout(r, 500));
          } catch (e) {
            console.error(`Error checking @${handle}:`, e.message);
          }
        }
        
        if (!foundTelegram) {
          console.log(`⚠️ No Telegram found for ${contact.name} after trying ${possibleHandles.length} patterns`);
        }
        
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error(`Error processing ${contact.name}:`, e.message);
        contact.verified = false;
      }
    }

    // Filter to only verified contacts
    const verifiedContacts = contacts.filter(c => c.verified !== false);
    
    console.log(`✅ Returning ${verifiedContacts.length} verified contacts, ${verifiedContacts.filter(c => c.telegram_handle).length} with Telegram`);
    res.json({ ok: true, contacts: verifiedContacts });

  } catch (e) {
    console.error("find-contacts error:", e);
    res.status(500).json({ error: "failed to find contacts", message: e.message });
  }
});

app.post("/api/targets/:id/find-website", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding website for ${target.team_name}...`);

    const searchPrompt = `Find the official website URL for ${target.team_name}. This is a web3/crypto company.

Search for their official website and respond with ONLY the full URL including https://.
If you cannot find an official website, respond with just the word "none".

Example responses:
- "https://uniswap.org" (for Uniswap)
- "https://aave.com" (for Aave)
- "none" (if not found)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: searchPrompt }]
    });

    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    const website = responseText.trim().toLowerCase();
    
    if (website && website !== "none" && (website.startsWith("http://") || website.startsWith("https://"))) {
      req.db.prepare("UPDATE targets SET website = ?, updated_at = ? WHERE id = ?").run(website, nowISO(), id);
      console.log(`✅ Found website for ${target.team_name}: ${website}`);
      res.json({ ok: true, website });
    } else {
      console.log(`❌ No website found for ${target.team_name}`);
      res.json({ ok: true, website: null });
    }

  } catch (e) {
    console.error("find-website error:", e);
    res.status(500).json({ error: "failed to find website", message: e.message });
  }
});

app.post("/api/targets/:id/find-x-handle", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
    if (!target) return res.status(404).json({ error: "target not found" });

    console.log(`🔍 Finding X handle for ${target.team_name}...`);

    const searchPrompt = `Find the official X (Twitter) handle for ${target.team_name}. This is a web3/crypto company.

Search for their official X/Twitter account and respond with ONLY the handle (without the @ symbol).
If you cannot find a verified official account, respond with just the word "none".

Example responses:
- "ethereum" (for Ethereum Foundation)
- "uniswap" (for Uniswap)
- "none" (if not found)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: searchPrompt }]
    });

    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    const handle = responseText.trim().toLowerCase().replace("@", "");
    
    if (handle && handle !== "none" && handle.length > 0 && handle.length < 50) {
      req.db.prepare("UPDATE targets SET x_handle = ?, updated_at = ? WHERE id = ?").run(handle, nowISO(), id);
      console.log(`✅ Found X handle for ${target.team_name}: @${handle}`);
      res.json({ ok: true, x_handle: handle });
    } else {
      console.log(`❌ No X handle found for ${target.team_name}`);
      res.json({ ok: true, x_handle: null });
    }

  } catch (e) {
    console.error("find-x-handle error:", e);
    res.status(500).json({ error: "failed to find X handle", message: e.message });
  }
});

app.post("/api/targets/research", requireAuth, async (req, res) => {
  try {
    const { auto_discover_x_users = false, max_users_per_team = 5 } = req.body;

    console.log("🔍 Starting autonomous team research...");
    if (auto_discover_x_users) {
      console.log("🔍 Auto-discovery enabled: will search for X users after research");
    }

    // Get existing teams to avoid duplicates
    const existingTeams = req.db.prepare("SELECT team_name FROM targets").all().map(t => t.team_name);
    console.log(`📋 Found ${existingTeams.length} existing teams in database`);

    // Fetch real project data from AlphaGrowth and DeFiLlama
    console.log("📊 Fetching project data from AlphaGrowth and DeFiLlama...");
    let projectsContext = "";

    try {
      const [alphaGrowthProjects, defiLlamaFees] = await Promise.all([
        fetch("https://alphagrowth.io/projects").then(r => r.text()).catch(() => null),
        fetch("https://defillama.com/fees").then(r => r.text()).catch(() => null)
      ]);

      if (alphaGrowthProjects || defiLlamaFees) {
        projectsContext = `\n\nI've fetched real project data for you to analyze:\n\n`;

        if (alphaGrowthProjects) {
          projectsContext += `AlphaGrowth Projects (excerpt):\n${alphaGrowthProjects.substring(0, 10000)}\n\n`;
        }

        if (defiLlamaFees) {
          projectsContext += `DeFiLlama Top Revenue Projects (excerpt):\n${defiLlamaFees.substring(0, 10000)}\n\n`;
        }

        console.log("✅ Fetched external project data");
      }
    } catch (fetchError) {
      console.log("⚠️ Failed to fetch external project data:", fetchError.message);
    }

    // Add existing teams to context so Claude avoids them
    const existingTeamsContext = existingTeams.length > 0
      ? `\n\nEXISTING TEAMS TO AVOID (do not include any of these):\n${existingTeams.join(", ")}\n\n`
      : "";

    const researchPrompt = `Find 15-20 web3/crypto companies that meet ALL of these criteria:
- Raised at least $10M in total funding
- Generating at least $1M in monthly revenue (or have strong revenue metrics)
- Active and well-known in 2024-2026

Search for top and trending DeFi protocols, Wallets, NFT platforms, gaming projects, etc. within web3 that Alchemy, the infrastructure company can support. Focus on applications and protocols that would benefit from blockchain infrastructure services.

DO NOT include L1/L2 chains or infrastructure companies themselves.

CRITICAL: Find NEW and DIFFERENT companies. Look for emerging projects, rising protocols, and growing platforms. Don't just return the most obvious choices.${existingTeamsContext}

IMPORTANT: You MUST respond with ONLY a valid JSON array. Do not include any text before or after the JSON.

Format (copy this structure exactly):
[
  {
    "team_name": "Uniswap",
    "raised_usd": 165000000,
    "monthly_revenue_usd": 15000000,
    "x_handle": "uniswap",
    "website": "https://uniswap.org",
    "notes": "Leading DEX protocol"
  }
]

Include 15-20 companies. Focus on DeFi protocols (DEXs, lending, derivatives), wallet companies, NFT platforms, gaming projects, and other web3 applications that use blockchain infrastructure.${projectsContext}`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: "You are a research assistant. Always respond with valid JSON only, no additional text.",
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: researchPrompt }]
    });

    console.log("📊 Claude research complete, parsing results...");
    
    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }
    
    console.log("Raw response:", responseText.substring(0, 500));
    
    // Try to extract and clean JSON
    let teams = [];
    
    // Remove markdown code blocks if present
    let cleanText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    // Try to find JSON array
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        teams = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        console.error("Attempted to parse:", jsonMatch[0].substring(0, 200));
        return res.status(500).json({ 
          error: "Failed to parse Claude's response as JSON",
          details: e.message,
          sample: jsonMatch[0].substring(0, 200)
        });
      }
    } else {
      console.error("No JSON array found in response");
      return res.status(500).json({ 
        error: "No JSON array found in Claude's response",
        sample: cleanText.substring(0, 300)
      });
    }

    if (!Array.isArray(teams)) {
      return res.status(500).json({ error: "Response is not an array" });
    }

    if (teams.length === 0) {
      return res.status(500).json({ error: "No teams found in response" });
    }

    console.log(`Found ${teams.length} teams from research`);

    let inserted = 0;
    let skipped = 0;
    const ins = req.db.prepare(`INSERT INTO targets (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`);
    const ts = nowISO();

    for (const raw of teams) {
      const norm = {
        team_name: raw?.team_name ? String(raw.team_name).trim() : "",
        raised_usd: Number(raw?.raised_usd),
        monthly_revenue_usd: Number(raw?.monthly_revenue_usd),
        is_web3: 1,
        x_handle: raw?.x_handle ? String(raw.x_handle).replace("@", "").trim() : null,
        website: raw?.website ? String(raw.website).trim() : null,
        notes: raw?.notes ? stripCiteTags(raw.notes) : null,
        sources_json: JSON.stringify({ source: "claude_research", date: ts }),
      };

      if (!norm.team_name) { skipped++; continue; }
      if (!qualifiesTarget(norm)) { skipped++; continue; }

      // Check if team already exists (by name, x_handle, or website)
      const existingCheck = req.db.prepare(`
        SELECT id FROM targets
        WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))
        OR (? IS NOT NULL AND LOWER(TRIM(x_handle)) = LOWER(TRIM(?)))
        OR (? IS NOT NULL AND LOWER(TRIM(website)) = LOWER(TRIM(?)))
        LIMIT 1
      `).get(norm.team_name, norm.x_handle, norm.x_handle, norm.website, norm.website);

      if (existingCheck) {
        console.log(`⚠️ Skipped duplicate: ${norm.team_name} (already exists in database)`);
        skipped++;
        continue;
      }

      try {
        ins.run(nanoid(), norm.team_name, Math.trunc(norm.raised_usd), Math.trunc(norm.monthly_revenue_usd), norm.is_web3, norm.x_handle, norm.website, norm.notes, norm.sources_json, ts, ts);
        inserted++;
        console.log(`✅ Imported: ${norm.team_name}${norm.x_handle ? ' (@' + norm.x_handle + ')' : ''}${norm.website ? ' - ' + norm.website : ''}`);
      } catch (e) {
        console.log(`⚠️ Skipped duplicate (insert error): ${norm.team_name}`);
        skipped++;
      }
    }

    console.log(`✅ Research complete: ${inserted} imported, ${skipped} skipped`);

    // Auto-search contacts for newly inserted teams
    const auto_search_contacts = req.body.auto_search_contacts !== false; // Default to true

    if (auto_search_contacts && inserted > 0) {
      console.log("🔍 Starting auto-search of contacts for imported teams...");

      // Get all newly inserted teams (check by timestamp to identify recently created)
      const newlyInsertedTeams = [];
      for (const raw of teams) {
        const teamName = raw?.team_name ? String(raw.team_name).trim() : "";
        if (!teamName) continue;

        // Check if this team was just inserted (has matching timestamp)
        const target = req.db.prepare(`
          SELECT * FROM targets
          WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))
          AND created_at = ?
          LIMIT 1
        `).get(teamName, ts);

        if (target) {
          newlyInsertedTeams.push(target);
        }
      }

      console.log(`🔍 Will search contacts for ${newlyInsertedTeams.length} teams`);

      if (newlyInsertedTeams.length > 0) {
        // Import the helper dynamically
        import("./lib/contact-search.js").then(({ searchCompanyContacts }) => {
          // Start contact search in background (non-blocking)
          Promise.all(
            newlyInsertedTeams.map(async (target) => {
              try {
                console.log(`🔍 Searching contacts for ${target.team_name}`);
                const result = await searchCompanyContacts(target, anthropic, db, nanoid, nowISO, apolloClient);
                console.log(`✅ Found ${result.stored} contacts for ${target.team_name}`);
              } catch (error) {
                console.error(`❌ Contact search failed for ${target.team_name}:`, error.message);
              }
            })
          ).then(() => {
            console.log("✅ Auto-contact-search completed for all teams");
          }).catch((error) => {
            console.error("❌ Auto-contact-search error:", error);
          });
        }).catch((error) => {
          console.error("❌ Failed to load contact-search module:", error);
        });
      }
    }

    // Auto-discover X users if enabled
    if (auto_discover_x_users && inserted > 0) {
      console.log("🔍 Starting auto-discovery of X users for imported teams...");

      // Get all inserted teams with x_handle
      const teamsWithXHandle = teams
        .filter(t => t.x_handle && qualifiesTarget({ ...t, is_web3: 1 }))
        .slice(0, 10); // Limit to 10 teams to avoid overwhelming

      if (teamsWithXHandle.length > 0) {
        console.log(`🔍 Will discover users for ${teamsWithXHandle.length} teams`);

        // Start discovery workflows in background
        // Don't await - let them run async to not block the response
        Promise.all(
          teamsWithXHandle.map(async (team) => {
            try {
              // Find the target ID we just created
              const target = req.db.prepare("SELECT id FROM targets WHERE team_name = ? ORDER BY created_at DESC LIMIT 1").get(team.team_name);

              if (target) {
                console.log(`🔍 Starting discovery for ${team.team_name} (@${team.x_handle})`);
                await workflowEngine.executeXDiscovery({
                  x_handle: team.x_handle,
                  target_id: target.id,
                  max_users: Number(max_users_per_team) || 5,
                  employeeDb: req.db, // Pass employee-specific database for production Railway
                });
              }
            } catch (error) {
              console.error(`❌ Discovery failed for ${team.team_name}:`, error.message);
            }
          })
        ).then(() => {
          console.log("✅ Auto-discovery workflows completed");
        }).catch((error) => {
          console.error("❌ Auto-discovery error:", error);
        });

        // Return immediately with discovery status
        return res.json({
          ok: true,
          found: teams.length,
          inserted,
          skipped,
          auto_discovery: {
            enabled: true,
            teams_queued: teamsWithXHandle.length,
            max_users_per_team: Number(max_users_per_team) || 5,
            message: "X user discovery running in background. Check contacts and queue in a few minutes.",
          },
        });
      } else {
        console.log("ℹ️ No teams with X handles to discover users from");
      }
    }

    res.json({ ok: true, found: teams.length, inserted, skipped });

  } catch (e) {
    console.error("Research error:", e);
    res.status(500).json({ error: "Research failed", message: e.message, details: e.toString() });
  }
});

app.post("/api/targets/import", requireAuth, (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : null;
  const bypassFilter = req.body?.bypass_filter === true;
  if (!items) return res.status(400).json({ error: "items must be an array" });
  let inserted = 0;
  let skipped = 0;
  let duplicates = 0;
  const newlyInsertedTeams = []; // Track all inserted teams for research
  const ins = req.db.prepare(`INSERT INTO targets (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`);
  const checkDuplicate = req.db.prepare(`SELECT id FROM targets WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?)) LIMIT 1`);
  const ts = nowISO();
  const db = req.db; // Store db reference for async usage

  for (const raw of items) {
    const norm = {
      team_name: raw?.team_name ? String(raw.team_name).trim() : "",
      raised_usd: Number(raw?.raised_usd) || 0,
      monthly_revenue_usd: Number(raw?.monthly_revenue_usd) || 0,
      is_web3: (raw?.is_web3 === 1 || raw?.is_web3 === true || raw?.is_web3 === "1" || raw?.is_web3 === "true") ? 1 : 0,
      x_handle: raw?.x_handle ? String(raw.x_handle).replace("@", "").trim() : null,
      website: raw?.website ? String(raw.website).trim() : null,
      notes: raw?.notes ? stripCiteTags(raw.notes) : null,
      sources_json: raw?.sources ? JSON.stringify(raw.sources) : (raw?.sources_json || null),
    };
    if (!norm.team_name) { skipped++; continue; }
    if (!bypassFilter && !qualifiesTarget(norm)) { skipped++; continue; }
    // Check for duplicate team name
    const existing = checkDuplicate.get(norm.team_name);
    if (existing) { duplicates++; continue; }
    try {
      const newId = nanoid();
      ins.run(newId, norm.team_name, Math.trunc(norm.raised_usd), Math.trunc(norm.monthly_revenue_usd), norm.is_web3, norm.x_handle, norm.website, norm.notes, norm.sources_json, ts, ts);
      inserted++;
      // Track all inserted teams for research
      newlyInsertedTeams.push({
        id: newId,
        team_name: norm.team_name,
        x_handle: norm.x_handle,
        website: norm.website,
        raised_usd: norm.raised_usd,
        monthly_revenue_usd: norm.monthly_revenue_usd,
        notes: norm.notes
      });
    } catch (e) {
      skipped++;
    }
  }

  // Kick off research for all imported teams (same as Research button)
  let researchQueued = 0;
  if (newlyInsertedTeams.length > 0) {
    researchQueued = newlyInsertedTeams.length;
    console.log(`🔍 Starting research for ${researchQueued} imported targets...`);

    // Import the helper and run research asynchronously
    import("./lib/contact-search.js").then(({ searchCompanyContacts }) => {
      // Research all teams in background (non-blocking)
      Promise.all(
        newlyInsertedTeams.map(async (target) => {
          try {
            console.log(`🔍 Researching ${target.team_name}...`);
            const result = await searchCompanyContacts(target, anthropic, db, nanoid, nowISO, apolloClient);
            console.log(`✅ Research complete for ${target.team_name}: found ${result.stored} contacts`);
          } catch (error) {
            console.error(`❌ Research failed for ${target.team_name}:`, error.message);
          }
        })
      ).then(() => {
        console.log(`✅ Research completed for all ${newlyInsertedTeams.length} imported teams`);
      }).catch((error) => {
        console.error("❌ Research error:", error);
      });
    }).catch((error) => {
      console.error("❌ Failed to load contact-search module:", error);
    });
  }

  res.json({ ok: true, inserted, skipped, duplicates, research_queued: researchQueued });
});

// Research a company from a website URL - uses Apollo + Claude to fill out the company card
app.post("/api/targets/research-url", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  console.log(`🔍 Researching company from URL: ${url}`);

  try {
    // Extract domain from URL
    let domain;
    let normalizedUrl;
    try {
      const parsedUrl = url.startsWith("http") ? new URL(url) : new URL(`https://${url}`);
      domain = parsedUrl.hostname.replace("www.", "");
      normalizedUrl = parsedUrl.origin;
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    // Check if target with this website already exists
    const existingByWebsite = req.db.prepare(`SELECT id, team_name FROM targets WHERE website LIKE ? OR website LIKE ?`).get(`%${domain}%`, `%${domain}%`);
    if (existingByWebsite) {
      return res.status(400).json({ error: `Team already exists: ${existingByWebsite.team_name}` });
    }

    let apolloData = null;
    let twitterHandle = null;

    // Step 1: Try Apollo API for organization enrichment
    if (apolloClient.isEnabled()) {
      console.log(`📊 Querying Apollo API for domain: ${domain}`);
      try {
        apolloData = await apolloClient.enrichOrganization(null, domain);
        if (apolloData) {
          console.log(`✅ Apollo found: ${apolloData.name}`);
          // Extract Twitter handle from Apollo data
          if (apolloData.twitter_url) {
            const twitterMatch = apolloData.twitter_url.match(/(?:twitter\.com|x\.com)\/([^/?]+)/i);
            if (twitterMatch) {
              twitterHandle = twitterMatch[1].replace("@", "");
            }
          }
        }
      } catch (apolloError) {
        console.log(`⚠️ Apollo API error: ${apolloError.message}`);
      }
    }

    // Step 2: Use Claude with web search to research the company
    console.log(`🤖 Using Claude to research ${domain}...`);

    const researchPrompt = `Research the company at ${url} and provide detailed information about them.

I need you to find:
1. The official company/project name
2. Total funding raised (in USD) - look for funding rounds, seed rounds, Series A/B/C, etc.
3. Monthly revenue (in USD) if available - look for revenue reports, fee revenue, protocol revenue
4. Whether this is a web3/crypto company (true/false)
5. Their official Twitter/X handle
6. A brief description of what they do (1-2 sentences)

${apolloData ? `
Apollo API already found some data:
- Company name: ${apolloData.name || "unknown"}
- Industry: ${apolloData.industry || "unknown"}
- Employee count: ${apolloData.employee_count || "unknown"}
- Description: ${apolloData.description || "none"}
- Twitter URL: ${apolloData.twitter_url || "none"}

Please verify and supplement this data with funding/revenue information.
` : ""}

Respond in this exact JSON format:
{
  "team_name": "Company Name",
  "raised_usd": 15000000,
  "monthly_revenue_usd": 600000,
  "is_web3": true,
  "x_handle": "twitterhandle",
  "website": "${normalizedUrl}",
  "notes": "Brief description of the company"
}

Important:
- Use 0 for raised_usd or monthly_revenue_usd if you cannot find reliable data
- For x_handle, provide just the handle without @ symbol, or null if not found
- Make sure is_web3 is a boolean (true/false)
- Keep notes concise (under 200 characters)`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      tools: [{
        type: "web_search_20250305",
        name: "web_search"
      }],
      messages: [{ role: "user", content: researchPrompt }]
    });

    // Extract the response text
    let responseText = "";
    for (const block of msg.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    // Parse the JSON from Claude's response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to extract JSON from Claude response:", responseText);
      return res.status(500).json({ error: "Failed to parse research results" });
    }

    let researchResult;
    try {
      researchResult = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("❌ Invalid JSON in Claude response:", jsonMatch[0]);
      return res.status(500).json({ error: "Invalid research results format" });
    }

    // Normalize the result
    const normalizedResult = {
      team_name: researchResult.team_name || apolloData?.name || domain,
      raised_usd: Math.trunc(Number(researchResult.raised_usd) || 0),
      monthly_revenue_usd: Math.trunc(Number(researchResult.monthly_revenue_usd) || 0),
      is_web3: (researchResult.is_web3 === true || researchResult.is_web3 === "true") ? 1 : 0,
      x_handle: researchResult.x_handle || twitterHandle || null,
      website: researchResult.website || normalizedUrl,
      notes: stripCiteTags(researchResult.notes) || apolloData?.description || null
    };

    // Clean up x_handle
    if (normalizedResult.x_handle) {
      normalizedResult.x_handle = normalizedResult.x_handle.replace("@", "").trim();
    }

    // Check for duplicate by team name
    const existingByName = req.db.prepare(`SELECT id FROM targets WHERE LOWER(TRIM(team_name)) = LOWER(TRIM(?))`).get(normalizedResult.team_name);
    if (existingByName) {
      return res.status(400).json({ error: `Team already exists: ${normalizedResult.team_name}` });
    }

    // Insert into targets table
    const ts = nowISO();
    const newId = nanoid();
    req.db.prepare(`
      INSERT INTO targets (id, team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle, website, notes, sources_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(newId, normalizedResult.team_name, normalizedResult.raised_usd, normalizedResult.monthly_revenue_usd, normalizedResult.is_web3, normalizedResult.x_handle, normalizedResult.website, normalizedResult.notes, null, ts, ts);

    console.log(`✅ Research complete and saved for ${normalizedResult.team_name}`);
    console.log(`   - Raised: $${normalizedResult.raised_usd.toLocaleString()}`);
    console.log(`   - Revenue: $${normalizedResult.monthly_revenue_usd.toLocaleString()}/mo`);
    console.log(`   - Twitter: ${normalizedResult.x_handle || "not found"}`);

    res.json({ ok: true, result: { id: newId, ...normalizedResult } });

  } catch (error) {
    console.error("❌ Research URL error:", error);
    res.status(500).json({ error: "Research failed", message: error.message });
  }
});

app.post("/api/targets/:id/dismiss", requireAuth, (req, res) => {
  const { id } = req.params;

  // Get target to find company name
  const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "target not found" });

  try {
    // Delete associated drafts first (to avoid foreign key constraint)
    const contactIds = req.db.prepare(`
      SELECT id FROM contacts WHERE company = ?
      UNION
      SELECT id FROM discovered_contacts WHERE target_id = ?
    `).all(target.team_name, id).map(r => r.id);

    for (const contactId of contactIds) {
      req.db.prepare("DELETE FROM drafts WHERE contact_id = ?").run(contactId);
    }

    // Delete discovered contacts
    req.db.prepare("DELETE FROM discovered_contacts WHERE target_id = ?").run(id);

    // Delete contacts by company name (includes X/Twitter discovery contacts)
    req.db.prepare("DELETE FROM contacts WHERE company = ?").run(target.team_name);

    // Finally dismiss the target (keep it in database but mark as dismissed)
    req.db.prepare(`UPDATE targets SET status = 'dismissed', updated_at = ? WHERE id = ?`).run(nowISO(), id);

    console.log(`🗑️ Dismissed target ${target.team_name} and deleted all associated contacts and drafts`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Dismiss target error:", e);
    res.status(500).json({ error: "Failed to dismiss target", message: e.message });
  }
});

app.patch("/api/targets/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const { x_handle, website, notes, raised_usd, monthly_revenue_usd } = req.body;

  const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "target not found" });

  try {
    req.db.prepare(`
      UPDATE targets
      SET x_handle = ?,
          website = ?,
          notes = ?,
          raised_usd = ?,
          monthly_revenue_usd = ?,
          updated_at = ?
      WHERE id = ?
    `).run(x_handle, website, notes, raised_usd, monthly_revenue_usd, nowISO(), id);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/targets/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  // Get target first to find associated data
  const target = req.db.prepare("SELECT * FROM targets WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "target not found" });

  try {
    // Delete associated drafts first (to avoid foreign key constraint)
    const contactIds = req.db.prepare(`
      SELECT id FROM contacts WHERE company = ?
      UNION
      SELECT id FROM discovered_contacts WHERE target_id = ?
    `).all(target.team_name, id).map(r => r.id);

    for (const contactId of contactIds) {
      req.db.prepare("DELETE FROM drafts WHERE contact_id = ?").run(contactId);
    }

    // Delete discovered contacts
    req.db.prepare("DELETE FROM discovered_contacts WHERE target_id = ?").run(id);

    // Delete contacts by company name
    req.db.prepare("DELETE FROM contacts WHERE company = ?").run(target.team_name);

    // Finally delete the target
    const info = req.db.prepare("DELETE FROM targets WHERE id = ?").run(id);

    console.log(`🗑️ Deleted target ${target.team_name} (id: ${id})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("Delete target error:", e);
    res.status(500).json({ error: "Failed to delete target", message: e.message });
  }
});

app.get("/api/health/claude", async (req, res) => {
  try {
    const msg = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 12,
      system: "Respond with exactly: ok",
      messages: [{ role: "user", content: "say ok" }],
    });
    res.json({ ok: true, sample: msg.content?.[0]?.text || null });
  } catch (e) {
    console.error("claude health error:", e?.status, e?.name, e?.message);
    res.status(500).json({ ok: false, status: e?.status, name: e?.name, message: e?.message });
  }
});

// Draft approval endpoint for relayer mode
app.post("/api/drafts/:id/approve", requireAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Get the draft and contact info to check if we need to create a target
    const draft = req.db.prepare(`
      SELECT d.*, c.company
      FROM drafts d
      JOIN contacts c ON c.id = d.contact_id
      WHERE d.id = ?
    `).get(id);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // If contact has a company, ensure a target exists for it
    if (draft.company) {
      const existingTarget = req.db.prepare(`
        SELECT id FROM targets WHERE team_name = ? COLLATE NOCASE
      `).get(draft.company);

      if (!existingTarget) {
        // Create a new approved target for this company
        const targetId = nanoid();
        req.db.prepare(`
          INSERT INTO targets
          (id, team_name, raised_usd, monthly_revenue_usd, is_web3, status, created_at, updated_at)
          VALUES (?, ?, 0, 0, 1, 'approved', ?, ?)
        `).run(targetId, draft.company, nowISO(), nowISO());
        console.log(`✅ Auto-created target for company: ${draft.company}`);
      }
    }

    // Update draft to approved status, clear prepared_at so relayer can pick it up
    req.db.prepare(`
      UPDATE drafts
      SET status = 'approved',
          prepared_at = NULL,
          updated_at = ?
      WHERE id = ?
    `).run(nowISO(), id);

    console.log(`✅ Draft ${id} approved for relayer`);
    res.json({ ok: true, message: "Draft approved, relayer will process it" });
  } catch (e) {
    console.error("approve error:", e);
    res.status(500).json({ error: "Failed to approve draft", message: e.message });
  }
});

// Relayer API endpoints
app.get("/api/relayer/approved-pending", authenticateRelayer, (req, res) => {
  try {
    // Find approved drafts and follow-ups that haven't been prepared yet
    const rows = req.db.prepare(`
      SELECT
        d.id,
        d.message_text,
        d.status,
        d.updated_at,
        c.id as contact_id,
        c.name,
        c.telegram_handle,
        c.company
      FROM drafts d
      JOIN contacts c ON c.id = d.contact_id
      WHERE d.status IN ('approved', 'followup')
        AND (d.prepared_at IS NULL OR d.prepared_at = '')
      ORDER BY d.updated_at DESC
      LIMIT 50
    `).all();

    res.json({ ok: true, drafts: rows, count: rows.length });
  } catch (e) {
    console.error("relayer/approved-pending error:", e);
    res.status(500).json({ error: "Failed to fetch pending drafts", message: e.message });
  }
});

app.post("/api/relayer/mark-prepared/:id", authenticateRelayer, (req, res) => {
  const { id } = req.params;

  try {
    // Get the current status to preserve follow-up status
    const draft = req.db.prepare(`SELECT status FROM drafts WHERE id = ?`).get(id);

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Keep 'followup' status, change 'approved' to 'sent'
    const newStatus = draft.status === 'followup' ? 'followup' : 'sent';

    const info = req.db.prepare(`
      UPDATE drafts
      SET prepared_at = ?, updated_at = ?, status = ?
      WHERE id = ?
    `).run(nowISO(), nowISO(), newStatus, id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    console.log(`✅ Relayer marked draft ${id} as ${newStatus}`);
    res.json({ ok: true, message: `Draft marked as ${newStatus}` });
  } catch (e) {
    console.error("relayer/mark-prepared error:", e);
    res.status(500).json({ error: "Failed to mark draft as prepared", message: e.message });
  }
});

app.post("/api/relayer/mark-failed/:id", authenticateRelayer, (req, res) => {
  const { id} = req.params;
  const { error: errorMessage } = req.body;

  try {
    // Clear prepared_at to allow retry
    const info = req.db.prepare(`
      UPDATE drafts
      SET prepared_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Draft not found" });
    }

    console.log(`⚠️ Relayer reported failure for draft ${id}: ${errorMessage || 'Unknown error'}`);
    res.json({ ok: true, message: "Draft reset for retry" });
  } catch (e) {
    console.error("relayer/mark-failed error:", e);
    res.status(500).json({ error: "Failed to mark draft as failed", message: e.message });
  }
});

// Relayer: Get pending response capture requests
app.get("/api/relayer/capture-requests", authenticateRelayer, (req, res) => {
  try {
    const requests = req.db.prepare(`
      SELECT * FROM response_capture_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    `).all();

    res.json({ requests });
  } catch (e) {
    console.error("relayer/capture-requests error:", e);
    res.status(500).json({ error: "Failed to fetch capture requests", message: e.message });
  }
});

// Relayer: Complete a response capture request
app.post("/api/relayer/capture-complete/:id", authenticateRelayer, (req, res) => {
  const { id } = req.params;
  const { captured_response, error_message } = req.body;

  try {
    const status = captured_response ? 'completed' : 'failed';
    const info = req.db.prepare(`
      UPDATE response_capture_requests
      SET status = ?, captured_response = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `).run(status, captured_response || null, error_message || null, nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    console.log(`✅ Relayer completed capture request ${id}`);
    res.json({ ok: true });
  } catch (e) {
    console.error("relayer/capture-complete error:", e);
    res.status(500).json({ error: "Failed to complete capture request", message: e.message });
  }
});

// Relayer: Get pending X auth requests
app.get("/api/relayer/x-auth-requests", authenticateRelayer, (req, res) => {
  try {
    const requests = req.db.prepare(`
      SELECT * FROM x_auth_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 1
    `).all();

    res.json({ requests });
  } catch (e) {
    console.error("relayer/x-auth-requests error:", e);
    res.status(500).json({ error: "Failed to fetch X auth requests", message: e.message });
  }
});

// Relayer: Complete an X auth request (includes uploading cookies)
app.post("/api/relayer/x-auth-complete/:id", authenticateRelayer, (req, res) => {
  const { id } = req.params;
  const { success, error_message, cookies } = req.body;

  try {
    const status = success ? 'completed' : 'failed';
    const info = req.db.prepare(`
      UPDATE x_auth_requests
      SET status = ?, error_message = ?, completed_at = ?
      WHERE id = ?
    `).run(status, error_message || null, nowISO(), id);

    if (info.changes === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // If successful and cookies provided, save them to Railway database
    if (success && cookies) {
      console.log(`[X-AUTH-UPLOAD] Received ${cookies.length} cookies from relayer for ${req.employeeId}`);
      console.log(`[X-AUTH-UPLOAD] Sample cookie names: ${cookies.slice(0, 3).map(c => c.name).join(', ')}`);

      req.db.prepare(`
        INSERT OR REPLACE INTO employee_config (key, value, updated_at)
        VALUES ('x_cookies', ?, ?)
      `).run(JSON.stringify(cookies), nowISO());

      // Verify it was saved
      const saved = req.db.prepare(`
        SELECT key, length(value) as size, updated_at FROM employee_config WHERE key = 'x_cookies'
      `).get();
      console.log(`✅ Saved ${cookies.length} X cookies to Railway database for ${req.employeeId}`);
      console.log(`[X-AUTH-UPLOAD] Verification: ${JSON.stringify(saved)}`);
    } else if (success && !cookies) {
      console.log(`⚠️ X auth marked successful but no cookies provided by relayer`);
    }

    console.log(`✅ Relayer completed X auth request ${id} (${status})`);
    res.json({ ok: true });
  } catch (e) {
    console.error("relayer/x-auth-complete error:", e);
    res.status(500).json({ error: "Failed to complete X auth request", message: e.message });
  }
});

// Get draft queue (standalone route for backward compatibility)
app.get("/api/queue", requireAuth, (req, res) => {
  const rows = req.db.prepare(
    `SELECT d.*, c.name, c.company, c.title, c.telegram_handle FROM drafts d JOIN contacts c ON c.id = d.contact_id WHERE d.status IN ('queued','approved') ORDER BY d.created_at DESC`
  ).all();
  res.json(rows.map((r) => ({ ...r, tg: tgLinks(r.telegram_handle) })));
});

// Mount contact and draft routes (protected by requireAuth)
app.use("/api/contacts", requireAuth, createContactRoutes(nanoid, nowISO, generateOutbound));
app.use("/api/drafts", requireAuth, createDraftRoutes(
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
));

// Initialize WorkflowEngine
const workflowEngine = new WorkflowEngine(db, anthropic, generateOutbound, nowISO, nanoid);

// X Authentication endpoint (via relayer) - creates request for relayer to process
app.post("/api/x-auth/authenticate", requireAuth, async (req, res) => {
  try {
    console.log(`[API] X authentication request for: ${req.employeeId}`);

    // Create an X auth request in the database
    const requestId = nanoid();
    const now = nowISO();

    req.db.prepare(`
      INSERT INTO x_auth_requests (id, status, created_at)
      VALUES (?, 'pending', ?)
    `).run(requestId, now);

    console.log(`[API] Created X auth request ${requestId}, waiting for relayer...`);

    // Poll for completion (wait up to 2 minutes for user to complete login)
    const maxWaitTime = 120000; // 2 minutes
    const pollInterval = 2000; // 2 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check if request is completed
      const request = req.db.prepare(`
        SELECT * FROM x_auth_requests WHERE id = ?
      `).get(requestId);

      if (request.status === 'completed') {
        console.log(`[API] X authentication successful for ${req.employeeId}`);
        return res.json({ success: true, message: "X authentication successful" });
      }

      if (request.status === 'failed') {
        console.log(`[API] X authentication failed: ${request.error_message}`);
        return res.status(500).json({
          success: false,
          error: "authentication_failed",
          message: request.error_message || "X authentication failed"
        });
      }

      // Wait before next poll
      await new Promise(r => setTimeout(r, pollInterval));
    }

    // Timeout - mark as failed
    req.db.prepare(`
      UPDATE x_auth_requests
      SET status = 'failed', error_message = 'Timeout waiting for relayer', completed_at = ?
      WHERE id = ?
    `).run(nowISO(), requestId);

    console.log("[API] Timeout waiting for relayer to complete X authentication");
    return res.status(408).json({
      success: false,
      error: "timeout",
      message: "Timeout waiting for relayer. Make sure relayer is running on your Mac."
    });
  } catch (e) {
    console.error("[API] X auth error:", e?.message || e);
    res.status(500).json({ success: false, error: "X authentication failed", message: e?.message });
  }
});

// X Authentication endpoint - manually trigger visible browser login (DEPRECATED - kept for backward compatibility)
app.post("/api/x-auth/login", requireAuth, async (req, res) => {
  try {
    console.log(`[API] Manual X authentication requested for: ${req.employeeId}`);
    const { authenticate } = await import("./lib/x-auth.js");
    const success = await authenticate(req.db);

    if (success) {
      res.json({ ok: true, message: "Authentication successful - cookies saved" });
    } else {
      res.status(500).json({ ok: false, error: "Authentication failed" });
    }
  } catch (error) {
    console.error("[API] X auth error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Check X authentication status (protected by requireAuth)
app.get("/api/x-auth/status", requireAuth, (req, res) => {
  // Check employee database first
  const config = req.db.prepare("SELECT value FROM employee_config WHERE key = 'x_cookies'").get();
  if (config) {
    try {
      const cookies = JSON.parse(config.value);
      return res.json({
        authenticated: true,
        cookieCount: cookies.length,
        source: "employee_database"
      });
    } catch (err) {
      console.error('[X-AUTH-STATUS] Error parsing database cookies:', err.message);
    }
  }

  // Fallback: Check if local x-cookies.json exists (for local development/backward compatibility)
  const localCookiesPath = path.join(process.cwd(), 'x-cookies.json');
  if (fs.existsSync(localCookiesPath)) {
    try {
      const localCookies = JSON.parse(fs.readFileSync(localCookiesPath, 'utf8'));
      return res.json({
        authenticated: true,
        cookieCount: localCookies.length,
        source: "local_file"
      });
    } catch (err) {
      console.error('[X-AUTH-STATUS] Error reading local cookies:', err.message);
    }
  }

  // Fallback: Check if X_COOKIES environment variable is set (for Railway)
  if (process.env.X_COOKIES) {
    try {
      const envCookies = JSON.parse(process.env.X_COOKIES);
      return res.json({
        authenticated: true,
        cookieCount: envCookies.length,
        source: "environment"
      });
    } catch (err) {
      console.error('[X-AUTH-STATUS] Error parsing X_COOKIES env var:', err.message);
    }
  }

  // Not authenticated
  return res.json({
    authenticated: false,
    message: "Not authenticated - please authenticate via X login"
  });
});

// Upload X cookies from browser (via bookmarklet)
app.post("/api/x-auth/upload-cookies-from-browser", requireAuth, async (req, res) => {
  try {
    const { cookies, sessionToken } = req.body;

    console.log(`[X-AUTH] 📡 Cookie upload request received from employee: ${req.employeeId}`);

    if (!cookies || typeof cookies !== 'string') {
      console.error('[X-AUTH] ❌ Invalid request - no cookies string provided');
      return res.status(400).json({
        success: false,
        error: "Invalid request - cookies string required"
      });
    }

    // Validate session token matches current session
    if (sessionToken && sessionToken !== req.sessionID) {
      console.error(`[X-AUTH] ❌ Session token mismatch - provided: ${sessionToken}, expected: ${req.sessionID}`);
      return res.status(401).json({
        success: false,
        error: "Invalid session token - please refresh the SDR Console and try again"
      });
    }

    console.log(`[X-AUTH] ✓ Session validated for employee: ${req.employeeId}`);

    // Parse browser cookie string into Puppeteer format
    let parsedCookies;
    try {
      parsedCookies = parseBrowserCookies(cookies);
    } catch (err) {
      console.error('[X-AUTH] ❌ Cookie parsing failed:', err.message);
      return res.status(400).json({
        success: false,
        error: "Failed to parse cookies - invalid format"
      });
    }

    if (parsedCookies.length === 0) {
      console.error('[X-AUTH] ❌ No cookies parsed from browser string');
      return res.status(400).json({
        success: false,
        error: "No cookies found - make sure you're logged into X"
      });
    }

    console.log(`[X-AUTH] ✓ Parsed ${parsedCookies.length} cookies from browser`);

    // Basic validation: check for essential cookies
    const hasAuthToken = parsedCookies.some(c => c.name === 'auth_token');
    const hasCt0 = parsedCookies.some(c => c.name === 'ct0');

    if (!hasAuthToken) {
      console.error('[X-AUTH] ❌ Missing auth_token cookie - this is required');
      return res.status(400).json({
        success: false,
        error: "Missing auth_token cookie - please make sure you're logged into X"
      });
    }

    console.log(`[X-AUTH] ✓ Essential cookies present - auth_token: ${hasAuthToken}, ct0: ${hasCt0}`);

    // Store cookies in employee database
    const ts = new Date().toISOString();
    req.db.prepare(`
      INSERT OR REPLACE INTO employee_config (key, value, updated_at)
      VALUES ('x_cookies', ?, ?)
    `).run(JSON.stringify(parsedCookies), ts);

    console.log(`[X-AUTH] ✅ SUCCESS: Cookies stored in database for employee: ${req.employeeId}`);

    // Return JSON response
    return res.json({
      success: true,
      cookieCount: parsedCookies.length
    });

  } catch (error) {
    console.error('[X-AUTH] ❌ UNEXPECTED ERROR:', error);
    return res.status(500).json({
      success: false,
      error: error.message || "Unexpected error occurred"
    });
  }
});

// Mount workflow routes (must come BEFORE other target routes, protected by requireAuth)
app.use("/api/workflow", requireAuth, createWorkflowRoutes(workflowEngine));

// Note: createTargetRoutes adds routes to /api/targets/:id/discover-x-users
// This must be registered AFTER other /api/targets routes to avoid conflicts
const targetDiscoveryRouter = createTargetRoutes(workflowEngine, anthropic, nanoid, nowISO, qualifiesTarget, apolloClient, generateOutbound);
app.use("/api/targets", requireAuth, targetDiscoveryRouter);

(async () => {
  // Fetch Alchemy Data API documentation
  let ALCHEMY_DATA_INFO = "";
  try {
    console.log("🔍 Fetching Alchemy Data API documentation...");
    const response = await fetch("https://alchemy.com/docs/data.md");
    if (response.ok) {
      ALCHEMY_DATA_INFO = await response.text();
      console.log("📘 Loaded Alchemy Data API documentation");
      
      // Save to cache for offline use
      try {
        fs.writeFileSync(path.join(process.cwd(), "alchemy_data_cache.md"), ALCHEMY_DATA_INFO, "utf8");
      } catch (e) {
        // Ignore cache errors
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn("⚠️ Could not fetch Data API docs:", e.message);
    // Try loading from cache
    try {
      ALCHEMY_DATA_INFO = fs.readFileSync(path.join(process.cwd(), "alchemy_data_cache.md"), "utf8");
      console.log("📘 Loaded Data API docs from cache");
    } catch (e2) {
      console.warn("⚠️ No cached Data API docs available");
    }
  }

  // Fetch Alchemy Node API documentation
  let ALCHEMY_NODE_INFO = "";
  try {
    console.log("🔍 Fetching Alchemy Node API documentation...");
    const response = await fetch("https://alchemy.com/docs/node.md");
    if (response.ok) {
      ALCHEMY_NODE_INFO = await response.text();
      console.log("📘 Loaded Alchemy Node API documentation");
      
      // Save to cache for offline use
      try {
        fs.writeFileSync(path.join(process.cwd(), "alchemy_node_cache.md"), ALCHEMY_NODE_INFO, "utf8");
      } catch (e) {
        // Ignore cache errors
      }
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn("⚠️ Could not fetch Node API docs:", e.message);
    // Try loading from cache
    try {
      ALCHEMY_NODE_INFO = fs.readFileSync(path.join(process.cwd(), "alchemy_node_cache.md"), "utf8");
      console.log("📘 Loaded Node API docs from cache");
    } catch (e2) {
      console.warn("⚠️ No cached Node API docs available");
    }
  }

  // Make available globally
  global.ALCHEMY_DATA_INFO = ALCHEMY_DATA_INFO;
  global.ALCHEMY_NODE_INFO = ALCHEMY_NODE_INFO;

  // Catch-all route for client-side routing (must be after all API routes)
  app.use((req, res) => {
    // Only handle GET requests for non-API routes
    // Exclude installer files which have their own routes
    if (req.method === 'GET' && !req.path.startsWith('/api') &&
        !req.path.endsWith('.sh') && !req.path.endsWith('.tar.gz')) {
      const nextIndexPath = path.join(process.cwd(), 'frontend', 'out', 'index.html');
      if (fs.existsSync(nextIndexPath)) {
        return res.sendFile(nextIndexPath);
      }
    }
    res.status(404).send('Page not found');
  });

  // Auto-create default admin user if no users exist (for ephemeral filesystems)
  const users = getAllUsers();
  if (users.length === 0) {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    console.log('🔐 No users found, creating default admin user...');
    const result = await createUser('derrick', defaultPassword, 'derrick', true);
    if (result.success) {
      console.log('✅ Default admin user created (username: derrick)');
    } else {
      console.error('❌ Failed to create default admin:', result.error);
    }
  } else {
    console.log(`👥 ${users.length} user(s) found in database`);
  }

  const port = Number(process.env.PORT || 3002);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
})();
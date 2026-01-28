import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Cache for employee database instances: employeeId -> db instance
const dbInstances = new Map();

/**
 * Get the base directory for all databases
 * Uses DATABASE_DIR env var (for Railway persistent volume) or falls back to ./databases
 */
export function getDatabaseDir() {
  return process.env.DATABASE_DIR || path.join(process.cwd(), "databases");
}

/**
 * Get or create a database instance for a specific employee
 * @param {string} employeeId - The unique employee identifier
 * @returns {Database} The database instance for this employee
 */
export function getDatabaseForEmployee(employeeId) {
  // Validate employee ID (alphanumeric + underscore/dash only)
  if (!employeeId || !/^[a-zA-Z0-9_-]+$/.test(employeeId)) {
    throw new Error("Invalid employee ID");
  }

  // Check cache
  if (dbInstances.has(employeeId)) {
    return dbInstances.get(employeeId);
  }

  // All employee databases go in databases/ folder for Railway persistent volume support
  const baseDir = getDatabaseDir();
  const dbDir = path.join(baseDir, employeeId);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "data.db");
  console.log(`📂 Database for ${employeeId}: ${dbPath}`);

  // Set env var temporarily for initializeDatabase()
  const originalPath = process.env.DB_PATH;
  process.env.DB_PATH = dbPath;

  const db = initializeDatabase();

  // Restore env var
  if (originalPath) {
    process.env.DB_PATH = originalPath;
  } else {
    delete process.env.DB_PATH;
  }

  // Cache instance
  dbInstances.set(employeeId, db);

  return db;
}

/**
 * Close all open database connections
 */
export function closeAllDatabases() {
  for (const [employeeId, db] of dbInstances.entries()) {
    db.close();
    console.log(`Closed database for ${employeeId}`);
  }
  dbInstances.clear();
}

/**
 * Initialize database with schema and migrations
 */
export function initializeDatabase() {
  // Use environment variable for database path, fallback to local data.db
  const dbPath = process.env.DB_PATH || "data.db";
  console.log(`📂 Database path: ${dbPath}`);

  // Ensure the directory exists before opening the database
  const dbDir = path.dirname(dbPath);
  if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 Created database directory: ${dbDir}`);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  // Create initial tables
  db.exec(`
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  telegram_handle TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  message_text TEXT NOT NULL,
  status TEXT NOT NULL,
  prepared_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  team_name TEXT NOT NULL,
  raised_usd INTEGER NOT NULL,
  monthly_revenue_usd INTEGER NOT NULL,
  is_web3 INTEGER NOT NULL DEFAULT 1,
  x_handle TEXT,
  website TEXT,
  notes TEXT,
  sources_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_targets_status ON targets(status);
CREATE INDEX IF NOT EXISTS idx_targets_money ON targets(raised_usd, monthly_revenue_usd);

CREATE TABLE IF NOT EXISTS response_capture_requests (
  id TEXT PRIMARY KEY,
  telegram_handle TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  captured_response TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_response_capture_status ON response_capture_requests(status);
CREATE INDEX IF NOT EXISTS idx_response_capture_created ON response_capture_requests(created_at);

CREATE TABLE IF NOT EXISTS x_auth_requests (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_x_auth_status ON x_auth_requests(status);
CREATE INDEX IF NOT EXISTS idx_x_auth_created ON x_auth_requests(created_at);
`);

  // Migration: Add x_handle and website columns to targets table
  try {
    const columns = db.pragma("table_info(targets)");
    const hasXHandle = columns.some(col => col.name === "x_handle");
    const hasWebsite = columns.some(col => col.name === "website");

    if (!hasXHandle) {
      console.log("📝 Adding x_handle column to targets table...");
      db.exec("ALTER TABLE targets ADD COLUMN x_handle TEXT");
      console.log("✅ x_handle column added");
    }

    if (!hasWebsite) {
      console.log("📝 Adding website column to targets table...");
      db.exec("ALTER TABLE targets ADD COLUMN website TEXT");
      console.log("✅ website column added");
    }

    if (hasXHandle && hasWebsite) {
      console.log("✅ Database schema up to date");
    }
  } catch (e) {
    console.error("Migration error (this is usually safe to ignore):", e.message);
  }

  // Migration: Add X discovery columns to contacts table
  try {
    const contactColumns = db.pragma("table_info(contacts)");
    const hasXUsername = contactColumns.some(col => col.name === "x_username");
    const hasXBio = contactColumns.some(col => col.name === "x_bio");
    const hasSource = contactColumns.some(col => col.name === "source");
    const hasTelegramValidated = contactColumns.some(col => col.name === "telegram_validated");
    const hasTelegramValidationDate = contactColumns.some(col => col.name === "telegram_validation_date");
    const hasEmail = contactColumns.some(col => col.name === "email");

    if (!hasXUsername) {
      console.log("📝 Adding x_username column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN x_username TEXT");
      console.log("✅ x_username column added");
    }

    if (!hasXBio) {
      console.log("📝 Adding x_bio column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN x_bio TEXT");
      console.log("✅ x_bio column added");
    }

    if (!hasSource) {
      console.log("📝 Adding source column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN source TEXT DEFAULT 'manual'");
      console.log("✅ source column added");
    }

    if (!hasTelegramValidated) {
      console.log("📝 Adding telegram_validated column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN telegram_validated INTEGER DEFAULT 0");
      console.log("✅ telegram_validated column added");
    }

    if (!hasTelegramValidationDate) {
      console.log("📝 Adding telegram_validation_date column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN telegram_validation_date TEXT");
      console.log("✅ telegram_validation_date column added");
    }

    if (!hasEmail) {
      console.log("📝 Adding email column to contacts table...");
      db.exec("ALTER TABLE contacts ADD COLUMN email TEXT");
      console.log("✅ email column added");
    }

    if (hasXUsername && hasXBio && hasSource && hasTelegramValidated && hasTelegramValidationDate && hasEmail) {
      console.log("✅ Contacts table schema up to date for X discovery");
    }
  } catch (e) {
    console.error("X discovery migration error (this is usually safe to ignore):", e.message);
  }

  // Migration: Create discovered_contacts table for "All Contacts" feature
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS discovered_contacts (
        id TEXT PRIMARY KEY,
        target_id TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT,
        email TEXT,
        phone TEXT,
        linkedin TEXT,
        telegram_handle TEXT,
        apollo_id TEXT,
        apollo_confidence_score REAL,
        source TEXT DEFAULT 'web_search',
        discovered_at TEXT NOT NULL,
        FOREIGN KEY(target_id) REFERENCES targets(id)
      )
    `);
    console.log("✅ Discovered contacts table ready");
  } catch (e) {
    console.error("Discovered contacts table error:", e.message);
  }

  // Migration: Add Apollo-specific columns to existing discovered_contacts table
  try {
    const columns = db.pragma("table_info(discovered_contacts)");
    const hasApolloId = columns.some(col => col.name === "apollo_id");
    const hasApolloScore = columns.some(col => col.name === "apollo_confidence_score");

    if (!hasApolloId) {
      db.exec("ALTER TABLE discovered_contacts ADD COLUMN apollo_id TEXT");
      console.log("✅ Added apollo_id column to discovered_contacts");
    }

    if (!hasApolloScore) {
      db.exec("ALTER TABLE discovered_contacts ADD COLUMN apollo_confidence_score REAL");
      console.log("✅ Added apollo_confidence_score column to discovered_contacts");
    }
  } catch (e) {
    console.warn("⚠️ Apollo column migration:", e.message);
  }

  // Feedback history table for message improvement tracking
  try {
    const feedbackTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='draft_feedback'"
    ).get();

    if (!feedbackTableExists) {
      db.exec(`
        CREATE TABLE draft_feedback (
          id TEXT PRIMARY KEY,
          draft_id TEXT NOT NULL,
          feedback_text TEXT NOT NULL,
          previous_message TEXT NOT NULL,
          regenerated_message TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (draft_id) REFERENCES drafts(id)
        )
      `);
      db.exec("CREATE INDEX idx_draft_feedback_draft_id ON draft_feedback(draft_id)");
      console.log("✅ Created draft_feedback table with index");
    }
  } catch (e) {
    console.warn("⚠️ Draft feedback table migration:", e.message);
  }

  // Employee configuration table for per-employee settings (e.g., X cookies)
  try {
    const employeeConfigTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='employee_config'"
    ).get();

    if (!employeeConfigTableExists) {
      db.exec(`
        CREATE TABLE employee_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      console.log("✅ Created employee_config table");
    }
  } catch (e) {
    console.warn("⚠️ Employee config table migration:", e.message);
  }

  // Successful messages table - stores messages marked as successful via "Responded" button
  try {
    const successfulMessagesTableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='successful_messages'"
    ).get();

    if (!successfulMessagesTableExists) {
      db.exec(`
        CREATE TABLE successful_messages (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          contact_name TEXT NOT NULL,
          company TEXT NOT NULL,
          telegram_handle TEXT,
          message_text TEXT NOT NULL,
          message_type TEXT NOT NULL,
          their_response TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (contact_id) REFERENCES contacts(id)
        )
      `);
      db.exec("CREATE INDEX idx_successful_messages_contact ON successful_messages(contact_id)");
      db.exec("CREATE INDEX idx_successful_messages_created ON successful_messages(created_at)");
      console.log("✅ Created successful_messages table");
    }
  } catch (e) {
    console.warn("⚠️ Successful messages table migration:", e.message);
  }

  return db;
}

export default initializeDatabase;

import Database from "better-sqlite3";

/**
 * Initialize database with schema and migrations
 */
export function initializeDatabase() {
  // Use environment variable for database path, fallback to local data.db
  const dbPath = process.env.DB_PATH || "data.db";
  console.log(`📂 Database path: ${dbPath}`);

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

  return db;
}

export default initializeDatabase;

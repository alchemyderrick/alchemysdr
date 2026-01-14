import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Migration script to add x_discovery_requests table to all employee databases
 * Run on Railway with: node scripts/migrate-x-discovery-table.js
 */

const DATABASES_DIR = './databases';

function migrateDatabase(dbPath, employeeId) {
  console.log(`\n📂 Migrating database: ${employeeId}`);

  const db = new Database(dbPath);

  try {
    // Check if table already exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='x_discovery_requests'"
    ).get();

    if (tableExists) {
      console.log(`  ✅ x_discovery_requests table already exists`);
      db.close();
      return;
    }

    // Create table
    db.exec(`
      CREATE TABLE x_discovery_requests (
        id TEXT PRIMARY KEY,
        x_handle TEXT NOT NULL,
        target_id TEXT,
        max_users INTEGER NOT NULL DEFAULT 5,
        offset INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        result_json TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      )
    `);

    db.exec("CREATE INDEX idx_x_discovery_status ON x_discovery_requests(status)");
    db.exec("CREATE INDEX idx_x_discovery_created ON x_discovery_requests(created_at)");

    console.log(`  ✅ Created x_discovery_requests table with indexes`);

    db.close();
  } catch (error) {
    console.error(`  ❌ Migration failed: ${error.message}`);
    db.close();
    throw error;
  }
}

function main() {
  console.log('='.repeat(60));
  console.log('🔧 X Discovery Table Migration');
  console.log('='.repeat(60));

  // Check if databases directory exists
  if (!fs.existsSync(DATABASES_DIR)) {
    console.log('⚠️  No databases directory found - no migration needed');
    return;
  }

  // Get all employee directories
  const employees = fs.readdirSync(DATABASES_DIR)
    .filter(name => {
      const dirPath = path.join(DATABASES_DIR, name);
      return fs.statSync(dirPath).isDirectory();
    });

  if (employees.length === 0) {
    console.log('⚠️  No employee databases found - no migration needed');
    return;
  }

  console.log(`\nFound ${employees.length} employee database(s)\n`);

  // Migrate each database
  for (const employeeId of employees) {
    const dbPath = path.join(DATABASES_DIR, employeeId, 'data.db');

    if (!fs.existsSync(dbPath)) {
      console.log(`\n⚠️  Skipping ${employeeId}: database file not found`);
      continue;
    }

    migrateDatabase(dbPath, employeeId);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration complete!');
  console.log('='.repeat(60));
}

main();

#!/usr/bin/env node
/**
 * Database Migration Script
 *
 * Migrates databases from root directory to databases/ folder for Railway
 * persistent volume support.
 *
 * This script:
 * - Moves auth.db to databases/auth.db
 * - Moves sessions.db to databases/sessions.db
 * - Moves data.db to databases/derrick/data.db (for backwards compatibility)
 *
 * Safe to run multiple times - only copies if destination doesn't exist.
 */

import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const databasesDir = path.join(rootDir, 'databases');

// Ensure databases directory exists
if (!fs.existsSync(databasesDir)) {
  fs.mkdirSync(databasesDir, { recursive: true });
  console.log('✅ Created databases/ directory');
}

// Migration mappings: [source, destination]
const migrations = [
  ['auth.db', 'databases/auth.db'],
  ['sessions.db', 'databases/sessions.db'],
  ['data.db', 'databases/derrick/data.db'],
];

let migratedCount = 0;
let skippedCount = 0;

for (const [source, dest] of migrations) {
  const sourcePath = path.join(rootDir, source);
  const destPath = path.join(rootDir, dest);
  const destDir = path.dirname(destPath);

  // Create destination directory if needed
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Check if source exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`⏭️  Skipped ${source} (doesn't exist)`);
    skippedCount++;
    continue;
  }

  // Check if destination already exists (don't overwrite)
  if (fs.existsSync(destPath)) {
    console.log(`⏭️  Skipped ${source} → ${dest} (destination already exists)`);
    skippedCount++;
    continue;
  }

  // Copy the file (use copy instead of move to be safe)
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Migrated ${source} → ${dest}`);
    migratedCount++;

    // Also copy WAL and SHM files if they exist
    for (const suffix of ['-wal', '-shm']) {
      const walSource = sourcePath + suffix;
      const walDest = destPath + suffix;
      if (fs.existsSync(walSource)) {
        fs.copyFileSync(walSource, walDest);
        console.log(`   ↳ Also copied ${source}${suffix}`);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to migrate ${source}: ${error.message}`);
  }
}

console.log(`\n📊 Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);

if (migratedCount > 0) {
  console.log(`\n⚠️  Original files kept in root directory as backup.`);
  console.log(`   You can delete them after verifying the app works correctly.`);
}

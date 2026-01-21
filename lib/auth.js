import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const SALT_ROUNDS = 10;

/**
 * Get the master authentication database (separate from employee databases)
 * This database stores user credentials and admin status
 * Stored in databases/ folder for Railway persistent volume support
 */
function getAuthDatabase() {
  const dbDir = path.join(process.cwd(), 'databases');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const authDbPath = path.join(dbDir, 'auth.db');
  const db = new Database(authDbPath);

  // Create users table with admin support
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      employee_id TEXT NOT NULL UNIQUE,
      is_admin INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
  `);

  return db;
}

/**
 * Create a new user account
 * @param {string} username - The username for login
 * @param {string} password - The plain text password (will be hashed)
 * @param {string} employeeId - The unique employee identifier
 * @param {boolean} isAdmin - Whether this user has admin privileges
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createUser(username, password, employeeId, isAdmin = false) {
  const db = getAuthDatabase();

  // Explicit check for existing user (in addition to UNIQUE constraint)
  const existingUser = db.prepare('SELECT username FROM users WHERE username = ? OR employee_id = ?').get(username, employeeId);
  if (existingUser) {
    return { success: false, error: 'Username already exists' };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    db.prepare(`
      INSERT INTO users (username, password_hash, employee_id, is_admin, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, passwordHash, employeeId, isAdmin ? 1 : 0, new Date().toISOString());

    console.log(`✅ Created ${isAdmin ? 'ADMIN' : 'user'}: ${username} (employee_id: ${employeeId})`);
    return { success: true };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint')) {
      return { success: false, error: 'Username already exists' };
    }
    throw error;
  }
}

/**
 * Reset a user's password and optionally set admin status
 * @param {string} username - The username
 * @param {string} newPassword - The new plain text password (will be hashed)
 * @param {boolean} makeAdmin - Whether to make this user an admin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function resetUserPassword(username, newPassword, makeAdmin = false) {
  const db = getAuthDatabase();
  const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  db.prepare('UPDATE users SET password_hash = ?, is_admin = ? WHERE username = ?')
    .run(passwordHash, makeAdmin ? 1 : 0, username);

  console.log(`✅ Password reset for ${username}${makeAdmin ? ' (now admin)' : ''}`);
  return { success: true };
}

/**
 * Verify user credentials during login
 * @param {string} username - The username
 * @param {string} password - The plain text password to verify
 * @returns {Promise<{success: boolean, employeeId?: string, username?: string, isAdmin?: boolean, error?: string}>}
 */
export async function verifyUser(username, password) {
  const db = getAuthDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return { success: false, error: 'Invalid username or password' };
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    return { success: false, error: 'Invalid username or password' };
  }

  // Update last login timestamp
  db.prepare('UPDATE users SET last_login = ? WHERE username = ?')
    .run(new Date().toISOString(), username);

  return {
    success: true,
    employeeId: user.employee_id,
    username: user.username,
    isAdmin: user.is_admin === 1
  };
}

/**
 * Get user information by username
 * @param {string} username - The username to look up
 * @returns {Object|undefined} User object without password hash
 */
export function getUserByUsername(username) {
  const db = getAuthDatabase();
  return db.prepare('SELECT username, employee_id, is_admin, created_at, last_login FROM users WHERE username = ?').get(username);
}

/**
 * Get user information by employee ID
 * @param {string} employeeId - The employee ID to look up
 * @returns {Object|undefined} User object without password hash
 */
export function getUserByEmployeeId(employeeId) {
  const db = getAuthDatabase();
  return db.prepare('SELECT username, employee_id, is_admin, created_at, last_login FROM users WHERE employee_id = ?').get(employeeId);
}

/**
 * Get all users in the system (admin only)
 * @returns {Array<Object>} Array of user objects without password hashes
 */
export function getAllUsers() {
  const db = getAuthDatabase();
  return db.prepare(`
    SELECT username, employee_id, is_admin, created_at, last_login
    FROM users
    ORDER BY created_at DESC
  `).all();
}

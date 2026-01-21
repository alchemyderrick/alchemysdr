import "dotenv/config";
import { createUser } from '../lib/auth.js';

/**
 * Create admin user for Railway deployment
 * Run this in Railway shell: node scripts/create-admin-railway.js <password>
 */
async function main() {
  console.log('='.repeat(60));
  console.log('SDR Console - Creating Admin User for Railway');
  console.log('='.repeat(60));
  console.log('');

  // Get password from command line argument
  const password = process.argv[2];

  if (!password) {
    console.error('❌ Error: Password required');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/create-admin-railway.js <password>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/create-admin-railway.js MySecurePass123!');
    console.log('');
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters');
    process.exit(1);
  }

  // Create admin account for derrick
  const username = 'derrick';
  const employeeId = 'derrick';
  const isAdmin = true;

  console.log(`Creating admin user: ${username}`);
  console.log(`Employee ID: ${employeeId}`);
  console.log('');

  const result = await createUser(username, password, employeeId, isAdmin);

  if (result.success) {
    console.log('');
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log('');
    console.log('You can now:');
    console.log('  1. Visit your Railway URL');
    console.log('  2. Login with the credentials above');
    console.log('  3. Access admin dashboard at /admin');
    console.log('');
  } else {
    console.error(`❌ Failed to create user: ${result.error}`);
    if (result.error.includes('already exists')) {
      console.log('');
      console.log('Admin user already exists. If you need to reset the password,');
      console.log('delete auth.db in Railway shell and run this script again.');
    }
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

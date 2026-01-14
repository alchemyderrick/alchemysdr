import "dotenv/config";
import { createUser } from '../lib/auth.js';

// Create admin user directly
async function main() {
  console.log('='.repeat(60));
  console.log('SDR Console - Creating Admin User');
  console.log('='.repeat(60));
  console.log('');

  // Create admin account for derrick
  const username = 'derrick';
  const employeeId = 'derrick';
  const password = 'admin123'; // Change this after first login!
  const isAdmin = true;

  console.log(`Creating admin user: ${username}`);
  console.log('');

  const result = await createUser(username, password, employeeId, isAdmin);

  if (result.success) {
    console.log('');
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  URL: http://localhost:3000/login`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change password after first login!');
    console.log('');
    console.log('You can now:');
    console.log('  1. Visit http://localhost:3000/login');
    console.log('  2. Login with the credentials above');
    console.log('  3. Access admin dashboard at http://localhost:3000/admin');
  } else {
    console.error(`❌ Failed to create user: ${result.error}`);
    if (result.error.includes('already exists')) {
      console.log('');
      console.log('Admin user already exists. Try logging in at:');
      console.log('  http://localhost:3000/login');
    }
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});

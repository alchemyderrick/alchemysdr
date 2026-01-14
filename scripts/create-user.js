import "dotenv/config";
import { createUser } from '../lib/auth.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('SDR Console - Create New User');
  console.log('='.repeat(60));
  console.log('');

  const username = await question('Enter username (e.g., john): ');
  const employeeId = await question('Enter employee ID (e.g., john): ');
  const isAdminInput = await question('Is admin? (y/n): ');
  const password = await question('Enter password: ');
  const confirmPassword = await question('Confirm password: ');

  if (password !== confirmPassword) {
    console.error('❌ Passwords do not match');
    rl.close();
    return;
  }

  if (password.length < 8) {
    console.error('❌ Password must be at least 8 characters');
    rl.close();
    return;
  }

  const isAdmin = isAdminInput.toLowerCase() === 'y';

  console.log('');
  console.log('Creating user...');

  const result = await createUser(username, password, employeeId, isAdmin);

  if (result.success) {
    console.log('');
    console.log('✅ User created successfully!');
    console.log('');
    console.log('Share with employee:');
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  URL: ${process.env.RENDER_URL || process.env.RAILWAY_PUBLIC_DOMAIN || 'https://sdr-console-production.up.railway.app'}`);
    console.log('');
    console.log('Employee should change password after first login.');
    console.log('');
    if (isAdmin) {
      console.log('⚡ This user has admin privileges and can access the admin dashboard at /admin');
    }
  } else {
    console.error(`❌ Failed to create user: ${result.error}`);
  }

  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

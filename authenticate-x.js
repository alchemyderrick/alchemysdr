#!/usr/bin/env node
/**
 * X/Twitter Authentication Script
 *
 * This script helps employees authenticate their X account for the SDR Console.
 *
 * Usage:
 *   node authenticate-x.js
 *
 * What it does:
 *   1. Opens a Chrome browser window for X login
 *   2. Waits for you to log in to X/Twitter
 *   3. Captures authentication cookies
 *   4. Uploads cookies to your employee account on Railway
 *   5. You can then use X discovery features in the SDR Console
 */

import puppeteer from 'puppeteer';
import readline from 'readline';

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://web-production-554d8.up.railway.app';

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
  console.log('X/Twitter Authentication for SDR Console');
  console.log('='.repeat(60));
  console.log('');

  // Get employee credentials
  const username = await question('Enter your SDR Console username: ');
  const password = await question('Enter your SDR Console password: ');

  console.log('');
  console.log('📱 Opening Chrome browser for X authentication...');
  console.log('   Please log in to X/Twitter in the browser window.');
  console.log('   After logging in, press Enter here to continue.');
  console.log('');

  let browser;
  let sessionCookie;

  try {
    // Launch browser (visible)
    browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    // Step 1: Login to SDR Console to get session
    console.log('🔐 Logging into SDR Console...');
    await page.goto(`${RAILWAY_URL}/api/auth/login`, { waitUntil: 'networkidle2' });

    await page.evaluate(async (username, password) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }
    }, username, password);

    // Get session cookie
    const cookies = await page.cookies();
    const sessionCookieObj = cookies.find(c => c.name === 'connect.sid');

    if (!sessionCookieObj) {
      throw new Error('Failed to get session cookie. Check your username/password.');
    }

    sessionCookie = `connect.sid=${sessionCookieObj.value}`;
    console.log('✅ Logged into SDR Console');
    console.log('');

    // Step 2: Open X for authentication
    console.log('🐦 Opening X/Twitter login page...');
    await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });

    // Wait for user to login
    await question('Press Enter after you have logged into X/Twitter...');

    // Verify login by checking if we're on home page
    const currentUrl = page.url();
    if (!currentUrl.includes('x.com/home') && !currentUrl.includes('twitter.com/home')) {
      console.log('⚠️  Warning: You may not be logged in yet.');
      const proceed = await question('Do you want to continue anyway? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('❌ Authentication cancelled');
        rl.close();
        await browser.close();
        return;
      }
    }

    // Step 3: Get X cookies
    console.log('');
    console.log('📦 Capturing X cookies...');
    const xCookies = await page.cookies();
    const relevantCookies = xCookies.filter(c =>
      c.domain.includes('x.com') || c.domain.includes('twitter.com')
    );

    console.log(`   Found ${relevantCookies.length} cookies`);

    // Step 4: Upload to Railway
    console.log('');
    console.log('📤 Uploading to SDR Console...');

    const uploadResponse = await fetch(`${RAILWAY_URL}/api/x-auth/upload-cookies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ cookies: relevantCookies })
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(`Upload failed: ${error.error || uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    console.log('');
    console.log('✅ SUCCESS! X authentication complete!');
    console.log('');
    console.log(`   Employee: ${result.employeeId}`);
    console.log(`   Cookies saved: ${relevantCookies.length}`);
    console.log('');
    console.log('You can now use X discovery features in the SDR Console.');
    console.log(`   ${RAILWAY_URL}`);
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
    console.error('');
  } finally {
    rl.close();
    if (browser) {
      await browser.close();
    }
  }
}

main().catch(console.error);

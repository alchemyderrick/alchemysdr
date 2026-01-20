// Quick test script to verify Chromium works on Railway
import puppeteerManager from './lib/puppeteer-manager.js';

console.log('Starting browser test...');

try {
  const browser = await puppeteerManager.getBrowser();
  console.log('✅ Browser launched successfully!');
  console.log('Connected:', browser.isConnected());
  
  const page = await puppeteerManager.newPage();
  console.log('✅ Page created successfully!');
  
  await page.goto('https://example.com', { timeout: 10000 });
  console.log('✅ Navigation successful!');
  
  await puppeteerManager.closePage(page);
  await puppeteerManager.cleanup();
  
  console.log('✅ All tests passed!');
  process.exit(0);
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

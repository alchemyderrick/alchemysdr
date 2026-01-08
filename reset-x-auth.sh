#!/bin/bash
# Helper script to reset X authentication
# Run this if you get authentication errors or rate limiting issues

echo "🔄 Resetting X authentication..."

# Remove cookies
if [ -f "x-cookies.json" ]; then
  rm x-cookies.json
  echo "✅ Removed x-cookies.json"
else
  echo "ℹ️  No x-cookies.json found"
fi

# Remove browser data
if [ -d "puppeteer-data" ]; then
  rm -rf puppeteer-data
  echo "✅ Removed puppeteer-data directory"
else
  echo "ℹ️  No puppeteer-data directory found"
fi

echo ""
echo "✅ Reset complete!"
echo ""
echo "Next steps:"
echo "1. Restart your server: node server.js"
echo "2. Run a workflow - browser will open for you to log in"
echo "3. Log in to X manually in the browser"
echo "4. After successful login, the workflow will continue automatically"

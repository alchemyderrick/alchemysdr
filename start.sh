#!/bin/bash

# Find Chromium executable
CHROMIUM_PATH=$(which chromium || which chromium-browser || find /nix/store -name chromium -type f 2>/dev/null | head -1)

if [ -z "$CHROMIUM_PATH" ]; then
  echo "ERROR: Could not find Chromium executable"
  echo "Searching common locations..."
  find /usr -name "chromium*" -type f 2>/dev/null | head -5
  find /nix -name "chromium" -type f 2>/dev/null | head -5
  exit 1
fi

echo "Found Chromium at: $CHROMIUM_PATH"
export PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH"

# Start the application
exec node server.js

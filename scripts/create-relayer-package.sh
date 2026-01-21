#!/bin/bash
# Create a distributable package for new SDRs
# This packages the relayer-package directory into a tarball

set -e

echo "📦 Creating SDR Relayer Package..."

# Use existing relayer-package directory as source
PACKAGE_DIR="relayer-package"

if [[ ! -d "$PACKAGE_DIR" ]]; then
    echo "❌ Error: $PACKAGE_DIR directory not found"
    exit 1
fi

# Ensure relayer-client.js is up to date (copy from root if exists)
if [[ -f "relayer-client.js" ]]; then
    cp relayer-client.js "$PACKAGE_DIR/"
fi

# Create archive
echo "🗜️  Creating archive..."
tar -czf relayer-package.tar.gz "$PACKAGE_DIR"

# Calculate size
SIZE=$(du -h relayer-package.tar.gz | cut -f1)

echo "✅ Package created successfully!"
echo ""
echo "📦 relayer-package.tar.gz ($SIZE)"
echo ""
echo "📤 Send this to new SDRs along with:"
echo "   - RELAYER_API_KEY"
echo "   - EMPLOYEE_ID"
echo "   - ANTHROPIC_API_KEY"
echo "   - Web UI login credentials"
echo ""
echo "SDR can unpack with:"
echo "   tar -xzf relayer-package.tar.gz"
echo "   cd relayer-package"
echo "   npm install"
echo "   cp .env.local.template .env.local"
echo "   # Edit .env.local with credentials"
echo "   npm run relayer"

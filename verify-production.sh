#!/bin/bash

# Production Verification Script for SDR Console on Railway
# This script checks that all components are properly configured

echo "========================================================================="
echo "SDR Console - Production Verification"
echo "========================================================================="
echo ""

RAILWAY_URL="https://sdr-console-production.up.railway.app"
RELAYER_API_KEY="898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043"
EMPLOYEE_ID="derrick"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0
WARN=0

# Helper functions
pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "1. RAILWAY SERVER CHECKS"
echo "-------------------------"

# Check Railway health endpoint
echo -n "Testing Railway health endpoint... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/api/health/claude")
if [ "$HEALTH" = "200" ]; then
    pass "Railway server is responding"
else
    fail "Railway server health check failed (HTTP $HEALTH)"
fi

# Check relayer authentication
echo -n "Testing relayer API authentication... "
RELAYER_AUTH=$(curl -s -H "X-Employee-ID: $EMPLOYEE_ID" \
                    -H "X-Relayer-API-Key: $RELAYER_API_KEY" \
                    -o /dev/null -w "%{http_code}" \
                    "$RAILWAY_URL/api/relayer/approved-pending")
if [ "$RELAYER_AUTH" = "200" ]; then
    pass "Relayer API authentication working"
else
    fail "Relayer API authentication failed (HTTP $RELAYER_AUTH)"
fi

echo ""
echo "2. LOCAL ENVIRONMENT CHECKS"
echo "---------------------------"

# Check .env file exists
if [ -f ".env" ]; then
    pass ".env file exists"
else
    fail ".env file not found"
fi

# Check required env vars in .env
if [ -f ".env" ]; then
    for var in ANTHROPIC_API_KEY RELAYER_API_KEY RENDER_URL EMPLOYEE_ID; do
        if grep -q "^$var=" .env; then
            pass "$var is set in .env"
        else
            fail "$var is missing from .env"
        fi
    done
fi

# Check node_modules
if [ -d "node_modules" ]; then
    pass "node_modules directory exists"
else
    warn "node_modules not found - run 'npm install'"
fi

echo ""
echo "3. DATABASE CHECKS"
echo "------------------"

# Check employee database
DB_PATH="databases/$EMPLOYEE_ID/data.db"
if [ -f "$DB_PATH" ]; then
    pass "Employee database exists ($DB_PATH)"

    # Check contacts with Telegram handles
    TELEGRAM_CONTACTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM contacts WHERE telegram_handle IS NOT NULL AND telegram_handle != '';")
    if [ "$TELEGRAM_CONTACTS" -gt 0 ]; then
        pass "$TELEGRAM_CONTACTS contacts have Telegram handles"
    else
        warn "No contacts have Telegram handles configured"
    fi

    # Check for drafts
    DRAFT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM drafts;")
    if [ "$DRAFT_COUNT" -gt 0 ]; then
        pass "$DRAFT_COUNT drafts in database"
    else
        warn "No drafts found in database"
    fi

    # Check for approved drafts pending send
    APPROVED_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM drafts WHERE status = 'approved' AND prepared_at IS NULL;")
    if [ "$APPROVED_COUNT" -gt 0 ]; then
        warn "$APPROVED_COUNT approved drafts waiting for relayer"
    else
        pass "No drafts currently pending"
    fi

else
    fail "Employee database not found ($DB_PATH)"
fi

echo ""
echo "4. RELAYER CHECKS"
echo "-----------------"

# Check if relayer process is running
if pgrep -f "relayer-client.js" > /dev/null; then
    pass "Relayer process is running"

    # Check relayer log
    if [ -f "relayer.log" ]; then
        pass "Relayer log file exists"

        # Check for recent connection
        if tail -20 relayer.log | grep -q "Connected to server"; then
            pass "Relayer connected to server recently"
        else
            warn "No recent connection message in relayer.log"
        fi
    else
        warn "relayer.log file not found"
    fi
else
    fail "Relayer process is not running - start with 'npm run relayer'"
fi

# Check macOS accessibility permissions (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -n "Checking macOS accessibility permissions... "
    # Note: This is hard to check programmatically, so we just warn
    warn "Please verify Terminal has Accessibility permissions in System Settings"
else
    warn "Not running on macOS - Telegram automation requires macOS"
fi

echo ""
echo "5. TELEGRAM CHECKS"
echo "------------------"

# Check if Telegram is installed (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if [ -d "/Applications/Telegram.app" ]; then
        pass "Telegram Desktop is installed"
    else
        fail "Telegram Desktop not found in /Applications"
    fi

    # Check if Telegram is running
    if pgrep -i "Telegram" > /dev/null; then
        pass "Telegram is currently running"
    else
        warn "Telegram is not running - start it before sending messages"
    fi
else
    warn "Telegram checks skipped (not on macOS)"
fi

echo ""
echo "6. PUPPETEER CHECKS"
echo "-------------------"

# Check puppeteer-data directory
if [ -d "puppeteer-data" ]; then
    pass "Puppeteer user data directory exists"
else
    warn "puppeteer-data directory not found (will be created on first use)"
fi

# Check for Chrome processes
if pgrep -f "Chrome for Testing" > /dev/null; then
    warn "Chrome for Testing processes are running (might need cleanup)"
else
    pass "No orphaned Chrome processes"
fi

echo ""
echo "========================================================================="
echo "VERIFICATION SUMMARY"
echo "========================================================================="
echo -e "${GREEN}Passed:${NC}  $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC}  $FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Your SDR Console is ready for production use."
    echo ""
    echo "Next steps:"
    echo "1. Ensure relayer is running: npm run relayer"
    echo "2. Open web UI: $RAILWAY_URL"
    echo "3. Create and approve a test draft"
    echo "4. Watch relayer logs: tail -f relayer.log"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo ""
    echo "Please fix the failed items above before proceeding."
    echo ""
    echo "Common fixes:"
    echo "- Install dependencies: npm install"
    echo "- Start relayer: npm run relayer"
    echo "- Install Telegram Desktop"
    echo "- Grant accessibility permissions to Terminal"
    echo ""
    exit 1
fi

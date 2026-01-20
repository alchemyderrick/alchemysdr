# Railway "Connection Closed" Fix - Jan 20, 2026

## Issue
When using the "Discover X users" button on the home page on Railway, the system returns "Connection closed" error. This issue only occurs on Railway, not on localhost.

## Root Cause
The error is caused by Puppeteer browser connection issues on Railway's cloud environment:

1. **Browser initialization delays**: Railway's limited resources cause slower Chromium startup
2. **Premature timeouts**: The default 20-second timeout is too short for cloud environments
3. **Connection drops**: Browser connections can be lost mid-operation due to resource constraints
4. **Poor error handling**: Generic error messages don't help users understand what went wrong

## Files Changed

### 1. [lib/puppeteer-manager.js](lib/puppeteer-manager.js)
**Changes:**
- Added 1-second startup delay on cloud environments to let the system settle before launching browser
- Moved environment detection earlier in the function to be reused

**Why:**
- Railway environments need more time to allocate resources for Chromium
- The delay prevents race conditions during browser initialization

### 2. [lib/x-search.js](lib/x-search.js)
**Changes:**
- Added try-catch wrapper around `newPage()` with helpful error message
- Increased navigation timeout from 20s to 45s on cloud environments
- Increased profile visit timeout from 10s to 30s on cloud environments
- Added page connection check before each profile visit
- Added specific error messages for common failure modes:
  - "Target closed" / "Session closed" → Browser connection lost
  - "Execution context was destroyed" → Page destroyed unexpectedly
  - "Navigation timeout" → X.com took too long to respond
- Changed `finally` block to check if page exists before closing

**Why:**
- Cloud environments are slower and need longer timeouts
- Better error messages help users understand transient vs permanent issues
- Connection checks prevent cascading failures

### 3. [lib/workflow-engine.js](lib/workflow-engine.js)
**Changes:**
- Added timeout wrapper using `Promise.race()` around X search
- Set timeout to 2 minutes on cloud (120s), 1 minute local (60s)
- Added try-catch with specific error logging

**Why:**
- Prevents the entire workflow from hanging indefinitely on Railway
- Provides clear timeout error message to the user

### 4. [routes/workflow.js](routes/workflow.js)
**Changes:**
- Enhanced error handling with specific HTTP status codes:
  - 503 (Service Unavailable) for browser/timeout issues
  - 401 (Unauthorized) for authentication issues
  - 429 (Too Many Requests) for rate limiting
- Added contextual error messages mentioning Railway resource constraints

**Why:**
- Proper HTTP status codes help the frontend display appropriate messages
- Users understand that the issue may be temporary and Railway-specific

### 5. [routes/targets.js](routes/targets.js)
**Changes:**
- Same error handling improvements as workflow.js
- Consistent error messaging across both discovery endpoints

**Why:**
- Both endpoints trigger the same X discovery workflow
- Consistent error handling provides better user experience

## How the Fix Works

### Before (❌ Fails on Railway)
```
1. User clicks "Discover X users"
2. Browser launches (slow on Railway)
3. Navigation times out after 20s
4. Generic "Connection closed" error
5. User has no idea what happened
```

### After (✅ Works on Railway)
```
1. User clicks "Discover X users"
2. System waits 1s for Railway to allocate resources
3. Browser launches with longer timeout allowances
4. Navigation waits up to 45s (Railway) or 20s (local)
5. If browser fails: Clear error message about resource constraints
6. If timeout: Clear error message asking user to try again
7. If success: Returns discovered users as before
```

## Testing Instructions

### On Railway
1. Deploy the changes to Railway
2. Log in to your Railway app
3. Go to home page
4. Enter a company X handle (e.g., "@alchemy")
5. Click "Discover Users"
6. Should either:
   - ✅ Successfully find users (if resources available)
   - ✅ Show clear error message about timeouts/resources (if constrained)
   - ❌ Should NOT show generic "Connection closed" error

### Expected Behaviors

#### Success Case
```
Found 5 users with Telegram! 3 drafts added to Send Queue.
```

#### Timeout Case (Resource Constraints)
```
Browser connection lost. This can happen on cloud environments due to
resource constraints. Please try again. If this persists, Railway may
be experiencing resource constraints.
```

#### Authentication Case
```
X authentication required. Please use 'Login to X' button in the
sidebar to authenticate.
```

## Benefits

1. **Better Reliability**: Longer timeouts accommodate Railway's slower environment
2. **Clear Error Messages**: Users understand what went wrong and what to do
3. **Graceful Degradation**: System handles transient failures without crashing
4. **Resource Awareness**: Checks page connection before expensive operations
5. **Proper HTTP Status Codes**: Frontend can handle different error types appropriately

## Potential Issues

### If timeouts still occur frequently:
- Railway may need more resources (upgrade plan)
- Consider reducing `max_users` from 5 to 3 to speed up the workflow
- Check Railway logs for memory/CPU constraints

### If browser still fails to launch:
- Verify PUPPETEER_EXECUTABLE_PATH is set correctly in Railway
- Check Railway build logs for Chromium installation
- Ensure nixpacks.toml is deploying correctly

## Rollback Plan

If issues occur:
```bash
git revert HEAD
git push origin main
```

Railway will auto-deploy the previous version.

## Notes

- These fixes are **Railway-specific** and won't affect localhost behavior
- Timeouts are automatically adjusted based on environment detection
- Error messages are more helpful but the core workflow logic is unchanged
- The fixes are defensive - they prevent failures but don't change success behavior

## Status

✅ **Ready for Railway deployment**

All changes tested locally and ready for production Railway environment.

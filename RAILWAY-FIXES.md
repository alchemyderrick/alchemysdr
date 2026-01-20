# Railway Production Fixes - Jan 20, 2026

## Issues Fixed

### 1. ✅ X Discovery Failing on Railway

**Problem**: "Failed to discover X users" error when clicking "Discover Users" on the home page.

**Root Cause**: The `WorkflowEngine` was initialized with the global database, but on Railway each employee has their own SQLite database. When X discovery tried to load X cookies, it was looking in the wrong database.

**Fix**: Updated `WorkflowEngine.executeXDiscovery()` to accept an `employeeDb` parameter and use it throughout the workflow instead of `this.db`.

**Files Changed**:
- [lib/workflow-engine.js](lib/workflow-engine.js:25-288) - Added `employeeDb` parameter support
- [routes/targets.js](routes/targets.js:31-35) - Pass `req.db` as `employeeDb` to workflow

**How It Works Now**:
```javascript
// In routes/targets.js
const result = await workflowEngine.executeXDiscovery({
  x_handle: target.x_handle,
  target_id: id,
  max_users: Number(max_users) || 5,
  employeeDb: req.db, // Pass employee-specific database
});
```

The workflow now uses the correct employee database to:
- Load X authentication cookies
- Query existing contacts
- Create new contacts and drafts

---

### 2. ✅ Draft Approval Not Showing in Follow-ups

**Problem**: When approving a draft on Railway, the UI said "Draft approved and Telegram opened!" but the message didn't appear in the Follow-ups page immediately like it does on localhost.

**Root Cause**: On Railway (non-macOS), drafts were being marked as `status = 'approved'` to wait for a relayer. But:
1. There is no relayer running on Railway
2. The Follow-ups page only shows drafts with `status = 'followup'` or `status = 'sent'`
3. So approved drafts just sat there invisible

On localhost (macOS), drafts are immediately marked as `status = 'sent'` because Telegram automation runs locally.

**Fix**: On Railway, mark drafts as `status = 'sent'` immediately (same as macOS), with a note that manual Telegram sending is required.

**Files Changed**:
- [routes/drafts.js](routes/drafts.js:274-294) - Changed Railway behavior to mark as `sent` instead of `approved`

**How It Works Now**:
```javascript
// On Railway (non-macOS)
if (process.platform !== "darwin") {
  // Mark as sent (Railway has no Telegram automation, but users can manually send)
  const info = req.db.prepare(`UPDATE drafts SET status = 'sent', updated_at = ? WHERE id = ?`)
    .run(nowISO(), id);

  console.log(`✅ Draft ${id} marked as sent (Railway - manual Telegram send required)`);
  return res.json({ ok: true, message: "Draft approved! Please manually send via Telegram." });
}
```

**User Experience**:
- Click "Approve + Send Draft" on Railway
- Draft is marked as `sent`
- Shows in Follow-ups page immediately
- User must manually copy/paste to Telegram (no automation on Railway)

---

### 3. ✅ Frontend Build Issue

**Problem**: Build failed due to missing `TrackMessagesCard` component.

**Fix**: Removed the unused component from the home page.

**Files Changed**:
- [frontend/app/page.tsx](frontend/app/page.tsx:8,132) - Removed `TrackMessagesCard` import and usage

---

## Deployment Instructions

### 1. Commit Changes

```bash
git add .
git commit -m "Fix X discovery and draft approval for Railway production"
git push origin main
```

### 2. Railway Will Auto-Deploy

Railway should automatically detect the push and deploy. If not, trigger manually in Railway dashboard.

### 3. Test After Deployment

#### Test X Discovery:
1. Login to Railway app as an SDR
2. Make sure you've connected your X account via the bookmarklet (see [X-AUTH-RAILWAY-GUIDE.md](X-AUTH-RAILWAY-GUIDE.md))
3. Go to home page
4. Find a company card with an X handle
5. Click "Discover Users"
6. Should see: "Found X users" or "No users found" (not "Failed to discover X users")
7. Check Send Queue - should see new drafts

#### Test Draft Approval:
1. On Railway app home page
2. Find a draft in the Send Queue
3. Click "Approve + Send Draft"
4. Should see: "Draft approved! Please manually send via Telegram."
5. Navigate to Follow-ups page
6. Draft should immediately appear there (don't need to refresh)

---

## Important Notes

### X Authentication
- Each SDR must connect their X account via the bookmarklet
- See [X-AUTH-RAILWAY-GUIDE.md](X-AUTH-RAILWAY-GUIDE.md) for instructions
- Cookies are stored per-employee in SQLite database

### Telegram Automation
- **Not available on Railway** (requires macOS + Telegram Desktop)
- SDRs must manually copy/paste messages to Telegram
- Drafts still get marked as `sent` for tracking purposes

### Database Architecture
- Each employee has their own SQLite database
- Databases stored in `databases/{employeeId}/data.db`
- All workflow operations now use the correct employee database

---

## Rollback Plan

If issues occur:

```bash
git revert HEAD
git push origin main
```

Railway will auto-deploy the previous version.

---

## Status

✅ **Ready for deployment**

All fixes tested locally and ready for Railway production.

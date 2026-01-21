# Relayer Status & Fix Required

## Current Status

✅ **Relayer is running** (PID: check with `ps aux | grep relayer-client`)
✅ **Connected to Railway**: https://web-production-554d8.up.railway.app
✅ **Polling every 2 seconds** for approved drafts
✅ **Configuration correct**: RELAYER_API_KEY, EMPLOYEE_ID, etc.

## The Problem

**The web UI is calling the wrong API endpoint when you click "Approve".**

### What's Happening

1. You click "Approve" in the web UI
2. Web UI calls: `POST /api/drafts/:id/approve-open-telegram`
3. That endpoint marks the draft as `status = 'sent'` immediately (line 283 in routes/drafts.js)
4. The relayer never sees it because it only looks for drafts with `status = 'approved'`

### What Should Happen

1. You click "Approve" in the web UI
2. Web UI should call: `POST /api/drafts/:id/approve` (no `-open-telegram`)
3. That endpoint marks the draft as `status = 'approved'` (line 203 in routes/drafts.js)
4. Relayer picks it up within 2 seconds and sends it

## The Fix

The frontend needs to be updated to call the correct endpoint.

### Frontend Change Needed

Find where the frontend calls the approve endpoint and change:

```javascript
// WRONG (current):
POST /api/drafts/${id}/approve-open-telegram

// CORRECT (for relayer):
POST /api/drafts/${id}/approve
```

### Location to Check

The frontend is likely in:
- `frontend/app/` (Next.js pages)
- `frontend/components/` (React components)

Look for files related to:
- Drafts
- Send Queue
- Message approval

Search for: `approve-open-telegram` and replace with just `approve`

## Verification

Once the frontend is updated:

1. **Approve a draft** in the web UI
2. **Check relayer log**: `tail -f relayer.log`
3. **Should see within 2 seconds**:
   ```
   🔄 Processing draft abc123 for John Doe (@johndoe)
   📱 Opened Telegram chat with @johndoe
   📤 Sending message...
   ✅ Message sent!
   ```

## Temporary Workaround

Until the frontend is fixed, you can approve drafts via API:

```bash
# Get your session cookie from browser
# Then approve a draft:
curl -X POST https://web-production-554d8.up.railway.app/api/drafts/DRAFT_ID/approve \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

Or directly in the database:

```bash
# Update draft status to 'approved'
# The relayer will pick it up on next poll
```

## API Endpoints Summary

### For Relayer Workflow (Railway)

- ✅ **`POST /api/drafts/:id/approve`**
  - Sets `status = 'approved'`
  - Relayer picks it up
  - **This is what the web UI should use**

### For Direct Mac Automation (Old Workflow)

- **`POST /api/drafts/:id/approve-open-telegram`**
  - Sets `status = 'sent'`
  - Opens Telegram Desktop immediately (macOS only)
  - **Not for relayer workflow**

## Relayer Polling Logic

The relayer looks for drafts matching:

```sql
SELECT * FROM drafts
WHERE status = 'approved'
  AND prepared_at IS NULL
  AND employee_id = 'derrick'
```

If the web UI marks drafts as `'sent'` instead of `'approved'`, the relayer will never see them.

## Next Steps

1. **Update frontend** to call `/approve` endpoint
2. **Test** with one draft approval
3. **Verify** relayer picks it up and sends
4. **Deploy** to Railway

---

**Status**: Relayer is ready and working. Frontend needs endpoint fix.

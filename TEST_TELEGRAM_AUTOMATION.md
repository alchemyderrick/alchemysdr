# Testing Telegram Automation

This guide walks you through testing the complete Telegram automation flow from draft creation to message sending.

## Prerequisites

✅ Local server running: `npm run dev` (port 3000)
✅ Relayer running: `npm run relayer` (connected to Railway)
✅ Telegram Desktop app installed and logged in
✅ macOS Accessibility permissions granted to Terminal

## Test Flow Overview

```
1. Create/select a draft in web UI
2. Approve the draft
3. Relayer picks it up (polls every 2 seconds)
4. Relayer opens Telegram chat
5. Relayer sends message(s)
6. Draft status updates to "prepared"
```

## Option 1: Test via Web UI (Recommended)

### Step 1: Access the Web Interface

Open your browser to: http://localhost:3000

Or if testing against Railway: https://sdr-console-production.up.railway.app

### Step 2: Login

Use your employee credentials (e.g., username: `derrick`)

### Step 3: Navigate to Drafts

Go to the "Send Queue" or "Drafts" section

### Step 4: Find an Existing Draft

Look for a draft with status "pending" or "skipped" that has a valid Telegram handle

**Existing drafts in your database:**
- Contact: Eshan (@eshanxyz) - Draft ID: cf7AFRp2coybgwzDrRxnx (status: followup)
- Contact: itsjawdan (@itsjawdan) - Multiple drafts (status: skipped)

### Step 5: Approve the Draft

Click the "Approve" or "Send" button

### Step 6: Watch the Relayer

In the terminal where the relayer is running, you should see:

```
🔄 Processing draft {id} for {name} (@{handle})
📱 Opened Telegram chat with @{handle}
📤 Sending X paragraph(s) as separate messages
  → Sending paragraph 1/X
✅ All X message(s) sent to {name}
✅ Successfully prepared draft {id}
```

### Step 7: Verify in Telegram

Open Telegram Desktop and check that the message was sent to the contact

---

## Option 2: Test via API (Advanced)

### Create a Test Draft via API

```bash
# 1. Get an existing contact ID with Telegram handle
CONTACT_ID="tjoUFP1pII3KVuam_jYKW"  # Eshan (@eshanxyz)

# 2. Create a test draft
curl -X POST http://localhost:3000/api/drafts \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "contact_id": "'$CONTACT_ID'",
    "channel": "telegram",
    "message_text": "Hey! This is a test message from the SDR Console automation.\n\nJust making sure everything works correctly.\n\nLet me know if you got this!"
  }'
```

### Approve the Draft

```bash
# Replace DRAFT_ID with the ID from the creation response
DRAFT_ID="abc123"

curl -X POST http://localhost:3000/api/drafts/$DRAFT_ID/approve \
  -b "connect.sid=YOUR_SESSION_COOKIE"
```

### Check Relayer Picks It Up

Watch the relayer terminal output. Within 2 seconds, it should detect and process the draft.

---

## Option 3: Quick Database Test

If you want to manually approve an existing draft directly in the database:

```bash
# 1. List pending/skipped drafts
sqlite3 databases/derrick/data.db "
  SELECT d.id, c.name, c.telegram_handle, d.status
  FROM drafts d
  JOIN contacts c ON d.contact_id = c.id
  WHERE d.status IN ('pending', 'skipped')
  AND c.telegram_handle IS NOT NULL
  LIMIT 5;
"

# 2. Approve a specific draft (replace DRAFT_ID)
DRAFT_ID="cf7AFRp2coybgwzDrRxnx"

sqlite3 databases/derrick/data.db "
  UPDATE drafts
  SET status = 'approved',
      prepared_at = NULL,
      updated_at = datetime('now')
  WHERE id = '$DRAFT_ID';
"

# 3. Verify it was approved
sqlite3 databases/derrick/data.db "
  SELECT id, status, prepared_at
  FROM drafts
  WHERE id = '$DRAFT_ID';
"
```

The relayer should pick it up within 2 seconds.

---

## Troubleshooting

### Relayer Not Picking Up Drafts

**Check 1**: Verify relayer is connected
```bash
tail -f relayer.log
# Should show: "✅ Connected to server"
```

**Check 2**: Check for approved drafts
```bash
sqlite3 databases/derrick/data.db "
  SELECT d.id, c.telegram_handle, d.status, d.prepared_at
  FROM drafts d
  JOIN contacts c ON d.contact_id = c.id
  WHERE d.status = 'approved'
  AND d.prepared_at IS NULL;
"
```

**Check 3**: Test relayer API manually
```bash
curl -H "X-Employee-ID: derrick" \
     -H "X-Relayer-API-Key: 898d3e3030710bf0284501cfd10c752130170ac6b8e221f5104fb721f2c2a043" \
     https://sdr-console-production.up.railway.app/api/relayer/approved-pending
```

### Telegram Doesn't Open

**Issue**: Relayer says "Opened Telegram" but nothing happens

**Solutions**:
1. Check Telegram Desktop is installed (not just web version)
2. Verify the Telegram handle is correct (no typos)
3. Check macOS privacy settings for "Terminal" accessibility
4. Try opening a Telegram link manually: `open "tg://resolve?domain=eshanxyz"`

### Message Not Pasting

**Issue**: Telegram opens but message doesn't paste/send

**Solutions**:
1. Grant Accessibility permissions to Terminal:
   - System Settings → Privacy & Security → Accessibility
   - Add Terminal to the list
   - Enable the checkbox
2. Restart Terminal after granting permissions
3. Restart the relayer: Stop (Ctrl+C) and run `npm run relayer` again

### Draft Stays in "Approved" Status

**Issue**: Draft is approved but never changes to "prepared"

**Check relayer logs**:
```bash
tail -f relayer.log
```

Look for error messages. Common issues:
- Invalid Telegram handle
- Telegram app not running
- Accessibility permissions denied
- Network issues connecting to Railway

---

## Verifying the Complete Flow

### End-to-End Checklist

- [ ] Draft created with valid Telegram handle
- [ ] Draft approved via web UI or API
- [ ] Relayer detects draft within 2 seconds
- [ ] Telegram Desktop opens to the correct chat
- [ ] Message pastes and sends successfully
- [ ] Draft status updates to "prepared" in database
- [ ] Recipient receives the message in Telegram

### Check Final Status

```bash
sqlite3 databases/derrick/data.db "
  SELECT
    d.id,
    c.name,
    c.telegram_handle,
    d.status,
    d.prepared_at,
    d.updated_at
  FROM drafts d
  JOIN contacts c ON d.contact_id = c.id
  WHERE d.status = 'prepared'
  ORDER BY d.updated_at DESC
  LIMIT 5;
"
```

Successfully sent messages will show:
- `status = 'prepared'`
- `prepared_at` timestamp when relayer sent it

---

## Advanced: Testing Response Capture

The relayer can also capture responses from Telegram contacts using Claude Vision.

### How It Works

1. Create a response capture request (via API or web UI)
2. Relayer opens Telegram to the contact's chat
3. Takes a screenshot of the conversation
4. Uses Claude Vision API to extract the contact's messages
5. Stores the response in the database

### Test Response Capture

```bash
# 1. Create a capture request (requires API endpoint)
# This would be done via web UI typically

# 2. Check for capture requests
sqlite3 databases/derrick/data.db "
  SELECT * FROM response_capture_requests
  ORDER BY created_at DESC
  LIMIT 5;
"

# 3. Watch relayer process it
tail -f relayer.log
# Should show: "📸 Processing capture request..."
```

---

## Performance Notes

- **Polling Interval**: 2 seconds (configurable via `POLL_INTERVAL_MS`)
- **Message Sending**: ~1.5 seconds per paragraph
- **Retry Logic**: Failed drafts retry up to 2 times
- **Concurrent Processing**: One draft at a time (sequential)

---

## Success Indicators

✅ Relayer log shows: "✅ Successfully prepared draft {id}"
✅ Telegram shows the sent message
✅ Database shows `status = 'prepared'` and `prepared_at` timestamp
✅ No errors in relayer.log

If all of the above are true, your Telegram automation is working correctly!

---

## Next Steps

Once basic sending works:
1. Test with multiple paragraphs (separated by blank lines)
2. Test response capture feature
3. Test X/Twitter authentication flow
4. Set up production monitoring for the relayer

For production use, consider running the relayer as a background service (e.g., using `pm2` or `launchd` on macOS).

# SDR Console - Import Filter Changes Summary

## Changes Made

### 1. Changed `qualifiesTarget` filter logic from AND to OR
**File:** `lib/helpers.js` (lines 43-51)

**Before:**
```javascript
// Required BOTH: raised >= $10M AND revenue >= $500k
return Number.isFinite(raised) && Number.isFinite(rev) && raised >= 10_000_000 && rev >= 500_000 && isWeb3;
```

**After:**
```javascript
// Requires EITHER: raised >= $10M OR revenue >= $500k
const raised = Number(t?.raised_usd) || 0;  // null becomes 0
const rev = Number(t?.monthly_revenue_usd) || 0;  // null becomes 0
return (raised >= 10_000_000 || rev >= 500_000) && isWeb3;
```

### 2. Updated frontend filter criteria display
**File:** `frontend/components/import-targets-modal.tsx` (lines 75-79)

Changed from listing criteria as separate "must have" items to showing OR logic.

### 3. Added bypass filter checkbox to import modal
**File:** `frontend/components/import-targets-modal.tsx` (lines 81-89)

Added checkbox: "Bypass filter criteria (import all teams)"

### 4. Updated backend `/api/targets/import` endpoint
**File:** `server.js` (lines 1228-1262)

- Added `bypass_filter` parameter support
- Changed status from `'active'` to `'approved'` so imported teams appear in Target Teams tab
- Added explicit duplicate checking with separate `duplicates` count in response
- Null values for raised_usd/monthly_revenue_usd converted to 0

---

## Commits

1. **90547af** - Fix: Change target filter to OR logic and add bypass option
2. **9e88596** - Fix: Import targets with 'approved' status and show duplicates

---

## JSON Data Analysis

Out of 54 teams in the JSON file:
- **10 teams qualify** (raised >= $10M OR revenue >= $500k):
  - SoSoValue ($19.5M raised)
  - Story Protocol ($143M raised)
  - Upbit ($91.6M monthly revenue)
  - OKX ($100M raised)
  - COBO ($70M raised)
  - Chromia ($25M raised)
  - Delysium ($14M raised)
  - CertiK ($296M raised)
  - Bithumb ($207M raised)
  - Oasys ($20M raised)

- **44 teams don't qualify** (both raised and revenue are null or below thresholds)

To import all 54 teams, check the "Bypass filter criteria" checkbox.

---

## Notes

- The `qualifiesTarget` function is used by both "Research Teams" and "Import Teams" features
- If Railway deployment is stuck, the old code may still be running
- Verify new code deployed by checking if bypass checkbox is visible in import modal

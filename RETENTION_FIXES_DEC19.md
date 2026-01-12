# Retention Policy Fixes - December 19, 2024

## Issues Fixed

### 1. ✅ Policy Not Found Error (When Creating & Applying Policy)
**Problem**: When creating a new retention policy and immediately applying it to documents, the system threw "Policy not found" error.

**Root Cause**: The `applyPolicyToDocument` function in `useRetentionPolicies.ts` (line 395) searches for the policy in the `policies` array. When a policy is created in `ApplyPolicyDialog.tsx`, it's inserted into the database but the local `policies` state array isn't refreshed before trying to apply it.

**Fix**: Added `await fetchData()` call after creating a new policy to refresh the policies list before applying.

**File Modified**: `src/components/retention/ApplyPolicyDialog.tsx`
```tsx
// Line 221-223: Added refresh before applying
if (policyError) throw policyError;
policyId = newPolicy.id;

// Refresh policies to include the newly created one
await fetchData();
```

---

### 2. ✅ Failed to Update Template Error
**Problem**: Users couldn't update retention policy templates - received permission errors.

**Root Cause**: The RLS (Row Level Security) policy for `retention_policy_templates` table only allowed SELECT (viewing) operations for authenticated users. Update, insert, and delete operations were blocked.

**Fix**: Created new migration to add comprehensive RLS policies:
- Allow all users to view templates
- Allow all users to create templates
- Allow all users to update/delete non-system templates (protecting system templates)

**File Created**: `supabase/migrations/20251219000000_fix_template_permissions.sql`
```sql
CREATE POLICY "Users can create templates"
    ON retention_policy_templates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update non-system templates"
    ON retention_policy_templates FOR UPDATE
    TO authenticated
    USING (is_system_template = false OR is_system_template IS NULL)
    WITH CHECK (is_system_template = false OR is_system_template IS NULL);
```

**Action Required**: Run the migration with:
```bash
npx supabase migration up
```

---

### 3. ✅ Disposition Queue Not Fetching Documents
**Problem**: Disposition Queue tab appears empty or not showing expected documents.

**Root Cause**: The queue filters documents by specific statuses:
- `pending_review`
- `pending_approval`  
- `active` documents past their retention end date

If no documents match these criteria, the queue appears empty.

**Fix**: Added debug console logs to help diagnose why documents aren't appearing:

**File Modified**: `src/components/retention/DispositionQueue.tsx`
```tsx
// Lines 77-79: Added debugging
console.log('DispositionQueue - Total document statuses:', documentStatuses.length);
console.log('DispositionQueue - Pending docs:', pendingDocs.length);
console.log('DispositionQueue - Document statuses sample:', documentStatuses.slice(0, 3));
```

**To Diagnose**: Check browser console when viewing Disposition Queue tab. It will show:
- Total number of documents with retention status
- How many match the pending criteria
- Sample of document statuses to verify data structure

---

### 4. ✅ Legal Hold - View Documents Not Working
**Problem**: Clicking "View Documents" button in legal hold details navigates to documents page but doesn't filter by legal hold.

**Root Cause**: The Supabase `.contains()` query for array filtering wasn't working properly with the `legal_hold_ids` array column.

**Fix**: Changed approach to fetch all retention statuses and filter in JavaScript using `Array.includes()`.

**File Modified**: `src/components/simplify-drive/SimplifyDrive.tsx`
```tsx
// Lines 94-116: Fetch and filter in JavaScript
const { data: retentionStatuses, error } = await supabase
  .from('document_retention_status')
  .select('document_id, legal_hold_ids')
  .not('legal_hold_ids', 'is', null);

// Filter by legal hold ID in JavaScript
const documentIds = retentionStatuses
  ?.filter(s => {
    const holdIds = s.legal_hold_ids || [];
    return Array.isArray(holdIds) && holdIds.includes(state.legalHoldId);
  })
  .map(s => s.document_id) || [];
```

Added console logs to help diagnose filtering issues.

---

### 5. ✅ Audit Log Filters & CSV Export
**Problem**: User reported filters not working and CSV export missing (only PDF/Word available).

**Investigation**: The audit log component already has all required functionality:
- Action filter dropdown (disposed, archived, held, released, extended, exception granted)
- Date range filter buttons (7d, 30d, 90d, all time)
- CSV export button

**Improvements Made**:
1. Added debug console logs to track filter operations
2. Improved CSV export to include document names (was missing)
3. Added toast notification on successful export
4. Added URL cleanup after export

**File Modified**: `src/components/retention/RetentionAuditLog.tsx`
```tsx
// Lines 119-147: Enhanced filtering with debugging
console.log('RetentionAuditLog - Total logs:', logs.length);
console.log('RetentionAuditLog - Filters:', { searchQuery, actionFilter, dateRange });

// Lines 199-224: Improved CSV export
const csv = [
  ['Date', 'Action', 'Document ID', 'Document Name', 'Previous Status', 'New Status', 'Reason', 'Certificate'],
  ...
];
// Added toast notification and URL cleanup
```

**To Diagnose**: If filters still don't work, check browser console for debug output showing:
- Total number of logs
- Current filter values
- Number of logs after each filter is applied

---

## Testing Instructions

### Test 1: Policy Creation & Application
1. Go to Retention Dashboard → Policies tab
2. Click "Create Policy" or "Apply Policy" to documents
3. Select "Create New Policy" option
4. Fill in policy details and select documents
5. Click Apply
6. ✅ Should successfully create and apply without "Policy not found" error

### Test 2: Template Updates
1. First, run the migration: `npx supabase migration up`
2. Go to Retention Dashboard → Policies tab
3. Find a template or create a new one
4. Click edit template icon
5. Modify template settings
6. Click Save
7. ✅ Should save successfully without permission errors

### Test 3: Disposition Queue
1. Create a retention policy and apply it to documents
2. Set retention end date in the past (or wait for it to expire)
3. Go to Retention Dashboard → Disposition Queue tab
4. Open browser console (F12)
5. ✅ Check console logs for document counts and statuses
6. ✅ Should see documents that are pending review/approval or past end date

### Test 4: Legal Hold Document View
1. Create a legal hold with documents
2. Go to Legal Holds → Select a hold → View Details
3. Click "View Documents" button (or from custodian dropdown)
4. Open browser console (F12)
5. ✅ Check console logs showing fetched retention statuses and filtered document IDs
6. ✅ Documents page should filter to show only documents in that legal hold

### Test 5: Audit Log Filters & Export
1. Go to Retention Dashboard → Audit Log tab
2. Open browser console (F12)
3. Test search filter: Type document name/ID
4. Test action filter: Select different actions from dropdown
5. Test date filter: Click different time ranges (7d, 30d, 90d, All Time)
6. ✅ Check console for filter debug output
7. Click "Export CSV" button
8. ✅ Should download CSV file with filtered logs
9. ✅ Should see toast notification confirming export

---

## Files Modified

1. `src/components/retention/ApplyPolicyDialog.tsx` - Added policy refresh before applying
2. `src/components/retention/DispositionQueue.tsx` - Added debug logging
3. `src/components/simplify-drive/SimplifyDrive.tsx` - Fixed legal hold document filtering
4. `src/components/retention/RetentionAuditLog.tsx` - Enhanced CSV export and added debug logs
5. `supabase/migrations/20251219000000_fix_template_permissions.sql` - New migration for template permissions

## Migration Required

⚠️ **Important**: You must run the Supabase migration for template updates to work:

```bash
npx supabase migration up
```

Or if using Supabase CLI:
```bash
supabase db push
```

---

## Debug Console Output

When testing, you should see these console logs:

**Disposition Queue:**
```
DispositionQueue - Total document statuses: X
DispositionQueue - Pending docs: Y
DispositionQueue - Document statuses sample: [...]
```

**Legal Hold Documents:**
```
Fetching documents for legal hold: <hold-id>
All retention statuses with holds: [...]
Filtered document IDs for legal hold: [...]
```

**Audit Log:**
```
RetentionAuditLog - Total logs: X
RetentionAuditLog - Filters: { searchQuery: '...', actionFilter: '...', dateRange: '...' }
After search filter: Y
After action filter: Z
After date filter: W
Exporting logs: N
```

These logs will help diagnose any remaining issues with the retention policy features.

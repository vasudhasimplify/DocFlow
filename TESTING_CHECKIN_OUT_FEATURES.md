# Testing Guide: Check-In/Out & Ownership Transfer Features

## Overview
This guide provides step-by-step instructions for testing all Check-In/Out and Ownership Transfer features with real document IDs.

---

## Prerequisites

1. **Two User Accounts**: You need two browser sessions (or incognito windows) logged in as different users
   - User A (Alice) - Primary tester
   - User B (Bob) - Secondary tester

2. **Documents**: Create at least 2 test documents
   - Upload from the Documents page
   - Note down the document IDs

3. **Get Document IDs**: Run this query in Supabase SQL Editor:
   ```sql
   SELECT id, file_name, user_id 
   FROM documents 
   WHERE is_deleted = false 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

---

## Test 1: Document Lock Banner Integration

### Steps:
1. **As User A**:
   - Go to Documents page
   - Click on any document to open the DocumentViewer
   - **Expected**: You should see the DocumentLockBanner component below the header
   - **Expected**: Banner shows "No active lock" or lock status if document is locked

2. **Click "Check Out"** in the banner:
   - Select lock duration (e.g., 30 minutes)
   - Add reason: "Testing lock banner"
   - Click "Check Out"
   - **Expected**: Banner updates to show "You have this document checked out"
   - **Expected**: Shows lock expiration time

3. **As User B** (different browser):
   - Open the same document
   - **Expected**: Banner shows "This document is currently locked"
   - **Expected**: Shows User A's email as the lock holder
   - **Expected**: "Request Access" button is visible

4. **Click "Request Access"** (as User B):
   - Enter message: "Need to review this ASAP"
   - Click "Request Access"
   - **Expected**: Success toast appears
   - **Expected**: User A receives a notification

5. **As User A**:
   - Check the bell icon in navigation
   - **Expected**: Unread count shows "1"
   - Click bell icon
   - **Expected**: Notification says "User B requested access to your locked document"
   - **Expected**: Shows the message "Need to review this ASAP"

6. **Release Lock** (as User A):
   - In the document viewer, click "Release Lock"
   - **Expected**: Banner updates to "No active lock"
   - **Expected**: Both users can now see document is unlocked

### How to Verify:
- Open browser console (F12)
- Check for any errors
- Verify notification count updates immediately
- Verify banner updates without page refresh

---

## Test 2: Lock Status Check Before Delete

### Steps:
1. **As User A**:
   - Check out a document from Documents page
   - Lock duration: 30 minutes
   - Reason: "Testing delete prevention"

2. **Try to delete the locked document**:
   - Right-click document in grid/list view
   - Click "Delete" or trash icon
   - **Expected**: Toast error: "Cannot delete - This document is currently checked out by [your email]"
   - **Expected**: Document is NOT deleted

3. **As User B** (different browser):
   - Try to delete the same document (locked by User A)
   - **Expected**: Toast error: "Cannot delete - This document is currently checked out by [User A email]"
   - **Expected**: Document is NOT deleted

4. **Release lock** (as User A):
   - Go to Check In/Out dashboard
   - Click "Check In" for the document
   - **Expected**: Lock is released

5. **Try delete again** (as either user):
   - Delete the document
   - **Expected**: Success! Document moves to recycle bin
   - **Expected**: Toast: "Moved to recycle bin"

### How to Verify:
```sql
-- Check if document was soft deleted
SELECT id, file_name, is_deleted, deleted_at 
FROM documents 
WHERE id = 'YOUR_DOCUMENT_ID';

-- Should show is_deleted = true only after lock was released
```

---

## Test 3: Expired Lock Auto-Release

### Steps:
1. **Create a short lock**:
   - As User A, check out a document
   - Duration: 1 minute
   - Reason: "Testing expiration"

2. **Wait 1-2 minutes** for lock to expire

3. **Check lock status**:
   ```sql
   SELECT * 
   FROM document_locks 
   WHERE document_id = 'YOUR_DOCUMENT_ID' 
   ORDER BY checked_out_at DESC 
   LIMIT 1;
   ```
   - **Expected**: `lock_expires_at` is in the past

4. **Try to check out again** (as User A or B):
   - Go to Documents page
   - Try to check out the same document
   - **Expected**: NO error about existing lock
   - **Expected**: System automatically marks old lock as inactive
   - **Expected**: New checkout succeeds

5. **Verify in database**:
   ```sql
   SELECT id, is_active, lock_expires_at 
   FROM document_locks 
   WHERE document_id = 'YOUR_DOCUMENT_ID' 
   ORDER BY checked_out_at DESC 
   LIMIT 2;
   ```
   - **Expected**: Old lock has `is_active = false`
   - **Expected**: New lock has `is_active = true`

### How to Verify:
- Check browser console for "Expired lock detected" message
- Verify no 500 errors occur
- Confirm checkout completes successfully

---

## Test 4: Force Unlock (Document Owner Only)

### Steps:
1. **As User A (document owner)**:
   - Check out a document you own
   - Duration: 1 hour
   - Reason: "Testing force unlock"

2. **As User B** (different browser):
   - Go to Check In/Out Dashboard
   - Find the document locked by User A
   - **Expected**: NO "Force Unlock" button is visible
   - **Expected**: Only User A (document owner) can force unlock

3. **As User A** (document owner):
   - Go to Check In/Out Dashboard
   - Find your locked document
   - **Expected**: "Force Unlock" button IS visible
   - Click "Force Unlock"
   - Confirm action
   - **Expected**: Lock is released immediately
   - **Expected**: Success toast appears

4. **Verify in database**:
   ```sql
   SELECT document_id, locked_by, is_active, force_unlocked 
   FROM document_locks 
   WHERE document_id = 'YOUR_DOCUMENT_ID' 
   AND force_unlocked = true;
   ```
   - **Expected**: Shows the force unlocked record

### How to Verify:
- Only document owner sees "Force Unlock" button
- Lock holder who is NOT owner does NOT see button
- Force unlock works immediately without errors

---

## Test 5: Notification Count Fix

### Steps:
1. **Generate multiple notifications**:
   - As User B, request access to 3 different locked documents
   - Each request creates a notification for User A

2. **As User A**:
   - Check bell icon
   - **Expected**: Badge shows "3"

3. **Mark all as read**:
   - Click bell icon to open notification panel
   - Click "Mark all as read" button
   - **Expected**: Success toast appears

4. **CRITICAL CHECK - Open browser console (F12)**:
   - Look for these console logs:
     - `📧 Marking all notifications as read...`
     - `📧 Marked as read: 3 notifications`
     - `📧 Fetched notifications: 3 Unread: 0`
     - `📧 Refetch complete, new unread count should be 0`

5. **Verify UI updates**:
   - **Expected**: Badge disappears or shows "0"
   - **Expected**: All notifications now have gray background (read state)
   - Close and reopen notification panel
   - **Expected**: Badge still shows "0"

6. **Refresh page**:
   - Press F5 to refresh
   - **Expected**: Badge still shows "0" (persistent fix)

### How to Verify:
```sql
-- Check notification read status in database
SELECT id, notification_type, is_read, created_at 
FROM lock_notifications 
WHERE notified_user_id = 'USER_A_ID' 
ORDER BY created_at DESC 
LIMIT 10;

-- Should show all is_read = true after marking all
```

### If count still shows after marking all:
1. Check browser console for errors
2. Verify database was actually updated (run SQL above)
3. Check if there are new notifications arriving during test
4. Try marking single notification as read instead of all

---

## Test 6: Ownership Transfer Visibility

### Steps:
1. **Get document info**:
   ```sql
   -- Note the document ID and current owner
   SELECT id, file_name, user_id 
   FROM documents 
   WHERE id = 'YOUR_DOCUMENT_ID';
   ```

2. **As User A (current owner)**:
   - Go to Check In/Out Dashboard
   - Find a document you own
   - Click "Transfer Ownership"
   - Search for User B by email
   - Reason: "Transferring for testing"
   - Click "Initiate Transfer"
   - **Expected**: Success toast
   - **Expected**: Transfer appears in "Pending Outgoing Transfers" (amber card)

3. **As User B** (recipient):
   - Go to Check In/Out Dashboard
   - **Expected**: Transfer appears in "Pending Incoming Transfers" (blue card)
   - Shows transfer from User A
   - Click "Accept"
   - **Expected**: Success toast

4. **CRITICAL - Verify ownership changed**:
   ```sql
   SELECT id, file_name, user_id 
   FROM documents 
   WHERE id = 'YOUR_DOCUMENT_ID';
   ```
   - **Expected**: `user_id` NOW equals User B's ID (changed from User A)

5. **Check document visibility**:
   - As User A: Go to Documents page
   - **Expected**: Document NO LONGER appears in your list
   - As User B: Go to Documents page
   - **Expected**: Document NOW appears in your list

6. **If document still visible to User A or not visible to User B**:
   - There may be an RLS (Row Level Security) policy issue
   - Run this to check RLS policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'documents';
   ```

### Debug Commands if Ownership Transfer Fails:

```sql
-- Check if RPC function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'accept_ownership_transfer';

-- Manually test the function
SELECT accept_ownership_transfer('TRANSFER_ID_HERE');

-- Check if user_id actually changed
SELECT id, file_name, user_id, updated_at 
FROM documents 
WHERE id = 'DOCUMENT_ID' 
ORDER BY updated_at DESC;

-- Check transfer history
SELECT * 
FROM document_ownership_transfers 
WHERE document_id = 'DOCUMENT_ID' 
ORDER BY created_at DESC;
```

### Temporary Fix if RLS is blocking:
```sql
-- ONLY FOR TESTING - Disable RLS temporarily
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Test ownership transfer again
-- Re-enable RLS after testing
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
```

---

## Test 7: Grammar Fix for Expired Locks

### Steps:
1. **Check out a document** with 1 minute duration

2. **Immediately open document viewer**:
   - **Expected**: Banner text says "Lock **expires** in 1 minute"
   - (Future tense - correct)

3. **Wait for lock to expire** (1-2 minutes)

4. **Refresh document viewer**:
   - **Expected**: Banner text says "Lock **expired** 2 minutes ago"
   - (Past tense - correct)
   - **NOT**: "Lock expires 2 minutes ago" ❌

### How to Verify:
- Future locks: "Lock expires in X minutes"
- Past locks: "Lock expired X minutes ago"
- Grammar matches the time direction

---

## Test 8: Self-Transfer Prevention

### Steps:
1. **As User A**:
   - Go to Check In/Out Dashboard
   - Click "Transfer Ownership" on your document
   - Try to select your own email as recipient
   - **Expected**: Error toast: "You cannot transfer ownership to yourself"
   - **Expected**: Transfer is NOT created

### How to Verify:
```sql
-- Should NOT see any transfers where from_user_id = to_user_id
SELECT * 
FROM document_ownership_transfers 
WHERE from_user_id = to_user_id;

-- Should return 0 rows
```

---

## Test 9: Cancel Outgoing Transfer

### Steps:
1. **As User A**:
   - Initiate a transfer to User B
   - Go to Check In/Out Dashboard
   - Find the transfer in "Pending Outgoing Transfers" (amber card)
   - Click "Cancel Transfer"
   - Confirm cancellation
   - **Expected**: Success toast
   - **Expected**: Transfer disappears from outgoing transfers

2. **As User B**:
   - Go to Check In/Out Dashboard
   - **Expected**: Transfer NO LONGER appears in incoming transfers
   - **Expected**: Notification shows "Transfer was cancelled by User A"

3. **Verify in database**:
   ```sql
   SELECT id, status, cancelled_by_user_id 
   FROM document_ownership_transfers 
   WHERE id = 'TRANSFER_ID';
   ```
   - **Expected**: `status = 'cancelled'`
   - **Expected**: `cancelled_by_user_id = User A's ID`

---

## Common Issues & Solutions

### Issue 1: "ERROR: 22P02: invalid input syntax for type uuid"
**Problem**: You used literal "DOCUMENT_ID" text instead of actual UUID

**Solution**: Replace with real UUID from database:
```sql
-- Get real document IDs first
SELECT id, file_name FROM documents LIMIT 5;

-- Then use actual UUID (looks like: '123e4567-e89b-12d3-a456-426614174000')
SELECT * FROM document_locks WHERE document_id = '123e4567-e89b-12d3-a456-426614174000';
```

### Issue 2: Notification count won't reset
**Solution**: 
1. Open browser console (F12)
2. Click "Mark all as read"
3. Check for console logs (should see 📧 emojis)
4. If no logs appear, there's a JavaScript error
5. Verify database update:
   ```sql
   UPDATE lock_notifications 
   SET is_read = true 
   WHERE notified_user_id = 'YOUR_USER_ID';
   ```

### Issue 3: Document still visible after transfer
**Solution**:
1. Check if RPC function was called:
   ```sql
   SELECT * FROM document_ownership_transfers 
   WHERE status = 'accepted' 
   ORDER BY updated_at DESC 
   LIMIT 5;
   ```
2. Manually check document owner:
   ```sql
   SELECT user_id FROM documents WHERE id = 'DOCUMENT_ID';
   ```
3. If user_id didn't change, RLS might be blocking the update
4. Temporarily disable RLS for testing (see Test 6)

### Issue 4: Force Unlock button doesn't show for owner
**Solution**:
- Clear browser cache and refresh
- Verify you are actually the document owner:
  ```sql
  SELECT d.id, d.file_name, d.user_id, u.email
  FROM documents d
  JOIN auth.users u ON d.user_id = u.id
  WHERE d.id = 'DOCUMENT_ID';
  ```
- Check browser console for errors in CheckInOutDashboard component

---

## Success Criteria

✅ All tests should pass without errors  
✅ No 500 Internal Server Errors  
✅ UI updates reflect database state  
✅ Notifications display and update correctly  
✅ Lock checks prevent unauthorized operations  
✅ Ownership transfers actually change document.user_id  
✅ Grammar is correct for expired vs future locks  
✅ Force unlock only shows for document owners  

---

## Getting Help

If tests fail:
1. Check browser console for JavaScript errors
2. Check backend terminal for Python errors
3. Run SQL queries to verify database state
4. Check RLS policies if permissions seem wrong
5. Verify both frontend and backend are running
6. Clear browser cache and try incognito mode

**Backend API**: http://localhost:8000  
**Frontend**: http://localhost:4173  
**Supabase Dashboard**: https://nvdkgfptnqardtxlqoym.supabase.co

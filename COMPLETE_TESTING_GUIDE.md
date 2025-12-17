# 🧪 Complete Testing Guide: Check-In/Out & Transfers Features

## 📋 Prerequisites

Before testing, ensure:
- ✅ Backend server is running (port 8000)
- ✅ Frontend is running (port 4173 or dev server)
- ✅ All 6 migrations have been run in Supabase:
  1. `20251217000001_create_checkinout_transfers.sql`
  2. `20251217000002_add_from_user_email.sql`
  3. `20251217000003_fix_recursive_trigger.sql`
  4. `20251217000004_add_user_lookup_function.sql`
  5. `20251217000005_add_get_user_email_function.sql`
  6. `20251217000006_allow_reading_locked_documents.sql`
- ✅ At least 2 user accounts created for testing
- ✅ At least 2-3 test documents uploaded

---

## 🧩 PART 1: CHECK-IN/OUT FEATURE TESTING

### Test 1: Basic Document Lock/Unlock

**Steps:**
1. Navigate to SimplifyDrive (`/documents`)
2. Find a document and click the "Check Out" button
3. In the Check Out Dialog:
   - Select duration: "1 hour"
   - Add reason: "Testing lock feature"
   - Click "Check Out"

**Expected Result:**
- ✅ Document should be locked
- ✅ Success toast appears: "Document checked out successfully"
- ✅ Document card shows "Checked Out" badge
- ✅ Other users can only view (not edit) this document

**Test Check-In:**
4. Go to "Check In/Out" tab in top navigation
5. Under "My Checkouts", find your locked document
6. Click "Check In" button

**Expected Result:**
- ✅ Document is unlocked
- ✅ Success toast: "Document checked in successfully"
- ✅ Document disappears from "My Checkouts"
- ✅ Now available for others to check out

---

### Test 2: Lock Expiration

**Steps:**
1. Check out a document with "30 minutes" duration
2. Go to Check In/Out dashboard
3. Observe the "Expires in" time

**Expected Result:**
- ✅ Shows correct countdown (e.g., "in 29 minutes")
- ✅ "Expiring Soon" badge appears when < 10 minutes remaining
- ✅ After 30 minutes, lock auto-expires
- ✅ Document becomes available again

---

### Test 3: Lock Extension

**Steps:**
1. Check out a document with "1 hour" duration
2. Go to Check In/Out dashboard → "My Checkouts"
3. Click "Extend" button

**Expected Result:**
- ✅ Success toast: "Your checkout has been extended by 2 hours"
- ✅ Expiration time updates (+2 hours)
- ✅ Lock remains active

---

### Test 4: Force Unlock (as Document Owner)

**Steps:**
1. As User A, check out Document 1
2. Stay logged in as User A
3. Go to Check In/Out → "All Checkouts"
4. Find your own locked document
5. Click "Force Unlock" button

**Expected Result:**
- ✅ "Force Unlock" button is visible (even for your own lock)
- ✅ Success toast: "Document force unlocked"
- ✅ Document becomes available immediately
- ✅ No longer appears in "My Checkouts"

---

### Test 5: View Locked Documents (Other Users)

**Steps:**
1. As User A, check out Document 1
2. **Switch to User B account** (different browser/incognito)
3. Go to Check In/Out → "All Checkouts" tab
4. Find Document 1

**Expected Result:**
- ✅ Shows **correct document name** (not "Unknown Document")
- ✅ Shows **User A's email** (not "Unknown User")
- ✅ Shows lock reason if provided
- ✅ Shows expiration time

---

### Test 6: Duplicate Checkout Prevention

**Steps:**
1. As User A, check out Document 1
2. Try to check out Document 1 again (click Check Out button)

**Expected Result:**
- ✅ Error toast appears: "Already Checked Out"
- ✅ Message: "You have already checked out this document. Go to Check In/Out tab..."
- ✅ Dialog closes automatically
- ✅ No duplicate lock created

---

### Test 7: 🆕 Request Access to Locked Document

**Steps:**
1. As User A, check out Document 1 with reason "Editing financial data"
2. **Switch to User B**
3. Navigate to the locked Document 1
4. You should see a lock banner saying "This document is locked"
5. Click "Request Access" button
6. In the dialog:
   - Message: "Need to review urgently, please release"
   - Click "Send Request"

**Expected Result:**
- ✅ Success toast: "Access request sent to document owner"
- ✅ Dialog closes
- ✅ **Switch back to User A**
- ✅ Click bell icon 🔔 in navigation bar
- ✅ See notification: "Access Request" 
- ✅ Notification shows User B's message
- ✅ Red badge shows unread count

---

### Test 8: 🆕 Lock Notifications

**Steps:**
1. As User A, ensure you have some lock notifications from Test 7
2. Click bell icon 🔔 in top navigation
3. Review notifications panel

**Expected Result:**
- ✅ Shows all notifications (lock acquired, released, access requested)
- ✅ Unread notifications have blue background and checkmark
- ✅ Click notification → marks as read (background changes)
- ✅ "Mark all read" button works
- ✅ Real-time: New notifications appear instantly
- ✅ Unread count badge updates automatically

---

## 🔄 PART 2: OWNERSHIP TRANSFERS TESTING

### Test 9: Basic Transfer Request

**Steps:**
1. As User A (owner of Document 1)
2. Go to Documents page
3. Click "Transfer" button on Document 1
4. In Transfer Dialog:
   - Recipient Email: User B's email
   - Message: "Transferring ownership for your project"
   - Click "Send Transfer Request"

**Expected Result:**
- ✅ Success toast: "Transfer request sent"
- ✅ Dialog closes
- ✅ Go to "Transfers" tab
- ✅ Under "Pending Outgoing Transfers", see your request

---

### Test 10: 🆕 View and Cancel Outgoing Transfer

**Steps:**
1. Continue from Test 9 (as User A)
2. Stay on "Transfers" tab
3. Under "Pending Outgoing Transfers" section (🆕 **NEW FEATURE**)
4. Find your transfer to User B
5. Click "Cancel Transfer" button

**Expected Result:**
- ✅ **"Pending Outgoing Transfers" card appears** (amber/yellow colored)
- ✅ Shows recipient email and message
- ✅ Shows time elapsed since request
- ✅ "Cancel Transfer" button visible
- ✅ After clicking: Success toast "Transfer cancelled"
- ✅ Transfer moves to history with "Cancelled" status
- ✅ Disappears from pending outgoing section

---

### Test 11: Accept Transfer

**Steps:**
1. As User A, send another transfer to User B (see Test 9)
2. **Switch to User B account**
3. Go to "Transfers" tab
4. Under "Pending Transfers" (blue card)
5. Click "Accept" button

**Expected Result:**
- ✅ Success toast: "Transfer accepted"
- ✅ Document ownership changes to User B
- ✅ Transfer disappears from pending
- ✅ Appears in "Transfer History" with "Accepted" badge
- ✅ **Switch to User A** → Document no longer in "My Documents"

---

### Test 12: Reject Transfer

**Steps:**
1. As User A, send transfer to User B
2. **Switch to User B**
3. Go to "Transfers" tab
4. Under "Pending Transfers"
5. Click "Decline" button

**Expected Result:**
- ✅ Toast: "Transfer rejected"
- ✅ Transfer disappears from pending
- ✅ Appears in history with "Rejected" badge (red)
- ✅ Ownership remains with User A

---

### Test 13: Transfer Validation (Self-Transfer)

**Steps:**
1. As User A, try to transfer Document 1
2. Enter User A's own email (your email)
3. Try to send

**Expected Result:**
- ✅ Error toast: "No user found with email..." OR transfer creates but...
- ✅ Cannot accept own transfer
- ✅ If you try to accept: Error "You cannot accept a transfer you initiated"

---

### Test 14: Transfer to Non-Existent User

**Steps:**
1. As User A, click Transfer on Document 1
2. Enter email: "nonexistent@example.com"
3. Click "Send Transfer Request"

**Expected Result:**
- ✅ Error toast: "User not found"
- ✅ Message: "No user found with email... They may need to sign up first"
- ✅ Transfer not created

---

### Test 15: Transfer History Display

**Steps:**
1. Complete several transfers (accepted, rejected, cancelled)
2. Go to "Transfers" tab
3. Scroll to "Transfer History" section

**Expected Result:**
- ✅ Shows last 10 transfers
- ✅ Each transfer shows:
  - Recipient email
  - Time ago
  - Status badge (Accepted=green, Rejected=red, Cancelled=grey)
- ✅ Sorted by most recent first

---

## 🎨 PART 3: UI/UX TESTING

### Test 16: Summary Tabs Colored

**Steps:**
1. Upload a document
2. Click "Summary" or navigate to document summary
3. Observe the summary type tabs (Brief, Detailed, Executive, etc.)

**Expected Result:**
- ✅ **Brief** tab: Blue background
- ✅ **Detailed** tab: Green background
- ✅ **Executive** tab: Purple background
- ✅ **Bullet Points** tab: Amber/Orange background
- ✅ **Action Items** tab: Red background
- ✅ Active tab shows primary color
- ✅ Inactive tabs show colored background

---

### Test 17: Markdown Rendering in Summaries

**Steps:**
1. Generate an AI summary (Brief or Detailed)
2. Observe the summary text

**Expected Result:**
- ✅ **Bold text** renders as bold (not `**text**`)
- ✅ Bullet points formatted correctly
- ✅ Headings render properly
- ✅ No visible markdown syntax (`*`, `**`, `#`)

---

### Test 18: Responsive Button Text

**Steps:**
1. Go to Documents page
2. Resize browser window to mobile size (< 640px)
3. Observe document action buttons

**Expected Result:**
- ✅ On mobile: Buttons show icons only
- ✅ On desktop: Buttons show icon + text
- ✅ All buttons remain visible (no overflow)
- ✅ Tooltips work on icon-only buttons

---

## 🔔 PART 4: REAL-TIME FEATURES

### Test 19: Real-Time Notifications

**Steps:**
1. Open app in two browser windows (User A and User B)
2. As User B, check out a document
3. As User A, try to access that document
4. As User A, click "Request Access"
5. **Observe User B's screen**

**Expected Result:**
- ✅ User B's bell icon updates immediately (badge count increases)
- ✅ Toast notification appears for User B: "Access Request"
- ✅ No page refresh needed

---

### Test 20: Lock Status Updates

**Steps:**
1. User A checks out Document 1
2. User B views "All Checkouts" tab
3. User A checks in Document 1
4. **User B refreshes "All Checkouts"**

**Expected Result:**
- ✅ Document 1 disappears from User B's list
- ✅ Total checkout count updates
- ✅ Stats card reflects current state

---

## 🚨 ERROR HANDLING

### Test 21: Backend Offline

**Steps:**
1. Stop backend server
2. Try to check out a document

**Expected Result:**
- ✅ Error toast appears
- ✅ User-friendly message (not raw error)
- ✅ Button returns to enabled state

---

### Test 22: Network Error During Transfer

**Steps:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to initiate a transfer
4. Restore network

**Expected Result:**
- ✅ Error toast: "Failed to send transfer request"
- ✅ Dialog remains open (can retry)
- ✅ No data lost

---

## ✅ VERIFICATION CHECKLIST

After all tests, verify:

**Check-In/Out:**
- [ ] Can lock and unlock documents
- [ ] Lock expiration works
- [ ] Lock extension adds 2 hours
- [ ] Force unlock available to all users
- [ ] Document names show correctly (not "Unknown Document")
- [ ] User emails show correctly (not "Unknown User")
- [ ] Duplicate checkout prevented
- [ ] Request Access sends notification ✨
- [ ] Notifications bell works ✨
- [ ] Real-time notification updates ✨

**Transfers:**
- [ ] Can initiate transfers
- [ ] Can accept transfers
- [ ] Can reject transfers
- [ ] Can cancel outgoing transfers ✨
- [ ] Pending outgoing section visible ✨
- [ ] Email validation works
- [ ] Self-transfer prevented
- [ ] Transfer history shows correctly
- [ ] Status badges colored correctly

**UI/UX:**
- [ ] Summary tabs are colored ✨
- [ ] Markdown renders as HTML ✨
- [ ] Buttons responsive on mobile
- [ ] Notifications bell in navigation ✨
- [ ] No console errors
- [ ] All migrations applied

---

## 🐛 TROUBLESHOOTING

**Issue: "Unknown Document" still showing**
- Solution: Run migration #6 (`20251217000006_allow_reading_locked_documents.sql`)

**Issue: "Unknown User" showing**
- Solution: Run migration #5 (`20251217000005_add_get_user_email_function.sql`)

**Issue: Notifications not appearing**
- Check: Supabase Realtime enabled in project settings
- Check: Browser console for WebSocket errors
- Refresh page and try again

**Issue: Request Access button missing**
- Check: `documentId` prop passed to DocumentLockBanner
- Check: useLockNotifications hook imported correctly

**Issue: Cancel Transfer button not visible**
- Check: pendingOutgoing state in useOwnershipTransfer hook
- Check: User has pending outgoing transfers
- Refresh "Transfers" tab

**Issue: Markdown still showing as plain text**
- Clear browser cache
- Check: react-markdown and remark-gfm installed
- Check: ReactMarkdown component imported

---

## 📊 TESTING MATRIX

| Feature | User A | User B | Expected Outcome |
|---------|--------|--------|------------------|
| Check Out | ✅ Locks | ❌ Can't edit | Lock works |
| View Lock | Shows "You" | Shows User A email | Correct display |
| Request Access | N/A | ✅ Requests | Notification sent |
| Transfer | ✅ Sends | ✅ Receives | Transfer pending |
| Cancel Transfer | ✅ Cancels | N/A | Transfer cancelled |
| Accept Transfer | N/A | ✅ Accepts | Ownership changes |

---

## 🎉 SUCCESS CRITERIA

All features are working if:
1. ✅ Can complete full check-out/check-in cycle
2. ✅ Lock information displays correctly for all users
3. ✅ Request access sends notifications
4. ✅ Notifications appear in real-time
5. ✅ Can cancel pending outgoing transfers
6. ✅ Can complete full transfer accept/reject cycle
7. ✅ UI elements are properly colored
8. ✅ Markdown renders correctly
9. ✅ No "Unknown" placeholders anywhere
10. ✅ Mobile responsive design works

✨ **NEW FEATURES MARKED WITH ✨ ARE READY FOR TESTING!**

# Checkout Requests End-to-End Testing Guide

## Overview
This guide explains how to test the complete guest checkout request workflow and verify admin visibility.

---

## Complete Workflow

### 1. **Guest Shares / Share Links Creation** (Document Owner)

#### Option A: Email-Based Guest Share
1. Log in as document owner
2. Navigate to Documents → Select a document
3. Click "Share" → Choose "Guest Share"
4. Enter guest email and select permission level (view/comment/download)
5. Click "Share Document"
6. Guest receives email with access link

#### Option B: Share Link
1. Log in as document owner
2. Navigate to Documents → Select a document  
3. Click "Share" → Choose "Share Link"
4. Configure:
   - Permission: View/Comment/Download (NOT edit)
   - Expiration (optional)
   - Password protection (optional)
   - Download restrictions
5. Copy the generated link
6. Share the link with guests

---

### 2. **Guest Accessing Shared Document**

#### From Email (Guest Share)
1. Guest opens email notification
2. Clicks on the access link (format: `/s/{token}` or `/guest/{token}`)
3. Lands on GuestAccessPage with document info
4. Can view document but cannot edit (permission is view/comment/download)

#### From Share Link
1. Guest opens the shared link
2. If password protected, enters password
3. If email-restricted, enters email for verification
4. Lands on GuestAccessPage with document info

---

### 3. **Requesting Edit Access** (Guest User)

1. On GuestAccessPage, guest sees:
   - Document name and details
   - Current permission level (View/Comment/Download)
   - "Request Edit Access" button

2. Guest clicks "Request Edit Access"
3. Dialog opens with:
   - Email field (if anonymous/not logged in)
   - Name field (if anonymous)
   - Optional message field
4. Guest fills in details and clicks "Send Request"

**What Happens Behind the Scenes:**
- Creates entry in `checkout_requests` table with status='pending'
- Document owner receives email notification
- Email contains link to Checkout Requests dashboard

---

### 4. **Reviewing Requests** (Document Owner)

#### Navigate to Checkout Requests Dashboard
1. Log in as document owner
2. Navigate to: `/checkout-requests`
   - **OR** Click link in email notification
   - **OR** From Sidebar → "Checkout Requests"

#### What Owner Sees:
- List of pending requests with:
  - Document name
  - Requester name/email
  - Request message (if provided)
  - Requested time
  - Status badge

#### Approve Request:
1. Click "Approve" button on a request
2. Select duration (1, 2, 4, 8, or 24 hours)
3. Click "Approve Request"

**What Happens:**
- Updates `checkout_requests` table: status='approved', approved_at=now
- Creates entry in `document_locks` table:
  - `guest_email` = requester's email
  - `expires_at` = now + duration
  - `is_active` = true
- Guest receives approval email with "Open Document Editor" button

#### Reject Request:
1. Click "Reject" button on a request
2. Confirms rejection

**What Happens:**
- Updates `checkout_requests` table: status='rejected'
- No document lock is created
- Guest is NOT notified (can be enhanced to send rejection email)

---

### 5. **Guest Editing Document** (After Approval)

#### From Approval Email:
1. Guest opens approval email
2. Clicks "Open Document Editor" button
3. Redirected to share link URL (e.g., `/s/{token}`)

#### On GuestAccessPage:
1. Page automatically detects approved checkout by:
   - Checking `document_locks` table for active lock with guest's email
   - Verifying expiration time
2. Guest now sees:
   - Permission badge changes to "Edit" (green)
   - "Open in Editor" button appears (green)
   - Expiration countdown displayed

3. Guest clicks "Open in Editor"
4. OnlyOffice editor opens in a dialog/modal
5. Guest can edit document in real-time
6. Changes are saved via OnlyOffice callback

---

### 6. **Admin/Owner Visibility** (Check In/Out Dashboard)

#### Accessing Dashboard:
1. Log in as document owner (or admin)
2. Navigate to: `SimplifyDrive` → `Check In/Out` tab
   - **OR** Sidebar → "Check In/Out Dashboard"

#### Dashboard Structure:

**Stats Cards (Top):**
- **My Checkouts**: Documents YOU have checked out (including as guest)
- **Total Checkouts**: All active document locks across the system
- **Expiring Soon**: Locks expiring within 30 minutes
- **Checked In Today**: Documents checked in today

**Tabs:**

1. **My Checkouts Tab**
   - Shows documents YOU have locked (as owner)
   - Shows documents YOU have guest access to (approved checkout requests)
   - Each entry displays:
     - Document name
     - Guest email (if guest checkout)
     - Checkout time
     - Expiration time
     - "Check In" button (to release lock)
     - "Extend" button (to extend duration)

2. **All Checkouts Tab**
   - Shows ALL active document locks in the system
   - Displays:
     - Document name
     - Locker email (who locked it)
     - Guest email (if guest checkout)
     - Document owner
     - Checkout time
     - Expiration time
   - Search/filter functionality
   - Admin can see all guest checkouts here

3. **History Tab**
   - Shows past check-ins/check-outs
   - Filterable by date range
   - Shows who checked out/in and when

---

## Database Verification (For Admins)

### Check Pending Requests:
```sql
SELECT 
    id, 
    document_id, 
    requester_email, 
    requester_name, 
    status, 
    requested_at,
    request_message
FROM checkout_requests 
WHERE status = 'pending'
ORDER BY requested_at DESC;
```

### Check Approved Guest Checkouts:
```sql
SELECT 
    dl.id,
    d.file_name as document,
    dl.guest_email,
    dl.locked_at,
    dl.expires_at,
    dl.is_active
FROM document_locks dl
JOIN documents d ON dl.document_id = d.id
WHERE dl.guest_email IS NOT NULL 
  AND dl.is_active = true
ORDER BY dl.locked_at DESC;
```

### Check All Checkout Requests with Document Names:
```sql
SELECT 
    cr.id,
    d.file_name as document,
    cr.requester_email,
    cr.requester_name,
    cr.status,
    cr.requested_at,
    cr.approved_at,
    cr.expires_at
FROM checkout_requests cr
JOIN documents d ON cr.document_id = d.id
ORDER BY cr.requested_at DESC
LIMIT 20;
```

---

## Testing Checklist

### ✅ Guest Share Flow
- [ ] Create guest share with view-only permission
- [ ] Guest receives email notification
- [ ] Guest can access document via email link
- [ ] Guest sees "Request Edit Access" button
- [ ] Guest can submit edit request
- [ ] Owner receives request notification email

### ✅ Share Link Flow
- [ ] Create share link with view-only permission
- [ ] Share link URL works
- [ ] Guest can access document
- [ ] Guest sees "Request Edit Access" button
- [ ] Guest can submit edit request
- [ ] Owner receives request notification email

### ✅ Request Approval Flow
- [ ] Owner navigates to `/checkout-requests`
- [ ] Pending requests are displayed
- [ ] Owner can approve with custom duration
- [ ] Guest receives approval email
- [ ] Document lock is created in database
- [ ] Guest email is stored in `document_locks.guest_email`

### ✅ Request Rejection Flow
- [ ] Owner can reject a request
- [ ] Request status updates to 'rejected'
- [ ] No document lock is created

### ✅ Guest Editing Flow
- [ ] Guest clicks "Open Document Editor" from approval email
- [ ] Guest lands on share link page
- [ ] Permission badge shows "Edit" (green)
- [ ] "Open in Editor" button is visible
- [ ] Clicking button opens OnlyOffice editor
- [ ] Guest can make edits
- [ ] Expiration time is displayed

### ✅ Admin Dashboard Visibility
- [ ] Navigate to Check In/Out Dashboard
- [ ] Stats cards show correct counts
- [ ] "My Checkouts" tab shows owner's locked documents
- [ ] "My Checkouts" tab shows guest checkouts (if logged in user has guest access)
- [ ] "All Checkouts" tab shows ALL active locks
- [ ] Guest email is visible for guest checkouts
- [ ] Search and filter work correctly
- [ ] History tab shows past activities

### ✅ Expiration Handling
- [ ] Locks auto-expire after set duration
- [ ] Expired locks show as inactive
- [ ] Guest can no longer edit after expiration
- [ ] Dashboard removes expired locks from active view

---

## Common Issues & Troubleshooting

### Issue: "requests.map is not a function"
**Cause:** Backend returns error object instead of array
**Fix:** Applied - frontend now ensures `requests` is always an array

### Issue: "422 Unprocessable Content" on reject
**Cause:** Missing `x-user-id` header
**Fix:** Applied - frontend now sends header correctly

### Issue: Guest can't see "Open in Editor" button
**Cause:** Checkout not approved or expired
**Check:** 
1. Verify `document_locks` has active entry for guest email
2. Check expiration time hasn't passed
3. Confirm `is_active = true`

### Issue: Admin can't see guest checkouts
**Cause:** Database query not including guest email
**Fix:** Already implemented - `fetchAllCheckouts` includes `guest_email` field

---

## API Endpoints Reference

### Create Request
```
POST /api/v1/checkout-requests/request
Body: {
  document_id: string,
  requester_email: string,
  requester_name: string,
  share_id?: string,
  share_link_id?: string,
  request_message?: string
}
```

### Get Pending Requests (Owner)
```
GET /api/v1/checkout-requests/pending
Headers: { x-user-id: <owner_user_id> }
```

### Approve Request
```
POST /api/v1/checkout-requests/approve
Body: {
  request_id: string,
  duration_hours: number
}
```

### Reject Request
```
POST /api/v1/checkout-requests/reject
Headers: { x-user-id: <owner_user_id> }
Body: {
  request_id: string
}
```

---

## Success Criteria

A successful end-to-end flow should result in:

1. ✅ Guest can request edit access from any share link/guest share
2. ✅ Owner receives email notification of request
3. ✅ Owner can approve/reject from dashboard
4. ✅ Guest receives approval email with editor link
5. ✅ Guest can edit document with OnlyOffice editor
6. ✅ Admin can see all guest checkouts in dashboard
7. ✅ Locks auto-expire after set duration
8. ✅ All data is properly stored in database with correct relationships

---

## Notes

- Guest checkouts are tracked via `document_locks.guest_email` field
- Traditional check-in/out (for private documents) has been removed
- Only guest shares and share links can trigger checkout requests
- Expiration is enforced both in backend and frontend
- Admin can see ALL checkouts in "All Checkouts" tab
- Owners can extend checkout duration if needed

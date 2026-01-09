# Checkout Request Feature Implementation

## ✅ What's Been Implemented

### 1. Database Schema ✓
**File:** `supabase/migrations/20260109000000_create_checkout_requests.sql`

- Created `checkout_requests` table
- Added `guest_email` column to `document_locks` table
- Set up RLS policies for security
- Created helper functions for auto-expiration

### 2. Backend API ✓
**File:** `backend/app/api/checkout_requests.py`

Endpoints created:
- `POST /api/v1/checkout-requests/request` - Create checkout request
- `POST /api/v1/checkout-requests/approve` - Approve request
- `POST /api/v1/checkout-requests/reject` - Reject request
- `GET /api/v1/checkout-requests/pending` - Get pending requests (for owners)
- `GET /api/v1/checkout-requests/my-requests` - Get user's requests (for guests)

Features:
- Email notifications to document owners
- Email notifications to requesters on approval
- Document lock creation on approval
- 24-hour default access duration
- Request validation and duplicate checking

### 3. Frontend Components ✓

**RequestCheckoutButton** (`src/components/checkout-requests/RequestCheckoutButton.tsx`)
- Button for guests to request edit access
- Dialog with message input
- Loading states and error handling

**CheckoutRequestsPage** (`src/pages/CheckoutRequestsPage.tsx`)
- Dashboard for document owners
- List of pending requests
- Approve/Reject actions
- Real-time status updates

---

## 🔄 Integration Points (Next Steps)

### Step 1: Apply Database Migration
```bash
# In Supabase Studio or via CLI
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/20260109000000_create_checkout_requests.sql
```

### Step 2: Add Route to Router
**File:** `src/App.tsx` or your routing file

```tsx
import { CheckoutRequestsPage } from '@/pages/CheckoutRequestsPage';

// Add route:
<Route path="/checkout-requests" element={<CheckoutRequestsPage />} />
```

### Step 3: Integrate Request Button in Guest Share View

**Where to add:** When a guest user views a shared document with `can_view`/`can_comment`/`can_download` permissions but NOT `can_edit`.

Example integration in your guest document view:

```tsx
import { RequestCheckoutButton } from '@/components/checkout-requests/RequestCheckoutButton';

// In your guest document component:
{!canEdit && (
  <RequestCheckoutButton
    documentId={documentId}
    documentName={documentName}
    shareId={shareId}
    userEmail={guestEmail}
    userName={guestName}
  />
)}
```

### Step 4: Add Navigation Link

Add to your navigation menu:

```tsx
<NavLink to="/checkout-requests" className="flex items-center gap-2">
  <Lock className="h-4 w-4" />
  Checkout Requests
  {pendingCount > 0 && (
    <Badge variant="destructive">{pendingCount}</Badge>
  )}
</NavLink>
```

### Step 5: Connect to OnlyOffice Editor

When a request is approved, the guest user can access the editor through the link sent in the email. You need to:

1. **Check for active checkout lock** before loading OnlyOffice
2. **Verify guest_email matches** the current user
3. **Enable editor mode** if approved

Example check in your document editor component:

```tsx
// Check if user has approved checkout
const checkGuestEditAccess = async () => {
  const lock = await fetch(`/api/v1/checkinout/status?document_id=${docId}`);
  const lockData = await lock.json();
  
  if (lockData.is_locked && lockData.lock_info.guest_email === userEmail) {
    // User has approved access - load editor in edit mode
    setEditorMode('edit');
  } else {
    // View-only mode
    setEditorMode('view');
  }
};
```

---

## 📧 Email Templates Configured

### 1. Checkout Request Email (to Owner)
- Subject: "Edit Request: {document_name}"
- Content: Requester details, message, and approval link
- Action button: Opens checkout requests page

### 2. Approval Email (to Requester)
- Subject: "Edit Access Granted: {document_name}"
- Content: Access duration info and editor link
- Action button: Opens OnlyOffice editor

---

## 🔐 Security Features

- ✅ RLS policies ensure users only see relevant requests
- ✅ Document ownership verified before approval
- ✅ Duplicate request prevention
- ✅ Auto-expiration of old requests (7 days)
- ✅ Checkout locks auto-expire after duration
- ✅ Email validation for guest users

---

## 📊 Workflow Diagram

```
Guest User                 System                    Owner
    |                        |                         |
    |--Request Edit--------->|                         |
    |                        |--Email Notification---->|
    |                        |                         |
    |                        |<-----Approve/Reject-----|
    |<--Approval Email-------|                         |
    |                        |                         |
    |--Open Editor--------->|                         |
    |                        |--Create Lock----------->|
    |<--Edit Access---------|                         |
    |                        |                         |
    | (24 hours later)       |                         |
    |                        |--Auto Check-in--------->|
    |--Access Expired--------|                         |
```

---

## 🎯 Testing Checklist

- [ ] Apply database migration
- [ ] Test creating checkout request
- [ ] Verify owner receives email
- [ ] Test approving request
- [ ] Verify guest receives approval email
- [ ] Test OnlyOffice editor opens with edit access
- [ ] Verify checkout lock expires after 24 hours
- [ ] Test rejecting request
- [ ] Test duplicate request prevention
- [ ] Test with share links (not just email shares)

---

## 📝 Notes

- Default checkout duration: **24 hours** (can be customized in approve endpoint)
- Request auto-expiration: **7 days** for pending requests
- Guest users identified by **email address** (not user ID)
- Works with both **email-based shares** and **share links**

---

## 🚀 Next Steps

1. Run database migration
2. Add routing for CheckoutRequestsPage
3. Integrate RequestCheckoutButton in guest views
4. Connect approved access to OnlyOffice editor
5. Test end-to-end workflow
6. Consider adding notifications/badges for pending requests

---

## 🛠️ Files Modified/Created

**Backend:**
- ✅ `supabase/migrations/20260109000000_create_checkout_requests.sql`
- ✅ `backend/app/api/checkout_requests.py`
- ✅ `backend/app/main.py` (router registration)

**Frontend:**
- ✅ `src/components/checkout-requests/RequestCheckoutButton.tsx`
- ✅ `src/pages/CheckoutRequestsPage.tsx`

**Pending Integration:**
- ⏳ Guest share view pages (add button)
- ⏳ Share link pages (add button)
- ⏳ Navigation menu (add link)
- ⏳ OnlyOffice editor (check guest access)
- ⏳ App routing (add page route)

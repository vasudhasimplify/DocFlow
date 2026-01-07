# Check In/Out & Transfers Feature Implementation Plan

## Executive Summary

Both features have **frontend UI components already built** but are **missing backend support**:
- ✅ Frontend components exist and are well-designed
- ❌ Database tables don't exist (not in migrations)
- ❌ Backend API endpoints don't exist
- ❌ Frontend is trying to query non-existent tables

---

## 1. Check In/Out Feature

### Current State

**Frontend Status:** ✅ Fully Built
- Component: `src/components/checkinout/CheckInOutDashboard.tsx` (676 lines)
- Features implemented:
  - My checkouts tab
  - All checkouts tab (team view)
  - History tab
  - Stats display (checked out count, expiring soon)
  - Check in/check out functionality
  - Search and filtering
  - Real-time updates

**Backend Status:** ❌ Missing Completely
- No `document_locks` table in database
- No `lock_notifications` table
- No API endpoints in FastAPI backend

### What's Needed

#### 1.1 Database Schema (Supabase Migration)

Create migration: `supabase/migrations/20251217000001_create_checkinout_tables.sql`

```sql
-- Create document_locks table
CREATE TABLE IF NOT EXISTS public.document_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES auth.users(id),
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lock_reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  unlocked_by UUID REFERENCES auth.users(id),
  unlock_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_locks_document_id ON public.document_locks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_locks_locked_by ON public.document_locks(locked_by);
CREATE INDEX IF NOT EXISTS idx_document_locks_active ON public.document_locks(is_active, locked_at DESC);

-- RLS Policies
ALTER TABLE public.document_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all locks" 
  ON public.document_locks FOR SELECT 
  USING (true);

CREATE POLICY "Users can create locks for documents they own" 
  ON public.document_locks FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM documents WHERE id = document_id
    )
  );

CREATE POLICY "Users can update their own locks" 
  ON public.document_locks FOR UPDATE 
  USING (auth.uid() = locked_by);

-- Create lock_notifications table
CREATE TABLE IF NOT EXISTS public.lock_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  lock_id UUID NOT NULL REFERENCES public.document_locks(id) ON DELETE CASCADE,
  notified_user_id UUID NOT NULL REFERENCES auth.users(id),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'lock_acquired', 
    'lock_released', 
    'lock_expired', 
    'force_unlock'
  )),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_lock_notifications_user ON public.lock_notifications(notified_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lock_notifications_document ON public.lock_notifications(document_id);

-- RLS for notifications
ALTER TABLE public.lock_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
  ON public.lock_notifications FOR SELECT 
  USING (auth.uid() = notified_user_id);

CREATE POLICY "System can create notifications" 
  ON public.lock_notifications FOR INSERT 
  WITH CHECK (true);

-- Function to check if document is locked
CREATE OR REPLACE FUNCTION public.is_document_locked(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.document_locks
    WHERE document_id = doc_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get lock holder
CREATE OR REPLACE FUNCTION public.get_lock_holder(doc_id UUID)
RETURNS TABLE (
  lock_id UUID,
  locked_by UUID,
  locked_by_email TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  lock_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.locked_by,
    u.email,
    l.locked_at,
    l.expires_at,
    l.lock_reason
  FROM public.document_locks l
  LEFT JOIN auth.users u ON u.id = l.locked_by
  WHERE l.document_id = doc_id
  AND l.is_active = true
  AND (l.expires_at IS NULL OR l.expires_at > now())
  ORDER BY l.locked_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-expire locks
CREATE OR REPLACE FUNCTION public.expire_old_locks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.document_locks
  SET is_active = false
  WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_expired_locks
  AFTER INSERT OR UPDATE ON public.document_locks
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.expire_old_locks();
```

#### 1.2 Backend API Endpoints

Create file: `backend/app/api/checkinout.py`

**Endpoints needed:**
1. `POST /api/v1/checkinout/checkout` - Lock a document
2. `POST /api/v1/checkinout/checkin` - Unlock a document
3. `POST /api/v1/checkinout/force-unlock` - Force unlock (admin)
4. `GET /api/v1/checkinout/my-locks` - Get current user's locks
5. `GET /api/v1/checkinout/all-locks` - Get all active locks
6. `GET /api/v1/checkinout/document/{document_id}/lock-status` - Check if document is locked
7. `GET /api/v1/checkinout/history` - Get checkout history
8. `GET /api/v1/checkinout/notifications` - Get lock notifications

**Implementation outline:**
```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/v1/checkinout", tags=["check-in-out"])

@router.post("/checkout")
async def checkout_document(
    document_id: str,
    lock_reason: Optional[str] = None,
    duration_hours: Optional[int] = 24,
    user_id: str = Depends(get_current_user)
):
    """Lock a document for editing"""
    # Check if already locked
    # Create lock record
    # Create notification
    # Return lock info

@router.post("/checkin")
async def checkin_document(
    lock_id: str,
    user_id: str = Depends(get_current_user)
):
    """Release document lock"""
    # Verify user owns lock
    # Deactivate lock
    # Create notification
    # Return success

# ... other endpoints
```

#### 1.3 Frontend Updates Required

**Minimal changes needed:**
1. Update Supabase client queries to match actual column names
2. Add error handling for missing data
3. Add loading states
4. Add "Check out this document" button on document cards/views

**Files to update:**
- `src/components/checkinout/CheckInOutDashboard.tsx` - Already 90% complete
- `src/components/document-manager/DocumentGrid.tsx` - Add checkout button
- `src/components/document-manager/DocumentList.tsx` - Add checkout button
- Add lock icon overlay on locked documents

---

## 2. Transfers (Ownership Transfer) Feature

### Current State

**Frontend Status:** ✅ Fully Built
- Component: `src/components/ownership/PendingTransfersPanel.tsx` (174 lines)
- Hook: `src/hooks/useOwnershipTransfer.ts` (193 lines)
- Features implemented:
  - Pending incoming transfers (requires acceptance)
  - Transfer history
  - Accept/reject functionality
  - Transfer initiation
  - Status badges (pending, accepted, rejected, cancelled)

**Backend Status:** ❌ Missing Completely
- No `document_ownership_transfers` table
- No API endpoints in FastAPI backend
- Frontend trying to query non-existent table

### What's Needed

#### 2.1 Database Schema (Supabase Migration)

Add to same migration: `supabase/migrations/20251217000001_create_checkinout_tables.sql`

```sql
-- Create document_ownership_transfers table
CREATE TABLE IF NOT EXISTS public.document_ownership_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 
    'accepted', 
    'rejected', 
    'cancelled', 
    'expired'
  )),
  message TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent multiple pending transfers for same document
  CONSTRAINT unique_pending_transfer UNIQUE (document_id, status) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Remove constraint on status change
CREATE OR REPLACE FUNCTION public.remove_unique_pending_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'pending' THEN
    -- Drop the unique constraint dynamically (handled by application logic)
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_from ON public.document_ownership_transfers(from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_to ON public.document_ownership_transfers(to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_document ON public.document_ownership_transfers(document_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status ON public.document_ownership_transfers(status, created_at DESC);

-- RLS Policies
ALTER TABLE public.document_ownership_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transfers they're involved in" 
  ON public.document_ownership_transfers FOR SELECT 
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Document owners can initiate transfers" 
  ON public.document_ownership_transfers FOR INSERT 
  WITH CHECK (
    auth.uid() = from_user_id AND
    auth.uid() IN (
      SELECT user_id FROM documents WHERE id = document_id
    )
  );

CREATE POLICY "Recipients can update transfer status" 
  ON public.document_ownership_transfers FOR UPDATE 
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Function to accept transfer and update document ownership
CREATE OR REPLACE FUNCTION public.accept_ownership_transfer(transfer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM public.document_ownership_transfers
  WHERE id = transfer_id
  AND status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or already processed';
  END IF;
  
  -- Verify current user is the recipient
  IF v_transfer.to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: You are not the recipient of this transfer';
  END IF;
  
  -- Update document ownership
  UPDATE public.documents
  SET user_id = v_transfer.to_user_id,
      updated_at = now()
  WHERE id = v_transfer.document_id;
  
  -- Update transfer status
  UPDATE public.document_ownership_transfers
  SET status = 'accepted',
      transferred_at = now(),
      updated_at = now()
  WHERE id = transfer_id;
  
  -- Create notification (optional - if notifications table exists)
  INSERT INTO public.lock_notifications (
    document_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    v_transfer.from_user_id,
    'ownership_transferred',
    'Your document ownership transfer has been accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject transfer
CREATE OR REPLACE FUNCTION public.reject_ownership_transfer(transfer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
BEGIN
  SELECT * INTO v_transfer
  FROM public.document_ownership_transfers
  WHERE id = transfer_id
  AND status = 'pending'
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transfer not found or already processed';
  END IF;
  
  IF v_transfer.to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE public.document_ownership_transfers
  SET status = 'rejected',
      updated_at = now()
  WHERE id = transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-expire old transfers
CREATE OR REPLACE FUNCTION public.expire_old_transfers()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.document_ownership_transfers
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
  AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Scheduled job to expire transfers (call from backend or cron)
-- SELECT public.expire_old_transfers();
```

#### 2.2 Backend API Endpoints

Create file: `backend/app/api/ownership_transfers.py`

**Endpoints needed:**
1. `POST /api/v1/transfers/initiate` - Initiate ownership transfer
2. `POST /api/v1/transfers/{transfer_id}/accept` - Accept transfer
3. `POST /api/v1/transfers/{transfer_id}/reject` - Reject transfer
4. `POST /api/v1/transfers/{transfer_id}/cancel` - Cancel pending transfer (sender)
5. `GET /api/v1/transfers/pending-incoming` - Get pending transfers for current user
6. `GET /api/v1/transfers/history` - Get all transfers (sent + received)
7. `GET /api/v1/transfers/document/{document_id}` - Get transfer status for document

**Implementation outline:**
```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/transfers", tags=["ownership-transfers"])

class TransferRequest(BaseModel):
    document_id: str
    to_user_email: str
    message: Optional[str] = None

@router.post("/initiate")
async def initiate_transfer(
    request: TransferRequest,
    user_id: str = Depends(get_current_user)
):
    """Initiate document ownership transfer"""
    # Verify user owns document
    # Look up recipient by email
    # Create transfer record
    # Send notification email
    # Return transfer info

@router.post("/{transfer_id}/accept")
async def accept_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user)
):
    """Accept ownership transfer"""
    # Call accept_ownership_transfer() function
    # Return success

@router.post("/{transfer_id}/reject")
async def reject_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user)
):
    """Reject ownership transfer"""
    # Call reject_ownership_transfer() function
    # Return success

# ... other endpoints
```

#### 2.3 Frontend Updates Required

**Minimal changes needed:**
1. Fix profiles table lookup (currently trying to query non-existent table)
2. Add proper error handling
3. Add "Transfer Ownership" button in document settings/context menu

**Files to update:**
- `src/hooks/useOwnershipTransfer.ts` - Fix user lookup logic
- `src/components/ownership/PendingTransfersPanel.tsx` - Already complete
- `src/components/document-manager/` - Add transfer button to document actions

---

## 3. Implementation Priority & Order

### Phase 1: Database Setup (1-2 hours)
1. ✅ Create migration file with both features
2. ✅ Run migration on Supabase
3. ✅ Verify tables created
4. ✅ Test RLS policies

### Phase 2: Backend Implementation (4-6 hours)

**Check In/Out Backend:**
1. Create `backend/app/api/checkinout.py`
2. Implement all 8 endpoints
3. Add to main router in `backend/app/main.py`
4. Test with Postman/curl

**Transfers Backend:**
1. Create `backend/app/api/ownership_transfers.py`
2. Implement all 7 endpoints
3. Add to main router
4. Test endpoints

### Phase 3: Frontend Integration (2-3 hours)

**Check In/Out:**
1. Update `CheckInOutDashboard.tsx` queries
2. Add checkout buttons to document views
3. Add lock status indicators
4. Test full workflow

**Transfers:**
1. Fix user lookup in `useOwnershipTransfer.ts`
2. Add transfer button to document menus
3. Test accept/reject flow

### Phase 4: Testing & Polish (2-3 hours)
1. End-to-end testing
2. Error handling improvements
3. Loading states
4. Toast notifications
5. Documentation

**Total estimated time: 9-14 hours of development**

---

## 4. Quick Start Commands

### Run Migration
```bash
# From project root
supabase migration up

# Or manually in Supabase SQL editor:
# Copy contents of migration file and execute
```

### Test Backend Endpoints
```bash
# Check in/out status
curl http://localhost:8000/api/v1/checkinout/my-locks

# Initiate transfer
curl -X POST http://localhost:8000/api/v1/transfers/initiate \
  -H "Content-Type: application/json" \
  -d '{"document_id": "xxx", "to_user_email": "user@example.com"}'
```

### Test Frontend
```bash
# Start frontend
npm run dev

# Navigate to SimplifyDrive dashboard
# Click "Check In/Out" or "Transfers" tabs
```

---

## 5. Dependencies & Considerations

### Authentication
- Both features require authenticated users
- Need to ensure proper user_id passing from frontend to backend

### Email Notifications
- Transfer initiation should send email to recipient
- Lock expiration warnings could send emails
- Consider using Supabase Edge Functions or SendGrid

### Permissions
- Check In/Out: Only document owner/collaborators can lock
- Transfers: Only document owner can initiate transfer

### UI Integration Points
- Document cards need lock indicator icon
- Document context menu needs "Check Out" and "Transfer Ownership" options
- Top navigation could show "You have X pending transfers" badge

### Real-time Updates
- Consider using Supabase Realtime for:
  - Lock status changes
  - Transfer status updates
  - Notifications

---

## 6. Success Criteria

### Check In/Out
- ✅ Users can lock documents for editing
- ✅ Other users see locked status and can't edit
- ✅ Users can unlock their own documents
- ✅ Locks auto-expire after set duration
- ✅ History shows all lock/unlock actions

### Transfers
- ✅ Users can initiate ownership transfers
- ✅ Recipients receive notification and can accept/reject
- ✅ Accepted transfers update document ownership
- ✅ Transfer history is maintained
- ✅ Pending transfers expire after 7 days

---

## 7. Next Steps

1. **Review this plan** - Confirm approach with team
2. **Create migration file** - Copy SQL from section 1.1 and 2.1
3. **Run migration** - Apply to Supabase database
4. **Implement backends** - Start with Check In/Out, then Transfers
5. **Test integration** - Verify frontend works with new backend
6. **Deploy** - Push to production when tested

---

**Created:** December 16, 2025  
**Status:** Ready for Implementation  
**Estimated Completion:** 1-2 sprints

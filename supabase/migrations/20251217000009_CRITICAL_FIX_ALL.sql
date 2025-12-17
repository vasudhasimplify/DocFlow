-- =============================================================================
-- CRITICAL FIX: Run this ENTIRE SQL block in Supabase SQL Editor
-- This fixes: notifications, ownership transfer, and lock_id foreign key
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. FIX NOTIFICATIONS UPDATE (Add missing UPDATE policy)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.lock_notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.lock_notifications FOR UPDATE 
  USING (auth.uid() = notified_user_id)
  WITH CHECK (auth.uid() = notified_user_id);

-- Also drop foreign key constraint on lock_id to allow NULL
ALTER TABLE public.lock_notifications 
DROP CONSTRAINT IF EXISTS lock_notifications_lock_id_fkey;

-- Make lock_id nullable
ALTER TABLE public.lock_notifications 
ALTER COLUMN lock_id DROP NOT NULL;

-- Re-add constraint but allow NULL
ALTER TABLE public.lock_notifications 
ADD CONSTRAINT lock_notifications_lock_id_fkey 
FOREIGN KEY (lock_id) REFERENCES public.document_locks(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 2. FIX OWNERSHIP TRANSFER (Use NULL for lock_id instead of random UUID)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_ownership_transfer(UUID);

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
  
  -- Create notification (lock_id is NULL for ownership transfers)
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    NULL,
    v_transfer.from_user_id,
    'ownership_transferred',
    'Your document ownership transfer has been accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix reject function
DROP FUNCTION IF EXISTS public.reject_ownership_transfer(UUID);

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
    RAISE EXCEPTION 'Unauthorized: You are not the recipient of this transfer';
  END IF;
  
  UPDATE public.document_ownership_transfers
  SET status = 'rejected',
      updated_at = now()
  WHERE id = transfer_id;
  
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    NULL,
    v_transfer.from_user_id,
    'ownership_transferred',
    'Your document ownership transfer was rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix cancel function
DROP FUNCTION IF EXISTS public.cancel_ownership_transfer(UUID);

CREATE OR REPLACE FUNCTION public.cancel_ownership_transfer(transfer_id UUID)
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
  
  IF v_transfer.from_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only the sender can cancel a transfer';
  END IF;
  
  UPDATE public.document_ownership_transfers
  SET status = 'cancelled',
      cancelled_by_user_id = auth.uid(),
      updated_at = now()
  WHERE id = transfer_id;
  
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    NULL,
    v_transfer.to_user_id,
    'ownership_transferred',
    'The ownership transfer was cancelled by the sender'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 3. FIX DUPLICATE CHECKOUT (Add unique partial index on active locks)
-- -----------------------------------------------------------------------------
-- First, deactivate all but the most recent active lock for each document
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY locked_at DESC) as rn
  FROM public.document_locks
  WHERE is_active = true
)
UPDATE public.document_locks
SET is_active = false
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- This prevents two users from checking out the same document
DROP INDEX IF EXISTS idx_unique_active_lock;
CREATE UNIQUE INDEX idx_unique_active_lock 
ON public.document_locks (document_id) 
WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- 4. VERIFY - Show what we changed
-- -----------------------------------------------------------------------------
DO $$ 
BEGIN
  RAISE NOTICE 'SUCCESS: All fixes applied!';
  RAISE NOTICE '1. Added UPDATE policy for lock_notifications';
  RAISE NOTICE '2. Made lock_id nullable with proper FK constraint';
  RAISE NOTICE '3. Fixed accept/reject/cancel ownership transfer functions';
  RAISE NOTICE '4. Added unique index to prevent duplicate active locks';
END $$;

COMMIT;

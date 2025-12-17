-- Fix ownership transfer notifications to not require lock_id
-- The lock_id field should be nullable for ownership transfer notifications

BEGIN;

-- Make lock_id nullable in lock_notifications table (if not already)
ALTER TABLE public.lock_notifications 
ALTER COLUMN lock_id DROP NOT NULL;

-- Drop the existing accept_ownership_transfer function
DROP FUNCTION IF EXISTS public.accept_ownership_transfer(UUID);

-- Recreate accept_ownership_transfer function with lock_id = NULL
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
    NULL,  -- Changed from gen_random_uuid() to NULL
    v_transfer.from_user_id,
    'ownership_transferred',
    'Your document ownership transfer has been accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate reject_ownership_transfer function
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
  
  -- Create notification (lock_id is NULL for ownership transfers)
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    NULL,  -- Changed from gen_random_uuid() to NULL
    v_transfer.from_user_id,
    'ownership_transferred',
    'Your document ownership transfer was rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

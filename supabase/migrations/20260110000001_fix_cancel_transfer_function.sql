-- =============================================================================
-- Migration: Fix cancel_ownership_transfer function - remove non-existent column reference
-- Created: 2026-01-10
-- Description: The cancel function was trying to set cancelled_by_user_id which doesn't exist
-- =============================================================================

-- Drop and recreate the cancel function without the non-existent column
DROP FUNCTION IF EXISTS public.cancel_ownership_transfer(UUID);

CREATE OR REPLACE FUNCTION public.cancel_ownership_transfer(transfer_id UUID)
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
  
  -- Only the sender can cancel
  IF v_transfer.from_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only the sender can cancel a transfer';
  END IF;
  
  -- Update status to cancelled (don't reference cancelled_by_user_id as it doesn't exist)
  UPDATE public.document_ownership_transfers
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = transfer_id;
  
  -- Notify the recipient that the transfer was cancelled
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
    'transfer_cancelled',
    'The ownership transfer request was cancelled by the sender'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cancel_ownership_transfer(UUID) TO authenticated;

COMMENT ON FUNCTION public.cancel_ownership_transfer IS 
'Cancels a pending ownership transfer. Only the sender (from_user_id) can cancel.';

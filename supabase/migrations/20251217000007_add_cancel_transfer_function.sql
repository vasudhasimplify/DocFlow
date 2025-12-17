-- Migration: Add cancel_ownership_transfer function
-- Purpose: Allow transfer initiators to cancel pending transfers

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
  
  -- Verify current user is the sender (original owner)
  IF v_transfer.from_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Only the sender can cancel a transfer';
  END IF;
  
  -- Update transfer status to cancelled
  UPDATE public.document_ownership_transfers
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = transfer_id;
  
  -- Optionally notify the recipient
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    gen_random_uuid(),
    v_transfer.to_user_id,
    'ownership_transferred',
    'A document ownership transfer request has been cancelled by the sender'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cancel_ownership_transfer(UUID) TO authenticated;

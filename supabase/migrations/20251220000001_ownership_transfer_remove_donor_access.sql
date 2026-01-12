-- =============================================================================
-- Migration: Remove donor's ALL access after ownership transfer acceptance
-- Created: 2024-12-20
-- Description: Updates accept_ownership_transfer function to remove all donor's
--              access including shares, ensuring they lose view permission too
-- =============================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS public.accept_ownership_transfer(UUID);

-- Recreate with full access removal for donor
CREATE OR REPLACE FUNCTION public.accept_ownership_transfer(transfer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_transfer RECORD;
  v_from_user_email TEXT;
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
  
  -- Get donor's email for removing from external_shares
  SELECT email INTO v_from_user_email
  FROM public.profiles
  WHERE id = v_transfer.from_user_id;
  
  -- Update document ownership (transfer to new owner)
  UPDATE public.documents
  SET user_id = v_transfer.to_user_id,
      updated_at = now()
  WHERE id = v_transfer.document_id;
  
  -- Remove donor's external shares (if they were shared with them by someone else)
  DELETE FROM public.external_shares
  WHERE document_id = v_transfer.document_id
  AND (shared_with_email = v_from_user_email OR shared_with_user_id = v_transfer.from_user_id);
  
  -- Remove any share links created by the donor for this document
  DELETE FROM public.share_links
  WHERE document_id = v_transfer.document_id
  AND created_by = v_transfer.from_user_id;
  
  -- Remove donor from document collaborators (if such table exists)
  DELETE FROM public.document_collaborators
  WHERE document_id = v_transfer.document_id
  AND user_id = v_transfer.from_user_id;
  
  -- Also check if the external_shares table has any shares owned by the donor
  -- (shares they created for others on this doc - new owner should manage these)
  UPDATE public.external_shares
  SET owner_id = v_transfer.to_user_id
  WHERE document_id = v_transfer.document_id
  AND owner_id = v_transfer.from_user_id;
  
  -- Update transfer status
  UPDATE public.document_ownership_transfers
  SET status = 'accepted',
      transferred_at = now(),
      updated_at = now()
  WHERE id = transfer_id;
  
  -- Create notification for the donor (former owner)
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
    'Your document ownership transfer has been accepted. You no longer have access to this document.'
  );
  
  -- Create notification for the new owner
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
    'ownership_received',
    'You are now the owner of the transferred document'
  );
  
EXCEPTION
  WHEN undefined_table THEN
    -- If document_collaborators table doesn't exist, just skip that delete
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
    
    -- Create notification
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
      'Your document ownership transfer has been accepted. You no longer have access to this document.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.accept_ownership_transfer(UUID) TO authenticated;

COMMENT ON FUNCTION public.accept_ownership_transfer IS 
'Accepts a pending ownership transfer. Transfers document ownership to recipient and removes ALL access from the donor including external shares, share links, and collaborator permissions.';

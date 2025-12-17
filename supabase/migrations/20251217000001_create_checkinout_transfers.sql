-- ============= CHECK IN/OUT & OWNERSHIP TRANSFERS MIGRATION =============
-- Creates tables for document locking and ownership transfer features

-- =============================================================================
-- DOCUMENT LOCKS (Check In/Out Feature)
-- =============================================================================

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
    'force_unlock',
    'ownership_transferred'
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

-- =============================================================================
-- OWNERSHIP TRANSFERS
-- =============================================================================

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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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
  
  -- Create notification
  INSERT INTO public.lock_notifications (
    document_id,
    lock_id,
    notified_user_id,
    notification_type,
    message
  ) VALUES (
    v_transfer.document_id,
    gen_random_uuid(),
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

-- Add updated_at triggers
CREATE TRIGGER update_document_locks_updated_at
  BEFORE UPDATE ON public.document_locks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ownership_transfers_updated_at
  BEFORE UPDATE ON public.document_ownership_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration complete

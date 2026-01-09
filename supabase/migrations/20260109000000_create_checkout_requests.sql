-- ============================================================================
-- CHECKOUT REQUESTS TABLE
-- For guest/shared users to request edit access
-- ============================================================================

-- Create checkout_requests table
CREATE TABLE IF NOT EXISTS public.checkout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    requester_email TEXT NOT NULL,
    requester_name TEXT,
    share_id UUID REFERENCES public.external_shares(id) ON DELETE CASCADE,
    share_link_id TEXT, -- For link-based shares
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    request_message TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_checkout_requests_document ON public.checkout_requests(document_id);
CREATE INDEX idx_checkout_requests_email ON public.checkout_requests(requester_email);
CREATE INDEX idx_checkout_requests_status ON public.checkout_requests(status);
CREATE INDEX idx_checkout_requests_share ON public.checkout_requests(share_id);

-- Helper function to get current user email (if not already exists)
CREATE OR REPLACE FUNCTION current_user_email() 
RETURNS TEXT AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.checkout_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can create checkout requests"
    ON public.checkout_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Requesters can view their own requests"
    ON public.checkout_requests FOR SELECT
    USING (requester_email = current_user_email());

CREATE POLICY "Document owners can view requests for their documents"
    ON public.checkout_requests FOR SELECT
    USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

CREATE POLICY "Document owners can update requests"
    ON public.checkout_requests FOR UPDATE
    USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

-- Function to auto-expire old pending requests (older than 7 days)
CREATE OR REPLACE FUNCTION expire_old_checkout_requests()
RETURNS void AS $$
BEGIN
    UPDATE public.checkout_requests
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND requested_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Add guest_email column to document_locks for guest access tracking
ALTER TABLE public.document_locks 
ADD COLUMN IF NOT EXISTS guest_email TEXT;

CREATE INDEX IF NOT EXISTS idx_document_locks_guest_email ON public.document_locks(guest_email);

-- Comment
COMMENT ON TABLE public.checkout_requests IS 'Stores requests from guests/shared users to edit documents';
COMMENT ON COLUMN public.checkout_requests.share_id IS 'Reference to external_shares table for email-based shares';
COMMENT ON COLUMN public.checkout_requests.share_link_id IS 'Reference ID for link-based shares';
COMMENT ON COLUMN public.document_locks.guest_email IS 'Email of guest user who has checkout access (for approved requests)';

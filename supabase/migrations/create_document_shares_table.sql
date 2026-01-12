-- Create document_shares table for user-to-user document sharing
-- This enables the "Shared with me" feature for registered SimplifyDrive users

CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL,  -- User who shared the document
    shared_with UUID NOT NULL,  -- User who receives the share
    permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
    share_token TEXT,  -- Optional token for link-based shares
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate shares of the same document to the same user
    UNIQUE(document_id, shared_with)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_with ON public.document_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_document_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_shared_by ON public.document_shares(shared_by);

-- Enable Row Level Security
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see shares where they are the recipient or the sharer
CREATE POLICY "Users can view their own shares"
    ON public.document_shares
    FOR SELECT
    USING (auth.uid() = shared_with OR auth.uid() = shared_by);

-- Policy: Users can create shares for documents they own
CREATE POLICY "Users can create shares"
    ON public.document_shares
    FOR INSERT
    WITH CHECK (auth.uid() = shared_by);

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete their own shares"
    ON public.document_shares
    FOR DELETE
    USING (auth.uid() = shared_by);

-- Grant access to authenticated users
GRANT SELECT, INSERT, DELETE ON public.document_shares TO authenticated;

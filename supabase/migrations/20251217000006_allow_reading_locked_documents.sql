-- Migration: Allow reading document metadata for locked documents
-- Purpose: Fix "Unknown Document" issue in Check In/Out dashboard
-- Users should be able to see the name of documents that are locked, even if they don't own them

-- Drop existing policy if it exists (makes migration idempotent)
DROP POLICY IF EXISTS "Users can view metadata for locked documents" ON public.documents;

-- Add policy to allow reading document metadata when there's an active lock
CREATE POLICY "Users can view metadata for locked documents"
ON public.documents
FOR SELECT
USING (
  -- User owns the document OR there's an active lock on this document
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.document_locks 
    WHERE document_locks.document_id = documents.id 
    AND document_locks.is_active = true
  )
);

-- Note: This allows users to see file_name, file_type, etc. for documents
-- that are currently locked, which is necessary for the Check In/Out dashboard
-- to display document names for all active locks (not just their own)

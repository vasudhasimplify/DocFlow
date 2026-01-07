-- Add policy to allow users to view documents that are part of their ownership transfers
-- This allows both senders and recipients to view documents in their transfer history

DROP POLICY IF EXISTS "Users can view documents in their transfers" ON public.documents;

CREATE POLICY "Users can view documents in their transfers"
ON public.documents
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 
    FROM public.document_ownership_transfers 
    WHERE document_ownership_transfers.document_id = documents.id
    AND (
      document_ownership_transfers.from_user_id = auth.uid()
      OR document_ownership_transfers.to_user_id = auth.uid()
    )
  )
);

-- Update the main documents policy to work alongside the transfer view policy
DROP POLICY IF EXISTS "Users can manage their own documents" ON public.documents;

CREATE POLICY "Users can manage their own documents"
ON public.documents
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

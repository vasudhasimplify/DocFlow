-- Add document_file_name column to document_ownership_transfers table
-- This preserves the filename even if the document is deleted
ALTER TABLE public.document_ownership_transfers 
ADD COLUMN IF NOT EXISTS document_file_name TEXT;

-- Populate existing records with current document filenames
UPDATE public.document_ownership_transfers
SET document_file_name = documents.file_name
FROM public.documents
WHERE document_ownership_transfers.document_id = documents.id
  AND document_ownership_transfers.document_file_name IS NULL;

-- Update the trigger to set the filename when a transfer is created
CREATE OR REPLACE FUNCTION set_transfer_document_filename()
RETURNS TRIGGER AS $$
BEGIN
  -- Fetch the document filename
  SELECT file_name INTO NEW.document_file_name
  FROM public.documents
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-populate document_file_name on insert
DROP TRIGGER IF EXISTS trigger_set_transfer_document_filename ON public.document_ownership_transfers;
CREATE TRIGGER trigger_set_transfer_document_filename
  BEFORE INSERT ON public.document_ownership_transfers
  FOR EACH ROW
  EXECUTE FUNCTION set_transfer_document_filename();

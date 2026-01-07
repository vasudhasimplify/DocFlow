-- Add unique constraint on document_id to support upsert operations
-- This allows ON CONFLICT (document_id) to work properly

-- First, check if there are any duplicate document_ids and remove them
-- Keep only the most recent entry for each document
DELETE FROM document_retention_status a
USING document_retention_status b
WHERE a.document_id = b.document_id 
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE document_retention_status
ADD CONSTRAINT document_retention_status_document_id_unique UNIQUE (document_id);

SELECT 'Added unique constraint on document_id' AS status;

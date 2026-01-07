-- Add extraction-related columns to workflow_instances table
-- These columns store pre-extracted document data shown in the AI Workflow Suggestion dialog

ALTER TABLE workflow_instances 
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS extraction_status TEXT DEFAULT NULL CHECK (extraction_status IN ('extracted', 'failed', 'no_schema', 'not_ready', 'error')),
ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN workflow_instances.extracted_data IS 'Structured data extracted from the document before workflow starts';
COMMENT ON COLUMN workflow_instances.extraction_status IS 'Status of the extraction process: extracted, failed, no_schema, not_ready, error';
COMMENT ON COLUMN workflow_instances.data_status IS 'User-friendly message about the extraction status';

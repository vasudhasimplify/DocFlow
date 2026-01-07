-- Add metadata column to workflow_step_instances for tracking condition evaluations and other step-specific data
ALTER TABLE workflow_step_instances 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_metadata 
ON workflow_step_instances USING gin(metadata);

-- Add comment explaining the metadata structure
COMMENT ON COLUMN workflow_step_instances.metadata IS 'Stores step-specific data like condition evaluations, form data, and custom tracking info. Example: {"condition": "Amount > 10000", "evaluation": true, "evaluated_value": 15000}';

-- Add assigned_email column to workflow_step_instances table
-- This allows manual email assignment when starting workflows
-- without requiring users to exist in auth.users table

ALTER TABLE workflow_step_instances 
ADD COLUMN IF NOT EXISTS assigned_email TEXT DEFAULT NULL;

COMMENT ON COLUMN workflow_step_instances.assigned_email IS 'Manually assigned email address for step notification (bypasses auth.users lookup)';

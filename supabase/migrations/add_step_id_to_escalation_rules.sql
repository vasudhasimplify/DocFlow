-- Phase 4: Add step_id field for future step-level escalation rules
-- This is the foundation for step-specific escalation rules

-- Add step_id column (optional, for step-specific rules)
ALTER TABLE escalation_rules 
ADD COLUMN IF NOT EXISTS step_id UUID REFERENCES workflow_step_instances(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_escalation_rules_step_id ON escalation_rules(step_id);

-- Add comment explaining the hierarchy
COMMENT ON COLUMN escalation_rules.step_id IS 'Optional: Specific step this rule applies to. Priority: step_id > workflow_id > is_global';

-- Update RLS policy to include step_id
DROP POLICY IF EXISTS "Users can view escalation rules" ON escalation_rules;
CREATE POLICY "Users can view escalation rules" ON escalation_rules
  FOR SELECT
  USING (
    is_global = true 
    OR workflow_id IN (
      SELECT id FROM workflow_definitions 
      WHERE created_by = auth.uid()
    )
    OR step_id IN (
      SELECT ws.id FROM workflow_step_instances ws
      JOIN workflow_instances wi ON wi.id = ws.instance_id
      JOIN workflow_definitions wd ON wd.id = wi.workflow_id
      WHERE wd.created_by = auth.uid()
    )
  );

-- Add validation: Can't have both step_id AND is_global=true
ALTER TABLE escalation_rules 
ADD CONSTRAINT check_step_not_global 
CHECK (NOT (step_id IS NOT NULL AND is_global = true));

-- Add validation: If step_id is set, workflow_id must also be set (or derivable)
-- This is optional but recommended for data integrity

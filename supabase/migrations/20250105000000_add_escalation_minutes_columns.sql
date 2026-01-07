-- ============================================================================
-- Add minute columns to escalation_rules for rapid testing
-- ============================================================================

-- Add trigger_after_minutes column (takes precedence over hours for testing)
ALTER TABLE escalation_rules 
ADD COLUMN IF NOT EXISTS trigger_after_minutes INTEGER;

-- Add repeat_every_minutes column (takes precedence over hours for testing)
ALTER TABLE escalation_rules 
ADD COLUMN IF NOT EXISTS repeat_every_minutes INTEGER;

-- Add comments
COMMENT ON COLUMN escalation_rules.trigger_after_minutes IS 'Trigger after X minutes - takes precedence over trigger_after_hours for testing';
COMMENT ON COLUMN escalation_rules.repeat_every_minutes IS 'Repeat every X minutes - takes precedence over repeat_every_hours for testing';

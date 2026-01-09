-- ============================================================================
-- Change escalation minute columns from INTEGER to NUMERIC for decimal support
-- ============================================================================

-- Change trigger_after_minutes to NUMERIC to allow decimal values (e.g., 1.5 minutes)
ALTER TABLE escalation_rules 
ALTER COLUMN trigger_after_minutes TYPE NUMERIC USING trigger_after_minutes::NUMERIC;

-- Change repeat_every_minutes to NUMERIC to allow decimal values
ALTER TABLE escalation_rules 
ALTER COLUMN repeat_every_minutes TYPE NUMERIC USING repeat_every_minutes::NUMERIC;

-- Update comments
COMMENT ON COLUMN escalation_rules.trigger_after_minutes IS 'Trigger after X minutes (supports decimals like 1.5) - takes precedence over trigger_after_hours for testing';
COMMENT ON COLUMN escalation_rules.repeat_every_minutes IS 'Repeat every X minutes (supports decimals like 1.5) - takes precedence over repeat_every_hours for testing';

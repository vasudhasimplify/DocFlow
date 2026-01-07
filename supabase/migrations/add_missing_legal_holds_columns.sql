-- Add Missing Columns to Legal Holds Table
-- Run this in Supabase Dashboard → SQL Editor

-- Add notification and acknowledgment columns if they don't exist
ALTER TABLE public.legal_holds 
ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS acknowledgment_deadline_days INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS send_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_frequency_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS escalation_after_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS escalation_contacts TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS issuing_attorney TEXT,
ADD COLUMN IF NOT EXISTS legal_team_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'legal_holds'
AND column_name IN (
    'requires_acknowledgment',
    'acknowledgment_deadline_days',
    'send_reminders',
    'reminder_frequency_days',
    'escalation_enabled',
    'escalation_after_days',
    'issuing_attorney'
)
ORDER BY column_name;

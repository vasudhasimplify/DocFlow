-- Complete Schema Update for Legal Holds Table
-- Run this in Supabase Dashboard → SQL Editor

-- Add all missing columns
ALTER TABLE public.legal_holds 
-- Matter Information
ADD COLUMN IF NOT EXISTS matter_id TEXT,
ADD COLUMN IF NOT EXISTS matter_name TEXT,
ADD COLUMN IF NOT EXISTS matter_type TEXT DEFAULT 'litigation',
ADD COLUMN IF NOT EXISTS case_number TEXT,
ADD COLUMN IF NOT EXISTS court_name TEXT,
ADD COLUMN IF NOT EXISTS opposing_party TEXT,

-- Hold Details
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'search_criteria',
ADD COLUMN IF NOT EXISTS scope_details JSONB DEFAULT '{}',

-- Dates
ADD COLUMN IF NOT EXISTS issue_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS effective_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS anticipated_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS released_date TIMESTAMP WITH TIME ZONE,

-- Status
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',

-- Acknowledgment Settings
ADD COLUMN IF NOT EXISTS requires_acknowledgment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS acknowledgment_deadline_days INTEGER DEFAULT 5,

-- Notification Settings
ADD COLUMN IF NOT EXISTS send_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS reminder_frequency_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS escalation_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS escalation_after_days INTEGER DEFAULT 14,
ADD COLUMN IF NOT EXISTS escalation_contacts TEXT[] DEFAULT '{}',

-- Team
ADD COLUMN IF NOT EXISTS issuing_attorney TEXT,
ADD COLUMN IF NOT EXISTS legal_team_emails TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS internal_notes TEXT,

-- Stats Cache
ADD COLUMN IF NOT EXISTS cached_custodian_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_total_size_bytes BIGINT DEFAULT 0,

-- Audit fields (rename user_id to created_by if needed)
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS released_by UUID,
ADD COLUMN IF NOT EXISTS release_reason TEXT,
ADD COLUMN IF NOT EXISTS release_approved_by TEXT;

-- Drop NOT NULL constraint on user_id if it exists
ALTER TABLE public.legal_holds ALTER COLUMN user_id DROP NOT NULL;

-- Copy user_id to created_by if user_id exists and created_by is null
UPDATE legal_holds 
SET created_by = user_id 
WHERE created_by IS NULL AND user_id IS NOT NULL;

-- Set default values for required fields that might be null
UPDATE legal_holds 
SET 
    matter_id = COALESCE(matter_id, 'LEGACY-' || id::text),
    matter_name = COALESCE(matter_name, name),
    matter_type = COALESCE(matter_type, 'litigation'),
    scope = COALESCE(scope, 'search_criteria'),
    status = COALESCE(status, 'active')
WHERE matter_id IS NULL OR matter_name IS NULL;

-- Add check constraint if not exists
DO $$ 
BEGIN
    ALTER TABLE legal_holds DROP CONSTRAINT IF EXISTS legal_holds_status_check;
    ALTER TABLE legal_holds ADD CONSTRAINT legal_holds_status_check 
        CHECK (status IN ('draft', 'pending_approval', 'active', 'released', 'expired'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'legal_holds'
ORDER BY ordinal_position;

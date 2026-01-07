-- Add last_reminder_sent column to legal_hold_custodians table

ALTER TABLE public.legal_hold_custodians 
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- Add reminder_count column if it doesn't exist
ALTER TABLE public.legal_hold_custodians 
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'legal_hold_custodians' 
AND column_name IN ('last_reminder_sent', 'reminder_count')
ORDER BY column_name;

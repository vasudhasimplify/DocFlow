-- Fix Legal Holds Schema
-- Run this in Supabase SQL Editor

-- 1. Drop and recreate trigger (fixes the trigger error)
DROP TRIGGER IF EXISTS update_legal_holds_updated_at ON public.legal_holds;
CREATE TRIGGER update_legal_holds_updated_at
    BEFORE UPDATE ON public.legal_holds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Refresh PostgREST schema cache (fixes the PGRST204 error)
NOTIFY pgrst, 'reload schema';

-- 3. Verify all columns exist
DO $$
BEGIN
    -- Check if acknowledgment_deadline_days column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'legal_holds' 
        AND column_name = 'acknowledgment_deadline_days'
    ) THEN
        RAISE EXCEPTION 'Column acknowledgment_deadline_days is missing! Please run the full migration first.';
    END IF;
    
    RAISE NOTICE 'All required columns exist ✓';
END $$;

-- 4. Show table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'legal_holds'
ORDER BY ordinal_position;

-- Legal Holds Diagnostic & Fix Script
-- Run this in Supabase SQL Editor

-- 1. Check if table exists and has correct structure
DO $$
DECLARE
    table_exists boolean;
    column_count integer;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'legal_holds'
    ) INTO table_exists;
    
    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_name = 'legal_holds';
        
        RAISE NOTICE '✅ Table exists with % columns', column_count;
    ELSE
        RAISE EXCEPTION '❌ Table does not exist!';
    END IF;
END $$;

-- 2. Check critical columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_holds' AND column_name = 'acknowledgment_deadline_days') 
        THEN '✅ acknowledgment_deadline_days exists'
        ELSE '❌ acknowledgment_deadline_days MISSING'
    END as col_check;

-- 3. Refresh PostgREST schema cache (CRITICAL!)
NOTIFY pgrst, 'reload schema';

-- 4. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE tablename = 'legal_holds';

-- 5. Test query (as authenticated user would)
SELECT COUNT(*) as total_holds FROM legal_holds;

-- 6. Show sample data if any
SELECT 
    id,
    name,
    matter_id,
    status,
    created_at
FROM legal_holds 
ORDER BY created_at DESC 
LIMIT 5;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '✅ Diagnostic Complete!';
    RAISE NOTICE '✅ Schema cache refreshed';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Refresh browser (Ctrl+F5) and test again';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

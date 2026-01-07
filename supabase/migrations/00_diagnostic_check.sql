-- Diagnostic Query - Run this first to check table structure
-- Copy and paste this in Supabase SQL Editor before running the main migration

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('documents', 'users')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check auth schema
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

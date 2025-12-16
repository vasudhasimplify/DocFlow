-- Remove duplicate documents (keep oldest copy)
-- This handles cases where documents are processed by both frontend and backend

-- Step 0: First check ALL your documents (to verify you have data)
-- Run this first to see all documents and get your user_id
SELECT 
    id,
    file_name,
    created_at,
    processing_status,
    user_id
FROM documents
ORDER BY created_at DESC
LIMIT 20;

-- Step 1: Preview duplicates (SAFE - just shows data)
-- Replace 'YOUR_USER_ID_HERE' with the user_id from Step 0
WITH duplicate_files AS (
    SELECT 
        file_name,
        user_id,
        COUNT(*) as duplicate_count,
        MIN(created_at) as first_upload,
        MAX(created_at) as last_upload,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM documents
    WHERE user_id = 'YOUR_USER_ID_HERE'  -- ⚠️ REPLACE THIS!
    GROUP BY file_name, user_id
    HAVING COUNT(*) > 1
)
SELECT 
    d.id,
    d.file_name,
    d.created_at,
    d.processing_status,
    d.file_size,
    CASE 
        WHEN d.id = df.all_ids[1] THEN '✅ KEEP (oldest)'
        ELSE '❌ DELETE (duplicate)'
    END as action
FROM documents d
INNER JOIN duplicate_files df ON d.file_name = df.file_name AND d.user_id = df.user_id
ORDER BY d.file_name, d.created_at;

-- If no results: You have NO DUPLICATES! 🎉

-- Step 2: Count how many duplicates will be removed
WITH duplicate_files AS (
    SELECT 
        file_name,
        user_id,
        COUNT(*) as duplicate_count,
        ARRAY_AGG(id ORDER BY created_at) as all_ids
    FROM documents
    WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
    GROUP BY file_name, user_id
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as total_duplicates_to_delete,
    SUM(duplicate_count - 1) as files_saved
FROM duplicate_files;

-- Step 3: Delete duplicates (DANGER - this deletes data!)
-- This keeps the OLDEST upload of each file and removes newer duplicates
-- Uncomment the lines below after verifying Step 1 and 2 results

-- WITH duplicate_files AS (
--     SELECT 
--         file_name,
--         user_id,
--         ARRAY_AGG(id ORDER BY created_at) as all_ids
--     FROM documents
--     WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
--     GROUP BY file_name, user_id
--     HAVING COUNT(*) > 1
-- ),
-- ids_to_delete AS (
--     SELECT UNNEST(all_ids[2:]) as id_to_delete
--     FROM duplicate_files
-- )
-- DELETE FROM documents
-- WHERE id IN (SELECT id_to_delete FROM ids_to_delete);

-- Alternative: Delete duplicates keeping the NEWEST upload instead
-- Uncomment this if you want to keep the most recent version

-- WITH duplicate_files AS (
--     SELECT 
--         file_name,
--         user_id,
--         ARRAY_AGG(id ORDER BY created_at DESC) as all_ids
--     FROM documents
--     WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
--     GROUP BY file_name, user_id
--     HAVING COUNT(*) > 1
-- ),
-- ids_to_delete AS (
--     SELECT UNNEST(all_ids[2:]) as id_to_delete
--     FROM duplicate_files
-- )
-- DELETE FROM documents
-- WHERE id IN (SELECT id_to_delete FROM ids_to_delete);

-- Notes:
-- 1. This identifies duplicates by file_name and user_id
-- 2. By default, keeps the OLDEST upload (first processed)
-- 3. CASCADE delete will automatically remove related chunks
-- 4. Does NOT affect the Documents tab - only removes database duplicates
-- 5. Frontend will automatically refresh after deletion

-- To get your user ID:
-- Open browser console on http://localhost:4173 and run:
-- (await supabase.auth.getUser()).data.user.id

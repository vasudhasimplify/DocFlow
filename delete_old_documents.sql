-- Delete old documents except "document 1" and "minutes of meeting"
-- Run this in Supabase SQL Editor

-- Step 1: Preview what will be deleted (SAFE - just shows data)
SELECT 
    id, 
    file_name, 
    created_at, 
    processing_status,
    file_type
FROM documents
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
  AND file_name NOT ILIKE '%document 1%'
  AND file_name NOT ILIKE '%minutes of meeting%'
ORDER BY created_at DESC;

-- Step 2: Check how many chunks will be deleted
SELECT 
    COUNT(*) as chunks_to_delete,
    d.file_name
FROM document_chunks dc
INNER JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
  AND d.file_name NOT ILIKE '%document 1%'
  AND d.file_name NOT ILIKE '%minutes of meeting%'
GROUP BY d.file_name;

-- Step 3: Actually delete the documents (DANGER - this deletes data!)
-- Uncomment the lines below after verifying Step 1 and 2 results

-- DELETE FROM documents
-- WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user ID
--   AND file_name NOT ILIKE '%document 1%'
--   AND file_name NOT ILIKE '%minutes of meeting%';

-- Notes:
-- 1. The CASCADE delete will automatically remove related chunks
-- 2. ILIKE is case-insensitive pattern matching
-- 3. '%' matches any characters before/after
-- 4. Replace 'YOUR_USER_ID_HERE' with your actual user ID

-- To get your user ID:
-- Open browser console on http://localhost:4173 and run:
-- (await supabase.auth.getUser()).data.user.id

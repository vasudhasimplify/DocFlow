-- Step 1: Identify documents with invalid storage_path
-- Run this first to see what will be affected
SELECT 
  id,
  file_name,
  storage_path,
  created_at,
  processing_status
FROM documents 
WHERE storage_path IS NOT NULL 
  AND storage_path NOT LIKE 'http%'
  AND original_url IS NULL
ORDER BY created_at DESC;

-- Step 2A: Option A - Set storage_path to empty string (if column doesn't allow NULL)
UPDATE documents 
SET 
  storage_path = '',
  updated_at = NOW()
WHERE storage_path IS NOT NULL 
  AND storage_path != ''
  AND storage_path NOT LIKE 'http%'
  AND original_url IS NULL;

-- Step 2B: Option B - Remove NOT NULL constraint first, then set to NULL
-- ALTER TABLE documents ALTER COLUMN storage_path DROP NOT NULL;
-- UPDATE documents 
-- SET storage_path = NULL, updated_at = NOW()
-- WHERE storage_path IS NOT NULL 
--   AND storage_path NOT LIKE 'http%'
--   AND original_url IS NULL;

-- Step 3: Option C - Delete orphaned documents entirely (RECOMMENDED)
-- This completely removes documents with broken storage paths
DELETE FROM documents 
WHERE storage_path IS NOT NULL 
  AND storage_path != ''
  AND storage_path NOT LIKE 'http%'
  AND original_url IS NULL;

-- Step 4: Verify the cleanup
SELECT COUNT(*) as remaining_orphaned_docs
FROM documents 
WHERE storage_path IS NOT NULL 
  AND storage_path NOT LIKE 'http%'
  AND original_url IS NULL;

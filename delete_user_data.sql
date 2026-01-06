-- =====================================================
-- DELETE ALL DATA FOR A SPECIFIC USER
-- =====================================================
-- Replace 'USER_ID_HERE' with the actual user ID
-- Example: '966f675d-e364-4c43-a135-cca3bf715129'

-- SET THE USER ID HERE:
-- For the selected user (shrutishar03@gmail.com):
DO $$ 
DECLARE
    target_user_id UUID := '966f675d-e364-4c43-a135-cca3bf715129';
BEGIN
    RAISE NOTICE 'Starting deletion for user: %', target_user_id;

    -- =====================================================
    -- STEP 1: Delete document chunks (embeddings)
    -- =====================================================
    DELETE FROM document_chunks 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_chunks';

    -- =====================================================
    -- STEP 2: Delete document versions
    -- =====================================================
    DELETE FROM document_versions 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_versions';

    -- =====================================================
    -- STEP 3: Delete processing queue entries
    -- =====================================================
    DELETE FROM document_processing_queue 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_processing_queue entries';

    -- =====================================================
    -- STEP 4: Delete search index queue entries
    -- =====================================================
    DELETE FROM search_index_queue 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted search_index_queue entries';

    -- =====================================================
    -- STEP 5: Delete document signatures
    -- =====================================================
    DELETE FROM document_signatures 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_signatures';

    -- =====================================================
    -- STEP 6: Delete ownership transfers
    -- =====================================================
    DELETE FROM ownership_transfers 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted ownership_transfers';

    -- =====================================================
    -- STEP 7: Delete check-in/check-out records
    -- =====================================================
    DELETE FROM document_checkouts 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_checkouts';

    -- =====================================================
    -- STEP 8: Delete legal holds
    -- =====================================================
    DELETE FROM legal_holds 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted legal_holds';

    -- =====================================================
    -- STEP 9: Delete document comparisons
    -- =====================================================
    DELETE FROM document_comparisons 
    WHERE document_id IN (
        SELECT id FROM documents WHERE user_id = target_user_id
    );
    RAISE NOTICE 'Deleted document_comparisons';

    -- =====================================================
    -- STEP 10: Delete main documents
    -- =====================================================
    DELETE FROM documents 
    WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted documents';

    -- =====================================================
    -- STEP 11: Delete user's folders
    -- =====================================================
    DELETE FROM folders 
    WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted folders';

    -- =====================================================
    -- STEP 12: Delete user's templates
    -- =====================================================
    DELETE FROM templates 
    WHERE user_id = target_user_id;
    RAISE NOTICE 'Deleted templates';

    RAISE NOTICE 'Deletion complete for user: %', target_user_id;
END $$;

-- =====================================================
-- VERIFY DELETION
-- =====================================================
SELECT 
    'Documents' as table_name,
    COUNT(*) as remaining_records
FROM documents 
WHERE user_id = '966f675d-e364-4c43-a135-cca3bf715129'

UNION ALL

SELECT 
    'Folders',
    COUNT(*)
FROM folders 
WHERE user_id = '966f675d-e364-4c43-a135-cca3bf715129'

UNION ALL

SELECT 
    'Templates',
    COUNT(*)
FROM templates 
WHERE user_id = '966f675d-e364-4c43-a135-cca3bf715129';

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. This ONLY deletes DATABASE records
-- 2. UPLOADED FILES in storage (GCS/S3) are NOT deleted
-- 3. To delete files, you need to:
--    a) Get the file_path from documents table BEFORE deletion
--    b) Use your storage service API to delete files
--    c) Or use Supabase Storage API if using Supabase Storage
-- =====================================================

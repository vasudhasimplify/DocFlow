-- Fix documents stuck in 'processing' status AND remove duplicate queue entries
-- Run EACH STEP separately in Supabase SQL Editor

-- =====================================================
-- STEP 1: Remove DUPLICATE queue entries (keep oldest)
-- =====================================================
DELETE FROM document_processing_queue 
WHERE id NOT IN (
  SELECT DISTINCT ON (document_id) id 
  FROM document_processing_queue 
  ORDER BY document_id, created_at ASC
);

-- =====================================================
-- STEP 2: Remove DUPLICATE search index queue entries
-- =====================================================
DELETE FROM search_index_queue 
WHERE id NOT IN (
  SELECT DISTINCT ON (document_id) id 
  FROM search_index_queue 
  ORDER BY document_id, created_at ASC
);

-- =====================================================
-- STEP 3: Add UNIQUE constraint to prevent future duplicates
-- This ensures only ONE queue entry per document
-- =====================================================
ALTER TABLE document_processing_queue 
DROP CONSTRAINT IF EXISTS unique_document_processing_queue_document_id;

ALTER TABLE document_processing_queue 
ADD CONSTRAINT unique_document_processing_queue_document_id UNIQUE (document_id);

ALTER TABLE search_index_queue 
DROP CONSTRAINT IF EXISTS unique_search_index_queue_document_id;

ALTER TABLE search_index_queue 
ADD CONSTRAINT unique_search_index_queue_document_id UNIQUE (document_id);

-- =====================================================
-- STEP 4: Fix stuck documents (mark as completed)
-- =====================================================
UPDATE documents
SET processing_status = 'completed'
WHERE processing_status = 'processing'
  AND (extracted_text IS NOT NULL OR analysis_result IS NOT NULL);

-- =====================================================
-- STEP 5: Sync queue with document status
-- =====================================================
UPDATE document_processing_queue dpq
SET 
  stage = 'completed',
  progress_percent = 100,
  completed_at = NOW()
FROM documents d
WHERE dpq.document_id = d.id
  AND d.processing_status = 'completed'
  AND dpq.stage != 'completed';

-- =====================================================
-- STEP 5: Check results
-- =====================================================
SELECT 
  'Queue entries' as type,
  COUNT(*) as total,
  COUNT(DISTINCT document_id) as unique_docs
FROM document_processing_queue

UNION ALL

SELECT 
  'Documents by status: ' || processing_status,
  COUNT(*),
  0
FROM documents
GROUP BY processing_status;

-- Add Missing Cached Statistics Columns to Legal Holds
-- Run this in Supabase Dashboard → SQL Editor

-- Add cached statistics columns if they don't exist
ALTER TABLE public.legal_holds 
ADD COLUMN IF NOT EXISTS cached_custodian_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_document_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cached_total_size_bytes BIGINT DEFAULT 0;

-- Now create the function to calculate and update stats
CREATE OR REPLACE FUNCTION update_legal_hold_stats(hold_id_param UUID)
RETURNS void AS $$
DECLARE
    custodian_count INTEGER;
    doc_count INTEGER;
    total_size BIGINT;
BEGIN
    -- Count custodians
    SELECT COUNT(*) INTO custodian_count
    FROM legal_hold_custodians
    WHERE hold_id = hold_id_param;
    
    -- Count documents (from document_retention_status where legal_hold_ids contains this hold)
    SELECT COUNT(DISTINCT drs.document_id), COALESCE(SUM(d.file_size), 0)
    INTO doc_count, total_size
    FROM document_retention_status drs
    JOIN documents d ON d.id = drs.document_id
    WHERE hold_id_param = ANY(drs.legal_hold_ids);
    
    -- Update the legal hold with calculated stats
    UPDATE legal_holds
    SET 
        cached_custodian_count = custodian_count,
        cached_document_count = doc_count,
        cached_total_size_bytes = total_size
    WHERE id = hold_id_param;
END;
$$ LANGUAGE plpgsql;

-- Update stats for all existing holds
DO $$
DECLARE
    hold_record RECORD;
BEGIN
    FOR hold_record IN SELECT id FROM legal_holds
    LOOP
        PERFORM update_legal_hold_stats(hold_record.id);
    END LOOP;
END $$;

-- Verify updated stats
SELECT 
    name,
    created_at,
    cached_custodian_count,
    cached_document_count,
    cached_total_size_bytes,
    EXTRACT(DAY FROM (now() - created_at)) as days_active
FROM legal_holds
ORDER BY created_at DESC;

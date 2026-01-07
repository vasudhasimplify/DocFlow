-- Drop and recreate the search function with all necessary fields
DROP FUNCTION IF EXISTS search_document_chunks_by_similarity(vector(1536), uuid, float, int);

CREATE OR REPLACE FUNCTION search_document_chunks_by_similarity(
    query_embedding vector(1536),
    user_id_param uuid,
    similarity_threshold float DEFAULT 0.7,
    limit_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    file_name text,
    file_type text,
    file_size bigint,
    storage_path text,
    processing_status text,
    analysis_result jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    chunk_text text,
    chunk_index integer,
    chunk_id uuid,
    similarity_score float
)
LANGUAGE sql
AS $$
    WITH similarity_calculations AS (
        SELECT 
            d.id,
            d.user_id,
            d.file_name,
            d.file_type,
            d.file_size,
            d.storage_path,
            d.processing_status,
            d.analysis_result,
            d.created_at,
            d.updated_at,
            dc.chunk_text,
            dc.chunk_index,
            dc.id as chunk_id,
            -- Calculate cosine similarity: 1 - cosine_distance
            CASE 
                WHEN dc.chunk_embedding IS NOT NULL THEN
                    1 - (dc.chunk_embedding <=> query_embedding)
                ELSE 0.0
            END as similarity_score
        FROM document_chunks dc
        INNER JOIN documents d ON dc.document_id = d.id
        WHERE 
            d.user_id = user_id_param 
            AND dc.chunk_embedding IS NOT NULL
    ),
    filtered_results AS (
        SELECT *
        FROM similarity_calculations
        WHERE similarity_score >= similarity_threshold
    )
    SELECT 
        id,
        user_id,
        file_name,
        file_type,
        file_size,
        storage_path,
        processing_status,
        analysis_result,
        created_at,
        updated_at,
        chunk_text,
        chunk_index,
        chunk_id,
        similarity_score
    FROM filtered_results
    ORDER BY similarity_score DESC
    LIMIT limit_count;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION search_document_chunks_by_similarity TO authenticated;
GRANT EXECUTE ON FUNCTION search_document_chunks_by_similarity TO anon;

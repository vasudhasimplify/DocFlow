-- Check if document_chunks actually have data
SELECT 
    dc.id,
    dc.document_id,
    dc.chunk_index,
    LENGTH(dc.chunk_text) as chunk_text_length,
    dc.chunk_embedding IS NOT NULL as has_embedding,
    d.file_name,
    d.user_id
FROM document_chunks dc
INNER JOIN documents d ON dc.document_id = d.id
WHERE d.user_id = '83fef70e-6935-42aa-805b-4db45397d4df'
ORDER BY dc.created_at DESC
LIMIT 10;

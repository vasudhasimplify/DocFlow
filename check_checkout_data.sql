-- Check what's in checkout_requests for this document
SELECT 
    cr.id,
    cr.document_id,
    cr.requester_email,
    cr.share_link_id,
    cr.status,
    cr.approved_at,
    sl.token as share_token,
    sl.short_code,
    d.file_name
FROM checkout_requests cr
LEFT JOIN share_links sl ON sl.id::text = cr.share_link_id OR sl.token = cr.share_link_id OR sl.short_code = cr.share_link_id
LEFT JOIN documents d ON d.id = cr.document_id
WHERE d.file_name LIKE '%Chandigarh%'
ORDER BY cr.created_at DESC
LIMIT 5;

-- Also check share_links table
SELECT id, token, short_code, resource_name, permission
FROM share_links
WHERE resource_name LIKE '%Chandigarh%'
OR token = '1t5yl5pxg0'
OR short_code = '1t5yl5pxg0';

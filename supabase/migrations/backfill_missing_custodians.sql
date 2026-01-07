-- Backfill missing custodian records for legal holds
-- This fixes holds that have custodian info in legal_holds table but no custodian records

-- Insert custodian records for all holds missing them
INSERT INTO legal_hold_custodians (hold_id, name, email, status, added_by)
SELECT 
    h.id as hold_id,
    COALESCE(h.custodian_name, SPLIT_PART(h.custodian_email, '@', 1)) as name,
    COALESCE(h.custodian_email, h.custodian_name || '@example.com') as email,
    'pending' as status,
    h.created_by as added_by
FROM legal_holds h
WHERE (h.custodian_name IS NOT NULL OR h.custodian_email IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM legal_hold_custodians c WHERE c.hold_id = h.id
  );

-- Update cached custodian counts
UPDATE legal_holds
SET cached_custodian_count = (
    SELECT COUNT(*) 
    FROM legal_hold_custodians 
    WHERE hold_id = legal_holds.id
)
WHERE id IN (
    SELECT h.id 
    FROM legal_holds h
    WHERE (h.custodian_name IS NOT NULL OR h.custodian_email IS NOT NULL)
);

-- Verify the fix
SELECT 
    'Backfill Complete' as status,
    COUNT(*) as custodians_created
FROM legal_hold_custodians c
WHERE c.hold_id IN (
    SELECT h.id 
    FROM legal_holds h
    WHERE (h.custodian_name IS NOT NULL OR h.custodian_email IS NOT NULL)
);

-- Show the newly created custodian records
SELECT 
    c.hold_id,
    h.name as hold_name,
    c.name as custodian_name,
    c.email as custodian_email,
    c.status,
    h.status as hold_status
FROM legal_hold_custodians c
JOIN legal_holds h ON c.hold_id = h.id
WHERE h.id IN (
    SELECT DISTINCT h2.id
    FROM legal_holds h2
    WHERE (h2.custodian_name IS NOT NULL OR h2.custodian_email IS NOT NULL)
)
ORDER BY h.created_at DESC;

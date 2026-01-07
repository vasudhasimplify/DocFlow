-- Create Initial Audit Entries for Existing Legal Holds
-- Run this in Supabase Dashboard → SQL Editor

-- Create audit entries for hold creation (for existing holds)
INSERT INTO legal_hold_audit_log (hold_id, action, actor_id, actor_name, target_type, details, created_at)
SELECT 
    id,
    'hold_created',
    created_by,
    'System Migration',
    'legal_hold',
    jsonb_build_object(
        'name', name,
        'matter_id', matter_id,
        'status', status
    ),
    created_at
FROM legal_holds
WHERE id NOT IN (
    SELECT DISTINCT hold_id 
    FROM legal_hold_audit_log 
    WHERE action = 'hold_created'
);

-- Create audit entries for custodian additions
INSERT INTO legal_hold_audit_log (hold_id, action, actor_id, actor_name, target_type, target_id, target_name, details, created_at)
SELECT 
    c.hold_id,
    'custodian_added',
    c.added_by,
    'System Migration',
    'custodian',
    c.id::text,
    c.name,
    jsonb_build_object(
        'email', c.email,
        'department', c.department,
        'status', c.status
    ),
    c.added_at
FROM legal_hold_custodians c
WHERE c.id NOT IN (
    SELECT target_id::uuid 
    FROM legal_hold_audit_log 
    WHERE action = 'custodian_added' 
    AND target_id IS NOT NULL
);

-- Create audit entries for acknowledged custodians
INSERT INTO legal_hold_audit_log (hold_id, action, actor_id, target_type, target_id, target_name, details, created_at)
SELECT 
    c.hold_id,
    'custodian_acknowledged',
    c.user_id,
    'custodian',
    c.id::text,
    c.name,
    jsonb_build_object(
        'email', c.email,
        'acknowledged_at', c.acknowledged_at
    ),
    c.acknowledged_at
FROM legal_hold_custodians c
WHERE c.status = 'acknowledged' 
AND c.acknowledged_at IS NOT NULL
AND c.id NOT IN (
    SELECT target_id::uuid sq
    FROM legal_hold_audit_log 
    WHERE action = 'custodian_acknowledged' 
    AND target_id IS NOT NULL
);

-- Verify audit entries
SELECT 
    h.name as hold_name,
    COUNT(a.id) as audit_entries
FROM legal_holds h
LEFT JOIN legal_hold_audit_log a ON a.hold_id = h.id
GROUP BY h.id, h.name
ORDER BY h.created_at DESC;

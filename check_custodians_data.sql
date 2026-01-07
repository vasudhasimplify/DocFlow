-- Check if custodians were inserted
SELECT 
    COUNT(*) as total_custodians
FROM public.legal_hold_custodians;

-- Show all custodians with their hold information
SELECT 
    c.id,
    c.name,
    c.email,
    c.department,
    c.title,
    c.status,
    c.acknowledged_at,
    c.reminder_count,
    h.name as hold_name,
    h.id as hold_id
FROM public.legal_hold_custodians c
JOIN public.legal_holds h ON c.hold_id = h.id
ORDER BY h.name, c.name;

-- Check if there are any legal holds
SELECT 
    id,
    name,
    matter_id,
    matter_name,
    status,
    created_at
FROM public.legal_holds
ORDER BY created_at DESC;

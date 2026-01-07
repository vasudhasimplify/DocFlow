-- Insert Dummy Custodian Data
-- This script inserts sample custodian records into the legal_hold_custodians table
-- Make sure legal holds exist before running this script

-- First, let's check if we have any legal holds
DO $$
DECLARE
    hold_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO hold_count FROM public.legal_holds;
    
    IF hold_count = 0 THEN
        RAISE EXCEPTION 'No legal holds found. Please create legal holds first before adding custodians.';
    ELSE
        RAISE NOTICE 'Found % legal hold(s). Proceeding with custodian insertion...', hold_count;
    END IF;
END $$;

-- Insert dummy custodians for existing legal holds
-- This will add 3-5 custodians per legal hold

INSERT INTO public.legal_hold_custodians (
    hold_id, 
    name, 
    email, 
    department, 
    title, 
    status, 
    acknowledged_at,
    reminder_count
)
SELECT 
    h.id as hold_id,
    custodian.name,
    custodian.email,
    custodian.department,
    custodian.title,
    custodian.status,
    CASE 
        WHEN custodian.status = 'acknowledged' THEN now() - (random() * interval '10 days')
        ELSE NULL 
    END as acknowledged_at,
    CASE 
        WHEN custodian.status IN ('reminded', 'escalated') THEN floor(random() * 3 + 1)::INTEGER
        ELSE 0 
    END as reminder_count
FROM 
    public.legal_holds h
CROSS JOIN (
    VALUES 
        -- Finance Department Custodians
        ('Sarah Johnson', 'sarah.johnson@company.com', 'Finance', 'CFO', 'acknowledged'),
        ('Michael Chen', 'michael.chen@company.com', 'Finance', 'Finance Manager', 'acknowledged'),
        ('Emily Rodriguez', 'emily.rodriguez@company.com', 'Finance', 'Senior Accountant', 'pending'),
        ('David Kim', 'david.kim@company.com', 'Finance', 'Financial Analyst', 'reminded'),
        
        -- Legal Department Custodians
        ('Jennifer Williams', 'jennifer.williams@company.com', 'Legal', 'General Counsel', 'acknowledged'),
        ('Robert Brown', 'robert.brown@company.com', 'Legal', 'Senior Attorney', 'acknowledged'),
        ('Lisa Martinez', 'lisa.martinez@company.com', 'Legal', 'Paralegal', 'pending'),
        
        -- IT Department Custodians
        ('James Anderson', 'james.anderson@company.com', 'IT', 'CTO', 'acknowledged'),
        ('Maria Garcia', 'maria.garcia@company.com', 'IT', 'IT Director', 'reminded'),
        ('Thomas Wilson', 'thomas.wilson@company.com', 'IT', 'Systems Administrator', 'pending'),
        ('Jessica Taylor', 'jessica.taylor@company.com', 'IT', 'Security Engineer', 'escalated'),
        
        -- Operations Department Custodians
        ('Christopher Moore', 'christopher.moore@company.com', 'Operations', 'COO', 'acknowledged'),
        ('Amanda Jackson', 'amanda.jackson@company.com', 'Operations', 'Operations Manager', 'acknowledged'),
        ('Daniel White', 'daniel.white@company.com', 'Operations', 'Project Manager', 'reminded'),
        
        -- HR Department Custodians
        ('Patricia Harris', 'patricia.harris@company.com', 'HR', 'HR Director', 'acknowledged'),
        ('Kevin Martin', 'kevin.martin@company.com', 'HR', 'HR Business Partner', 'pending'),
        
        -- Sales Department Custodians
        ('Linda Thompson', 'linda.thompson@company.com', 'Sales', 'VP Sales', 'acknowledged'),
        ('Mark Robinson', 'mark.robinson@company.com', 'Sales', 'Sales Director', 'reminded'),
        ('Nancy Lee', 'nancy.lee@company.com', 'Sales', 'Account Executive', 'pending'),
        
        -- Executive Team Custodians
        ('Richard Davis', 'richard.davis@company.com', 'Executive', 'CEO', 'acknowledged'),
        ('Barbara Miller', 'barbara.miller@company.com', 'Executive', 'Executive Assistant', 'acknowledged')
) AS custodian(name, email, department, title, status)
ON CONFLICT DO NOTHING;

-- Update last_reminded_at for custodians with reminded/escalated status
UPDATE public.legal_hold_custodians
SET last_reminded_at = now() - (random() * interval '5 days')
WHERE status IN ('reminded', 'escalated')
AND last_reminded_at IS NULL;

-- Display summary of inserted custodians
SELECT 
    h.name as hold_name,
    COUNT(c.id) as custodian_count,
    COUNT(CASE WHEN c.status = 'acknowledged' THEN 1 END) as acknowledged,
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN c.status = 'reminded' THEN 1 END) as reminded,
    COUNT(CASE WHEN c.status = 'escalated' THEN 1 END) as escalated
FROM public.legal_holds h
LEFT JOIN public.legal_hold_custodians c ON h.id = c.hold_id
GROUP BY h.id, h.name
ORDER BY h.name;

-- Display total summary
SELECT 
    COUNT(DISTINCT hold_id) as total_holds_with_custodians,
    COUNT(*) as total_custodians,
    COUNT(CASE WHEN status = 'acknowledged' THEN 1 END) as acknowledged,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'reminded' THEN 1 END) as reminded,
    COUNT(CASE WHEN status = 'escalated' THEN 1 END) as escalated,
    COUNT(CASE WHEN status = 'released' THEN 1 END) as released
FROM public.legal_hold_custodians;

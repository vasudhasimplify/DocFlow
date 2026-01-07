-- =====================================================
-- Retention Policy Templates - Seed Data
-- Created: 2025-12-18
-- Purpose: Pre-populate common compliance framework templates
-- =====================================================

-- Clear existing templates (if re-running)
DELETE FROM retention_policy_templates WHERE is_system_template = true;

-- =====================================================
-- GDPR - General Data Protection Regulation (EU)
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'GDPR - Personal Data',
    'Retain personal data for no longer than necessary. Default retention: 3 years after last contact or contract termination.',
    'GDPR',
    1095, -- 3 years
    'delete',
    'last_modified',
    true,
    ARRAY['Personal', 'Customer Data', 'HR', 'Contracts'],
    true
);

-- =====================================================
-- HIPAA - Health Insurance Portability and Accountability Act (US)
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'HIPAA - Medical Records',
    'Retain medical records for minimum 6 years from creation or last treatment date. Some states require longer retention.',
    'HIPAA',
    2190, -- 6 years
    'archive',
    'creation_date',
    true,
    ARRAY['Medical', 'Health', 'Patient Records', 'PHI'],
    true
);

-- =====================================================
-- SOX - Sarbanes-Oxley Act (US)
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    'SOX - Financial Records',
    'Retain financial documents and audit trails for 7 years as required by Sarbanes-Oxley Act.',
    'SOX',
    2555, -- 7 years
    'archive',
    'creation_date',
    true,
    ARRAY['Financial', 'Audit', 'Accounting', 'Tax'],
    true
);

-- =====================================================
-- PCI-DSS - Payment Card Industry Data Security Standard
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000004',
    'PCI-DSS - Payment Records',
    'Retain payment transaction logs and cardholder data for 1 year minimum. Securely delete after retention.',
    'PCI-DSS',
    365, -- 1 year
    'delete',
    'creation_date',
    true,
    ARRAY['Payments', 'Transactions', 'Financial', 'Credit Cards'],
    true
);

-- =====================================================
-- TAX - Tax Records (General)
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000005',
    'Tax - Business Records',
    'Retain tax-related documents for 7 years (IRS audit period is 6 years for substantial underreporting).',
    'TAX',
    2555, -- 7 years
    'archive',
    'creation_date',
    true,
    ARRAY['Tax', 'Financial', 'Receipts', 'Invoices', 'Payroll'],
    true
);

-- =====================================================
-- HR - Human Resources Records
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000006',
    'HR - Employment Records',
    'Retain employee records for 7 years after termination. Includes I-9 forms, tax documents, and personnel files.',
    'HR',
    2555, -- 7 years
    'archive',
    'event_based',
    true,
    ARRAY['HR', 'Employment', 'Personnel', 'Payroll', 'Benefits'],
    true
);

-- =====================================================
-- LEGAL - Legal Documents
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000007',
    'Legal - Contracts & Agreements',
    'Retain contracts for 7 years after expiration. Permanent retention recommended for major agreements.',
    'LEGAL',
    2555, -- 7 years
    'review',
    'event_based',
    true,
    ARRAY['Legal', 'Contracts', 'Agreements', 'Litigation', 'Compliance'],
    true
);

-- =====================================================
-- BUSINESS - General Business Records
-- =====================================================
INSERT INTO retention_policy_templates (
    id,
    name,
    description,
    compliance_framework,
    retention_period_days,
    disposition_action,
    trigger_type,
    requires_approval,
    category_suggestions,
    is_system_template
) VALUES (
    '00000000-0000-0000-0000-000000000008',
    'Business - General Documents',
    'Default retention for general business documents: 3 years. Review before disposition.',
    'BUSINESS',
    1095, -- 3 years
    'review',
    'creation_date',
    false,
    ARRAY['Business', 'General', 'Operations', 'Correspondence'],
    true
);

-- =====================================================
-- VERIFICATION & SUMMARY
-- =====================================================

DO $$
DECLARE
    template_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM retention_policy_templates WHERE is_system_template = true;
    
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Retention Policy Templates Seeded Successfully';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total Templates Created: %', template_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Templates Available:';
    RAISE NOTICE '  1. GDPR - Personal Data (3 years)';
    RAISE NOTICE '  2. HIPAA - Medical Records (6 years)';
    RAISE NOTICE '  3. SOX - Financial Records (7 years)';
    RAISE NOTICE '  4. PCI-DSS - Payment Records (1 year)';
    RAISE NOTICE '  5. TAX - Business Records (7 years)';
    RAISE NOTICE '  6. HR - Employment Records (7 years)';
    RAISE NOTICE '  7. LEGAL - Contracts & Agreements (7 years)';
    RAISE NOTICE '  8. BUSINESS - General Documents (3 years)';
    RAISE NOTICE '================================================';
END $$;

-- Display templates
SELECT 
    name,
    compliance_framework,
    retention_period_days || ' days (' || ROUND(retention_period_days::NUMERIC / 365, 1) || ' years)' AS retention_period,
    disposition_action,
    trigger_type,
    requires_approval
FROM retention_policy_templates
WHERE is_system_template = true
ORDER BY compliance_framework;

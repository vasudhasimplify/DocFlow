-- =====================================================
-- Part 2: Add RLS, Triggers, and Seed Templates
-- Run this AFTER the tables are created
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_retention_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposition_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policy_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own retention policies"
    ON retention_policies FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own document retention status"
    ON document_retention_status FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own legal holds"
    ON legal_holds FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own audit logs"
    ON disposition_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit logs"
    ON disposition_audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All users can view retention templates"
    ON retention_policy_templates FOR SELECT
    TO authenticated
    USING (true);

SELECT 'RLS policies created' AS status;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_retention_policies_updated_at 
    BEFORE UPDATE ON retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_retention_status_updated_at 
    BEFORE UPDATE ON document_retention_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_holds_updated_at 
    BEFORE UPDATE ON legal_holds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Triggers created' AS status;

-- Seed retention policy templates
INSERT INTO retention_policy_templates (name, description, compliance_framework, retention_period_days, disposition_action, trigger_type, requires_approval, category_suggestions, is_system_template)
VALUES 
    ('GDPR - Personal Data', 'Retain personal data for no longer than necessary. Default: 3 years.', 'GDPR', 1095, 'delete', 'last_modified', true, ARRAY['Personal', 'Customer Data', 'HR'], true),
    ('HIPAA - Medical Records', 'Retain medical records for minimum 6 years.', 'HIPAA', 2190, 'archive', 'creation_date', true, ARRAY['Medical', 'Health', 'Patient Records'], true),
    ('SOX - Financial Records', 'Retain financial documents for 7 years per Sarbanes-Oxley.', 'SOX', 2555, 'archive', 'creation_date', true, ARRAY['Financial', 'Audit', 'Accounting'], true),
    ('PCI-DSS - Payment Records', 'Retain payment transaction logs for 1 year minimum.', 'PCI-DSS', 365, 'delete', 'creation_date', true, ARRAY['Payments', 'Transactions', 'Financial'], true),
    ('TAX - Business Records', 'Retain tax-related documents for 7 years.', 'TAX', 2555, 'archive', 'creation_date', true, ARRAY['Tax', 'Financial', 'Receipts', 'Invoices'], true),
    ('HR - Employment Records', 'Retain employee records for 7 years after termination.', 'HR', 2555, 'archive', 'event_based', true, ARRAY['HR', 'Employment', 'Personnel', 'Payroll'], true),
    ('LEGAL - Contracts', 'Retain contracts for 7 years after expiration.', 'LEGAL', 2555, 'review', 'event_based', true, ARRAY['Legal', 'Contracts', 'Agreements'], true),
    ('BUSINESS - General', 'Default retention for general business documents: 3 years.', 'BUSINESS', 1095, 'review', 'creation_date', false, ARRAY['Business', 'General', 'Operations'], true);

SELECT 'Templates seeded: ' || COUNT(*) as status FROM retention_policy_templates;

-- Grant permissions
GRANT ALL ON retention_policies TO authenticated;
GRANT ALL ON document_retention_status TO authenticated;
GRANT ALL ON legal_holds TO authenticated;
GRANT ALL ON disposition_audit_log TO authenticated;
GRANT SELECT ON retention_policy_templates TO authenticated;

SELECT 'Phase 1 Complete - All retention tables ready!' AS status;

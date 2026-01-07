-- =====================================================
-- Retention Management System - Database Tables
-- Created: 2025-12-18
-- Purpose: Records retention, legal holds, and disposition management
-- =====================================================

-- =====================================================
-- 1. RETENTION POLICIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    disposition_action TEXT NOT NULL CHECK (disposition_action IN ('delete', 'archive', 'review', 'transfer')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('creation_date', 'last_modified', 'custom_date', 'event_based')),
    trigger_event TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    applies_to_categories TEXT[] DEFAULT '{}',
    applies_to_folders TEXT[] DEFAULT '{}',
    compliance_framework TEXT CHECK (compliance_framework IN ('GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'TAX', 'HR', 'LEGAL', 'BUSINESS', 'CUSTOM')),
    notification_days_before INTEGER DEFAULT 30,
    requires_approval BOOLEAN DEFAULT false,
    approval_roles TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. DOCUMENT RETENTION STATUS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS document_retention_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    policy_id UUID REFERENCES retention_policies(id) ON DELETE SET NULL,
    retention_start_date TIMESTAMPTZ NOT NULL,
    retention_end_date TIMESTAMPTZ NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'active' CHECK (current_status IN ('active', 'pending_review', 'pending_approval', 'on_hold', 'disposed', 'archived')),
    legal_hold_ids UUID[] DEFAULT '{}',
    disposition_action TEXT CHECK (disposition_action IN ('delete', 'archive', 'review', 'transfer')),
    disposition_date TIMESTAMPTZ,
    disposition_approved_by UUID,
    disposition_notes TEXT,
    exception_reason TEXT,
    exception_approved_by UUID,
    exception_end_date TIMESTAMPTZ,
    notification_sent BOOLEAN DEFAULT false,
    last_review_date TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(document_id, user_id)
);

-- =====================================================
-- 3. LEGAL HOLDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    hold_reason TEXT NOT NULL,
    matter_id TEXT,
    custodian_name TEXT,
    custodian_email TEXT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired')),
    document_ids UUID[] DEFAULT '{}',
    folder_ids UUID[] DEFAULT '{}',
    search_criteria JSONB,
    notes TEXT,
    created_by UUID,
    released_by UUID,
    released_at TIMESTAMPTZ,
    release_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. DISPOSITION AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS disposition_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('disposed', 'archived', 'transferred', 'extended', 'held', 'released', 'exception_granted')),
    action_by UUID NOT NULL,
    policy_id UUID REFERENCES retention_policies(id) ON DELETE SET NULL,
    legal_hold_id UUID REFERENCES legal_holds(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    document_metadata JSONB,
    certificate_number TEXT UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. RETENTION POLICY TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS retention_policy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    compliance_framework TEXT NOT NULL CHECK (compliance_framework IN ('GDPR', 'HIPAA', 'SOX', 'PCI-DSS', 'TAX', 'HR', 'LEGAL', 'BUSINESS', 'CUSTOM')),
    retention_period_days INTEGER NOT NULL CHECK (retention_period_days > 0),
    disposition_action TEXT NOT NULL CHECK (disposition_action IN ('delete', 'archive', 'review', 'transfer')),
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('creation_date', 'last_modified', 'custom_date', 'event_based')),
    requires_approval BOOLEAN DEFAULT false,
    category_suggestions TEXT[] DEFAULT '{}',
    is_system_template BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Retention Policies Indexes
CREATE INDEX IF NOT EXISTS idx_retention_policies_user ON retention_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_active ON retention_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_retention_policies_compliance ON retention_policies(compliance_framework);

-- Document Retention Status Indexes
CREATE INDEX IF NOT EXISTS idx_document_retention_status_document ON document_retention_status(document_id);
CREATE INDEX IF NOT EXISTS idx_document_retention_status_user ON document_retention_status(user_id);
CREATE INDEX IF NOT EXISTS idx_document_retention_status_end_date ON document_retention_status(retention_end_date);
CREATE INDEX IF NOT EXISTS idx_document_retention_status_status ON document_retention_status(current_status);
CREATE INDEX IF NOT EXISTS idx_document_retention_status_policy ON document_retention_status(policy_id);

-- Legal Holds Indexes
CREATE INDEX IF NOT EXISTS idx_legal_holds_user ON legal_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON legal_holds(status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_matter ON legal_holds(matter_id);

-- Disposition Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_disposition_audit_document ON disposition_audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_disposition_audit_user ON disposition_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_disposition_audit_created ON disposition_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disposition_audit_action ON disposition_audit_log(action);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to retention tables
DROP TRIGGER IF EXISTS update_retention_policies_updated_at ON retention_policies;
CREATE TRIGGER update_retention_policies_updated_at 
    BEFORE UPDATE ON retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_retention_status_updated_at ON document_retention_status;
CREATE TRIGGER update_document_retention_status_updated_at 
    BEFORE UPDATE ON document_retention_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_holds_updated_at ON legal_holds;
CREATE TRIGGER update_legal_holds_updated_at 
    BEFORE UPDATE ON legal_holds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_retention_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE disposition_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_policy_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can manage their own retention policies" ON retention_policies;
DROP POLICY IF EXISTS "Users can manage their own document retention status" ON document_retention_status;
DROP POLICY IF EXISTS "Users can manage their own legal holds" ON legal_holds;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON disposition_audit_log;
DROP POLICY IF EXISTS "Users can insert audit logs" ON disposition_audit_log;
DROP POLICY IF EXISTS "All users can view retention templates" ON retention_policy_templates;

-- Retention Policies: Users can manage their own
CREATE POLICY "Users can manage their own retention policies"
    ON retention_policies FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Document Retention Status: Users can manage their own
CREATE POLICY "Users can manage their own document retention status"
    ON document_retention_status FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Legal Holds: Users can manage their own
CREATE POLICY "Users can manage their own legal holds"
    ON legal_holds FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Disposition Audit Log: Users can view and insert their own logs
CREATE POLICY "Users can view their own audit logs"
    ON disposition_audit_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert audit logs"
    ON disposition_audit_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Retention Templates: All authenticated users can view
CREATE POLICY "All users can view retention templates"
    ON retention_policy_templates FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate retention end date
CREATE OR REPLACE FUNCTION calculate_retention_end_date(
    start_date TIMESTAMPTZ,
    retention_days INTEGER
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN start_date + (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if document is under legal hold
CREATE OR REPLACE FUNCTION is_document_under_legal_hold(doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    hold_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO hold_count
    FROM document_retention_status
    WHERE document_id = doc_id
    AND array_length(legal_hold_ids, 1) > 0;
    
    RETURN hold_count > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get documents expiring within N days
CREATE OR REPLACE FUNCTION get_expiring_documents(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    document_id UUID,
    policy_name TEXT,
    retention_end_date TIMESTAMPTZ,
    days_remaining NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        drs.document_id,
        rp.name AS policy_name,
        drs.retention_end_date,
        EXTRACT(EPOCH FROM (drs.retention_end_date - now())) / 86400 AS days_remaining
    FROM document_retention_status drs
    LEFT JOIN retention_policies rp ON rp.id = drs.policy_id
    WHERE drs.current_status = 'active'
    AND drs.retention_end_date <= now() + (days_ahead || ' days')::INTERVAL
    ORDER BY drs.retention_end_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- TRIGGER TO PREVENT DELETION OF DOCUMENTS UNDER LEGAL HOLD
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_legal_hold_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM document_retention_status
        WHERE document_id = OLD.id
        AND array_length(legal_hold_ids, 1) > 0
        AND current_status = 'on_hold'
    ) THEN
        RAISE EXCEPTION 'Cannot delete document ID % - under active legal hold', OLD.id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_legal_hold_before_delete ON documents;
CREATE TRIGGER check_legal_hold_before_delete
    BEFORE DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION prevent_legal_hold_deletion();

-- =====================================================
-- ADD ARCHIVE COLUMNS TO DOCUMENTS TABLE IF NOT EXISTS
-- =====================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'is_archived'
    ) THEN
        ALTER TABLE documents ADD COLUMN is_archived BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE documents ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'retention_locked'
    ) THEN
        ALTER TABLE documents ADD COLUMN retention_locked BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create index on archived status
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(is_archived) WHERE is_archived = true;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE retention_policies IS 'Stores retention policies that define how long documents are kept';
COMMENT ON TABLE document_retention_status IS 'Tracks retention status for individual documents';
COMMENT ON TABLE legal_holds IS 'Manages legal holds that prevent document disposition';
COMMENT ON TABLE disposition_audit_log IS 'Audit trail for all retention and disposition actions';
COMMENT ON TABLE retention_policy_templates IS 'Pre-built policy templates for common compliance frameworks';

COMMENT ON COLUMN retention_policies.retention_period_days IS 'Number of days to retain documents';
COMMENT ON COLUMN retention_policies.disposition_action IS 'Action to take when retention period expires: delete, archive, review, or transfer';
COMMENT ON COLUMN retention_policies.trigger_type IS 'When to start retention period: creation_date, last_modified, custom_date, or event_based';
COMMENT ON COLUMN retention_policies.compliance_framework IS 'Compliance framework this policy supports (GDPR, HIPAA, SOX, etc.)';

COMMENT ON COLUMN document_retention_status.current_status IS 'Current retention status: active, pending_review, pending_approval, on_hold, disposed, or archived';
COMMENT ON COLUMN document_retention_status.legal_hold_ids IS 'Array of legal hold IDs protecting this document';

COMMENT ON COLUMN disposition_audit_log.certificate_number IS 'Unique certificate number for compliance proof';
COMMENT ON COLUMN disposition_audit_log.action IS 'Disposition action: disposed, archived, transferred, extended, held, released, or exception_granted';

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS TO auth.users
-- =====================================================
-- Add these after tables are created to avoid dependency issues

DO $$ 
BEGIN
    -- Only add foreign keys if auth.users table exists and is accessible
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        
        -- retention_policies.user_id -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'retention_policies_user_id_fkey' 
            AND table_schema = 'public'
            AND table_name = 'retention_policies'
        ) THEN
            ALTER TABLE retention_policies 
            ADD CONSTRAINT retention_policies_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- document_retention_status.user_id -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'document_retention_status_user_id_fkey' 
            AND table_schema = 'public'
            AND table_name = 'document_retention_status'
        ) THEN
            ALTER TABLE document_retention_status 
            ADD CONSTRAINT document_retention_status_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- document_retention_status.disposition_approved_by -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'document_retention_status_disposition_approved_by_fkey' 
            AND table_schema = 'public'
            AND table_name = 'document_retention_status'
        ) THEN
            ALTER TABLE document_retention_status 
            ADD CONSTRAINT document_retention_status_disposition_approved_by_fkey 
            FOREIGN KEY (disposition_approved_by) REFERENCES auth.users(id);
        END IF;

        -- document_retention_status.exception_approved_by -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'document_retention_status_exception_approved_by_fkey' 
            AND table_schema = 'public'
            AND table_name = 'document_retention_status'
        ) THEN
            ALTER TABLE document_retention_status 
            ADD CONSTRAINT document_retention_status_exception_approved_by_fkey 
            FOREIGN KEY (exception_approved_by) REFERENCES auth.users(id);
        END IF;

        -- legal_holds.user_id -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'legal_holds_user_id_fkey' 
            AND table_schema = 'public'
            AND table_name = 'legal_holds'
        ) THEN
            ALTER TABLE legal_holds 
            ADD CONSTRAINT legal_holds_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- legal_holds.created_by -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'legal_holds_created_by_fkey' 
            AND table_schema = 'public'
            AND table_name = 'legal_holds'
        ) THEN
            ALTER TABLE legal_holds 
            ADD CONSTRAINT legal_holds_created_by_fkey 
            FOREIGN KEY (created_by) REFERENCES auth.users(id);
        END IF;

        -- legal_holds.released_by -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'legal_holds_released_by_fkey' 
            AND table_schema = 'public'
            AND table_name = 'legal_holds'
        ) THEN
            ALTER TABLE legal_holds 
            ADD CONSTRAINT legal_holds_released_by_fkey 
            FOREIGN KEY (released_by) REFERENCES auth.users(id);
        END IF;

        -- disposition_audit_log.user_id -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'disposition_audit_log_user_id_fkey' 
            AND table_schema = 'public'
            AND table_name = 'disposition_audit_log'
        ) THEN
            ALTER TABLE disposition_audit_log 
            ADD CONSTRAINT disposition_audit_log_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;

        -- disposition_audit_log.action_by -> auth.users
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'disposition_audit_log_action_by_fkey' 
            AND table_schema = 'public'
            AND table_name = 'disposition_audit_log'
        ) THEN
            ALTER TABLE disposition_audit_log 
            ADD CONSTRAINT disposition_audit_log_action_by_fkey 
            FOREIGN KEY (action_by) REFERENCES auth.users(id);
        END IF;

        RAISE NOTICE 'Foreign key constraints to auth.users added successfully';
    ELSE
        RAISE NOTICE 'Skipping auth.users foreign keys - auth.users table not accessible';
    END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on tables to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON retention_policies TO authenticated;
GRANT ALL ON document_retention_status TO authenticated;
GRANT ALL ON legal_holds TO authenticated;
GRANT ALL ON disposition_audit_log TO authenticated;
GRANT SELECT ON retention_policy_templates TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Retention Management Tables Created Successfully';
    RAISE NOTICE '  - retention_policies: OK';
    RAISE NOTICE '  - document_retention_status: OK';
    RAISE NOTICE '  - legal_holds: OK';
    RAISE NOTICE '  - disposition_audit_log: OK';
    RAISE NOTICE '  - retention_policy_templates: OK';
    RAISE NOTICE 'Indexes, Triggers, and RLS Policies: OK';
    RAISE NOTICE 'Helper Functions: OK';
END $$;

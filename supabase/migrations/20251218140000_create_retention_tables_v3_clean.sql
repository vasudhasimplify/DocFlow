-- V3 Clean Slate Migration
-- This will DROP existing tables to ensure a clean start.

-- Drop dependent tables first
DROP TABLE IF EXISTS legal_hold_custodians CASCADE;
DROP TABLE IF EXISTS legal_hold_audit_log CASCADE;
DROP TABLE IF EXISTS legal_hold_attachments CASCADE;

-- Drop main tables with CASCADE to handle any remaining dependencies
DROP TABLE IF EXISTS disposition_audit_log CASCADE;
DROP TABLE IF EXISTS legal_holds CASCADE;
DROP TABLE IF EXISTS document_retention_status CASCADE;
DROP TABLE IF EXISTS retention_policies CASCADE;
DROP TABLE IF EXISTS retention_policy_templates CASCADE;

SELECT 'Dropped existing retention tables (if any)' as status;

-- 1. RETENTION POLICIES
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    retention_period_days INTEGER NOT NULL,
    disposition_action TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_event TEXT,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    applies_to_categories TEXT[] DEFAULT '{}',
    applies_to_folders TEXT[] DEFAULT '{}',
    compliance_framework TEXT,
    notification_days_before INTEGER DEFAULT 30,
    requires_approval BOOLEAN DEFAULT false,
    approval_roles TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. DOCUMENT RETENTION STATUS
CREATE TABLE document_retention_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    policy_id UUID,
    retention_start_date TIMESTAMPTZ NOT NULL,
    retention_end_date TIMESTAMPTZ NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'active',
    legal_hold_ids UUID[] DEFAULT '{}',
    disposition_action TEXT,
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
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. LEGAL HOLDS
CREATE TABLE legal_holds (
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
    status TEXT NOT NULL DEFAULT 'active',
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

-- 4. DISPOSITION AUDIT LOG
CREATE TABLE disposition_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    action_by UUID NOT NULL,
    policy_id UUID,
    legal_hold_id UUID,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    document_metadata JSONB,
    certificate_number TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RETENTION POLICY TEMPLATES
CREATE TABLE retention_policy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    compliance_framework TEXT NOT NULL,
    retention_period_days INTEGER NOT NULL,
    disposition_action TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    requires_approval BOOLEAN DEFAULT false,
    category_suggestions TEXT[] DEFAULT '{}',
    is_system_template BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

SELECT 'Tables created successfully' AS status;

-- Add basic indexes
CREATE INDEX idx_retention_policies_user ON retention_policies(user_id);
CREATE INDEX idx_document_retention_status_document ON document_retention_status(document_id);
CREATE INDEX idx_document_retention_status_user ON document_retention_status(user_id);
CREATE INDEX idx_legal_holds_user ON legal_holds(user_id);
CREATE INDEX idx_disposition_audit_document ON disposition_audit_log(document_id);

SELECT 'Indexes created successfully' AS status;

-- ============================================================================
-- SimplifyDrive Workflow System - Complete Schema
-- Date: December 22, 2025
-- Description: Enterprise-grade workflow automation system
-- ============================================================================

-- ============================================================================
-- 1. WORKFLOW DEFINITIONS
-- Template/blueprint for reusable workflows
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- approval, legal, finance, HR, etc.
    color TEXT DEFAULT '#6B7280',
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft', -- draft, active, paused, archived
    trigger_type TEXT NOT NULL, -- manual, document_upload, form_submission, schedule, api_webhook, condition
    trigger_config JSONB DEFAULT '{}', -- Document types, conditions, schedule cron, webhook URL
    steps JSONB NOT NULL DEFAULT '[]', -- Array of WorkflowStep objects
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_template BOOLEAN DEFAULT false, -- Pre-built templates
    tags TEXT[] DEFAULT '{}',
    sla_settings JSONB DEFAULT '{
        "enabled": true,
        "total_workflow_hours": 168,
        "warning_threshold_percent": 75,
        "critical_threshold_percent": 90,
        "business_hours_only": true,
        "business_hours": {
            "start": "09:00",
            "end": "17:00",
            "timezone": "UTC",
            "exclude_weekends": true
        }
    }',
    notification_settings JSONB DEFAULT '{
        "on_start": true,
        "on_step_complete": true,
        "on_complete": true,
        "on_reject": true,
        "on_escalation": true,
        "on_sla_warning": true,
        "channels": ["email", "in_app"],
        "digest_enabled": false,
        "digest_frequency": "daily"
    }',
    stats JSONB DEFAULT '{"total_runs": 0, "completed_runs": 0, "avg_completion_time": 0, "success_rate": 0}',
    visual_layout JSONB DEFAULT '{}' -- For visual workflow builder node positions
);

-- ============================================================================
-- 2. WORKFLOW INSTANCES
-- Running executions of workflows on specific documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id),
    status TEXT DEFAULT 'active', -- active, completed, rejected, cancelled, paused
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical
    current_step_id TEXT,
    current_step_index INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT now(),
    started_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    escalation_count INTEGER DEFAULT 0,
    sla_breached BOOLEAN DEFAULT false,
    sla_breach_count INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. WORKFLOW STEP INSTANCES
-- Individual step executions within a workflow instance
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_step_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    step_name TEXT NOT NULL,
    step_type TEXT NOT NULL, -- approval, review, task, notification, condition, parallel, integration
    step_config JSONB DEFAULT '{}', -- approval_type: single/all/majority, min_approvals, allow_delegation, require_comment
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, rejected, skipped
    assigned_to UUID REFERENCES auth.users(id),
    assigned_group TEXT, -- For group assignments
    delegated_to UUID REFERENCES auth.users(id),
    delegated_by UUID REFERENCES auth.users(id),
    delegated_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),
    decision TEXT, -- approved, rejected, delegated
    comments TEXT,
    attachments JSONB DEFAULT '[]',
    sla_due_at TIMESTAMPTZ,
    is_overdue BOOLEAN DEFAULT false,
    escalation_level INTEGER DEFAULT 0,
    approval_count INTEGER DEFAULT 0, -- For majority/all approval types
    rejection_count INTEGER DEFAULT 0,
    approvers JSONB DEFAULT '[]', -- List of users who approved
    rejectors JSONB DEFAULT '[]', -- List of users who rejected
    parallel_branch_id TEXT, -- For parallel execution tracking
    condition_result BOOLEAN, -- For condition step results
    integration_response JSONB DEFAULT '{}', -- For integration step responses
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 4. ESCALATION RULES
-- Automatic escalation configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    is_global BOOLEAN DEFAULT false, -- Apply to all workflows
    is_active BOOLEAN DEFAULT true,
    priority TEXT DEFAULT 'medium', -- low, medium, high, critical
    conditions JSONB NOT NULL DEFAULT '[]', -- When to trigger
    actions JSONB NOT NULL DEFAULT '[]', -- What to do (notify, reassign, escalate_manager, auto_approve, auto_reject, pause)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    trigger_after_hours INTEGER DEFAULT 24,
    repeat_every_hours INTEGER,
    max_escalations INTEGER DEFAULT 3
);

-- ============================================================================
-- 5. ESCALATION HISTORY
-- Track when escalations were triggered
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES escalation_rules(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_instance_id UUID REFERENCES workflow_step_instances(id) ON DELETE CASCADE,
    triggered_at TIMESTAMPTZ DEFAULT now(),
    action_taken TEXT NOT NULL,
    action_details JSONB DEFAULT '{}',
    result TEXT, -- success, failed, skipped
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 6. WORKFLOW AUDIT LOG
-- Complete audit trail of all workflow actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_instance_id UUID REFERENCES workflow_step_instances(id),
    action TEXT NOT NULL, -- started, step_assigned, approved, rejected, delegated, escalated, completed, cancelled
    performed_by UUID REFERENCES auth.users(id),
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 7. WORKFLOW NOTIFICATIONS
-- Notification queue for workflow events
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_instance_id UUID REFERENCES workflow_step_instances(id),
    notification_type TEXT NOT NULL, -- workflow_started, step_assigned, step_completed, workflow_completed, sla_warning, escalated
    recipient_id UUID REFERENCES auth.users(id),
    channel TEXT NOT NULL, -- email, in_app, slack, teams
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    template_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Workflow Definitions
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON workflow_definitions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_category ON workflow_definitions(category);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by ON workflow_definitions(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_is_template ON workflow_definitions(is_template);

-- Workflow Instances
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_document_id ON workflow_instances(document_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_started_by ON workflow_instances(started_by);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_priority ON workflow_instances(priority);

-- Workflow Step Instances
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_instance_id ON workflow_step_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_assigned_to ON workflow_step_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_status ON workflow_step_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_step_instances_is_overdue ON workflow_step_instances(is_overdue);

-- Escalation Rules
CREATE INDEX IF NOT EXISTS idx_escalation_rules_workflow_id ON escalation_rules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_is_active ON escalation_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_is_global ON escalation_rules(is_global);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_instance_id ON workflow_audit_log(instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_performed_by ON workflow_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_log_created_at ON workflow_audit_log(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_recipient_id ON workflow_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_workflow_notifications_status ON workflow_notifications(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_step_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_notifications ENABLE ROW LEVEL SECURITY;

-- Workflow Definitions Policies
CREATE POLICY "Users can view workflows"
    ON workflow_definitions FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create workflows"
    ON workflow_definitions FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their workflows"
    ON workflow_definitions FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their workflows"
    ON workflow_definitions FOR DELETE
    USING (auth.uid() = created_by);

-- Workflow Instances Policies
CREATE POLICY "Users can view instances they're involved in"
    ON workflow_instances FOR SELECT
    USING (
        auth.uid() = started_by OR
        EXISTS (
            SELECT 1 FROM workflow_step_instances
            WHERE workflow_step_instances.instance_id = workflow_instances.id
            AND workflow_step_instances.assigned_to = auth.uid()
        )
    );

CREATE POLICY "Users can create instances"
    ON workflow_instances FOR INSERT
    WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Users can update instances they started"
    ON workflow_instances FOR UPDATE
    USING (auth.uid() = started_by);

-- Workflow Step Instances Policies
CREATE POLICY "Users can view steps assigned to them"
    ON workflow_step_instances FOR SELECT
    USING (
        auth.uid() = assigned_to OR
        auth.uid() = delegated_to OR
        EXISTS (
            SELECT 1 FROM workflow_instances
            WHERE workflow_instances.id = workflow_step_instances.instance_id
            AND workflow_instances.started_by = auth.uid()
        )
    );

CREATE POLICY "Users can update steps assigned to them"
    ON workflow_step_instances FOR UPDATE
    USING (auth.uid() = assigned_to OR auth.uid() = delegated_to);

-- Escalation Rules Policies
CREATE POLICY "Users can view escalation rules"
    ON escalation_rules FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create escalation rules"
    ON escalation_rules FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their escalation rules"
    ON escalation_rules FOR UPDATE
    USING (auth.uid() = created_by);

-- Audit Log Policies (Read-only for users)
CREATE POLICY "Users can view audit logs for their workflows"
    ON workflow_audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflow_instances
            WHERE workflow_instances.id = workflow_audit_log.instance_id
            AND workflow_instances.started_by = auth.uid()
        ) OR
        auth.uid() = performed_by
    );

-- Notifications Policies
CREATE POLICY "Users can view their notifications"
    ON workflow_notifications FOR SELECT
    USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their notifications"
    ON workflow_notifications FOR UPDATE
    USING (auth.uid() = recipient_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON workflow_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_step_instances_updated_at BEFORE UPDATE ON workflow_step_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON escalation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: PRE-BUILT TEMPLATES
-- ============================================================================

-- Template 1: Document Approval
INSERT INTO workflow_definitions (
    name, description, category, color, status, trigger_type, is_template, tags,
    steps
) VALUES (
    'Document Approval',
    'Standard document approval workflow with manager review',
    'approval',
    '#22C55E',
    'active',
    'manual',
    true,
    ARRAY['approval', 'document', 'standard'],
    '[
        {
            "id": "step-1",
            "name": "Submit for Review",
            "type": "task",
            "order": 1,
            "config": {"require_comment": true},
            "assignees": [{"type": "user", "value": "submitter"}],
            "sla_hours": 24
        },
        {
            "id": "step-2",
            "name": "Manager Review",
            "type": "review",
            "order": 2,
            "config": {},
            "assignees": [{"type": "role", "value": "manager"}],
            "sla_hours": 48
        },
        {
            "id": "step-3",
            "name": "Final Approval",
            "type": "approval",
            "order": 3,
            "config": {"approval_type": "single"},
            "assignees": [{"type": "role", "value": "director"}],
            "sla_hours": 72
        },
        {
            "id": "step-4",
            "name": "Publish Document",
            "type": "notification",
            "order": 4,
            "config": {},
            "assignees": [],
            "sla_hours": 1
        }
    ]'::jsonb
);

-- Template 2: Invoice Processing
INSERT INTO workflow_definitions (
    name, description, category, color, status, trigger_type, is_template, tags,
    steps
) VALUES (
    'Invoice Processing',
    'Automated invoice validation and payment approval',
    'finance',
    '#F59E0B',
    'active',
    'document_upload',
    true,
    ARRAY['finance', 'invoice', 'payment'],
    '[
        {
            "id": "step-1",
            "name": "Receive Invoice",
            "type": "task",
            "order": 1,
            "config": {},
            "assignees": [{"type": "group", "value": "accounts-payable"}],
            "sla_hours": 24
        },
        {
            "id": "step-2",
            "name": "Validate Details",
            "type": "review",
            "order": 2,
            "config": {"require_comment": true},
            "assignees": [{"type": "group", "value": "finance-team"}],
            "sla_hours": 48
        },
        {
            "id": "step-3",
            "name": "Approve Payment",
            "type": "approval",
            "order": 3,
            "config": {"approval_type": "majority", "min_approvals": 2},
            "assignees": [{"type": "group", "value": "finance-managers"}],
            "sla_hours": 120
        },
        {
            "id": "step-4",
            "name": "Process Payment",
            "type": "integration",
            "order": 4,
            "config": {"integration_type": "payment_gateway"},
            "assignees": [],
            "sla_hours": 24
        }
    ]'::jsonb
);

-- Template 3: Contract Review
INSERT INTO workflow_definitions (
    name, description, category, color, status, trigger_type, is_template, tags,
    steps
) VALUES (
    'Contract Review',
    'Legal contract review and signature workflow',
    'legal',
    '#A855F7',
    'active',
    'manual',
    true,
    ARRAY['legal', 'contract', 'review'],
    '[
        {
            "id": "step-1",
            "name": "Draft Review",
            "type": "review",
            "order": 1,
            "config": {},
            "assignees": [{"type": "user", "value": "contract-owner"}],
            "sla_hours": 72
        },
        {
            "id": "step-2",
            "name": "Legal Review",
            "type": "approval",
            "order": 2,
            "config": {"approval_type": "all"},
            "assignees": [{"type": "group", "value": "legal-team"}],
            "sla_hours": 120
        },
        {
            "id": "step-3",
            "name": "Executive Approval",
            "type": "approval",
            "order": 3,
            "config": {"approval_type": "single", "allow_delegation": true},
            "assignees": [{"type": "role", "value": "executive"}],
            "sla_hours": 168
        },
        {
            "id": "step-4",
            "name": "Sign Contract",
            "type": "integration",
            "order": 4,
            "config": {"integration_type": "docusign"},
            "assignees": [],
            "sla_hours": 24
        }
    ]'::jsonb
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE workflow_definitions IS 'Workflow templates/blueprints';
COMMENT ON TABLE workflow_instances IS 'Running workflow executions';
COMMENT ON TABLE workflow_step_instances IS 'Individual step executions';
COMMENT ON TABLE escalation_rules IS 'Automatic escalation configuration';
COMMENT ON TABLE escalation_history IS 'Escalation trigger history';
COMMENT ON TABLE workflow_audit_log IS 'Complete audit trail';
COMMENT ON TABLE workflow_notifications IS 'Notification queue';

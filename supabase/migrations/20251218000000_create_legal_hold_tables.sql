-- Create Legal Hold Tables

-- 1. Legal Holds Table
CREATE TABLE IF NOT EXISTS public.legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Matter Information
    matter_id TEXT NOT NULL,
    matter_name TEXT NOT NULL,
    matter_type TEXT NOT NULL, -- litigation, investigation, regulatory, etc.
    case_number TEXT,
    court_name TEXT,
    opposing_party TEXT,
    
    -- Hold Details
    hold_reason TEXT NOT NULL,
    scope TEXT NOT NULL, -- specific_documents, folder, search_criteria, etc.
    scope_details JSONB DEFAULT '{}',
    
    -- Dates
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    effective_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    anticipated_end_date TIMESTAMP WITH TIME ZONE,
    released_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'pending_approval', 'active', 'released', 'expired')),
    
    -- Acknowledgment Settings
    requires_acknowledgment BOOLEAN DEFAULT true,
    acknowledgment_deadline_days INTEGER DEFAULT 5,
    
    -- Notification Settings
    send_reminders BOOLEAN DEFAULT true,
    reminder_frequency_days INTEGER DEFAULT 7,
    escalation_enabled BOOLEAN DEFAULT true,
    escalation_after_days INTEGER DEFAULT 14,
    escalation_contacts TEXT[] DEFAULT '{}',
    
    -- Team
    issuing_attorney TEXT,
    legal_team_emails TEXT[] DEFAULT '{}',
    internal_notes TEXT,
    
    -- Stats Cache (updated via triggers or periodic jobs)
    cached_custodian_count INTEGER DEFAULT 0,
    cached_document_count INTEGER DEFAULT 0,
    cached_total_size_bytes BIGINT DEFAULT 0,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    released_by UUID REFERENCES auth.users(id),
    release_reason TEXT,
    release_approved_by TEXT
);

-- 2. Legal Hold Custodians Table
CREATE TABLE IF NOT EXISTS public.legal_hold_custodians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_id UUID NOT NULL REFERENCES public.legal_holds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), -- Optional, might just differ by email
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    department TEXT,
    title TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'reminded', 'escalated', 'released')),
    
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    last_reminded_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    escalated_at TIMESTAMP WITH TIME ZONE,
    released_at TIMESTAMP WITH TIME ZONE,
    
    added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    added_by UUID REFERENCES auth.users(id)
);

-- 3. Legal Hold Audit Log Table
CREATE TABLE IF NOT EXISTS public.legal_hold_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_id UUID NOT NULL REFERENCES public.legal_holds(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT,
    target_type TEXT, -- custodian, document, notification, etc.
    target_id TEXT,
    target_name TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Legal Hold Attachments (optional, for hold notices etc)
CREATE TABLE IF NOT EXISTS public.legal_hold_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hold_id UUID NOT NULL REFERENCES public.legal_holds(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_hold_custodians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_hold_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_hold_attachments ENABLE ROW LEVEL SECURITY;

-- Policies for legal_holds
-- Simplify: Allow authenticated users to view/create for now, or based on permissions.
-- Assuming 'legal-admin' role or similar exists, but for now allow all auth users to manage for simplified implementation.
CREATE POLICY "Users can view legal holds" ON public.legal_holds
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert legal holds" ON public.legal_holds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update legal holds" ON public.legal_holds
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete legal holds" ON public.legal_holds
    FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for legal_hold_custodians
CREATE POLICY "Users can view legal hold custodians" ON public.legal_hold_custodians
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage legal hold custodians" ON public.legal_hold_custodians
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for audit log
CREATE POLICY "Users can view audit log" ON public.legal_hold_audit_log
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert audit log" ON public.legal_hold_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Triggers for updated_at (drop if exists first to make migration idempotent)
DROP TRIGGER IF EXISTS update_legal_holds_updated_at ON public.legal_holds;
CREATE TRIGGER update_legal_holds_updated_at
    BEFORE UPDATE ON public.legal_holds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_legal_holds_status ON public.legal_holds(status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_matter_id ON public.legal_holds(matter_id);
CREATE INDEX IF NOT EXISTS idx_legal_hold_custodians_hold_id ON public.legal_hold_custodians(hold_id);
CREATE INDEX IF NOT EXISTS idx_legal_hold_custodians_email ON public.legal_hold_custodians(email);
CREATE INDEX IF NOT EXISTS idx_legal_hold_audit_hold_id ON public.legal_hold_audit_log(hold_id);

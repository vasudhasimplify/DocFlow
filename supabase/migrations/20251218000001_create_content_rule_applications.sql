-- Create content_rule_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES content_access_rules(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    matched_criteria JSONB DEFAULT '{}'::jsonb,
    actions_applied JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups by document
CREATE INDEX IF NOT EXISTS idx_rule_apps_document_id ON content_rule_applications(document_id);
-- Index for faster lookups by rule
CREATE INDEX IF NOT EXISTS idx_rule_apps_rule_id ON content_rule_applications(rule_id);

-- Create content_access_rules table
CREATE TABLE IF NOT EXISTS content_access_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Matching Criteria
  file_types TEXT[] DEFAULT '{}',
  name_patterns TEXT[] DEFAULT '{}',
  content_keywords TEXT[] DEFAULT '{}',
  folder_ids UUID[] DEFAULT '{}',
  size_min_bytes BIGINT,
  size_max_bytes BIGINT,
  
  -- Restrictions
  restrict_download BOOLEAN DEFAULT false,
  restrict_print BOOLEAN DEFAULT false,
  restrict_share BOOLEAN DEFAULT false,
  restrict_external_share BOOLEAN DEFAULT false,
  watermark_required BOOLEAN DEFAULT false,
  notify_on_match BOOLEAN DEFAULT false,
  
  -- Auto Actions
  auto_apply_permission TEXT,
  auto_apply_tags TEXT[] DEFAULT '{}',
  auto_move_to_folder UUID,
  
  -- Meta
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE content_access_rules ENABLE ROW LEVEL SECURITY;

-- Create Policy for full access to own rules
DROP POLICY IF EXISTS "Users can manage their own content rules" ON content_access_rules;

CREATE POLICY "Users can manage their own content rules"
  ON content_access_rules
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create Policy for rule applications (logs)
CREATE TABLE IF NOT EXISTS content_rule_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES content_access_rules(id) ON DELETE SET NULL,
  document_id UUID NOT NULL, -- soft reference to documents table
  matched_criteria JSONB,
  actions_applied JSONB,
  applied_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE content_rule_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their rule logs" ON content_rule_applications;

CREATE POLICY "Users can view their rule logs"
  ON content_rule_applications
  FOR SELECT
  USING (auth.uid() = applied_by OR EXISTS (
    SELECT 1 FROM content_access_rules 
    WHERE id = content_rule_applications.rule_id 
    AND user_id = auth.uid()
  ));

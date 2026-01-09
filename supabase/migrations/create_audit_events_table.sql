-- Create audit_events table for tracking all user and system activities
-- Run this SQL in Supabase Dashboard -> SQL Editor

-- First drop the table if it exists (to ensure clean creation)
DROP TABLE IF EXISTS audit_events CASCADE;

-- Create the table
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource references
  document_id UUID,
  folder_id UUID,
  user_id UUID NOT NULL,
  
  -- Action details
  action TEXT NOT NULL,
  action_category TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_name TEXT,
  
  -- Detailed information (JSONB for flexibility)
  details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Request context
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_document_id ON audit_events(document_id);
CREATE INDEX idx_audit_events_folder_id ON audit_events(folder_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_action_category ON audit_events(action_category);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_resource_type ON audit_events(resource_type);

-- Enable Row Level Security
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit events
CREATE POLICY "Users can view own audit events" ON audit_events
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own audit events
CREATE POLICY "Users can insert own audit events" ON audit_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON audit_events TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE audit_events IS 'Stores all audit trail events for document management, access control, and user activities';

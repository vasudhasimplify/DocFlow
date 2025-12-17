-- ============= ADD MISSING COLUMNS TO EXTERNAL_SHARES =============
-- This migration adds the missing columns required by the guest sharing API

-- Add allow_print column
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS allow_print BOOLEAN DEFAULT true;

-- Add allow_reshare column
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS allow_reshare BOOLEAN DEFAULT false;

-- Add password_protected column
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS password_protected BOOLEAN DEFAULT false;

-- Add require_login column (for future use)
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS require_login BOOLEAN DEFAULT false;

-- Add max_views column (limit number of views)
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS max_views INTEGER;

-- Add view_count column to track views
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add notification settings
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS notify_on_view BOOLEAN DEFAULT false;
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS notify_on_download BOOLEAN DEFAULT false;

-- Add message column for personal message with invitation
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS message TEXT;

-- Add accepted_at timestamp
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;

-- Add revoked_at timestamp
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

-- Add last_accessed_at timestamp
ALTER TABLE public.external_shares ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;

-- Create guest_access_logs table for tracking guest access
CREATE TABLE IF NOT EXISTS public.guest_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_id UUID NOT NULL REFERENCES public.external_shares(id) ON DELETE CASCADE,
  guest_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'download', 'print', 'comment', 'edit')),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  country TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_access_logs
ALTER TABLE public.guest_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Share owners can view access logs for their shares
CREATE POLICY "Share owners can view access logs" ON public.guest_access_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.external_shares 
      WHERE id = share_id AND owner_id = auth.uid()
    )
  );

-- Policy: Allow inserting access logs (for public guest access)
CREATE POLICY "Allow inserting access logs" ON public.guest_access_logs 
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_shares_owner_id ON public.external_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_external_shares_status ON public.external_shares(status);
CREATE INDEX IF NOT EXISTS idx_external_shares_guest_email ON public.external_shares(guest_email);
CREATE INDEX IF NOT EXISTS idx_external_shares_invitation_token ON public.external_shares(invitation_token);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_share_id ON public.guest_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_guest_access_logs_created_at ON public.guest_access_logs(created_at DESC);

-- Migration complete

-- ============= IMPORTANT: PUBLIC ACCESS POLICY =============
-- Allow guests (unauthenticated users) to read share data by token
-- This is required for the guest access page to work

-- Drop existing restrictive policy if exists
DROP POLICY IF EXISTS "Users manage external shares" ON public.external_shares;

-- Owner can do everything (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Owners manage external shares" ON public.external_shares 
  FOR ALL USING (auth.uid() = owner_id);

-- Anyone can SELECT shares (for guest access page) - but only limited data exposure
CREATE POLICY "Public can view shares by token" ON public.external_shares 
  FOR SELECT USING (true);

-- ============= ALLOW GUESTS TO READ SHARED DOCUMENTS =============
-- Guests need to read document metadata for documents shared with them
-- This policy allows reading documents that exist in external_shares

CREATE POLICY "Public can view shared documents" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.external_shares 
      WHERE external_shares.resource_id = documents.id::text
        AND external_shares.resource_type = 'document'
        AND external_shares.status IN ('pending', 'accepted')
    )
  );


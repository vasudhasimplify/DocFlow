-- Bug Report / Feedback Feature Schema
-- Migration: 20260112000000_user_feedback_schema.sql

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug_report', 'feature_request')),
  title text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'in_progress', 'resolved', 'closed', 'rejected')),
  user_email text,
  user_name text,
  user_role text,
  browser_info jsonb DEFAULT '{}'::jsonb,
  current_page_url text,
  attachments jsonb DEFAULT '[]'::jsonb,
  admin_notes text,
  assigned_to uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_feedback_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_priority ON public.user_feedback(priority);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can create feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (only before admin review)
CREATE POLICY "Users can update own pending feedback"
  ON public.user_feedback FOR UPDATE
  USING (auth.uid() = user_id AND status = 'submitted');

-- Admins can view all feedback (allow all authenticated users for now - restrict later if needed)
CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can update any feedback (allow all authenticated users for now - restrict later if needed)
CREATE POLICY "Admins can update all feedback"
  ON public.user_feedback FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create storage bucket for feedback attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-attachments',
  'feedback-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for feedback-attachments bucket

-- Users can upload to their own folder
CREATE POLICY "Users can upload feedback attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'feedback-attachments' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own attachments
CREATE POLICY "Users can view own feedback attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-attachments' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can view all feedback attachments (allow all authenticated users for now)
CREATE POLICY "Admins can view all feedback attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION public.update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_feedback_updated_at_trigger ON public.user_feedback;
CREATE TRIGGER update_user_feedback_updated_at_trigger
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_feedback_updated_at();

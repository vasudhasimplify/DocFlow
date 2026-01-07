-- Add RLS Policies for Documents Table (for Legal Hold access)
-- Run this in Supabase Dashboard → SQL Editor

-- First, check what policies exist
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'documents';

-- Drop all existing restrictive policies that might block access
DROP POLICY IF EXISTS "authenticated_users_read_documents" ON public.documents;
DROP POLICY IF EXISTS "Users can only see their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can only access their own documents" ON public.documents;

-- Create a permissive policy that allows authenticated users to read all documents
CREATE POLICY "authenticated_users_read_all_documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Verify the new policy is in place
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'documents';

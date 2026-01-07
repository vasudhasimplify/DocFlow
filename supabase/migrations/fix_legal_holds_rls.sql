-- Fix Legal Holds RLS Policies
-- Run this in Supabase Dashboard → SQL Editor

-- First, check if data exists
SELECT 'Total custodians in DB:' as info, COUNT(*) as count FROM public.legal_hold_custodians;
SELECT 'Sample custodians:' as info, * FROM public.legal_hold_custodians LIMIT 5;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view legal hold custodians" ON public.legal_hold_custodians;
DROP POLICY IF EXISTS "Users can manage legal hold custodians" ON public.legal_hold_custodians;

-- Create more permissive policies that actually work
CREATE POLICY "Allow authenticated users to read custodians" 
ON public.legal_hold_custodians
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert custodians" 
ON public.legal_hold_custodians
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update custodians" 
ON public.legal_hold_custodians
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete custodians" 
ON public.legal_hold_custodians
FOR DELETE 
TO authenticated
USING (true);

-- Same for audit log
DROP POLICY IF EXISTS "Users can view audit log" ON public.legal_hold_audit_log;
DROP POLICY IF EXISTS "Users can insert audit log" ON public.legal_hold_audit_log;

CREATE POLICY "Allow authenticated users to read audit log" 
ON public.legal_hold_audit_log
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert audit log" 
ON public.legal_hold_audit_log
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Same for attachments
DROP POLICY IF EXISTS "Users can view attachments" ON public.legal_hold_attachments;
DROP POLICY IF EXISTS "Users can manage attachments" ON public.legal_hold_attachments;

CREATE POLICY "Allow authenticated users to read attachments" 
ON public.legal_hold_attachments
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to manage attachments" 
ON public.legal_hold_attachments
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('legal_hold_custodians', 'legal_hold_audit_log', 'legal_hold_attachments')
ORDER BY tablename, policyname;

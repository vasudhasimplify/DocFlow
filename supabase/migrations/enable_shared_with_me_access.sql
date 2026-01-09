-- Enable access for guests to view their shares
-- This allows a user to query external_shares where they are the recipient

-- Drop existing policy if it conflicts (or create new one)
DROP POLICY IF EXISTS "Allow users to view their own shares or shares sent to them" ON public.external_shares;

CREATE POLICY "Allow users to view their own shares or shares sent to them"
ON public.external_shares
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR 
  guest_email = (select email from auth.users where id = auth.uid())
);

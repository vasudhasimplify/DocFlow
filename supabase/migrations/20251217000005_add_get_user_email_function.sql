-- Create function to get user email by ID
-- This is needed because we can't directly query auth.users from RLS policies

CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;
  
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_email_by_id(UUID) IS 'Gets user email by user ID from auth.users table';

GRANT EXECUTE ON FUNCTION public.get_user_email_by_id(UUID) TO authenticated;

-- Create a function to look up user ID by email
-- This is needed for ownership transfers since we can't access auth.users directly from client

CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Query auth.users to find user by email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email
  LIMIT 1;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_id_by_email(TEXT) IS 'Looks up a user ID by their email address from auth.users table';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;

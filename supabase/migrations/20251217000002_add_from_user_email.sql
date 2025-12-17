-- Add from_user_email column to document_ownership_transfers table
ALTER TABLE public.document_ownership_transfers 
ADD COLUMN IF NOT EXISTS from_user_email TEXT;

-- Update existing records to populate from_user_email
-- This uses a subquery to get the email from auth.users
UPDATE public.document_ownership_transfers
SET from_user_email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = document_ownership_transfers.from_user_id
)
WHERE from_user_email IS NULL;

-- Add a trigger to automatically populate from_user_email on insert
CREATE OR REPLACE FUNCTION public.set_from_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.from_user_email IS NULL THEN
    NEW.from_user_email := (
      SELECT email 
      FROM auth.users 
      WHERE id = NEW.from_user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_from_user_email_trigger
  BEFORE INSERT ON public.document_ownership_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_from_user_email();

COMMENT ON COLUMN public.document_ownership_transfers.from_user_email IS 'Email of the user initiating the transfer';
COMMENT ON FUNCTION public.set_from_user_email() IS 'Automatically populates from_user_email from auth.users on insert';

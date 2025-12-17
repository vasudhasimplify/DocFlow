-- Fix recursive trigger issue with document_locks
-- Drop the problematic trigger and recreate it properly

DROP TRIGGER IF EXISTS check_expired_locks ON public.document_locks;
DROP FUNCTION IF EXISTS public.expire_old_locks();

-- Recreate the function to expire locks without causing recursion
-- This version checks if the current row being inserted/updated is already expired
-- and doesn't trigger additional updates
CREATE OR REPLACE FUNCTION public.auto_expire_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set is_active to false if this specific row is expired
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < now() THEN
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a BEFORE trigger instead of AFTER to avoid recursion
CREATE TRIGGER auto_expire_lock_trigger
  BEFORE INSERT OR UPDATE ON public.document_locks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_expire_lock();

-- Optional: Create a scheduled job to expire old locks in batch
-- This is safer than using triggers for this purpose
-- Run this manually or set up pg_cron if available
CREATE OR REPLACE FUNCTION public.batch_expire_old_locks()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.document_locks
  SET is_active = false
  WHERE is_active = true
  AND expires_at IS NOT NULL
  AND expires_at < now();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.batch_expire_old_locks() IS 'Batch expire old locks - can be called periodically';
COMMENT ON FUNCTION public.auto_expire_lock() IS 'Automatically marks a lock as inactive if expired on insert/update';

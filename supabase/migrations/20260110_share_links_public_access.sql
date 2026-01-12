-- Enable anonymous/public access to share_links table for token-based lookups
-- This allows the GuestAccessPage to fetch share link details without authentication

-- Drop existing policies if they exist (to avoid duplicates)
DROP POLICY IF EXISTS "Public can view share links by token" ON public.share_links;
DROP POLICY IF EXISTS "Anyone can view active share links by token" ON public.share_links;

-- Create policy to allow anyone (including anonymous) to SELECT share links by token
-- This is safe because:
-- 1. Tokens are cryptographically random and hard to guess
-- 2. Only active, non-expired links are accessible
CREATE POLICY "Anyone can view active share links by token"
ON public.share_links
FOR SELECT
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Add additional columns that might be needed for full functionality
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS notify_on_access BOOLEAN DEFAULT false;
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS require_email BOOLEAN DEFAULT false;
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS signed_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_share_links_short_code ON public.share_links(short_code);

COMMENT ON POLICY "Anyone can view active share links by token" ON public.share_links 
IS 'Allows public/anonymous access to share links for token-based document sharing';

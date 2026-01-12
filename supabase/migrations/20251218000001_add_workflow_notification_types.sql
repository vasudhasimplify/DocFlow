-- Migration: Add workflow notification types to lock_notifications table
-- This allows workflow approval/rejection comments to use the existing notification infrastructure

-- 1. Make lock_id nullable (workflow notifications don't need a lock_id)
ALTER TABLE public.lock_notifications 
  ALTER COLUMN lock_id DROP NOT NULL;

-- 2. Drop the old constraint
ALTER TABLE public.lock_notifications 
  DROP CONSTRAINT IF EXISTS lock_notifications_notification_type_check;

-- 3. Add new constraint with workflow notification types
ALTER TABLE public.lock_notifications 
  ADD CONSTRAINT lock_notifications_notification_type_check 
  CHECK (notification_type IN (
    'lock_acquired',
    'lock_released', 
    'lock_expired',
    'force_unlock',
    'ownership_transferred',
    'access_requested',
    'share_accessed',
    'workflow_approved',
    'workflow_rejected'
  ));

-- 4. Add index for workflow-related notifications
CREATE INDEX IF NOT EXISTS idx_lock_notifications_workflow 
  ON public.lock_notifications(document_id, notification_type) 
  WHERE notification_type IN ('workflow_approved', 'workflow_rejected');

COMMENT ON TABLE public.lock_notifications IS 'Unified notification table for document locks, transfers, and workflow events';

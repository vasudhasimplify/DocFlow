"""
Apply workflow notification types migration
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

def apply_migration():
    """Apply the workflow notification types migration"""
    
    migration_sql = """
    -- Make lock_id nullable
    ALTER TABLE public.lock_notifications 
      ALTER COLUMN lock_id DROP NOT NULL;

    -- Drop old constraint
    ALTER TABLE public.lock_notifications 
      DROP CONSTRAINT IF EXISTS lock_notifications_notification_type_check;

    -- Add new constraint with workflow types
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

    -- Add index for workflow notifications
    CREATE INDEX IF NOT EXISTS idx_lock_notifications_workflow 
      ON public.lock_notifications(document_id, notification_type) 
      WHERE notification_type IN ('workflow_approved', 'workflow_rejected');
    """
    
    try:
        # Execute migration using Supabase SQL
        result = supabase.rpc('exec_sql', {'sql': migration_sql}).execute()
        print("✅ Migration applied successfully!")
        print("Added workflow_approved and workflow_rejected notification types")
        return True
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("\nPlease apply the migration manually using Supabase SQL Editor:")
        print(migration_sql)
        return False

if __name__ == "__main__":
    apply_migration()

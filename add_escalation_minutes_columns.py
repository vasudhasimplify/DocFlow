"""
Apply escalation minutes columns migration
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("VITE_SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: Missing Supabase credentials in .env file")
    print("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are set")
    exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# SQL to add minute columns
migration_sql = """
-- Add minute columns to escalation_rules for rapid testing
ALTER TABLE escalation_rules 
ADD COLUMN IF NOT EXISTS trigger_after_minutes INTEGER;

ALTER TABLE escalation_rules 
ADD COLUMN IF NOT EXISTS repeat_every_minutes INTEGER;

COMMENT ON COLUMN escalation_rules.trigger_after_minutes IS 'Trigger after X minutes - takes precedence over trigger_after_hours for testing';
COMMENT ON COLUMN escalation_rules.repeat_every_minutes IS 'Repeat every X minutes - takes precedence over repeat_every_hours for testing';
"""

print("Applying migration: Add escalation_rules minute columns")
print("-" * 60)

try:
    # Execute the migration
    result = supabase.rpc('exec_sql', {'sql': migration_sql}).execute()
    print("✅ Migration applied successfully!")
    print("Added columns:")
    print("  - trigger_after_minutes (INTEGER)")
    print("  - repeat_every_minutes (INTEGER)")
except Exception as e:
    # If RPC doesn't work, try direct execution
    print(f"RPC method failed: {e}")
    print("\nPlease run this SQL manually in Supabase SQL Editor:")
    print("=" * 60)
    print(migration_sql)
    print("=" * 60)

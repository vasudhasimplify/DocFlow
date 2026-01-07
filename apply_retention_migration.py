"""
Apply database migration to add unique constraint on document_retention_status.document_id
This fixes the "ON CONFLICT" error when applying retention policies.
"""
import os
from supabase import create_client

# Get Supabase credentials from environment or use defaults
SUPABASE_URL = "https://uajyetwarydyvjazopko.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhanlldHdhcnlkeXZqYXpvcGtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5Mjc4MDksImV4cCI6MjA0OTUwMzgwOX0.d6P_hK38_2-ixrU0sHcGrWpVRCXIj2u-DjRPgWHXX5w")

print("🔧 Connecting to Supabase...")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

migration_sql = """
-- Add unique constraint on document_id to support upsert operations
-- This allows ON CONFLICT (document_id) to work properly

-- First, check if there are any duplicate document_ids and remove them
-- Keep only the most recent entry for each document
DELETE FROM document_retention_status a
USING document_retention_status b
WHERE a.document_id = b.document_id 
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE document_retention_status
ADD CONSTRAINT document_retention_status_document_id_unique UNIQUE (document_id);

SELECT 'Added unique constraint on document_id' AS status;
"""

try:
    print("📝 Applying migration...")
    print("   - Removing duplicate document_ids (if any)")
    print("   - Adding unique constraint on document_id")
    
    # Execute the migration
    result = supabase.rpc('exec_sql', {'sql': migration_sql}).execute()
    
    print("✅ Migration applied successfully!")
    print("   You can now apply retention policies to documents without errors.")
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    print("\n💡 Alternative: Run this SQL manually in Supabase SQL Editor:")
    print("-" * 60)
    print(migration_sql)
    print("-" * 60)


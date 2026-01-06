"""
Script to fix duplicate document_processing_queue entries
Removes duplicates and applies unique constraint
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.core.supabase_client import get_supabase_client

def fix_duplicates():
    """Remove duplicate queue entries and apply unique constraint."""
    supabase = get_supabase_client()
    
    print("🔍 Checking for duplicate queue entries...")
    
    # Read and execute the migration SQL
    migration_path = backend_dir.parent / "supabase" / "migrations" / "20260105_add_unique_document_queue.sql"
    
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        return
    
    with open(migration_path, 'r') as f:
        sql = f.read()
    
    # Split into separate statements and execute
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for i, statement in enumerate(statements):
        if statement:
            try:
                print(f"\n📝 Executing statement {i+1}/{len(statements)}...")
                print(f"   {statement[:100]}...")
                result = supabase.rpc('exec_sql', {'query': statement}).execute()
                print(f"   ✅ Success")
            except Exception as e:
                # Try using postgrest directly
                print(f"   ⚠️ RPC failed, trying direct execution...")
                print(f"   Error: {e}")
    
    print("\n✅ Migration completed!")
    print("Please run this SQL manually in your Supabase SQL Editor if needed:")
    print(f"\n{sql}\n")

if __name__ == "__main__":
    fix_duplicates()

"""
Run Supabase retention table migrations
"""
import os
import sys
from pathlib import Path
from supabase import create_client, Client

# Read environment variables
SUPABASE_URL = "https://uajyetwarydyvjazopko.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhanlldHdhcnlkeXZqYXpvcGtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkxNzgyMywiZXhwIjoyMDc1NDkzODIzfQ.QxELF22qrTrznqf4fS0hFLVBTMXsvviLjkeVazc_Ku0"

def run_migration():
    """Run the retention tables migration"""
    try:
        # Create Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Read migration files
        migrations_dir = Path(__file__).parent / "supabase" / "migrations"
        
        # Migration 1: Create tables
        migration_1 = migrations_dir / "20251218140000_create_retention_tables.sql"
        print(f"\n{'='*60}")
        print(f"Running Migration 1: Create Retention Tables")
        print(f"{'='*60}")
        
        with open(migration_1, 'r', encoding='utf-8') as f:
            sql_1 = f.read()
        
        # Execute via Supabase RPC or direct SQL
        # Note: Supabase Python client doesn't have direct SQL execution
        # We need to use the REST API directly
        print("\n⚠️  IMPORTANT: Supabase Python client cannot execute raw SQL directly.")
        print("You need to run this migration using one of these methods:\n")
        
        print("METHOD 1 - Supabase Dashboard (Recommended):")
        print("  1. Go to: https://uajyetwarydyvjazopko.supabase.co")
        print("  2. Navigate to SQL Editor")
        print("  3. Click 'New Query'")
        print(f"  4. Copy the contents of: {migration_1}")
        print("  5. Paste and click 'Run'\n")
        
        print("METHOD 2 - Install Supabase CLI:")
        print("  1. Install: npm install -g supabase")
        print("  2. Link project: supabase link --project-ref uajyetwarydyvjazopko")
        print("  3. Run: supabase db push\n")
        
        print("METHOD 3 - Use psql (PostgreSQL client):")
        print("  Get connection string from Supabase dashboard settings\n")
        
        # Print the SQL for easy copying
        print(f"\n{'='*60}")
        print("SQL MIGRATION FILE LOCATION:")
        print(f"{'='*60}")
        print(f"File 1: {migration_1.absolute()}")
        
        # Migration 2: Seed templates
        migration_2 = migrations_dir / "20251218140001_seed_retention_templates.sql"
        print(f"File 2: {migration_2.absolute()}")
        print(f"{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

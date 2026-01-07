"""Apply workflow metadata migration"""
import os
import sys
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("❌ Missing Supabase credentials in .env")
    sys.exit(1)

# Connect to Supabase
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
print("✅ Connected to Supabase")

# Read migration file
migration_path = Path(__file__).parent.parent / "supabase" / "migrations" / "20251230_add_workflow_metadata.sql"
with open(migration_path, 'r') as f:
    migration_sql = f.read()

print(f"\n📝 Applying migration from {migration_path.name}")
print("=" * 60)

# Execute migration
try:
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    for statement in statements:
        if statement:
            print(f"\n🔧 Executing: {statement[:80]}...")
            # Use raw SQL execution
            result = supabase.rpc('exec_sql', {'sql': statement}).execute()
            print("✅ Success")
    
    print("\n" + "=" * 60)
    print("✅ Migration applied successfully!")
    
except Exception as e:
    print(f"\n❌ Error applying migration: {str(e)}")
    print("\nTrying alternative method...")
    
    # Alternative: Direct execution using psycopg2 if available
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Parse Supabase URL to get connection string
        # Note: This assumes you have database direct access
        print("Please run the migration manually using Supabase SQL Editor")
        print(f"\nMigration SQL:\n{migration_sql}")
        
    except ImportError:
        print("\n💡 Please apply this migration manually in Supabase SQL Editor:")
        print("\n" + "=" * 60)
        print(migration_sql)
        print("=" * 60)

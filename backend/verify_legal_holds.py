import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).parent
env_file_path = backend_dir / ".env"
if env_file_path.exists():
    load_dotenv(env_file_path)

from app.core.supabase import supabase
import sys
import time

print("Checking legal_holds table...")

try:
    # Try multiple times in case of transient issues
    for i in range(3):
        try:
            response = supabase.table('legal_holds').select('count', count='exact').limit(1).execute()
            print("SUCCESS: Table 'legal_holds' exists.")
            sys.exit(0)
        except Exception as e:
            if 'relation "legal_holds" does not exist' in str(e) or '404' in str(e):
                print("Table does not exist yet.")
                raise e
            print(f"Retrying... {e}")
            time.sleep(1)
            
except Exception as e:
    print("FAILURE: Could not access table 'legal_holds'.")
    print("\nPlease run the migration: supabase/migrations/20251218000000_create_legal_hold_tables.sql")
    sys.exit(1)

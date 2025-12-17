import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).parent
env_file_path = backend_dir / ".env"
if env_file_path.exists():
    load_dotenv(env_file_path)

from app.core.supabase import supabase
import sys

tables = ['legal_holds', 'legal_hold_custodians', 'legal_hold_audit_log']
missing = []

print("Checking tables...")
for table in tables:
    try:
        # Perform a minimal query
        response = supabase.table(table).select('count', count='exact').limit(1).execute()
        print(f"✅ {table} exists.")
    except Exception as e:
        print(f"❌ {table} NOT FOUND or Error: {e}")
        missing.append(table)

if missing:
    print(f"\nMissing tables: {', '.join(missing)}")
    sys.exit(1)
else:
    print("\nAll tables validated.")
    sys.exit(0)

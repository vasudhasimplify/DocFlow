from app.core.supabase import supabase
import sys

print("Checking database connection...")

try:
    # Try to select from the table (limit 1 to be fast)
    response = supabase.table('document_watermarks').select('*').limit(1).execute()
    print("SUCCESS: Table 'document_watermarks' exists.")
    print(f"Data sample: {response.data}")
except Exception as e:
    print("FAILURE: Could not access table 'document_watermarks'.")
    print(f"Error details: {e}")
    # Check if it's a specific 'relation does not exist' error
    if 'relation "document_watermarks" does not exist' in str(e):
        print("\n!!! CRITICAL: THE TABLE DOES NOT EXIST !!!")
        print("You must run the SQL migration script in Supabase SQL Editor.")
    sys.exit(1)

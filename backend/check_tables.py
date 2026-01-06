"""Check tables existence"""
from app.core.supabase_client import get_supabase_client
import sys

def main():
    supabase = get_supabase_client()
    
    print("Checking 'profiles' table...")
    try:
        res = supabase.table('profiles').select('count', count='exact').head(True).execute()
        print(f"✅ 'profiles' table EXISTS (count: {res.count})")
    except Exception as e:
        print(f"❌ 'profiles' table query failed: {e}")

    print("\nChecking 'users' table...")
    try:
        res = supabase.table('users').select('count', count='exact').head(True).execute()
        print(f"✅ 'users' table EXISTS (count: {res.count})")
    except Exception as e:
        print(f"❌ 'users' table query failed: {e}")

if __name__ == "__main__":
    main()

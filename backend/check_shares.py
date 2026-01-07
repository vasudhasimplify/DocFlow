"""Check if identity mapping created shares"""
from app.core.supabase_client import get_supabase_client


def main():
    supabase = get_supabase_client()
    
    # Check recent external_shares
    print("=== Recent External Shares ===")
    result = supabase.table('external_shares').select('id,guest_email,resource_type,permission,message,created_at').order('created_at', desc=True).limit(5).execute()
    if result.data:
        for share in result.data:
            print(f"  {share['guest_email']} - {share['permission']} - {share.get('message', 'no message')}")
    else:
        print("  No shares found")
    
    # Check if shrutisharma10072003 exists in profiles
    print()
    print("=== Looking for shrutisharma10072003 user ===")
    result2 = supabase.table('profiles').select('id,email,full_name').ilike('email', '%shrutisharma%').execute()
    if result2.data:
        for p in result2.data:
            print(f"  Found: {p['email']} - {p['id']}")
    else:
        print("  NOT FOUND - This user does not exist in SimplifyDrive!")
        print("  Identity mapping can only share with EXISTING users!")


if __name__ == "__main__":
    main()

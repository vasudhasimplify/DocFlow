"""
Script to remove duplicate documents
Keeps only the oldest copy of each document
"""
import os
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
for env_path in [Path("backend") / ".env", Path(".env"), backend_dir / ".env"]:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        break

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
    sys.exit(1)

client = create_client(supabase_url, supabase_key)

print("=" * 80)
print("REMOVING DUPLICATE DOCUMENTS")
print("=" * 80)

# Get all active documents
result = client.table("documents").select("*").eq("is_deleted", False).order("created_at", desc=False).execute()

documents = result.data
print(f"\n📊 Total active documents: {len(documents)}")

# Group by file_name
from collections import defaultdict
docs_by_name = defaultdict(list)
for doc in documents:
    docs_by_name[doc["file_name"]].append(doc)

# Find duplicates
duplicates_to_delete = []
for file_name, docs in docs_by_name.items():
    if len(docs) > 1:
        # Keep the oldest (first in sorted list), delete the rest
        keep_doc = docs[0]
        delete_docs = docs[1:]
        
        print(f"\n📄 {file_name}: {len(docs)} copies")
        print(f"   ✅ KEEP: ID {keep_doc['id'][:8]}... | Created: {keep_doc['created_at'][:19]}")
        
        for doc in delete_docs:
            print(f"   ❌ DELETE: ID {doc['id'][:8]}... | Created: {doc['created_at'][:19]}")
            duplicates_to_delete.append(doc['id'])

if not duplicates_to_delete:
    print("\n✅ No duplicates found!")
    sys.exit(0)

print(f"\n⚠️  Total documents to delete: {len(duplicates_to_delete)}")
print("\n" + "=" * 80)

# Confirm before deleting
response = input("Do you want to proceed with deletion? (yes/no): ")

if response.lower() != 'yes':
    print("❌ Deletion cancelled")
    sys.exit(0)

print("\n🗑️  Deleting duplicates...")

# Soft delete by setting is_deleted = true
deleted_count = 0
for doc_id in duplicates_to_delete:
    try:
        client.table("documents").update({"is_deleted": True}).eq("id", doc_id).execute()
        deleted_count += 1
        print(f"   ✅ Deleted: {doc_id[:8]}...")
    except Exception as e:
        print(f"   ❌ Failed to delete {doc_id[:8]}...: {e}")

print(f"\n✅ Successfully deleted {deleted_count} duplicate documents")
print(f"📊 Remaining active documents: {len(documents) - deleted_count}")
print("\n" + "=" * 80)

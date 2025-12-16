"""
Diagnostic script to check document count and processing status
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from supabase import create_client

# Load environment variables - try both locations
env_loaded = False
for env_path in [Path("backend") / ".env", Path(".env"), backend_dir / ".env"]:
    if env_path.exists():
        print(f"Loading .env from: {env_path}")
        load_dotenv(env_path, override=True)
        env_loaded = True
        break

if not env_loaded:
    print("Warning: No .env file found")

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

print(f"SUPABASE_URL loaded: {bool(supabase_url)}")
print(f"SUPABASE_KEY loaded: {bool(supabase_key)}")

if not supabase_url or not supabase_key:
    print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file")
    sys.exit(1)

client = create_client(supabase_url, supabase_key)

print("=" * 80)
print("DOCUMENT COUNT ANALYSIS")
print("=" * 80)

# Get all documents
result = client.table("documents").select("id, file_name, processing_status, is_deleted, created_at, user_id").order("created_at", desc=True).execute()

total = len(result.data)
print(f"\n📊 Total documents in database: {total}")

# Count by is_deleted
active = [d for d in result.data if not d.get("is_deleted")]
deleted = [d for d in result.data if d.get("is_deleted")]

print(f"✅ Active documents: {len(active)}")
print(f"🗑️  Deleted documents: {len(deleted)}")

# Count by processing_status (active only)
from collections import Counter
status_counts = Counter([d["processing_status"] for d in active])
print(f"\n📋 Processing Status (Active Documents):")
for status, count in status_counts.items():
    print(f"   {status}: {count}")

# Count by user
user_counts = Counter([d["user_id"] for d in active])
print(f"\n👥 Documents by User (Active):")
for user_id, count in user_counts.most_common():
    print(f"   {user_id}: {count} documents")

# Check for duplicates
print(f"\n🔍 Checking for duplicate file names...")
name_counts = Counter([d["file_name"] for d in active])
duplicates = {name: count for name, count in name_counts.items() if count > 1}

if duplicates:
    print(f"⚠️  Found {len(duplicates)} files with duplicates:")
    for name, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True):
        print(f"   '{name}': {count} copies")
        # Show the IDs and dates of duplicates
        dup_docs = [d for d in active if d["file_name"] == name]
        for doc in dup_docs:
            print(f"      - ID: {doc['id'][:8]}... | Created: {doc['created_at'][:19]} | Status: {doc['processing_status']}")
else:
    print("✅ No duplicate file names found")

print(f"\n📅 Recent 10 documents:")
for doc in active[:10]:
    status_emoji = "✅" if doc["processing_status"] == "completed" else "⏳"
    has_text = bool(doc.get("extracted_text"))
    text_status = "✅ Has Text" if has_text else "❌ No Text"
    print(f"   {status_emoji} {doc['file_name'][:40]:40} | Status: {doc['processing_status']:12} | {text_status:15} | Created: {doc['created_at'][:19]}")

# Check how many documents are missing extracted_text
missing_text = [d for d in active if not d.get("extracted_text")]
print(f"\n⚠️  Documents without extracted_text: {len(missing_text)} / {len(active)}")
if missing_text:
    print("Sample files missing text:")
    for doc in missing_text[:5]:
        print(f"   - {doc['file_name']}")

print("\n" + "=" * 80)

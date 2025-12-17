"""
Supabase client module
Provides access to Supabase instance
"""

import os
from supabase import create_client, Client

# Initialize Supabase client
_supabase_url = os.getenv("SUPABASE_URL")
_supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not _supabase_url or not _supabase_key:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")

supabase: Client = create_client(_supabase_url, _supabase_key)

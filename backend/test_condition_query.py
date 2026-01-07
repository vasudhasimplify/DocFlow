from supabase import create_client
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY'))

date_from = datetime.now() - timedelta(days=30)
print(f'Date from: {date_from.isoformat()}')

result = supabase.table('workflow_step_instances').select('id, created_at, metadata').eq('step_type', 'condition').execute()
print(f'\nAll condition steps ({len(result.data)}):')
for row in result.data:
    print(f"  - {row['created_at']}")
    print(f"    metadata: {row.get('metadata')}")

# Test the exact query from analytics endpoint
date_from_iso = date_from.isoformat()
print(f"\nTesting analytics query with date >= {date_from_iso}")
filtered_result = supabase.table('workflow_step_instances')\
    .select('metadata, condition_result, step_config, created_at')\
    .eq('step_type', 'condition')\
    .gte('created_at', date_from_iso)\
    .execute()

print(f'Filtered results: {len(filtered_result.data)}')
for row in filtered_result.data:
    print(f"  - {row['created_at']}")
    print(f"    condition_result: {row.get('condition_result')}")
    print(f"    metadata: {row.get('metadata')}")

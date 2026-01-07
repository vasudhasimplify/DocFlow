import sys
sys.path.insert(0, 'C:\\Users\\DELL\\Desktop\\DocFlowForked\\DocFlow\\backend')

from app.core.supabase_client import get_supabase_client
from datetime import datetime

supabase = get_supabase_client()

# Check is_overdue status
print('=== CHECKING STEP OVERDUE STATUS ===')
step = supabase.table('workflow_step_instances').select('id, step_name, status, is_overdue, created_at, sla_due_at').eq('id', 'b839626f-82dc-4e49-a2a0-a28456c53d86').execute()
if step.data:
    s = step.data[0]
    print(f"Step: {s['step_name']}")
    print(f"Status: {s['status']}")
    print(f"is_overdue: {s.get('is_overdue', 'NOT SET')}")
    print(f"Created: {s['created_at']}")
    print(f"SLA Due: {s.get('sla_due_at', 'NOT SET')}")
    
    # Calculate hours since created
    created = datetime.fromisoformat(s['created_at'].replace('Z', '+00:00'))
    now = datetime.now(created.tzinfo)
    hours = (now - created).total_seconds() / 3600
    print(f"Hours since created: {hours:.2f}")
print()

# Check condition steps
print('=== CHECKING CONDITION STEPS ===')
conditions = supabase.table('workflow_step_instances').select('step_type, step_name, condition_result, metadata, step_config').eq('step_type', 'condition').execute()
print(f"Total condition steps: {len(conditions.data)}")
if conditions.data:
    for c in conditions.data[:5]:
        print(f"  - {c['step_name']}: result={c.get('condition_result', 'NOT SET')}, metadata={c.get('metadata')}, config={c.get('step_config')}")
else:
    print('  No condition steps found - You need to create workflows with condition steps to see evaluations')
print()

# Check all overdue steps for bottlenecks
print('=== CHECKING OVERDUE STEPS FOR BOTTLENECKS ===')
overdue = supabase.table('workflow_step_instances').select('step_name, is_overdue, status, started_at').eq('is_overdue', True).execute()
print(f"Total overdue steps: {len(overdue.data)}")
for o in overdue.data[:5]:
    print(f"  - {o['step_name']}: status={o['status']}, started={o.get('started_at', 'N/A')}")

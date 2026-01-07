"""
Example helper function for evaluating workflow conditions and storing metadata.
This can be integrated into your workflow execution logic.
"""
from typing import Dict, Any, Optional
from datetime import datetime

def evaluate_condition(
    condition_config: Dict[str, Any],
    workflow_data: Dict[str, Any],
    extracted_data: Optional[Dict[str, Any]] = None
) -> tuple[bool, Dict[str, Any]]:
    """
    Evaluate a workflow condition and return result with metadata.
    
    Args:
        condition_config: Condition configuration from step config
            Example: {
                "field": "amount",
                "operator": "greater_than",
                "value": 10000,
                "label": "Amount > $10,000"
            }
        workflow_data: Workflow instance data
        extracted_data: Optional extracted document data
        
    Returns:
        Tuple of (result: bool, metadata: dict)
    """
    field = condition_config.get("field")
    operator = condition_config.get("operator")
    threshold = condition_config.get("value")
    label = condition_config.get("label", f"{field} {operator} {threshold}")
    
    # Get actual value from extracted data or workflow metadata
    actual_value = None
    if extracted_data and field in extracted_data:
        actual_value = extracted_data[field]
    elif field in workflow_data.get("metadata", {}):
        actual_value = workflow_data["metadata"][field]
    
    # Evaluate based on operator
    result = False
    if operator == "equals":
        result = actual_value == threshold
    elif operator == "not_equals":
        result = actual_value != threshold
    elif operator == "greater_than":
        result = float(actual_value) > float(threshold) if actual_value is not None else False
    elif operator == "less_than":
        result = float(actual_value) < float(threshold) if actual_value is not None else False
    elif operator == "contains":
        result = str(threshold).lower() in str(actual_value).lower() if actual_value else False
    elif operator == "in":
        result = actual_value in threshold if actual_value and isinstance(threshold, list) else False
    
    # Build metadata for tracking
    metadata = {
        "condition_description": label,
        "condition_field": field,
        "condition_operator": operator,
        "condition_threshold": threshold,
        "evaluated_value": actual_value,
        "evaluation_result": result,
        "evaluation_time": datetime.now().isoformat(),
        "value_found": actual_value is not None
    }
    
    return result, metadata


# Example usage in workflow step execution:
"""
# When processing a condition step:
condition_config = step["step_config"]["condition"]
extracted_data = instance.get("extracted_data", {})

# Evaluate condition
result, metadata = evaluate_condition(
    condition_config=condition_config,
    workflow_data=instance,
    extracted_data=extracted_data
)

# Update step instance with result and metadata
supabase.table("workflow_step_instances").update({
    "status": "completed",
    "condition_result": result,
    "metadata": metadata,
    "completed_at": datetime.now().isoformat()
}).eq("id", step_instance_id).execute()

# Determine next step based on result
if result:
    next_step_id = condition_config.get("true_next_step")
else:
    next_step_id = condition_config.get("false_next_step")
"""

"""
API endpoint to get available document fields for workflow conditions
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging
from app.models.extraction_schemas import DOCUMENT_SCHEMAS

router = APIRouter()
logger = logging.getLogger(__name__)


def resolve_schema(schema_name: str, schemas: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve schema inheritance (extends)"""
    schema = schemas.get(schema_name, {})
    
    if "extends" in schema:
        parent_name = schema["extends"]
        parent_schema = resolve_schema(parent_name, schemas)
        # Merge parent fields with current schema
        merged_fields = {**parent_schema.get("fields", {})}
        merged_fields.update(schema.get("fields", {}))
        return {
            **parent_schema,
            **schema,
            "fields": merged_fields
        }
    
    return schema


@router.get("/document-fields")
async def get_document_fields():
    """
    Get all available document fields from extraction schemas.
    Returns fields grouped by document type with metadata.
    """
    try:
        all_fields = []
        field_set = set()  # To track unique fields
        
        # Process each document type
        for doc_type, schema in DOCUMENT_SCHEMAS.items():
            # Resolve schema inheritance
            resolved_schema = resolve_schema(doc_type, DOCUMENT_SCHEMAS)
            fields = resolved_schema.get("fields", {})
            
            for field_name, field_config in fields.items():
                # Skip array/complex types for conditions
                if field_config.get("type") == "array":
                    continue
                
                # Create unique key for field
                field_key = f"{field_name}:{field_config.get('type')}"
                
                if field_key not in field_set:
                    field_set.add(field_key)
                    all_fields.append({
                        "name": field_name,
                        "label": field_config.get("label", field_name.replace("_", " ").title()),
                        "type": field_config.get("type", "string"),
                        "description": f"{field_config.get('label')} from {resolved_schema.get('display_name', doc_type)}",
                        "required": field_config.get("required", False),
                        "operators": get_operators_for_type(field_config.get("type", "string"))
                    })
        
        # Sort by most commonly used fields first
        priority_fields = ["total_amount", "invoice_number", "invoice_date", "vendor_name", 
                          "po_number", "contract_value", "customer_name"]
        
        all_fields.sort(key=lambda x: (
            priority_fields.index(x["name"]) if x["name"] in priority_fields else 999,
            x["name"]
        ))
        
        return {
            "fields": all_fields,
            "count": len(all_fields)
        }
        
    except Exception as e:
        logger.error(f"Error fetching document fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def get_operators_for_type(field_type: str) -> List[str]:
    """Get appropriate operators for a field type"""
    if field_type in ["decimal", "integer", "number"]:
        return ["equals", "not_equals", "greater_than", "less_than", "greater_or_equal", "less_or_equal"]
    elif field_type == "date":
        return ["equals", "not_equals", "greater_than", "less_than"]
    elif field_type == "string":
        return ["equals", "not_equals", "contains", "not_contains"]
    elif field_type == "boolean":
        return ["equals"]
    else:
        return ["equals", "not_equals"]


@router.get("/document-fields/grouped")
async def get_document_fields_grouped():
    """
    Get document fields grouped by document type.
    Useful for showing "Invoice fields", "PO fields", etc.
    """
    try:
        grouped_fields = {}
        
        for doc_type, schema in DOCUMENT_SCHEMAS.items():
            resolved_schema = resolve_schema(doc_type, DOCUMENT_SCHEMAS)
            fields = resolved_schema.get("fields", {})
            display_name = resolved_schema.get("display_name", doc_type.replace("-", " ").title())
            
            field_list = []
            for field_name, field_config in fields.items():
                # Skip array types
                if field_config.get("type") == "array":
                    continue
                    
                field_list.append({
                    "name": field_name,
                    "label": field_config.get("label", field_name.replace("_", " ").title()),
                    "type": field_config.get("type", "string"),
                    "required": field_config.get("required", False)
                })
            
            if field_list:
                grouped_fields[doc_type] = {
                    "display_name": display_name,
                    "fields": field_list
                }
        
        return grouped_fields
        
    except Exception as e:
        logger.error(f"Error fetching grouped document fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

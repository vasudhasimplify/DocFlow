"""
Document Extraction Schemas
Defines the structure and validation rules for extracted data from different document types
"""

from typing import Dict, Any, List

DOCUMENT_SCHEMAS: Dict[str, Dict[str, Any]] = {
    "invoice": {
        "fields": {
            "invoice_number": {
                "type": "string",
                "required": True,
                "label": "Invoice Number",
                "validation": {"min_length": 1, "max_length": 50}
            },
            "invoice_date": {
                "type": "date",
                "required": True,
                "label": "Invoice Date",
                "validation": {"format": "YYYY-MM-DD"}
            },
            "due_date": {
                "type": "date",
                "required": False,
                "label": "Due Date",
                "validation": {"format": "YYYY-MM-DD"}
            },
            "vendor_name": {
                "type": "string",
                "required": True,
                "label": "Vendor Name",
                "validation": {"min_length": 2, "max_length": 200}
            },
            "vendor_gstin": {
                "type": "string",
                "required": False,
                "label": "Vendor GSTIN",
                "validation": {"pattern": "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"}
            },
            "vendor_address": {
                "type": "string",
                "required": False,
                "label": "Vendor Address"
            },
            "subtotal": {
                "type": "decimal",
                "required": False,
                "label": "Subtotal Amount",
                "validation": {"min": 0}
            },
            "tax_amount": {
                "type": "decimal",
                "required": False,
                "label": "Tax Amount",
                "validation": {"min": 0}
            },
            "total_amount": {
                "type": "decimal",
                "required": True,
                "label": "Total Amount",
                "validation": {"min": 0}
            },
            "currency": {
                "type": "string",
                "required": False,
                "label": "Currency",
                "default": "INR"
            },
            "payment_terms": {
                "type": "string",
                "required": False,
                "label": "Payment Terms"
            },
            "line_items": {
                "type": "array",
                "required": False,
                "label": "Line Items",
                "schema": {
                    "item_description": {"type": "string", "label": "Description"},
                    "quantity": {"type": "integer", "label": "Quantity", "validation": {"min": 0}},
                    "unit_price": {"type": "decimal", "label": "Unit Price", "validation": {"min": 0}},
                    "amount": {"type": "decimal", "label": "Amount", "validation": {"min": 0}},
                    "tax_rate": {"type": "decimal", "label": "Tax Rate %", "validation": {"min": 0, "max": 100}},
                    "hsn_code": {"type": "string", "label": "HSN/SAC Code"}
                }
            }
        },
        "display_name": "Invoice",
        "description": "Standard invoice document with line items"
    },
    
    "tax-invoice": {
        # Inherit from invoice schema
        "extends": "invoice",
        "display_name": "Tax Invoice",
        "description": "Tax invoice with GST details"
    },
    
    "laptop-bill": {
        "extends": "invoice",
        "display_name": "Laptop Bill",
        "description": "Purchase bill for laptop/electronics"
    },
    
    "flight-invoice": {
        "extends": "invoice",
        "display_name": "Flight Invoice",
        "description": "Invoice for flight ticket purchase"
    },
    
    "purchase-order": {
        "fields": {
            "po_number": {
                "type": "string",
                "required": True,
                "label": "PO Number",
                "validation": {"min_length": 1, "max_length": 50}
            },
            "po_date": {
                "type": "date",
                "required": True,
                "label": "PO Date",
                "validation": {"format": "YYYY-MM-DD"}
            },
            "vendor_name": {
                "type": "string",
                "required": True,
                "label": "Vendor Name"
            },
            "delivery_date": {
                "type": "date",
                "required": False,
                "label": "Expected Delivery Date"
            },
            "shipping_address": {
                "type": "string",
                "required": False,
                "label": "Shipping Address"
            },
            "total_amount": {
                "type": "decimal",
                "required": True,
                "label": "Total Amount",
                "validation": {"min": 0}
            },
            "line_items": {
                "type": "array",
                "required": True,
                "label": "Line Items",
                "schema": {
                    "item_description": {"type": "string", "label": "Description"},
                    "quantity": {"type": "integer", "label": "Quantity"},
                    "unit_price": {"type": "decimal", "label": "Unit Price"},
                    "amount": {"type": "decimal", "label": "Amount"}
                }
            }
        },
        "display_name": "Purchase Order",
        "description": "Purchase order document"
    },
    
    "contract": {
        "fields": {
            "contract_number": {
                "type": "string",
                "required": True,
                "label": "Contract Number"
            },
            "contract_date": {
                "type": "date",
                "required": True,
                "label": "Contract Date"
            },
            "party_a": {
                "type": "string",
                "required": True,
                "label": "Party A (Organization)"
            },
            "party_b": {
                "type": "string",
                "required": True,
                "label": "Party B (Vendor/Partner)"
            },
            "start_date": {
                "type": "date",
                "required": True,
                "label": "Start Date"
            },
            "end_date": {
                "type": "date",
                "required": False,
                "label": "End Date"
            },
            "contract_value": {
                "type": "decimal",
                "required": False,
                "label": "Contract Value"
            },
            "payment_schedule": {
                "type": "string",
                "required": False,
                "label": "Payment Schedule"
            },
            "renewal_terms": {
                "type": "string",
                "required": False,
                "label": "Renewal Terms"
            }
        },
        "display_name": "Contract",
        "description": "Legal contract or agreement"
    },
    
    "bank-statement": {
        "fields": {
            "account_number": {
                "type": "string",
                "required": True,
                "label": "Account Number"
            },
            "account_holder": {
                "type": "string",
                "required": True,
                "label": "Account Holder Name"
            },
            "statement_period": {
                "type": "string",
                "required": True,
                "label": "Statement Period"
            },
            "opening_balance": {
                "type": "decimal",
                "required": False,
                "label": "Opening Balance"
            },
            "closing_balance": {
                "type": "decimal",
                "required": False,
                "label": "Closing Balance"
            },
            "transactions": {
                "type": "array",
                "required": False,
                "label": "Transactions",
                "schema": {
                    "date": {"type": "date", "label": "Date"},
                    "description": {"type": "string", "label": "Description"},
                    "debit": {"type": "decimal", "label": "Debit"},
                    "credit": {"type": "decimal", "label": "Credit"},
                    "balance": {"type": "decimal", "label": "Balance"}
                }
            }
        },
        "display_name": "Bank Statement",
        "description": "Bank account statement"
    },
    
    "resume": {
        "fields": {
            "candidate_name": {
                "type": "string",
                "required": True,
                "label": "Candidate Name"
            },
            "email": {
                "type": "string",
                "required": False,
                "label": "Email",
                "validation": {"pattern": "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"}
            },
            "phone": {
                "type": "string",
                "required": False,
                "label": "Phone Number"
            },
            "total_experience": {
                "type": "string",
                "required": False,
                "label": "Total Experience"
            },
            "current_designation": {
                "type": "string",
                "required": False,
                "label": "Current Designation"
            },
            "current_company": {
                "type": "string",
                "required": False,
                "label": "Current Company"
            },
            "skills": {
                "type": "array",
                "required": False,
                "label": "Skills",
                "schema": {
                    "skill_name": {"type": "string", "label": "Skill"}
                }
            },
            "education": {
                "type": "array",
                "required": False,
                "label": "Education",
                "schema": {
                    "degree": {"type": "string", "label": "Degree"},
                    "institution": {"type": "string", "label": "Institution"},
                    "year": {"type": "string", "label": "Year"}
                }
            }
        },
        "display_name": "Resume/CV",
        "description": "Candidate resume or curriculum vitae"
    }
}


def get_schema(document_type: str) -> Dict[str, Any]:
    """
    Get the schema for a given document type.
    Handles schema inheritance (extends).
    """
    schema = DOCUMENT_SCHEMAS.get(document_type)
    
    if not schema:
        return None
    
    # Handle inheritance
    if "extends" in schema:
        parent_schema = DOCUMENT_SCHEMAS.get(schema["extends"])
        if parent_schema:
            # Merge parent fields with current schema
            merged_fields = parent_schema.get("fields", {}).copy()
            merged_fields.update(schema.get("fields", {}))
            
            return {
                **parent_schema,
                **schema,
                "fields": merged_fields
            }
    
    return schema


def get_all_schemas() -> Dict[str, Dict[str, Any]]:
    """Get all document schemas with display information"""
    return {
        doc_type: {
            "display_name": schema.get("display_name", doc_type),
            "description": schema.get("description", ""),
            "field_count": len(schema.get("fields", {}))
        }
        for doc_type, schema in DOCUMENT_SCHEMAS.items()
    }

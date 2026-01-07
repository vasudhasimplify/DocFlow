"""
Retention API Routes
Endpoints for retention policy management, document retention, and disposition
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.core.auth import get_current_user, User
from app.services.modules.retention_service import RetentionService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/retention", tags=["retention"])


# ===========================
# REQUEST/RESPONSE MODELS
# ===========================

class CreatePolicyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    retention_period_days: int = Field(..., gt=0)
    disposition_action: str = Field(..., pattern="^(delete|archive|review|transfer)$")
    trigger_type: str = Field(..., pattern="^(creation_date|last_modified|custom_date|event_based)$")
    trigger_event: Optional[str] = None
    is_active: bool = True
    priority: int = 0
    applies_to_categories: List[str] = []
    applies_to_folders: List[str] = []
    compliance_framework: Optional[str] = None
    notification_days_before: int = 30
    requires_approval: bool = False
    approval_roles: List[str] = []


class UpdatePolicyRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    retention_period_days: Optional[int] = None
    disposition_action: Optional[str] = None
    trigger_type: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    applies_to_categories: Optional[List[str]] = None
    applies_to_folders: Optional[List[str]] = None
    notification_days_before: Optional[int] = None
    requires_approval: Optional[bool] = None


class ApplyPolicyRequest(BaseModel):
    document_id: str
    policy_id: str
    custom_start_date: Optional[datetime] = None


class DisposeDocumentRequest(BaseModel):
    document_id: str
    action: str = Field(..., pattern="^(delete|archive|transfer)$")
    reason: Optional[str] = None


class GrantExceptionRequest(BaseModel):
    document_id: str
    reason: str
    extension_days: int = Field(..., gt=0)


class UpdateStatusRequest(BaseModel):
    document_id: str
    new_status: str = Field(..., pattern="^(active|pending_review|pending_approval|on_hold|disposed|archived)$")
    reason: Optional[str] = None


class CreateLegalHoldRequest(BaseModel):
    name: str
    description: Optional[str] = None
    hold_reason: str
    matter_id: Optional[str] = None
    custodian_name: Optional[str] = None
    custodian_email: Optional[str] = None
    document_ids: List[str] = []
    folder_ids: List[str] = []
    notes: Optional[str] = None


class ReleaseLegalHoldRequest(BaseModel):
    reason: str


class CreateFromTemplateRequest(BaseModel):
    template_id: str
    name: str
    description: Optional[str] = None


# ===========================
# RETENTION POLICIES
# ===========================

@router.get("/policies")
async def get_policies(user: User = Depends(get_current_user)):
    """Get all retention policies for the current user"""
    try:
        policies = await RetentionService.get_policies(user.id)
        return {"success": True, "data": policies}
    except Exception as e:
        logger.error(f"Error fetching policies: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/policies/{policy_id}")
async def get_policy(policy_id: str, user: User = Depends(get_current_user)):
    """Get a specific retention policy"""
    try:
        policy = await RetentionService.get_policy(policy_id, user.id)
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        return {"success": True, "data": policy}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/policies")
async def create_policy(request: CreatePolicyRequest, user: User = Depends(get_current_user)):
    """Create a new retention policy"""
    try:
        policy = await RetentionService.create_policy(user.id, request.model_dump())
        return {"success": True, "data": policy}
    except Exception as e:
        logger.error(f"Error creating policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/policies/{policy_id}")
async def update_policy(policy_id: str, request: UpdatePolicyRequest, user: User = Depends(get_current_user)):
    """Update a retention policy"""
    try:
        updates = {k: v for k, v in request.model_dump().items() if v is not None}
        policy = await RetentionService.update_policy(policy_id, user.id, updates)
        return {"success": True, "data": policy}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/policies/{policy_id}")
async def delete_policy(policy_id: str, user: User = Depends(get_current_user)):
    """Delete a retention policy"""
    try:
        await RetentionService.delete_policy(policy_id, user.id)
        return {"success": True, "message": "Policy deleted"}
    except Exception as e:
        logger.error(f"Error deleting policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# DOCUMENT RETENTION STATUS
# ===========================

@router.get("/documents")
async def get_document_statuses(
    status: Optional[str] = Query(None, description="Filter by status"),
    user: User = Depends(get_current_user)
):
    """Get all document retention statuses"""
    try:
        statuses = await RetentionService.get_document_retention_statuses(user.id, status)
        return {"success": True, "data": statuses}
    except Exception as e:
        logger.error(f"Error fetching document statuses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/{document_id}")
async def get_document_status(document_id: str, user: User = Depends(get_current_user)):
    """Get retention status for a specific document"""
    try:
        status = await RetentionService.get_document_retention_status(document_id, user.id)
        if not status:
            raise HTTPException(status_code=404, detail="Document retention status not found")
        return {"success": True, "data": status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/apply-policy")
async def apply_policy_to_document(request: ApplyPolicyRequest, user: User = Depends(get_current_user)):
    """Apply a retention policy to a document"""
    try:
        result = await RetentionService.apply_policy_to_document(
            user.id,
            request.document_id,
            request.policy_id,
            request.custom_start_date
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error applying policy: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents/expiring")
async def get_expiring_documents(
    days: int = Query(30, description="Days ahead to check"),
    user: User = Depends(get_current_user)
):
    """Get documents expiring within N days"""
    try:
        documents = await RetentionService.get_expiring_documents(user.id, days)
        return {"success": True, "data": documents}
    except Exception as e:
        logger.error(f"Error fetching expiring documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/dispose")
async def dispose_document(request: DisposeDocumentRequest, user: User = Depends(get_current_user)):
    """Dispose of a document"""
    try:
        result = await RetentionService.dispose_document(
            user.id,
            request.document_id,
            request.action,
            request.reason
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error disposing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/exception")
async def grant_exception(request: GrantExceptionRequest, user: User = Depends(get_current_user)):
    """Grant an exception to extend retention period"""
    try:
        result = await RetentionService.grant_exception(
            user.id,
            request.document_id,
            request.reason,
            request.extension_days
        )
        return {"success": True, "data": result}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error granting exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/update-status")
async def update_document_status(request: UpdateStatusRequest, user: User = Depends(get_current_user)):
    """Update the status of a document in the retention workflow"""
    try:
        from app.services.modules.supabase_service import SupabaseService
        supabase = SupabaseService()
        
        # Update the document retention status
        result = supabase.update_data(
            "document_retention_status",
            {"document_id": request.document_id},
            {
                "current_status": request.new_status,
                "updated_at": datetime.now().isoformat()
            }
        )
        
        # Log the status change in audit log
        supabase.create_data("disposition_audit_log", {
            "document_id": request.document_id,
            "user_id": user.id,
            "action": f"status_change_to_{request.new_status}",
            "previous_status": "active",  # Would need to fetch current status first
            "new_status": request.new_status,
            "reason": request.reason or f"Status changed to {request.new_status}",
            "timestamp": datetime.now().isoformat()
        })
        
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error updating document status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# LEGAL HOLDS
# ===========================

@router.get("/legal-holds")
async def get_legal_holds(
    status: Optional[str] = Query(None, description="Filter by status"),
    user: User = Depends(get_current_user)
):
    """Get all legal holds"""
    try:
        holds = await RetentionService.get_legal_holds(user.id, status)
        return {"success": True, "data": holds}
    except Exception as e:
        logger.error(f"Error fetching legal holds: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/legal-holds")
async def create_legal_hold(request: CreateLegalHoldRequest, user: User = Depends(get_current_user)):
    """Create a new legal hold"""
    try:
        hold = await RetentionService.create_legal_hold(user.id, request.model_dump())
        return {"success": True, "data": hold}
    except Exception as e:
        logger.error(f"Error creating legal hold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/legal-holds/{hold_id}/release")
async def release_legal_hold(hold_id: str, request: ReleaseLegalHoldRequest, user: User = Depends(get_current_user)):
    """Release a legal hold"""
    try:
        hold = await RetentionService.release_legal_hold(user.id, hold_id, request.reason)
        return {"success": True, "data": hold}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error releasing legal hold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/legal-holds/{hold_id}/documents/{document_id}")
async def add_document_to_hold(hold_id: str, document_id: str, user: User = Depends(get_current_user)):
    """Add a document to a legal hold"""
    try:
        await RetentionService.apply_legal_hold_to_document(user.id, document_id, hold_id)
        return {"success": True, "message": "Document added to legal hold"}
    except Exception as e:
        logger.error(f"Error adding document to hold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/legal-holds/{hold_id}/documents/{document_id}")
async def remove_document_from_hold(hold_id: str, document_id: str, user: User = Depends(get_current_user)):
    """Remove a document from a legal hold"""
    try:
        await RetentionService.remove_legal_hold_from_document(user.id, document_id, hold_id)
        return {"success": True, "message": "Document removed from legal hold"}
    except Exception as e:
        logger.error(f"Error removing document from hold: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# TEMPLATES
# ===========================

@router.get("/templates")
async def get_templates(user: User = Depends(get_current_user)):
    """Get all retention policy templates"""
    try:
        templates = await RetentionService.get_templates()
        return {"success": True, "data": templates}
    except Exception as e:
        logger.error(f"Error fetching templates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/templates/create-policy")
async def create_policy_from_template(request: CreateFromTemplateRequest, user: User = Depends(get_current_user)):
    """Create a retention policy from a template"""
    try:
        policy = await RetentionService.create_policy_from_template(
            user.id,
            request.template_id,
            request.name,
            request.description
        )
        return {"success": True, "data": policy}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating policy from template: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# AUDIT LOG
# ===========================

@router.get("/audit-log")
async def get_audit_logs(
    document_id: Optional[str] = Query(None, description="Filter by document ID"),
    limit: int = Query(100, le=500),
    user: User = Depends(get_current_user)
):
    """Get disposition audit logs"""
    try:
        logs = await RetentionService.get_audit_logs(user.id, document_id, limit)
        return {"success": True, "data": logs}
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# STATISTICS
# ===========================

@router.get("/stats")
async def get_retention_stats(user: User = Depends(get_current_user)):
    """Get retention statistics for dashboard"""
    try:
        stats = await RetentionService.get_retention_stats(user.id)
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

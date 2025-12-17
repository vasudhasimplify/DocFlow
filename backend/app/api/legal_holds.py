from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from app.core.auth import get_current_user
from app.core.supabase import supabase
from datetime import datetime
import json

router = APIRouter(prefix="/api/legal-holds", tags=["legal-holds"])

# --- Models ---

class SCOPE_DETAILS(BaseModel):
    document_ids: Optional[List[str]] = None
    folder_ids: Optional[List[str]] = None
    search_query: Optional[str] = None
    date_range: Optional[Dict[str, str]] = None
    custodian_emails: Optional[List[str]] = None
    file_types: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

class CreateLegalHoldRequest(BaseModel):
    name: str
    description: Optional[str] = None
    matter_id: str
    matter_name: str
    matter_type: str
    hold_reason: str
    scope: str
    scope_details: Dict[str, Any] = {}
    issue_date: Optional[str] = None
    effective_date: Optional[str] = None
    anticipated_end_date: Optional[str] = None
    requires_acknowledgment: bool = True
    acknowledgment_deadline_days: int = 5
    send_reminders: bool = True
    reminder_frequency_days: int = 7
    escalation_enabled: bool = True
    escalation_after_days: int = 14
    escalation_contacts: List[str] = []
    issuing_attorney: Optional[str] = None
    legal_team_emails: List[str] = []
    internal_notes: Optional[str] = None
    custodian_emails: Optional[List[str]] = None # Helper to add custodians on create

class UpdateLegalHoldRequest(BaseModel):
    name: Optional[str]
    description: Optional[str]
    status: Optional[str]
    internal_notes: Optional[str]
    anticipated_end_date: Optional[str]
    # Add other fields as needed

class ReleaseHoldRequest(BaseModel):
    reason: str
    approved_by: Optional[str] = None

class AddCustodianRequest(BaseModel):
    name: str
    email: str
    department: Optional[str] = None
    title: Optional[str] = None

class CustodianResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str
    added_at: str
    acknowledged_at: Optional[str]
    reminder_count: int
    department: Optional[str]
    title: Optional[str]
    document_count: Optional[int] = 0

class LegalHoldResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    matter_id: str
    matter_name: str
    matter_type: str
    case_number: Optional[str]
    court_name: Optional[str]
    opposing_party: Optional[str]
    hold_reason: str
    scope: str
    scope_details: Dict[str, Any]
    issue_date: str
    effective_date: str
    anticipated_end_date: Optional[str]
    released_date: Optional[str]
    status: str
    requires_acknowledgment: bool
    acknowledgment_deadline_days: int
    send_reminders: bool
    reminder_frequency_days: int
    escalation_enabled: bool
    escalation_after_days: int
    escalation_contacts: List[str]
    issuing_attorney: Optional[str]
    legal_team_emails: List[str]
    internal_notes: Optional[str]
    
    # Stats
    document_count: int
    folder_count: int = 0
    total_size_bytes: int
    custodians: List[CustodianResponse]
    stats: Optional[Dict[str, Any]]
    
    created_by: Optional[str]
    created_at: str
    updated_at: str

class AuditLogEntry(BaseModel):
    id: str
    action: str
    actor_name: Optional[str]
    target_name: Optional[str]
    details: Dict[str, Any]
    created_at: str

# --- Helpers ---

async def calculate_stats(hold: Dict[str, Any], custodians: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Dynamically calculate stats based on hold scope and current documents.
    """
    scope = hold.get('scope')
    scope_details = hold.get('scope_details') or {}
    
    doc_count = 0
    total_size = 0
    
    try:
        # 1. Calculate Document Stats
        query = supabase.table('documents').select('file_size')
        
        should_run_query = False
        
        if scope == 'specific_documents' and scope_details.get('document_ids'):
            query = query.in_('id', scope_details.get('document_ids'))
            should_run_query = True
        elif scope == 'custodian_content':
            # Get user_ids from custodians
            custodian_emails = [c['email'] for c in custodians]
            # Find user ids from auth table or just match by some other means?
            # For simplicity, let's assume legal_hold_custodians has user_id populated or we just query if user_id is present
            user_ids = [c['user_id'] for c in custodians if c.get('user_id')]
            if user_ids:
                query = query.in_('user_id', user_ids)
                should_run_query = True
        elif scope == 'folder' and scope_details.get('folder_ids'):
             # If we have folder logic, implement here. 
             # For now, maybe skipped or mocked if folders aren't fully in DB yet.
             pass
        
        if should_run_query:
            result = query.execute()
            docs = result.data
            doc_count = len(docs)
            total_size = sum(d['file_size'] for d in docs)
        
        # 2. Calculate Custodian Stats
        total_custodians = len(custodians)
        acknowledged = len([c for c in custodians if c['status'] == 'acknowledged'])
        pending = len([c for c in custodians if c['status'] == 'pending'])
        escalated = len([c for c in custodians if c['status'] == 'escalated'])
        
        # 3. Notifications sent (mock or query audit log)
        notifications_sent = 0 # Placeholder
        
        # 4. Days Active
        effective_date = datetime.fromisoformat(hold['effective_date'].replace('Z', '+00:00'))
        days_active = (datetime.now(effective_date.tzinfo) - effective_date).days
        if days_active < 0: days_active = 0
            
        return {
            "document_count": doc_count,
            "total_size_bytes": total_size,
            "stats": {
                "total_custodians": total_custodians,
                "acknowledged_custodians": acknowledged,
                "pending_custodians": pending,
                "escalated_custodians": escalated,
                "total_documents": doc_count,
                "total_size_bytes": total_size,
                "notifications_sent": notifications_sent,
                "days_active": days_active
            }
        }
    except Exception as e:
        print(f"Error calculating stats: {e}")
        return {
            "document_count": 0,
            "total_size_bytes": 0,
            "stats": {}
        }

async def log_audit(hold_id: str, action: str, current_user: Any, details: Dict[str, Any] = {}, target_type: str = None, target_id: str = None, target_name: str = None):
    try:
        audit_data = {
            "hold_id": hold_id,
            "action": action,
            "actor_id": current_user.id,
            "actor_name": current_user.email, # Or get name
            "details": details,
            "target_type": target_type,
            "target_id": target_id,
            "target_name": target_name
        }
        supabase.table('legal_hold_audit_log').insert(audit_data).execute()
    except Exception as e:
        print(f"Error logging audit: {e}")

# --- Endpoints ---

@router.get("/", response_model=List[LegalHoldResponse])
async def get_legal_holds(current_user = Depends(get_current_user)):
    """List all legal holds with dynamic stats"""
    try:
        # Fetch holds
        holds_result = supabase.table('legal_holds').select('*').order('created_at', desc=True).execute()
        holds = holds_result.data
        
        response_holds = []
        for hold in holds:
            # Fetch custodians for this hold
            cust_result = supabase.table('legal_hold_custodians').select('*').eq('hold_id', hold['id']).execute()
            custodians = cust_result.data
            
            # Dynamic Stats
            stat_data = await calculate_stats(hold, custodians)
            
            # Format custodians for response
            formatted_custodians = []
            for c in custodians:
                # Calculate individual custodian doc count if needed (e.g. scope='custodian_content')
                c_doc_count = 0
                if c.get('user_id'):
                     # Simple query count
                     # c_docs = supabase.table('documents').select('id', count='exact').eq('user_id', c['user_id']).execute()
                     # c_doc_count = c_docs.count
                     pass
                
                formatted_custodians.append({
                   **c,
                   "document_count": c_doc_count
                })

            response_holds.append({
                **hold,
                "custodians": formatted_custodians,
                "document_count": stat_data['document_count'],
                "total_size_bytes": stat_data['total_size_bytes'],
                "stats": stat_data['stats']
            })
            
        return response_holds
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{hold_id}", response_model=LegalHoldResponse)
async def get_legal_hold(hold_id: str, current_user = Depends(get_current_user)):
    """Get processed legal hold details"""
    try:
        hold_result = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_result.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        hold = hold_result.data
        
        cust_result = supabase.table('legal_hold_custodians').select('*').eq('hold_id', hold_id).execute()
        custodians = cust_result.data
        
        stat_data = await calculate_stats(hold, custodians)
        
        # Add individual doc counts to custodians if needed
        
        return {
            **hold,
            "custodians": custodians,
            "document_count": stat_data['document_count'],
            "total_size_bytes": stat_data['total_size_bytes'],
            "stats": stat_data['stats']
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=LegalHoldResponse)
async def create_legal_hold(
    hold_req: CreateLegalHoldRequest, 
    current_user = Depends(get_current_user)
):
    """Create a new legal hold"""
    try:
        hold_data = hold_req.dict(exclude={'custodian_emails'})
        hold_data['created_by'] = current_user.id
        # Ensure status is active by default as per req? Or draft? "active" is good.
        hold_data['status'] = 'active'
        
        # Insert Hold
        result = supabase.table('legal_holds').insert(hold_data).execute()
        if not result.data:
             raise HTTPException(status_code=500, detail="Failed to create hold")
        new_hold = result.data[0]
        
        # Add Custodians
        custodians = []
        if hold_req.custodian_emails:
            for email in hold_req.custodian_emails:
                # Try to find user?
                # For now just insert as pending
                cust_data = {
                    "hold_id": new_hold['id'],
                    "name": email.split('@')[0], # Placeholder name
                    "email": email,
                    "status": 'pending',
                    "added_by": current_user.id
                }
                c_res = supabase.table('legal_hold_custodians').insert(cust_data).execute()
                if c_res.data:
                    custodians.append(c_res.data[0])
        
        # Audit
        await log_audit(new_hold['id'], "hold_created", current_user, {"name": new_hold['name']})
        
        # Return complete object
        stat_data = await calculate_stats(new_hold, custodians)
        
        return {
            **new_hold,
            "custodians": custodians,
            "document_count": stat_data['document_count'],
            "total_size_bytes": stat_data['total_size_bytes'],
            "stats": stat_data['stats']
        }
    except Exception as e:
        print(f"Create error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{hold_id}/release")
async def release_hold(
    hold_id: str, 
    req: ReleaseHoldRequest,
    current_user = Depends(get_current_user)
):
    try:
        updates = {
            "status": "released",
            "released_date": datetime.now().isoformat(),
            "released_by": current_user.id,
            "release_reason": req.reason,
            "release_approved_by": req.approved_by,
            "updated_at": datetime.now().isoformat()
        }
        res = supabase.table('legal_holds').update(updates).eq('id', hold_id).execute()
        
        # Audit
        await log_audit(hold_id, "hold_released", current_user, {"reason": req.reason})
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{hold_id}/custodians")
async def add_custodian(
    hold_id: str,
    req: AddCustodianRequest,
    current_user = Depends(get_current_user)
):
    try:
        cust_data = req.dict()
        cust_data['hold_id'] = hold_id
        cust_data['status'] = 'pending'
        cust_data['added_by'] = current_user.id
        
        res = supabase.table('legal_hold_custodians').insert(cust_data).execute()
        
        await log_audit(hold_id, "custodian_added", current_user, target_name=req.name, target_type='custodian')
        
        return {"success": True, "custodian": res.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{hold_id}/custodians/{custodian_id}")
async def remove_custodian(
    hold_id: str,
    custodian_id: str,
    current_user = Depends(get_current_user)
):
    try:
        supabase.table('legal_hold_custodians').delete().eq('id', custodian_id).eq('hold_id', hold_id).execute()
        await log_audit(hold_id, "custodian_removed", current_user, target_id=custodian_id, target_type='custodian')
        return {"success": True}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.post("/{hold_id}/custodians/{custodian_id}/remind")
async def remind_custodian(
    hold_id: str,
    custodian_id: str,
    current_user = Depends(get_current_user)
):
    try:
        # Update custodian status and reminder count
        # Need to fetch current count first to increment... or use sql increment
        # Supabase/Postgrest doesn't support easy ++ in one call usually without rpc
        # Just read-update for simplicity
        c_res = supabase.table('legal_hold_custodians').select('reminder_count').eq('id', custodian_id).single().execute()
        current_count = c_res.data['reminder_count'] if c_res.data else 0
        
        updates = {
            "status": "reminded",
            "reminder_count": current_count + 1,
            "last_reminded_at": datetime.now().isoformat()
        }
        supabase.table('legal_hold_custodians').update(updates).eq('id', custodian_id).execute()
        
        await log_audit(hold_id, "custodian_reminded", current_user, target_id=custodian_id, target_type='custodian')
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{hold_id}/custodians/{custodian_id}/escalate")
async def escalate_custodian(
    hold_id: str,
    custodian_id: str,
    current_user = Depends(get_current_user)
):
    try:
        updates = {
            "status": "escalated",
            "escalated_at": datetime.now().isoformat()
        }
        supabase.table('legal_hold_custodians').update(updates).eq('id', custodian_id).execute()
        
        await log_audit(hold_id, "custodian_escalated", current_user, target_id=custodian_id, target_type='custodian')
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{hold_id}/audit-trail", response_model=List[AuditLogEntry])
async def get_audit_trail(hold_id: str, current_user = Depends(get_current_user)):
    try:
        res = supabase.table('legal_hold_audit_log').select('*').eq('hold_id', hold_id).order('created_at', desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

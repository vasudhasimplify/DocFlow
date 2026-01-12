from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from app.core.auth import get_current_user
from app.core.supabase import supabase
from app.services.email import EmailService
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
            docs = result.data or []
            doc_count = len(docs)
            total_size = sum(d.get('file_size', 0) for d in docs if d.get('file_size'))
        
        # 2. Calculate Custodian Stats
        total_custodians = len(custodians)
        acknowledged = len([c for c in custodians if c.get('status') == 'acknowledged'])
        pending = len([c for c in custodians if c.get('status') == 'pending'])
        escalated = len([c for c in custodians if c.get('status') == 'escalated'])
        
        # 3. Notifications sent (mock or query audit log)
        notifications_sent = 0 # Placeholder
        
        # 4. Days Active
        days_active = 0
        try:
            effective_date_str = hold.get('effective_date')
            if effective_date_str:
                effective_date = datetime.fromisoformat(effective_date_str.replace('Z', '+00:00'))
                days_active = (datetime.now(effective_date.tzinfo) - effective_date).days
                if days_active < 0: days_active = 0
        except Exception as date_error:
            print(f"Error parsing effective_date: {date_error}")
            days_active = 0
            
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
        import traceback
        traceback.print_exc()
        return {
            "document_count": 0,
            "total_size_bytes": 0,
            "stats": {
                "total_custodians": 0,
                "acknowledged_custodians": 0,
                "pending_custodians": 0,
                "escalated_custodians": 0,
                "total_documents": 0,
                "total_size_bytes": 0,
                "notifications_sent": 0,
                "days_active": 0
            }
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
        holds = holds_result.data or []
        
        # If no holds, return empty array
        if not holds:
            return []
        
        response_holds = []
        for hold in holds:
            try:
                # Fetch custodians for this hold
                cust_result = supabase.table('legal_hold_custodians').select('*').eq('hold_id', hold['id']).execute()
                custodians = cust_result.data or []
                
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
                    "document_count": stat_data.get('document_count', 0),
                    "folder_count": 0,  # Add default value
                    "total_size_bytes": stat_data.get('total_size_bytes', 0),
                    "stats": stat_data.get('stats', {})
                })
            except Exception as hold_error:
                print(f"Error processing hold {hold.get('id')}: {hold_error}")
                import traceback
                traceback.print_exc()
                # Skip this hold and continue with others
                continue
            
        return response_holds
    except Exception as e:
        print(f"Error fetching legal holds: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch legal holds: {str(e)}")

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
        # Fetch hold details for email
        hold_res = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_res.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        hold = hold_res.data
        
        cust_data = req.dict()
        cust_data['hold_id'] = hold_id
        cust_data['status'] = 'pending'
        cust_data['added_by'] = current_user.id
        
        res = supabase.table('legal_hold_custodians').insert(cust_data).execute()
        
        # Send notification email to the new custodian
        try:
            email_service = EmailService()
            subject = f"🔒 Legal Hold Assignment: {hold['name']}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .footer {{ background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }}
                    .alert {{ background-color: #ede9fe; border-left: 4px solid #7c3aed; padding: 15px; margin: 15px 0; }}
                    .button {{ display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }}
                    .info-box {{ background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0;">🔒 Legal Hold Assignment</h2>
                        <p style="margin:5px 0 0 0; font-size: 14px;">You have been assigned to a legal hold</p>
                    </div>
                    <div class="content">
                        <p>Dear {req.name},</p>
                        
                        <div class="alert">
                            <strong>IMPORTANT: You have been assigned to a legal hold</strong>
                        </div>
                        
                        <p>You have been identified as a custodian for the following legal matter:</p>
                        
                        <div class="info-box">
                            <p style="margin:5px 0;"><strong>Hold Name:</strong> {hold['name']}</p>
                            <p style="margin:5px 0;"><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}</p>
                            <p style="margin:5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                            <p style="margin:5px 0;"><strong>Reason:</strong> {hold.get('hold_reason', 'Legal preservation requirement')}</p>
                        </div>
                        
                        <p><strong>Your Obligations:</strong></p>
                        <ul>
                            <li>Preserve all relevant documents and communications</li>
                            <li>Do not delete, modify, or destroy any potentially relevant materials</li>
                            <li>Suspend all automatic deletion policies for relevant data</li>
                            <li>Immediately report any accidental deletion or modification</li>
                        </ul>
                        
                        <p><strong>Please click below to view your legal hold documents and acknowledge receipt:</strong></p>
                        
                        <a href="http://localhost:4173/documents?tab=legal-hold&hold_id={hold_id}" class="button">
                            View Legal Hold Documents →
                        </a>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #666;">
                            Failure to comply with this legal hold may result in serious legal and disciplinary consequences.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from the Legal Hold system</p>
                        <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            email_service.send_email(
                to_email=req.email,
                subject=subject,
                html_content=html_content
            )
        except Exception as email_error:
            print(f"Failed to send custodian assignment email: {str(email_error)}")
        
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
        # Fetch hold and custodian details for email
        hold_res = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_res.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        hold = hold_res.data
        
        cust_res = supabase.table('legal_hold_custodians').select('*').eq('id', custodian_id).single().execute()
        if not cust_res.data:
            raise HTTPException(status_code=404, detail="Custodian not found")
        custodian = cust_res.data
        
        # Delete the custodian
        supabase.table('legal_hold_custodians').delete().eq('id', custodian_id).eq('hold_id', hold_id).execute()
        
        # Send removal notification email
        try:
            email_service = EmailService()
            subject = f"📢 Legal Hold Release Notice: {hold['name']}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .footer {{ background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }}
                    .notice {{ background-color: #d1fae5; border-left: 4px solid #059669; padding: 15px; margin: 15px 0; }}
                    .info-box {{ background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0;">📢 Legal Hold Release Notice</h2>
                        <p style="margin:5px 0 0 0; font-size: 14px;">You have been released from a legal hold</p>
                    </div>
                    <div class="content">
                        <p>Dear {custodian['name']},</p>
                        
                        <div class="notice">
                            <strong>You have been removed from the following legal hold</strong>
                        </div>
                        
                        <div class="info-box">
                            <p style="margin:5px 0;"><strong>Hold Name:</strong> {hold['name']}</p>
                            <p style="margin:5px 0;"><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}</p>
                            <p style="margin:5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                        </div>
                        
                        <p><strong>What this means:</strong></p>
                        <ul>
                            <li>You are no longer required to preserve documents specifically for this matter</li>
                            <li>Normal document retention policies may resume for this matter</li>
                            <li>You may still be subject to other legal holds - check your active holds</li>
                        </ul>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #666;">
                            <strong>Note:</strong> If you believe this removal was made in error, please contact your legal department immediately.
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated notification from the Legal Hold system</p>
                        <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            email_service.send_email(
                to_email=custodian['email'],
                subject=subject,
                html_content=html_content
            )
        except Exception as email_error:
            print(f"Failed to send custodian removal email: {str(email_error)}")
        
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
        # Fetch hold and custodian details
        hold_res = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_res.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        
        hold = hold_res.data
        
        cust_res = supabase.table('legal_hold_custodians').select('*').eq('id', custodian_id).single().execute()
        if not cust_res.data:
            raise HTTPException(status_code=404, detail="Custodian not found")
        
        custodian = cust_res.data
        
        # Send reminder email
        email_service = EmailService()
        subject = f"REMINDER: Legal Hold Notice - {hold['name']}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                .footer {{ background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }}
                .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin:0;">⚠️ REMINDER: Legal Hold Notice</h2>
                </div>
                <div class="content">
                    <p>Dear {custodian['name']},</p>
                    
                    <div class="warning">
                        <strong>This is a REMINDER about your pending legal hold acknowledgment</strong>
                    </div>
                    
                    <p>You have not yet acknowledged the legal hold notice for:</p>
                    
                    <p><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}<br>
                    <strong>Hold Name:</strong> {hold['name']}<br>
                    <strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                    
                    <p><strong>Reason for Hold:</strong><br>
                    {hold.get('hold_reason', 'Legal preservation requirement')}</p>
                    
                    <p><strong>URGENT: Please acknowledge receipt immediately.</strong></p>
                    
                    <p><strong>Your Obligations:</strong></p>
                    <ul>
                        <li>Preserve all relevant documents and communications</li>
                        <li>Do not delete, modify, or destroy any potentially relevant materials</li>
                        <li>Suspend all automatic deletion policies for relevant data</li>
                        <li>Immediately report any accidental deletion or modification</li>
                    </ul>
                    
                    <p style="margin-top: 20px;">Failure to comply may result in escalation to management and potential legal consequences.</p>
                    
                    <p><strong>Questions?</strong> Contact the legal team at: {', '.join(hold.get('legal_team_emails', [])) if hold.get('legal_team_emails') else 'your legal department'}</p>
                </div>
                <div class="footer">
                    <p>This is reminder #{custodian.get('reminder_count', 0) + 1} for this legal hold</p>
                    <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        email_service.send_email(
            to_email=custodian['email'],
            subject=subject,
            html_content=html_content
        )
        
        # Update custodian reminder tracking
        c_res = supabase.table('legal_hold_custodians').select('reminder_count').eq('id', custodian_id).single().execute()
        current_count = c_res.data['reminder_count'] if c_res.data else 0
        
        updates = {
            "reminder_count": current_count + 1,
            "last_reminder_sent": datetime.now().isoformat()
        }
        supabase.table('legal_hold_custodians').update(updates).eq('id', custodian_id).execute()
        
        await log_audit(hold_id, "custodian_reminded", current_user, target_id=custodian_id, target_type='custodian')
        return {"success": True, "email_sent": True}
    except Exception as e:
        print(f"Error sending reminder: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{hold_id}/custodians/{custodian_id}/escalate")
async def escalate_custodian(
    hold_id: str,
    custodian_id: str,
    current_user = Depends(get_current_user)
):
    try:
        # Fetch hold and custodian details
        hold_res = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_res.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        
        hold = hold_res.data
        
        cust_res = supabase.table('legal_hold_custodians').select('*').eq('id', custodian_id).single().execute()
        if not cust_res.data:
            raise HTTPException(status_code=404, detail="Custodian not found")
        
        custodian = cust_res.data
        
        # Send escalation emails to legal team and escalation contacts
        email_service = EmailService()
        
        # Build recipient list
        recipients = hold.get('escalation_contacts', [])
        if hold.get('legal_team_emails'):
            recipients.extend(hold.get('legal_team_emails'))
        
        if recipients:
            subject = f"⚠️ ESCALATION: Non-Compliant Custodian - {hold['name']}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .footer {{ background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }}
                    .alert {{ background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }}
                    .info-box {{ background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0;">⚠️ ESCALATION REQUIRED</h2>
                        <p style="margin:5px 0 0 0; font-size: 14px;">Non-Compliant Custodian</p>
                    </div>
                    <div class="content">
                        <div class="alert">
                            <strong>URGENT: A custodian has failed to acknowledge their legal hold obligations</strong>
                        </div>
                        
                        <div class="info-box">
                            <p style="margin:5px 0;"><strong>Custodian:</strong> {custodian['name']} ({custodian['email']})</p>
                            <p style="margin:5px 0;"><strong>Hold:</strong> {hold['name']}</p>
                            <p style="margin:5px 0;"><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}</p>
                            <p style="margin:5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                            <p style="margin:5px 0;"><strong>Reminders Sent:</strong> {custodian.get('reminder_count', 0)}</p>
                        </div>
                        
                        <p><strong>Situation:</strong></p>
                        <p>This custodian has failed to acknowledge the legal hold notice despite {custodian.get('reminder_count', 0)} reminder(s). 
                        Non-compliance poses a significant risk to the organization and may result in legal sanctions.</p>
                        
                        <p><strong>Required Actions:</strong></p>
                        <ul>
                            <li>Immediately contact the custodian directly</li>
                            <li>Verify they understand their legal obligations</li>
                            <li>Document all communications</li>
                            <li>Consider disciplinary action if non-compliance continues</li>
                            <li>Notify General Counsel if necessary</li>
                        </ul>
                        
                        <p style="margin-top: 20px;"><strong>Consequences of Non-Compliance:</strong></p>
                        <ul>
                            <li>Spoliation of evidence charges</li>
                            <li>Adverse inference instructions to jury</li>
                            <li>Monetary sanctions against the company</li>
                            <li>Damage to company reputation</li>
                        </ul>
                        
                        <p>Please take immediate action to ensure compliance.</p>
                    </div>
                    <div class="footer">
                        <p>This escalation was triggered automatically by the Legal Hold system</p>
                        <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send to all escalation contacts
            for recipient in recipients:
                try:
                    email_service.send_email(
                        to_email=recipient,
                        subject=subject,
                        html_content=html_content
                    )
                except Exception as e:
                    print(f"Failed to send escalation email to {recipient}: {str(e)}")
        
        # Update custodian status
        updates = {
            "status": "escalated",
            "escalated_at": datetime.now().isoformat()
        }
        supabase.table('legal_hold_custodians').update(updates).eq('id', custodian_id).execute()
        
        await log_audit(
            hold_id, 
            "custodian_escalated", 
            current_user, 
            target_id=custodian_id, 
            target_type='custodian',
            details={'escalated_to': recipients}
        )
        return {"success": True, "emails_sent": len(recipients)}
    except Exception as e:
        print(f"Error escalating custodian: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{hold_id}/audit-trail", response_model=List[AuditLogEntry])
async def get_audit_trail(hold_id: str, current_user = Depends(get_current_user)):
    try:
        res = supabase.table('legal_hold_audit_log').select('*').eq('hold_id', hold_id).order('created_at', desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SendNotificationsRequest(BaseModel):
    custodian_ids: List[str]
    message: Optional[str] = None

@router.post("/{hold_id}/send-notifications")
async def send_notifications(hold_id: str, request: SendNotificationsRequest, current_user = Depends(get_current_user)):
    """Send email notifications to selected custodians"""
    try:
        # Fetch hold details
        hold_res = supabase.table('legal_holds').select('*').eq('id', hold_id).single().execute()
        if not hold_res.data:
            raise HTTPException(status_code=404, detail="Legal hold not found")
        
        hold = hold_res.data
        
        # Fetch custodians
        custodians_res = supabase.table('legal_hold_custodians').select('*').in_('id', request.custodian_ids).eq('hold_id', hold_id).execute()
        if not custodians_res.data:
            raise HTTPException(status_code=404, detail="No custodians found")
        
        # Initialize email service
        email_service = EmailService()
        sent_count = 0
        failed_count = 0
        
        # Send email to each custodian
        for custodian in custodians_res.data:
            subject = f"Legal Hold Notice: {hold['name']}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .footer {{ background-color: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }}
                    .button {{ display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                    .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0;">⚖️ Legal Hold Notice</h2>
                    </div>
                    <div class="content">
                        <p>Dear {custodian['name']},</p>
                        
                        <div class="warning">
                            <strong>⚠️ IMPORTANT: This is a legal hold notice</strong>
                        </div>
                        
                        <p>You are receiving this notice because you have been identified as a custodian in the following legal matter:</p>
                        
                        <p><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}<br>
                        <strong>Hold Name:</strong> {hold['name']}<br>
                        <strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                        
                        <p><strong>Reason for Hold:</strong><br>
                        {hold.get('hold_reason', 'Legal preservation requirement')}</p>
                        
                        {f'<p><strong>Additional Message:</strong><br>{request.message}</p>' if request.message else ''}
                        
                        <p><strong>Your Obligations:</strong></p>
                        <ul>
                            <li>Preserve all relevant documents and communications</li>
                            <li>Do not delete, modify, or destroy any potentially relevant materials</li>
                            <li>Suspend all automatic deletion policies for relevant data</li>
                            <li>Immediately report any accidental deletion or modification</li>
                        </ul>
                        
                        <p style="margin-top: 20px;">Please acknowledge receipt of this legal hold notice as soon as possible.</p>
                        
                        <p><strong>Questions?</strong> Contact the legal team at: {', '.join(hold.get('legal_team_emails', [])) if hold.get('legal_team_emails') else 'your legal department'}</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated legal hold notification from SimplifyAI DocFlow</p>
                        <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            try:
                success = email_service.send_email(
                    to_email=custodian['email'],
                    subject=subject,
                    html_content=html_content
                )
                
                if success:
                    sent_count += 1
                    # Update custodian reminder tracking
                    reminder_count = (custodian.get('reminder_count') or 0) + 1
                    supabase.table('legal_hold_custodians').update({
                        'last_reminder_sent': datetime.now().isoformat(),
                        'reminder_count': reminder_count
                    }).eq('id', custodian['id']).execute()
                else:
                    failed_count += 1
            except Exception as e:
                print(f"Failed to send email to {custodian['email']}: {str(e)}")
                failed_count += 1
        
        # Create audit log
        await log_audit(
            hold_id,
            "notifications_sent",
            current_user,
            target_type='notification',
            details={
                'custodian_count': len(request.custodian_ids),
                'sent_count': sent_count,
                'failed_count': failed_count,
                'message': request.message
            }
        )
        
        return {
            "success": True,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "total": len(request.custodian_ids)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error sending notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


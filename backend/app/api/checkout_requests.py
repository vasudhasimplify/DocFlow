"""
Checkout Request API
Handles guest/shared user requests for document editing access
"""
from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import os

from ..core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/checkout-requests", tags=["checkout-requests"])

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CheckoutRequestCreate(BaseModel):
    document_id: str
    requester_email: EmailStr
    requester_name: Optional[str] = None
    share_id: Optional[str] = None
    share_link_id: Optional[str] = None
    request_message: Optional[str] = None


class CheckoutRequestResponse(BaseModel):
    id: str
    document_id: str
    requester_email: str
    requester_name: Optional[str] = None
    status: str
    request_message: Optional[str] = None
    requested_at: str
    approved_at: Optional[str] = None
    document_name: Optional[str] = None


class ApproveRequestBody(BaseModel):
    request_id: str
    duration_hours: int = 24  # Default checkout duration


class RejectRequestBody(BaseModel):
    request_id: str
    rejection_reason: Optional[str] = None


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def send_checkout_request_email(owner_email: str, owner_name: str, requester_name: str, 
                                     requester_email: str, document_name: str, 
                                     request_message: str, request_id: str):
    """Send email notification to document owner"""
    try:
        from ..services.email import EmailService
        email_service = EmailService()
        
        approval_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/checkout-requests"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">📝 Document Edit Request</h2>
                <p>Hi {owner_name},</p>
                <p><strong>{requester_name}</strong> ({requester_email}) has requested edit access to your document:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #1f2937;">📄 {document_name}</p>
                </div>
                {f'<div style="border-left: 3px solid #4F46E5; padding-left: 15px; margin: 20px 0;"><p style="color: #666; font-style: italic;">"{request_message}"</p></div>' if request_message else ''}
                <p>
                    <a href="{approval_url}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
                        Review Request →
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    You can approve or reject this request from your Checkout Requests dashboard.
                </p>
            </div>
        </body>
        </html>
        """
        
        await email_service.send_email(
            to_email=owner_email,
            subject=f"Edit Request: {document_name}",
            html_content=html_content
        )
        logger.info(f"✉️ Sent checkout request email to {owner_email}")
    except Exception as e:
        logger.error(f"Failed to send checkout request email: {e}")


async def send_approval_email(requester_email: str, requester_name: str, 
                              document_name: str, duration_hours: int, edit_url: str):
    """Send approval notification to requester"""
    try:
        from ..services.email import EmailService
        email_service = EmailService()
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #10B981;">✅ Edit Request Approved!</h2>
                <p>Hi {requester_name},</p>
                <p>Good news! Your request to edit <strong>"{document_name}"</strong> has been approved.</p>
                <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981;">
                    <p style="margin: 0; font-weight: bold; color: #065f46;">⏱️ Access Duration: {duration_hours} hours</p>
                </div>
                <p>
                    <a href="{edit_url}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
                        Open Document Editor →
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    The document will automatically check in after {duration_hours} hours.
                </p>
            </div>
        </body>
        </html>
        """
        
        result = email_service.send_email(
            to_email=requester_email,
            subject=f"Edit Access Granted: {document_name}",
            html_content=html_content
        )
        if result:
            logger.info(f"✉️ Sent approval email to {requester_email}")
        else:
            logger.warning(f"⚠️ Failed to send approval email to {requester_email}")
    except Exception as e:
        logger.error(f"Failed to send approval email: {e}")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/request", response_model=CheckoutRequestResponse)
async def create_checkout_request(request: CheckoutRequestCreate):
    """
    Create a checkout request from guest/shared user
    - Checks for existing pending requests
    - Sends email notification to document owner
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"📝 Creating checkout request for document {request.document_id} by {request.requester_email}")
        
        # Get document details
        doc_response = supabase.table('documents').select('id, file_name, user_id').eq('id', request.document_id).single().execute()
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_response.data
        owner_user_id = document['user_id']
        
        # Get owner email from auth.users using admin client
        from supabase import create_client
        supabase_admin = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        
        # Query auth.users for owner email
        owner_response = supabase_admin.auth.admin.get_user_by_id(owner_user_id)
        if not owner_response or not owner_response.user:
            raise HTTPException(status_code=404, detail="Document owner not found")
        
        owner_email = owner_response.user.email
        owner_name = owner_response.user.user_metadata.get('full_name') or owner_response.user.email.split('@')[0] or 'Document Owner'
        
        # Check if document is already locked
        lock_response = supabase.table('document_locks')\
            .select('*')\
            .eq('document_id', request.document_id)\
            .eq('is_active', True)\
            .execute()
        
        if lock_response.data:
            raise HTTPException(status_code=400, detail="Document is currently locked by another user")
        
        # Check if there's already a pending request from this user
        existing = supabase.table('checkout_requests')\
            .select('*')\
            .eq('document_id', request.document_id)\
            .eq('requester_email', request.requester_email)\
            .eq('status', 'pending')\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="You already have a pending checkout request for this document")
        
        # Create the request
        new_request = {
            'document_id': request.document_id,
            'requester_email': request.requester_email,
            'requester_name': request.requester_name,
            'share_id': request.share_id,
            'share_link_id': request.share_link_id,
            'request_message': request.request_message,
            'status': 'pending'
        }
        
        result = supabase.table('checkout_requests').insert(new_request).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create checkout request")
        
        # Send email notification to document owner
        try:
            if owner_email:
                await send_checkout_request_email(
                    owner_email=owner_email,
                    owner_name=owner_name,
                    requester_email=request.requester_email,
                    requester_name=request.requester_name or request.requester_email,
                    document_name=document['file_name'],
                    request_message=request.request_message or '',
                    request_id=result.data[0]['id']
                )
        except Exception as e:
            logger.warning(f"Email notification failed but request was created: {e}")
        
        logger.info(f"✅ Checkout request created: {result.data[0]['id']}")
        
        return CheckoutRequestResponse(
            **result.data[0],
            document_name=document['file_name']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating checkout request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/approve")
async def approve_checkout_request(body: ApproveRequestBody):
    """
    Approve a checkout request and grant edit access
    - Creates a document lock for the guest user
    - Sends approval email
    """
    try:
        supabase = get_supabase_client()
        
        logger.info(f"✅ Approving checkout request {body.request_id}")
        
        # Get the request
        req_response = supabase.table('checkout_requests')\
            .select('*')\
            .eq('id', body.request_id)\
            .single()\
            .execute()
        
        if not req_response.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        checkout_req = req_response.data
        
        # Get document details
        doc_response = supabase.table('documents')\
            .select('id, file_name, user_id')\
            .eq('id', checkout_req['document_id'])\
            .single()\
            .execute()
        
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_response.data
        
        # Check if already approved/rejected
        if checkout_req['status'] != 'pending':
            raise HTTPException(status_code=400, detail=f"Request already {checkout_req['status']}")
        
        # Update request status
        expires_at = datetime.utcnow() + timedelta(hours=body.duration_hours)
        supabase.table('checkout_requests').update({
            'status': 'approved',
            'approved_at': datetime.utcnow().isoformat(),
            'approved_by': document['user_id'],
            'expires_at': expires_at.isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', body.request_id).execute()
        
        # Create a document lock for the guest
        lock_data = {
            'document_id': checkout_req['document_id'],
            'locked_by': document['user_id'],  # Owner's ID for tracking
            'guest_email': checkout_req['requester_email'],
            'locked_at': datetime.utcnow().isoformat(),
            'expires_at': expires_at.isoformat(),
            'lock_reason': f"Guest edit access approved for {checkout_req['requester_email']}",
            'is_active': True
        }
        
        supabase.table('document_locks').insert(lock_data).execute()
        
        # Send approval email to requester
        try:
            # Construct edit URL based on share type
            if checkout_req.get('share_id'):
                # For guest sharing (external_shares), we need to get the invitation_token
                share_response = supabase.table('external_shares')\
                    .select('invitation_token')\
                    .eq('id', checkout_req['share_id'])\
                    .single()\
                    .execute()
                
                if share_response.data and share_response.data.get('invitation_token'):
                    token = share_response.data['invitation_token']
                    edit_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/guest/{token}"
                    logger.info(f"📧 Using external_shares token for edit URL: {token[:20]}...")
                else:
                    # Fallback to share_id if token not found
                    logger.warning(f"⚠️ invitation_token not found for share_id {checkout_req['share_id']}, using share_id as fallback")
                    edit_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/guest/{checkout_req['share_id']}"
            elif checkout_req.get('share_link_id'):
                # share_link_id stores the token from the URL, not a UUID
                # Use it directly for the edit URL
                token = checkout_req['share_link_id']
                edit_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/s/{token}"
                logger.info(f"📧 Using share_link token directly for edit URL: {token[:20] if len(token) > 20 else token}...")
            else:
                edit_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/documents/{checkout_req['document_id']}"
            
            logger.info(f"📧 Sending approval email with edit URL: {edit_url}")
            
            await send_approval_email(
                requester_email=checkout_req['requester_email'],
                requester_name=checkout_req.get('requester_name', ''),
                document_name=document['file_name'],
                duration_hours=body.duration_hours,
                edit_url=edit_url
            )
        except Exception as e:
            logger.warning(f"Approval email failed but access was granted: {e}")
        
        logger.info(f"✅ Checkout request approved, access granted for {body.duration_hours} hours")
        
        return {
            "success": True,
            "message": f"Checkout request approved. Access granted for {body.duration_hours} hours.",
            "expires_at": expires_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving checkout request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reject")
async def reject_checkout_request(body: RejectRequestBody, request: Request):
    """Reject a checkout request"""
    try:
        supabase = get_supabase_client()
        
        # Get user ID from header
        user_id = request.headers.get("x-user-id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not provided")
        
        logger.info(f"❌ Rejecting checkout request {body.request_id}")
        
        # Get the request to verify ownership
        req_response = supabase.table('checkout_requests')\
            .select('*, documents!inner(user_id)')\
            .eq('id', body.request_id)\
            .single()\
            .execute()
        
        if not req_response.data:
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify ownership
        if req_response.data['documents']['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Update status
        supabase.table('checkout_requests').update({
            'status': 'rejected',
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', body.request_id).execute()
        
        logger.info(f"✅ Request rejected")
        
        return {"success": True, "message": "Request rejected"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting request: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending", response_model=List[CheckoutRequestResponse])
async def get_pending_requests(request: Request):
    """Get all pending checkout requests for user's documents"""
    try:
        supabase = get_supabase_client()
        
        # Get user ID from header
        user_id = request.headers.get("x-user-id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not provided")
        
        # Get pending requests for user's documents
        requests_response = supabase.table('checkout_requests')\
            .select('*, documents!inner(file_name, user_id)')\
            .eq('documents.user_id', user_id)\
            .eq('status', 'pending')\
            .order('requested_at', desc=True)\
            .execute()
        
        results = []
        for req in requests_response.data or []:
            results.append(CheckoutRequestResponse(
                **{k: v for k, v in req.items() if k != 'documents'},
                document_name=req['documents']['file_name']
            ))
        
        logger.info(f"📋 Retrieved {len(results)} pending requests for user {user_id}")
        
        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching pending requests: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-requests", response_model=List[CheckoutRequestResponse])
async def get_my_requests(email: str):
    """Get all checkout requests made by a specific email (for guest users)"""
    try:
        supabase = get_supabase_client()
        
        requests_response = supabase.table('checkout_requests')\
            .select('*, documents(file_name)')\
            .eq('requester_email', email)\
            .order('requested_at', desc=True)\
            .limit(50)\
            .execute()
        
        results = []
        for req in requests_response.data:
            results.append(CheckoutRequestResponse(
                **{k: v for k, v in req.items() if k != 'documents'},
                document_name=req['documents']['file_name'] if req.get('documents') else 'Unknown'
            ))
        
        return results
    except Exception as e:
        logger.error(f"Error fetching user requests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/release-guest-lock/{document_id}")
async def release_guest_lock(document_id: str, request: Request):
    """
    Release a guest document lock (for document owners)
    This allows owners to revoke edit access granted to guests via checkout approval
    """
    try:
        supabase = get_supabase_client()
        
        # Get user ID from header
        user_id = request.headers.get("x-user-id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not provided")
        
        logger.info(f"🔓 Releasing guest lock for document {document_id} by owner {user_id}")
        
        # Verify the document belongs to the current user
        doc_response = supabase.table('documents')\
            .select('user_id')\
            .eq('id', document_id)\
            .single()\
            .execute()
        
        if not doc_response.data or doc_response.data['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to release this lock")
        
        # Deactivate all guest locks for this document
        supabase.table('document_locks')\
            .update({'is_active': False})\
            .eq('document_id', document_id)\
            .neq('guest_email', '')\
            .execute()
        
        logger.info(f"✅ Guest lock released for document {document_id}")
        
        return {
            "success": True,
            "message": "Guest lock released successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error releasing guest lock: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

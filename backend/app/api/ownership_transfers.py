"""
Ownership Transfer API Endpoints
Handles document ownership transfer functionality
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/transfers", tags=["ownership-transfers"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class InitiateTransferRequest(BaseModel):
    document_id: str
    to_user_email: str
    message: Optional[str] = None


class TransferResponse(BaseModel):
    id: str
    document_id: str
    from_user_id: str
    to_user_id: str
    to_user_email: str
    status: str
    message: Optional[str] = None
    transferred_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_supabase_client():
    """Get shared Supabase client (connection pooling)"""
    from app.core.supabase_client import get_supabase_client as _get_client
    
    client = _get_client()
    if not client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    return client


async def get_current_user_id(http_request: Request) -> str:
    """Extract user ID from request headers"""
    # In production, this should validate the JWT token
    user_id = http_request.headers.get("x-user-id")
    if not user_id:
        # Fallback to Authorization header parsing
        auth_header = http_request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # TODO: Decode JWT and extract user_id
            pass
        raise HTTPException(status_code=401, detail="User not authenticated")
    return user_id


async def lookup_user_by_email(supabase, email: str) -> Optional[str]:
    """Look up user ID by email address"""
    try:
        # Use RPC function (same as frontend) to get user ID by email
        result = supabase.rpc('get_user_id_by_email', {'user_email': email}).execute()
        
        if result.data:
            return result.data
        
        return None
        
    except Exception as e:
        logger.warning(f"Error looking up user by email: {e}")
        # Try using admin API as fallback
        try:
            auth_response = supabase.auth.admin.list_users()
            users = []
            if hasattr(auth_response, 'users'):
                users = auth_response.users
            elif isinstance(auth_response, list):
                users = auth_response
            
            for user in users:
                if user.email == email:
                    return user.id
            
        except Exception as admin_error:
            logger.warning(f"Error using admin API: {admin_error}")
        
        return None


async def send_ownership_transfer_email(recipient_email: str, sender_email: str, sender_name: str,
                                        document_name: str, message: str, transfer_id: str):
    """Send email notification to transfer recipient"""
    try:
        from ..services.email import EmailService
        email_service = EmailService()
        
        review_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/transfer-requests"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #F59E0B;">📤 Document Ownership Transfer</h2>
                <p>Hi,</p>
                <p><strong>{sender_name or sender_email}</strong> wants to transfer ownership of a document to you:</p>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                    <p style="margin: 0; font-weight: bold; color: #92400e;">📄 {document_name}</p>
                </div>
                {f'<div style="border-left: 3px solid #F59E0B; padding-left: 15px; margin: 20px 0;"><p style="color: #666; font-style: italic;">Message from sender: "{message}"</p></div>' if message else ''}
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #4b5563; font-size: 14px;">
                        <strong>⚠️ What this means:</strong><br>
                        If you accept, you will become the full owner of this document with all permissions.
                        The current owner will lose all access, including view permission.
                    </p>
                </div>
                <p>
                    <a href="{review_url}" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
                        Review Transfer Request →
                    </a>
                </p>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                    You can accept or reject this transfer from your DocFlow dashboard.
                </p>
            </div>
        </body>
        </html>
        """
        
        await email_service.send_email(
            to_email=recipient_email,
            subject=f"Document Ownership Transfer: {document_name}",
            html_content=html_content
        )
        logger.info(f"✉️ Sent ownership transfer email to {recipient_email}")
    except Exception as e:
        logger.error(f"Failed to send ownership transfer email: {e}")


async def create_transfer_notification(supabase, user_id: str, sender_name: str, 
                                        document_name: str, transfer_id: str):
    """Create in-app notification for transfer recipient"""
    try:
        notification_data = {
            "user_id": user_id,
            "type": "ownership_transfer",
            "title": "Document Ownership Transfer",
            "message": f"{sender_name} wants to transfer ownership of '{document_name}' to you",
            "data": {"transfer_id": transfer_id},
            "read": False
        }
        
        supabase.table("lock_notifications").insert(notification_data).execute()
        logger.info(f"📬 Created transfer notification for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to create transfer notification: {e}")


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/initiate", response_model=TransferResponse)
async def initiate_transfer(
    request: InitiateTransferRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Initiate ownership transfer for a document
    
    - Verifies user owns the document
    - Looks up recipient by email
    - Creates pending transfer record
    - Sends notification email to recipient
    - Creates in-app notification for recipient
    """
    try:
        supabase = get_supabase_client()
        
        # Verify user owns the document
        doc = supabase.table("documents")\
            .select("user_id, name, file_name")\
            .eq("id", request.document_id)\
            .single()\
            .execute()
        
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if doc.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You don't own this document")
        
        document_name = doc.data.get("name") or doc.data.get("file_name") or "Unknown Document"
        
        # Get sender info using admin API
        try:
            sender_user = supabase.auth.admin.get_user_by_id(user_id)
            sender_name = sender_user.user.user_metadata.get("full_name") or sender_user.user.email.split('@')[0]
            sender_email = sender_user.user.email
        except Exception as e:
            logger.warning(f"Error getting sender info: {e}")
            sender_name = "Unknown User"
            sender_email = "unknown@email.com"
        
        # Look up recipient user ID
        to_user_id = await lookup_user_by_email(supabase, request.to_user_email)
        
        if not to_user_id:
            raise HTTPException(
                status_code=404,
                detail=f"User with email {request.to_user_email} not found. They need to create an account first."
            )
        
        # Check for existing pending transfers
        existing = supabase.table("document_ownership_transfers")\
            .select("*")\
            .eq("document_id", request.document_id)\
            .eq("status", "pending")\
            .execute()
        
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="There is already a pending transfer for this document"
            )
        
        # Create transfer record
        transfer_data = {
            "document_id": request.document_id,
            "from_user_id": user_id,
            "to_user_id": to_user_id,
            "to_user_email": request.to_user_email,
            "message": request.message,
            "status": "pending"
        }
        
        result = supabase.table("document_ownership_transfers")\
            .insert(transfer_data)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create transfer")
        
        transfer = result.data[0]
        
        logger.info(f"Ownership transfer initiated: {transfer['id']}")
        
        # Send email notification to recipient
        await send_ownership_transfer_email(
            recipient_email=request.to_user_email,
            sender_email=sender_email or "Unknown",
            sender_name=sender_name or sender_email or "A DocFlow user",
            document_name=document_name,
            message=request.message,
            transfer_id=transfer['id']
        )
        
        # Create in-app notification for recipient (if they exist in system)
        if to_user_id != user_id:  # Don't notify self
            await create_transfer_notification(
                supabase=supabase,
                user_id=to_user_id,
                sender_name=sender_name or sender_email or "A DocFlow user",
                document_name=document_name,
                transfer_id=transfer['id']
            )
        
        return TransferResponse(**transfer)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{transfer_id}/accept")
async def accept_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Accept an ownership transfer
    
    - Verifies user is the recipient
    - Updates document ownership
    - Updates transfer status
    - Creates notifications
    """
    try:
        supabase = get_supabase_client()
        
        # Call the database function which handles the entire transaction
        result = supabase.rpc("accept_ownership_transfer", {"transfer_id": transfer_id}).execute()
        
        logger.info(f"Ownership transfer {transfer_id} accepted by user {user_id}")
        
        return {"success": True, "message": "Transfer accepted successfully"}
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error accepting transfer: {error_msg}")
        
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail="Transfer not found or already processed")
        elif "unauthorized" in error_msg.lower():
            raise HTTPException(status_code=403, detail="You are not authorized to accept this transfer")
        else:
            raise HTTPException(status_code=500, detail=error_msg)


@router.post("/{transfer_id}/reject")
async def reject_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Reject an ownership transfer
    
    - Verifies user is the recipient
    - Updates transfer status to rejected
    """
    try:
        supabase = get_supabase_client()
        
        # Call the database function
        result = supabase.rpc("reject_ownership_transfer", {"transfer_id": transfer_id}).execute()
        
        logger.info(f"Ownership transfer {transfer_id} rejected by user {user_id}")
        
        return {"success": True, "message": "Transfer rejected successfully"}
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error rejecting transfer: {error_msg}")
        
        if "not found" in error_msg.lower():
            raise HTTPException(status_code=404, detail="Transfer not found or already processed")
        elif "unauthorized" in error_msg.lower():
            raise HTTPException(status_code=403, detail="You are not authorized to reject this transfer")
        else:
            raise HTTPException(status_code=500, detail=error_msg)


@router.post("/{transfer_id}/cancel")
async def cancel_transfer(
    transfer_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Cancel a pending transfer (sender only)
    
    - Verifies user is the sender
    - Updates transfer status to cancelled
    """
    try:
        supabase = get_supabase_client()
        
        # Get transfer
        transfer = supabase.table("document_ownership_transfers")\
            .select("*")\
            .eq("id", transfer_id)\
            .single()\
            .execute()
        
        if not transfer.data:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        transfer_data = transfer.data
        
        # Verify user is the sender
        if transfer_data["from_user_id"] != user_id:
            raise HTTPException(status_code=403, detail="You can only cancel transfers you initiated")
        
        # Verify transfer is still pending
        if transfer_data["status"] != "pending":
            raise HTTPException(status_code=400, detail="Can only cancel pending transfers")
        
        # Update status
        supabase.table("document_ownership_transfers")\
            .update({"status": "cancelled", "updated_at": datetime.now().isoformat()})\
            .eq("id", transfer_id)\
            .execute()
        
        logger.info(f"Ownership transfer {transfer_id} cancelled by user {user_id}")
        
        return {"success": True, "message": "Transfer cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling transfer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pending-incoming", response_model=List[TransferResponse])
async def get_pending_incoming(user_id: str = Depends(get_current_user_id)):
    """Get pending transfers where current user is recipient"""
    try:
        supabase = get_supabase_client()
        
        transfers = supabase.table("document_ownership_transfers")\
            .select("*")\
            .eq("to_user_id", user_id)\
            .eq("status", "pending")\
            .order("created_at", desc=True)\
            .execute()
        
        return [TransferResponse(**t) for t in (transfers.data or [])]
        
    except Exception as e:
        logger.error(f"Error fetching pending incoming transfers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[TransferResponse])
async def get_transfer_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = 50
):
    """Get all transfers (sent and received) for current user"""
    try:
        supabase = get_supabase_client()
        
        transfers = supabase.table("document_ownership_transfers")\
            .select("*")\
            .or_(f"from_user_id.eq.{user_id},to_user_id.eq.{user_id}")\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return [TransferResponse(**t) for t in (transfers.data or [])]
        
    except Exception as e:
        logger.error(f"Error fetching transfer history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{document_id}", response_model=List[TransferResponse])
async def get_document_transfers(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get all transfers for a specific document"""
    try:
        supabase = get_supabase_client()
        
        # Verify user has access to document
        doc = supabase.table("documents")\
            .select("user_id")\
            .eq("id", document_id)\
            .single()\
            .execute()
        
        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get transfers
        transfers = supabase.table("document_ownership_transfers")\
            .select("*")\
            .eq("document_id", document_id)\
            .order("created_at", desc=True)\
            .execute()
        
        return [TransferResponse(**t) for t in (transfers.data or [])]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document transfers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/expire-old")
async def expire_old_transfers():
    """
    Background task to expire old pending transfers
    Should be called periodically (e.g., daily cron job)
    """
    try:
        supabase = get_supabase_client()
        
        # Call the database function
        result = supabase.rpc("expire_old_transfers").execute()
        
        expired_count = result.data if result.data is not None else 0
        
        logger.info(f"Expired {expired_count} old transfers")
        
        return {"success": True, "expired_count": expired_count}
        
    except Exception as e:
        logger.error(f"Error expiring old transfers: {e}")
        raise HTTPException(status_code=500, detail=str(e))

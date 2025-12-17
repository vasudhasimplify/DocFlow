"""
Guest Sharing API Endpoints
Handles creation, management, and tracking of guest document shares
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import os
from app.core.auth import get_current_user
from app.services.email import send_guest_invitation

router = APIRouter(prefix="/api/shares", tags=["shares"])

# ============== Pydantic Models ==============

class CreateShareRequest(BaseModel):
    resource_type: str  # 'document', 'folder', 'workspace'
    resource_id: str
    resource_name: str
    guest_email: EmailStr
    guest_name: Optional[str] = None
    permission: str  # 'view', 'comment', 'download', 'edit'
    allow_download: bool = True
    allow_print: bool = True
    allow_reshare: bool = False
    password: Optional[str] = None
    expires_in_days: Optional[int] = 7
    max_views: Optional[int] = None
    notify_on_view: bool = False
    notify_on_download: bool = False
    message: Optional[str] = None

class ShareResponse(BaseModel):
    id: str
    owner_id: str
    resource_type: str
    resource_id: str
    resource_name: Optional[str]
    guest_email: str
    guest_name: Optional[str]
    permission: str
    allow_download: bool
    allow_print: bool
    allow_reshare: bool
    expires_at: Optional[str]
    max_views: Optional[int]
    view_count: int
    status: str
    invitation_token: str
    created_at: str
    updated_at: str

class ShareStatsResponse(BaseModel):
    active_shares: int
    total_views: int
    pending_invitations: int
    expired_shares: int
    revoked_shares: int

# ============== Helper Functions ==============

def get_supabase_client():
    """Get Supabase client instance"""
    from app.core.supabase import supabase
    return supabase

def generate_invitation_token() -> str:
    """Generate unique invitation token"""
    return str(uuid.uuid4()).replace('-', '')[:32]

# ============== API Endpoints ==============

@router.post("/create", response_model=ShareResponse)
async def create_share(
    request: CreateShareRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Create a new guest share and send invitation email
    
    Args:
        request: Share creation parameters
        background_tasks: FastAPI background tasks for async email
        current_user: Authenticated user (share owner)
    
    Returns:
        ShareResponse with created share details
    """
    try:
        supabase = get_supabase_client()
        
        # Validate permission level
        valid_permissions = ['view', 'comment', 'download', 'edit']
        if request.permission not in valid_permissions:
            raise HTTPException(status_code=400, detail=f"Invalid permission: {request.permission}")
        
        # Validate resource type
        valid_types = ['document', 'folder', 'workspace']
        if request.resource_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid resource type: {request.resource_type}")
        
        # Generate invitation token
        invitation_token = generate_invitation_token()
        
        # Calculate expiration date
        expires_at = None
        if request.expires_in_days:
            expires_at = (datetime.utcnow() + timedelta(days=request.expires_in_days)).isoformat()
        
        # Prepare share data
        share_data = {
            "owner_id": current_user.id,
            "resource_type": request.resource_type,
            "resource_id": request.resource_id,
            "resource_name": request.resource_name,
            "guest_email": request.guest_email,
            "guest_name": request.guest_name,
            "permission": request.permission,
            "allow_download": request.allow_download,
            "allow_print": request.allow_print,
            "allow_reshare": request.allow_reshare,
            "password_protected": bool(request.password),
            "require_login": False,
            "expires_at": expires_at,
            "max_views": request.max_views,
            "view_count": 0,
            "notify_on_view": request.notify_on_view,
            "notify_on_download": request.notify_on_download,
            "message": request.message,
            "status": "pending",
            "invitation_token": invitation_token,
        }
        
        # Insert into database
        response = supabase.table('external_shares').insert(share_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create share")
        
        created_share = response.data[0]
        
        # Generate share URL
        share_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/guest/{invitation_token}"
        
        # Send invitation email in background
        background_tasks.add_task(
            send_guest_invitation,
            guest_email=request.guest_email,
            guest_name=request.guest_name,
            owner_name=current_user.user_metadata.get('full_name', 'A user'),
            document_name=request.resource_name,
            share_url=share_url,
            permission=request.permission,
            expires_at=expires_at,
            message=request.message
        )
        
        return ShareResponse(**created_share)
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating share: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create share: {str(e)}")


@router.get("/", response_model=List[ShareResponse])
async def get_user_shares(current_user = Depends(get_current_user)):
    """
    Get all shares created by current user
    
    Returns:
        List of shares with statistics
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('external_shares')\
            .select('*')\
            .eq('owner_id', current_user.id)\
            .order('created_at', desc=True)\
            .execute()
        
        return [ShareResponse(**share) for share in response.data]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch shares: {str(e)}")


@router.get("/stats", response_model=ShareStatsResponse)
async def get_share_stats(current_user = Depends(get_current_user)):
    """
    Get statistics for all shares created by current user
    
    Returns:
        Stats including active shares, total views, pending invitations, etc.
    """
    try:
        supabase = get_supabase_client()
        
        # Get all shares
        response = supabase.table('external_shares')\
            .select('*')\
            .eq('owner_id', current_user.id)\
            .execute()
        
        shares = response.data if response.data else []
        
        # Calculate statistics
        active_shares = len([s for s in shares if s['status'] in ['pending', 'accepted']])
        pending_invitations = len([s for s in shares if s['status'] == 'pending'])
        expired_shares = len([s for s in shares if s['status'] == 'expired'])
        revoked_shares = len([s for s in shares if s['status'] == 'revoked'])
        total_views = sum(s['view_count'] for s in shares)
        
        return ShareStatsResponse(
            active_shares=active_shares,
            total_views=total_views,
            pending_invitations=pending_invitations,
            expired_shares=expired_shares,
            revoked_shares=revoked_shares
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.post("/{share_id}/revoke")
async def revoke_share(
    share_id: str,
    current_user = Depends(get_current_user)
):
    """
    Revoke a guest share (change status to 'revoked')
    
    Args:
        share_id: UUID of the share to revoke
        current_user: Must be the share owner
    """
    try:
        supabase = get_supabase_client()
        
        # Verify ownership
        share_response = supabase.table('external_shares')\
            .select('owner_id')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data or share_response.data['owner_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to revoke this share")
        
        # Revoke share
        response = supabase.table('external_shares')\
            .update({
                'status': 'revoked',
                'revoked_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            })\
            .eq('id', share_id)\
            .execute()
        
        return {"status": "revoked", "message": "Share has been revoked"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to revoke share: {str(e)}")


@router.post("/{share_id}/resend-invitation")
async def resend_invitation(
    share_id: str,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Resend invitation email for a pending share
    
    Args:
        share_id: UUID of the share
        background_tasks: For async email sending
        current_user: Must be the share owner
    """
    try:
        supabase = get_supabase_client()
        
        # Fetch share
        share_response = supabase.table('external_shares')\
            .select('*')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = share_response.data
        
        if share['owner_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Generate share URL
        share_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:4173')}/guest/{share['invitation_token']}"
        
        # Send email in background
        background_tasks.add_task(
            send_guest_invitation,
            guest_email=share['guest_email'],
            guest_name=share['guest_name'],
            owner_name=current_user.user_metadata.get('full_name', 'A user'),
            document_name=share['resource_name'],
            share_url=share_url,
            permission=share['permission'],
            expires_at=share['expires_at'],
            message=share['message']
        )
        
        return {"status": "sent", "message": "Invitation email sent"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resend invitation: {str(e)}")


@router.delete("/{share_id}")
async def delete_share(
    share_id: str,
    current_user = Depends(get_current_user)
):
    """
    Permanently delete a share record
    
    Args:
        share_id: UUID of the share to delete
        current_user: Must be the share owner
    """
    try:
        supabase = get_supabase_client()
        
        # Verify ownership
        share_response = supabase.table('external_shares')\
            .select('owner_id')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data or share_response.data['owner_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this share")
        
        # Delete share (cascades to access logs)
        supabase.table('external_shares')\
            .delete()\
            .eq('id', share_id)\
            .execute()
        
        return {"status": "deleted", "message": "Share deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete share: {str(e)}")


@router.get("/{share_id}/access-logs")
async def get_access_logs(
    share_id: str,
    current_user = Depends(get_current_user)
):
    """
    Get access logs for a specific share
    
    Args:
        share_id: UUID of the share
        current_user: Must be the share owner
    """
    try:
        supabase = get_supabase_client()
        
        # Verify ownership
        share_response = supabase.table('external_shares')\
            .select('owner_id')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data or share_response.data['owner_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view these logs")
        
        # Get access logs
        logs_response = supabase.table('guest_access_logs')\
            .select('*')\
            .eq('share_id', share_id)\
            .order('created_at', desc=True)\
            .execute()
        
        return logs_response.data if logs_response.data else []
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch access logs: {str(e)}")


@router.post("/{share_id}/view")
async def record_view(share_id: str):
    """
    Record a view for a shared document (called by public guest page)
    This is a public endpoint - no auth required
    
    Args:
        share_id: UUID of the share
    """
    try:
        supabase = get_supabase_client()
        
        # Get current share data
        share_response = supabase.table('external_shares')\
            .select('view_count, guest_email, status')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = share_response.data
        
        # Check if share is valid
        if share['status'] not in ['pending', 'accepted']:
            raise HTTPException(status_code=403, detail="Share is no longer active")
        
        # Increment view count
        new_count = (share['view_count'] or 0) + 1
        
        supabase.table('external_shares')\
            .update({
                'view_count': new_count,
                'status': 'accepted',  # Mark as accepted on first view
                'accepted_at': datetime.utcnow().isoformat() if share['status'] == 'pending' else None,
                'last_accessed_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            })\
            .eq('id', share_id)\
            .execute()
        
        # Log the view access
        try:
            supabase.table('guest_access_logs').insert({
                'share_id': share_id,
                'guest_email': share['guest_email'],
                'action': 'view',
                'created_at': datetime.utcnow().isoformat()
            }).execute()
        except:
            pass  # Silently fail if logging fails
        
        return {"status": "recorded", "view_count": new_count}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error recording view: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to record view: {str(e)}")


@router.post("/{share_id}/log-access")
async def log_guest_access(
    share_id: str,
    action: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    device_type: Optional[str] = None
):
    """
    Log guest access to a shared document (called by public guest page)
    
    Args:
        share_id: UUID of the share
        action: 'view', 'download', 'print', 'comment', 'edit'
        ip_address: Guest's IP address
        user_agent: Guest's browser user agent
        device_type: 'mobile', 'desktop', 'tablet'
    """
    try:
        if action not in ['view', 'download', 'print', 'comment', 'edit']:
            raise HTTPException(status_code=400, detail="Invalid action")
        
        supabase = get_supabase_client()
        
        # Get share to verify it exists and get guest email
        share_response = supabase.table('external_shares')\
            .select('guest_email')\
            .eq('id', share_id)\
            .single()\
            .execute()
        
        if not share_response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        # Log the access
        log_data = {
            'share_id': share_id,
            'guest_email': share_response.data['guest_email'],
            'action': action,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'device_type': device_type,
            'created_at': datetime.utcnow().isoformat()
        }
        
        supabase.table('guest_access_logs').insert(log_data).execute()
        
        # Update share view count
        supabase.table('external_shares')\
            .update({
                'view_count': supabase.rpc('increment_view_count', {'share_id': share_id}),
                'last_accessed_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            })\
            .eq('id', share_id)\
            .execute()
        
        return {"status": "logged", "message": "Access logged successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log access: {str(e)}")

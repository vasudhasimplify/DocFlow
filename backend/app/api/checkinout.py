"""
Check In/Out API Endpoints
Handles document locking and unlocking functionality
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/checkinout", tags=["check-in-out"])


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CheckoutRequest(BaseModel):
    document_id: str
    lock_reason: Optional[str] = None
    duration_hours: Optional[int] = 24


class CheckinRequest(BaseModel):
    lock_id: str


class ForceUnlockRequest(BaseModel):
    lock_id: str
    unlock_reason: Optional[str] = None


class LockResponse(BaseModel):
    id: str
    document_id: str
    document_name: Optional[str] = None
    locked_by: str
    locker_email: Optional[str] = None
    locked_at: datetime
    lock_reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool


class LockStatusResponse(BaseModel):
    is_locked: bool
    lock_info: Optional[LockResponse] = None


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


async def get_current_user_id(request) -> str:
    """Extract user ID from request headers"""
    # In production, this should validate the JWT token
    user_id = request.headers.get("x-user-id")
    if not user_id:
        # Fallback to Authorization header parsing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # TODO: Decode JWT and extract user_id
            # For now, return a test user ID if auth header exists
            pass
        raise HTTPException(status_code=401, detail="User not authenticated")
    return user_id


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/checkout", response_model=LockResponse)
async def checkout_document(
    request: CheckoutRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Check out (lock) a document for editing
    
    - Verifies user has access to document
    - Creates lock record with expiration
    - Notifies other users
    """
    try:
        supabase = get_supabase_client()
        
        # Check if document already locked
        existing_lock = supabase.table("document_locks")\
            .select("*")\
            .eq("document_id", request.document_id)\
            .eq("is_active", True)\
            .execute()
        
        if existing_lock.data:
            lock = existing_lock.data[0]
            # Check if lock is expired
            if lock.get("expires_at"):
                expires_at = datetime.fromisoformat(lock["expires_at"].replace("Z", "+00:00"))
                if expires_at < datetime.now():
                    # Lock expired, deactivate it
                    supabase.table("document_locks")\
                        .update({"is_active": False})\
                        .eq("id", lock["id"])\
                        .execute()
                else:
                    raise HTTPException(
                        status_code=409,
                        detail=f"Document already locked by another user"
                    )
            else:
                raise HTTPException(
                    status_code=409,
                    detail=f"Document already locked by another user"
                )
        
        # Calculate expiration
        expires_at = datetime.now() + timedelta(hours=request.duration_hours) if request.duration_hours else None
        
        # Create lock
        lock_data = {
            "document_id": request.document_id,
            "locked_by": user_id,
            "lock_reason": request.lock_reason,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "is_active": True
        }
        
        result = supabase.table("document_locks").insert(lock_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create lock")
        
        lock = result.data[0]
        
        # Get document name
        doc = supabase.table("documents")\
            .select("name, file_name")\
            .eq("id", request.document_id)\
            .single()\
            .execute()
        
        document_name = doc.data.get("name") or doc.data.get("file_name") if doc.data else "Unknown"
        
        # Create notification
        notification_data = {
            "document_id": request.document_id,
            "lock_id": lock["id"],
            "notified_user_id": user_id,
            "notification_type": "lock_acquired",
            "message": f"Document '{document_name}' checked out"
        }
        
        supabase.table("lock_notifications").insert(notification_data).execute()
        
        logger.info(f"Document {request.document_id} checked out by user {user_id}")
        
        return LockResponse(
            id=lock["id"],
            document_id=lock["document_id"],
            document_name=document_name,
            locked_by=lock["locked_by"],
            locked_at=lock["locked_at"],
            lock_reason=lock.get("lock_reason"),
            expires_at=lock.get("expires_at"),
            is_active=lock["is_active"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkin")
async def checkin_document(
    request: CheckinRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Check in (unlock) a document
    
    - Verifies user owns the lock
    - Deactivates lock
    - Notifies other users
    """
    try:
        supabase = get_supabase_client()
        
        # Get lock
        lock = supabase.table("document_locks")\
            .select("*")\
            .eq("id", request.lock_id)\
            .single()\
            .execute()
        
        if not lock.data:
            raise HTTPException(status_code=404, detail="Lock not found")
        
        lock_data = lock.data
        
        # Verify user owns the lock
        if lock_data["locked_by"] != user_id:
            raise HTTPException(status_code=403, detail="You don't own this lock")
        
        # Deactivate lock
        supabase.table("document_locks")\
            .update({
                "is_active": False,
                "unlocked_at": datetime.now().isoformat(),
                "unlocked_by": user_id
            })\
            .eq("id", request.lock_id)\
            .execute()
        
        # Create notification
        notification_data = {
            "document_id": lock_data["document_id"],
            "lock_id": request.lock_id,
            "notified_user_id": user_id,
            "notification_type": "lock_released",
            "message": "Document checked in"
        }
        
        supabase.table("lock_notifications").insert(notification_data).execute()
        
        logger.info(f"Document lock {request.lock_id} released by user {user_id}")
        
        return {"success": True, "message": "Document checked in successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking in document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force-unlock")
async def force_unlock(
    request: ForceUnlockRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Force unlock a document (admin function)
    
    - Allows admins/document owners to unlock documents
    - Creates audit trail
    """
    try:
        supabase = get_supabase_client()
        
        # Get lock
        lock = supabase.table("document_locks")\
            .select("*")\
            .eq("id", request.lock_id)\
            .single()\
            .execute()
        
        if not lock.data:
            raise HTTPException(status_code=404, detail="Lock not found")
        
        lock_data = lock.data
        
        # Check if user is document owner
        doc = supabase.table("documents")\
            .select("user_id")\
            .eq("id", lock_data["document_id"])\
            .single()\
            .execute()
        
        if doc.data and doc.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Only document owner can force unlock")
        
        # Deactivate lock
        supabase.table("document_locks")\
            .update({
                "is_active": False,
                "unlocked_at": datetime.now().isoformat(),
                "unlocked_by": user_id,
                "unlock_reason": request.unlock_reason
            })\
            .eq("id", request.lock_id)\
            .execute()
        
        # Create notification
        notification_data = {
            "document_id": lock_data["document_id"],
            "lock_id": request.lock_id,
            "notified_user_id": lock_data["locked_by"],
            "notification_type": "force_unlock",
            "message": f"Document was force unlocked. Reason: {request.unlock_reason or 'Not specified'}"
        }
        
        supabase.table("lock_notifications").insert(notification_data).execute()
        
        logger.info(f"Document lock {request.lock_id} force unlocked by user {user_id}")
        
        return {"success": True, "message": "Document force unlocked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error force unlocking document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/my-locks", response_model=List[LockResponse])
async def get_my_locks(user_id: str = Depends(get_current_user_id)):
    """Get all active locks for current user"""
    try:
        supabase = get_supabase_client()
        
        locks = supabase.table("document_locks")\
            .select("*")\
            .eq("locked_by", user_id)\
            .eq("is_active", True)\
            .order("locked_at", desc=True)\
            .execute()
        
        # Get document names
        result_locks = []
        for lock in locks.data:
            doc = supabase.table("documents")\
                .select("name, file_name")\
                .eq("id", lock["document_id"])\
                .single()\
                .execute()
            
            document_name = doc.data.get("name") or doc.data.get("file_name") if doc.data else "Unknown"
            
            result_locks.append(LockResponse(
                id=lock["id"],
                document_id=lock["document_id"],
                document_name=document_name,
                locked_by=lock["locked_by"],
                locked_at=lock["locked_at"],
                lock_reason=lock.get("lock_reason"),
                expires_at=lock.get("expires_at"),
                is_active=lock["is_active"]
            ))
        
        return result_locks
        
    except Exception as e:
        logger.error(f"Error fetching user locks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all-locks", response_model=List[LockResponse])
async def get_all_locks(user_id: str = Depends(get_current_user_id)):
    """Get all active locks (for team view)"""
    try:
        supabase = get_supabase_client()
        
        locks = supabase.table("document_locks")\
            .select("*")\
            .eq("is_active", True)\
            .order("locked_at", desc=True)\
            .execute()
        
        # Get document names
        result_locks = []
        for lock in locks.data:
            doc = supabase.table("documents")\
                .select("name, file_name")\
                .eq("id", lock["document_id"])\
                .single()\
                .execute()
            
            document_name = doc.data.get("name") or doc.data.get("file_name") if doc.data else "Unknown"
            
            result_locks.append(LockResponse(
                id=lock["id"],
                document_id=lock["document_id"],
                document_name=document_name,
                locked_by=lock["locked_by"],
                locked_at=lock["locked_at"],
                lock_reason=lock.get("lock_reason"),
                expires_at=lock.get("expires_at"),
                is_active=lock["is_active"]
            ))
        
        return result_locks
        
    except Exception as e:
        logger.error(f"Error fetching all locks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/document/{document_id}/lock-status", response_model=LockStatusResponse)
async def get_lock_status(document_id: str):
    """Check if a document is currently locked"""
    try:
        supabase = get_supabase_client()
        
        # Call the database function
        result = supabase.rpc("is_document_locked", {"doc_id": document_id}).execute()
        
        is_locked = result.data if result.data is not None else False
        
        lock_info = None
        if is_locked:
            # Get lock details
            lock = supabase.table("document_locks")\
                .select("*")\
                .eq("document_id", document_id)\
                .eq("is_active", True)\
                .order("locked_at", desc=True)\
                .limit(1)\
                .execute()
            
            if lock.data:
                lock_data = lock.data[0]
                doc = supabase.table("documents")\
                    .select("name, file_name")\
                    .eq("id", document_id)\
                    .single()\
                    .execute()
                
                document_name = doc.data.get("name") or doc.data.get("file_name") if doc.data else "Unknown"
                
                lock_info = LockResponse(
                    id=lock_data["id"],
                    document_id=lock_data["document_id"],
                    document_name=document_name,
                    locked_by=lock_data["locked_by"],
                    locked_at=lock_data["locked_at"],
                    lock_reason=lock_data.get("lock_reason"),
                    expires_at=lock_data.get("expires_at"),
                    is_active=lock_data["is_active"]
                )
        
        return LockStatusResponse(is_locked=is_locked, lock_info=lock_info)
        
    except Exception as e:
        logger.error(f"Error checking lock status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(
    user_id: str = Depends(get_current_user_id),
    limit: int = 50
):
    """Get checkout/checkin history"""
    try:
        supabase = get_supabase_client()
        
        # Get notifications as history
        notifications = supabase.table("lock_notifications")\
            .select("*")\
            .eq("notified_user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return {"history": notifications.data or []}
        
    except Exception as e:
        logger.error(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notifications")
async def get_notifications(
    user_id: str = Depends(get_current_user_id),
    unread_only: bool = False
):
    """Get lock notifications for current user"""
    try:
        supabase = get_supabase_client()
        
        query = supabase.table("lock_notifications")\
            .select("*")\
            .eq("notified_user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        notifications = query.order("created_at", desc=True).limit(100).execute()
        
        return {"notifications": notifications.data or []}
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/request-access")
async def request_access(
    document_id: str,
    message: str = None,
    user_id: str = Depends(get_current_user_id)
):
    """Request access to a locked document"""
    try:
        supabase = get_supabase_client()
        
        # Check if document is actually locked
        active_lock = supabase.table("document_locks")\
            .select("*")\
            .eq("document_id", document_id)\
            .eq("is_active", True)\
            .order("locked_at", desc=True)\
            .limit(1)\
            .execute()
        
        if not active_lock.data:
            raise HTTPException(status_code=404, detail="Document is not locked")
        
        lock = active_lock.data[0]
        lock_holder_id = lock["locked_by"]
        
        # Don't allow requesting access to your own lock
        if lock_holder_id == user_id:
            raise HTTPException(status_code=400, detail="Cannot request access to your own lock")
        
        # Create notification for lock holder
        notification_message = message or "A user has requested access to your locked document"
        
        notification = supabase.table("lock_notifications").insert({
            "document_id": document_id,
            "lock_id": lock["id"],
            "notified_user_id": lock_holder_id,
            "notification_type": "access_requested",
            "message": notification_message,
            "is_read": False
        }).execute()
        
        logger.info(f"Access request created for document {document_id} by user {user_id}")
        
        return {
            "success": True,
            "message": "Access request sent to document owner",
            "notification_id": notification.data[0]["id"] if notification.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error requesting access: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Mark a notification as read"""
    try:
        supabase = get_supabase_client()
        
        # Update notification
        result = supabase.table("lock_notifications")\
            .update({"is_read": True})\
            .eq("id", notification_id)\
            .eq("notified_user_id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"success": True, "message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

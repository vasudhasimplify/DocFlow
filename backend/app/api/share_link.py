"""
Share Link Document Access Endpoint
Provides signed URLs for share link document viewing (works across all browsers)
"""

from fastapi import APIRouter, HTTPException
from app.core.supabase import supabase
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/share-link", tags=["share-link"])

@router.get("/document/{token}")
async def get_share_link_document_url(token: str):
    """
    Get a signed URL for a document shared via share link (/s/:token routes)
    This endpoint doesn't require authentication - uses service role to bypass RLS
    
    Args:
        token: The share link token (can be token, short_code, or invitation_token)
    
    Returns:
        Document information and signed URL
    """
    try:
        logger.info(f"📄 Fetching document for share link token: {token}")
        
        share = None
        is_external_share = False
        
        # First try share_links table by token field - use limit(1) instead of maybe_single() which has bugs
        try:
            share_response = supabase.table('share_links')\
                .select('*')\
                .eq('token', token)\
                .limit(1)\
                .execute()
            
            if share_response.data and len(share_response.data) > 0:
                share = share_response.data[0]
        except Exception as e:
            logger.warning(f"⚠️ Error querying share_links by token: {e}")
        
        # If not found by token, try by short_code in share_links
        if not share:
            logger.info(f"🔍 Token not found in share_links, trying short_code: {token}")
            try:
                share_response = supabase.table('share_links')\
                    .select('*')\
                    .eq('short_code', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
            except Exception as e:
                logger.warning(f"⚠️ Error querying share_links by short_code: {e}")
        
        # If not found in share_links, try external_shares table by invitation_token
        if not share:
            logger.info(f"🔍 Not found in share_links, trying external_shares by invitation_token: {token}")
            try:
                share_response = supabase.table('external_shares')\
                    .select('*')\
                    .eq('invitation_token', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
                    is_external_share = True
                    logger.info(f"✅ Found in external_shares table")
            except Exception as e:
                logger.warning(f"⚠️ Error querying external_shares by invitation_token: {e}")
        
        # If still not found, try external_shares by token field
        if not share:
            logger.info(f"🔍 Trying external_shares by token field: {token}")
            try:
                share_response = supabase.table('external_shares')\
                    .select('*')\
                    .eq('token', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
                    is_external_share = True
                    logger.info(f"✅ Found in external_shares table by token")
            except Exception as e:
                logger.warning(f"⚠️ Error querying external_shares by token: {e}")
        
        if not share:
            logger.warning(f"❌ Share not found in any table for token: {token}")
            raise HTTPException(status_code=404, detail="Share link not found")
        
        logger.info(f"✅ Found share: {share.get('name', 'Unnamed')} (ID: {share.get('id')}, type: {'external_share' if is_external_share else 'share_link'})")
        
        # Check if share is active (handle both external_shares and share_links)
        if is_external_share:
            # external_shares use 'is_revoked' field
            if share.get('is_revoked', False) or share.get('revoked', False):
                raise HTTPException(status_code=403, detail="Share link has been revoked")
        else:
            # share_links use 'is_active' field
            if not share.get('is_active', True):
                raise HTTPException(status_code=403, detail="Share link has been revoked")
        
        # Check if share is expired
        if share.get('expires_at'):
            from datetime import datetime
            try:
                expires_at = datetime.fromisoformat(share['expires_at'].replace('Z', '+00:00'))
                if expires_at < datetime.now(expires_at.tzinfo):
                    raise HTTPException(status_code=403, detail="Share link has expired")
            except ValueError as e:
                logger.warning(f"⚠️ Could not parse expiry date: {e}")
        
        # Check max uses (handle both use_count and view_count)
        use_count = share.get('use_count', 0) if not is_external_share else share.get('view_count', 0)
        max_uses = share.get('max_uses')
        if max_uses and use_count >= max_uses:
            raise HTTPException(status_code=403, detail="Share link has reached maximum views")
        
        resource_id = share.get('resource_id')
        if not resource_id:
            raise HTTPException(status_code=404, detail="Share link has no associated document")
        
        # Get the document using service role (bypasses RLS)
        logger.info(f"🔍 Fetching document: {resource_id}")
        document = None
        try:
            doc_response = supabase.table('documents')\
                .select('*')\
                .eq('id', resource_id)\
                .single()\
                .execute()
            
            if doc_response and hasattr(doc_response, 'data'):
                document = doc_response.data
        except Exception as e:
            logger.error(f"❌ Error fetching document: {e}")
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        logger.info(f"✅ Document found: {document.get('file_name')}")
        
        # Create signed URL using service role (bypasses RLS)
        storage_path = document.get('storage_path')
        if not storage_path:
            raise HTTPException(status_code=404, detail="Document file not found in storage")
        
        logger.info(f"🔐 Creating signed URL for: {storage_path}")
        try:
            signed_url_response = supabase.storage\
                .from_('documents')\
                .create_signed_url(storage_path, 3600)  # 1 hour expiry
            
            if not signed_url_response or not signed_url_response.get('signedURL'):
                logger.error(f"❌ Failed to create signed URL: {signed_url_response}")
                raise HTTPException(status_code=500, detail="Failed to generate document URL - storage error")
        except HTTPException:
            raise
        except Exception as storage_err:
            logger.error(f"❌ Storage error creating signed URL: {storage_err}")
            raise HTTPException(status_code=500, detail="Failed to access document in storage")
        
        logger.info(f"✅ Signed URL created successfully for share link")
        
        # Determine file type from various fields
        file_type = document.get('file_type') or document.get('mime_type') or document.get('document_type') or ''
        file_name = document.get('file_name') or document.get('original_name') or document.get('name') or 'document'
        
        # If file_type is empty, try to determine from file extension
        if not file_type:
            ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
            extension_to_mime = {
                'pdf': 'application/pdf',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp',
                'svg': 'image/svg+xml',
                'bmp': 'image/bmp',
                'txt': 'text/plain',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            }
            file_type = extension_to_mime.get(ext, ext)
        
        return {
            "document_id": document['id'],
            "file_name": file_name,
            "file_type": file_type,
            "signed_url": signed_url_response['signedURL'],
            "storage_path": storage_path,
            "share_info": {
                "id": share.get('id'),
                "name": share.get('name') or share.get('resource_name'),
                "resource_name": share.get('resource_name'),
                "permission": share.get('permission', 'view'),
                "allow_download": share.get('allow_download', False),
                "allow_print": share.get('allow_print', False),
                "allow_copy": share.get('allow_copy', False),
                "use_count": use_count,
                "max_uses": max_uses,
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        # Clean up error message - don't expose raw JSON/dict data
        if len(error_msg) > 100 or '{' in error_msg:
            error_msg = "An unexpected error occurred"
        logger.error(f"❌ Error in get_share_link_document_url: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load document: {error_msg}")
from pydantic import BaseModel
from typing import Optional

class ViewTrackingRequest(BaseModel):
    device_type: Optional[str] = "Desktop"
    visitor_id: Optional[str] = None
    user_agent: Optional[str] = None
    accessor_email: Optional[str] = None

@router.post("/document/{token}/view")
async def track_share_link_view(token: str, request: ViewTrackingRequest = None):
    """
    Track a view on a share link by incrementing use_count (or view_count for external_shares)
    """
    try:
        if request is None:
            request = ViewTrackingRequest()
        
        share = None
        is_external_share = False
        table_name = None
        
        # Find the share link - try share_links first
        try:
            share_response = supabase.table('share_links')\
                .select('id, use_count')\
                .eq('token', token)\
                .limit(1)\
                .execute()
            
            if share_response.data and len(share_response.data) > 0:
                share = share_response.data[0]
                table_name = 'share_links'
        except Exception as e:
            logger.warning(f"⚠️ Error querying share_links by token in view tracking: {e}")
        
        if not share:
            # Try by short_code in share_links
            try:
                share_response = supabase.table('share_links')\
                    .select('id, use_count')\
                    .eq('short_code', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
                    table_name = 'share_links'
            except Exception as e:
                logger.warning(f"⚠️ Error querying share_links by short_code in view tracking: {e}")
        
        # Try external_shares by invitation_token
        if not share:
            try:
                share_response = supabase.table('external_shares')\
                    .select('id, view_count')\
                    .eq('invitation_token', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
                    is_external_share = True
                    table_name = 'external_shares'
            except Exception as e:
                logger.warning(f"⚠️ Error querying external_shares by invitation_token in view tracking: {e}")
        
        # Try external_shares by token
        if not share:
            try:
                share_response = supabase.table('external_shares')\
                    .select('id, view_count')\
                    .eq('token', token)\
                    .limit(1)\
                    .execute()
                
                if share_response.data and len(share_response.data) > 0:
                    share = share_response.data[0]
                    is_external_share = True
                    table_name = 'external_shares'
            except Exception as e:
                logger.warning(f"⚠️ Error querying external_shares by token in view tracking: {e}")
        
        if not share or not table_name:
            raise HTTPException(status_code=404, detail="Share link not found")
        
        # Increment use_count or view_count depending on table
        if is_external_share:
            new_count = (share.get('view_count') or 0) + 1
            supabase.table('external_shares')\
                .update({'view_count': new_count})\
                .eq('id', share['id'])\
                .execute()
        else:
            new_count = (share.get('use_count') or 0) + 1
            supabase.table('share_links')\
                .update({'use_count': new_count})\
                .eq('id', share['id'])\
                .execute()
        
        logger.info(f"📊 View tracked for {token} in {table_name}: count={new_count}, device={request.device_type}")
        
        return {
            "success": True, 
            "use_count": new_count,
            "device_type": request.device_type
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error tracking share link view: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to track view: {str(e)}")


@router.get("/check-approved-checkout/{token}")
async def check_approved_checkout(token: str):
    """
    Check if there's an approved checkout request for this share link and active document lock.
    This endpoint bypasses RLS by using service role.
    
    Args:
        token: The share link token (can be token or short_code)
    
    Returns:
        Information about approved checkout access and document lock if found
    """
    try:
        logger.info(f"🔍 Checking approved checkout for share link: {token}")
        
        # First get the share_link to find the document_id
        share_response = supabase.table('share_links')\
            .select('resource_id')\
            .eq('token', token)\
            .limit(1)\
            .execute()
        
        if not share_response.data or len(share_response.data) == 0:
            # Try by short_code
            share_response = supabase.table('share_links')\
                .select('resource_id')\
                .eq('short_code', token)\
                .limit(1)\
                .execute()
        
        if not share_response.data or len(share_response.data) == 0:
            logger.warning(f"❌ Share link not found for token: {token}")
            return {
                "has_approved_checkout": False,
                "requester_email": None,
                "lock_expires_at": None
            }
        
        document_id = share_response.data[0]['resource_id']
        
        # Query checkout_requests using service role (bypasses RLS)
        checkout_response = supabase.table('checkout_requests')\
            .select('requester_email, approved_at, expires_at, status')\
            .eq('share_link_id', token)\
            .eq('status', 'approved')\
            .order('approved_at', {'ascending': False})\
            .limit(1)\
            .execute()
        
        if not checkout_response.data or len(checkout_response.data) == 0:
            logger.info(f"❌ No approved checkout found for token: {token}")
            return {
                "has_approved_checkout": False,
                "requester_email": None,
                "lock_expires_at": None
            }
        
        approved_request = checkout_response.data[0]
        requester_email = approved_request['requester_email']
        logger.info(f"✅ Found approved checkout for {requester_email}")
        
        # Now check if there's an active document lock for this email
        from datetime import datetime
        lock_response = supabase.table('document_locks')\
            .select('*')\
            .eq('document_id', document_id)\
            .eq('guest_email', requester_email)\
            .eq('is_active', True)\
            .gte('expires_at', datetime.utcnow().isoformat())\
            .limit(1)\
            .execute()
        
        if lock_response.data and len(lock_response.data) > 0:
            lock = lock_response.data[0]
            logger.info(f"✅ Found active document lock, expires: {lock['expires_at']}")
            return {
                "has_approved_checkout": True,
                "requester_email": requester_email,
                "approved_at": approved_request.get('approved_at'),
                "lock_expires_at": lock['expires_at'],
                "lock_active": True
            }
        else:
            logger.warning(f"⚠️ Checkout approved but no active lock found")
            return {
                "has_approved_checkout": True,
                "requester_email": requester_email,
                "approved_at": approved_request.get('approved_at'),
                "lock_expires_at": None,
                "lock_active": False
            }
        
    except Exception as e:
        logger.error(f"❌ Error checking approved checkout: {str(e)}")
        # Return false instead of error to not break the flow
        return {
            "has_approved_checkout": False,
            "requester_email": None,
            "lock_expires_at": None
        }


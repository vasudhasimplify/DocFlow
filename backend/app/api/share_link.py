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
        token: The share link token (can be token or short_code)
    
    Returns:
        Document information and signed URL
    """
    try:
        logger.info(f"📄 Fetching document for share link token: {token}")
        
        # First try by token field
        share_response = supabase.table('share_links')\
            .select('*')\
            .eq('token', token)\
            .maybe_single()\
            .execute()
        
        share = share_response.data
        
        # If not found by token, try by short_code
        if not share:
            logger.info(f"🔍 Token not found, trying short_code: {token}")
            share_response = supabase.table('share_links')\
                .select('*')\
                .eq('short_code', token)\
                .maybe_single()\
                .execute()
            share = share_response.data
        
        if not share:
            logger.warning(f"❌ Share link not found for token: {token}")
            raise HTTPException(status_code=404, detail="Share link not found")
        
        logger.info(f"✅ Found share link: {share.get('name', 'Unnamed')} (ID: {share.get('id')})")
        
        # Check if share is active
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
        
        # Check max uses
        use_count = share.get('use_count', 0)
        max_uses = share.get('max_uses')
        if max_uses and use_count >= max_uses:
            raise HTTPException(status_code=403, detail="Share link has reached maximum views")
        
        resource_id = share.get('resource_id')
        if not resource_id:
            raise HTTPException(status_code=404, detail="Share link has no associated document")
        
        # Get the document using service role (bypasses RLS)
        logger.info(f"🔍 Fetching document: {resource_id}")
        doc_response = supabase.table('documents')\
            .select('*')\
            .eq('id', resource_id)\
            .single()\
            .execute()
        
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_response.data
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
    Track a view on a share link by incrementing use_count
    """
    try:
        if request is None:
            request = ViewTrackingRequest()
            
        # Find the share link - only select columns that exist
        share_response = supabase.table('share_links')\
            .select('id, use_count')\
            .eq('token', token)\
            .maybe_single()\
            .execute()
        
        share = share_response.data
        
        if not share:
            # Try by short_code
            share_response = supabase.table('share_links')\
                .select('id, use_count')\
                .eq('short_code', token)\
                .maybe_single()\
                .execute()
            share = share_response.data
        
        if not share:
            raise HTTPException(status_code=404, detail="Share link not found")
        
        # Increment use_count
        new_count = (share.get('use_count') or 0) + 1
        
        # Update use_count only
        supabase.table('share_links')\
            .update({'use_count': new_count})\
            .eq('id', share['id'])\
            .execute()
        
        logger.info(f"📊 View tracked for {token}: views={new_count}, device={request.device_type}")
        
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



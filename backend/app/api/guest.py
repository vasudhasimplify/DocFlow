"""
Guest Document Access Endpoint
Provides signed URLs for guest document viewing
"""

from fastapi import APIRouter, HTTPException
from app.core.supabase import supabase
import os

router = APIRouter(prefix="/api/guest", tags=["guest"])

@router.get("/document/{share_token}")
async def get_guest_document_url(share_token: str):
    """
    Get a signed URL for a guest-shared document
    This endpoint doesn't require authentication
    
    Args:
        share_token: The invitation token from the guest share link
    
    Returns:
        Document information and signed URL
    """
    try:
        # Get the share by token
        share_response = supabase.table('external_shares')\
            .select('*')\
            .eq('invitation_token', share_token)\
            .single()\
            .execute()
        
        if not share_response.data:
            raise HTTPException(status_code=404, detail="Share not found")
        
        share = share_response.data
        
        # Check if share is valid
        if share['status'] not in ['pending', 'accepted']:
            raise HTTPException(status_code=403, detail="Share is no longer active")
        
        # Get the document
        doc_response = supabase.table('documents')\
            .select('*')\
            .eq('id', share['resource_id'])\
            .single()\
            .execute()
        
        if not doc_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = doc_response.data
        
        # Create signed URL using service role (bypasses RLS)
        if not document.get('storage_path'):
            raise HTTPException(status_code=404, detail="Document file not found in storage")
        
        signed_url_response = supabase.storage\
            .from_('documents')\
            .create_signed_url(document['storage_path'], 3600)  # 1 hour expiry
        
        if not signed_url_response:
            raise HTTPException(status_code=500, detail="Failed to generate document URL")
        
        # Return document info with signed URL
        return {
            "document_id": document['id'],
            "file_name": document.get('file_name', 'document'),
            "file_type": document.get('file_type') or document.get('mime_type'),
            "signed_url": signed_url_response['signedURL'],
            "share_info": {
                "resource_name": share['resource_name'],
                "permission": share['permission'],
                "allow_download": share.get('allow_download', False),
                "allow_print": share.get('allow_print', True)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_guest_document_url: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")

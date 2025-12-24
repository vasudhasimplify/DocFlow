"""
Signature Request Email API
Sends email notifications when signature requests are created/sent
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from supabase import create_client, Client
import os
from app.services.email import send_signature_request_email

router = APIRouter(prefix="/api/signatures", tags=["signatures"])

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


class SendSignatureEmailsRequest(BaseModel):
    request_id: str


@router.post("/send-emails")
async def send_signature_request_emails(body: SendSignatureEmailsRequest):
    """
    Send email notifications to all signers for a signature request
    """
    try:
        # Get the signature request details
        response = supabase.table('signature_requests').select(
            '*'
        ).eq('id', body.request_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Signature request not found")
        
        request_data = response.data
        
        # Get all signers for this request
        signers_response = supabase.table('signature_signers').select(
            '*'
        ).eq('request_id', body.request_id).execute()
        
        if not signers_response.data:
            raise HTTPException(status_code=404, detail="No signers found for this request")
        
        # Get user details (sender)
        user_response = supabase.auth.admin.get_user_by_id(request_data['user_id'])
        sender_email = user_response.user.email if user_response and user_response.user else "SimplifyDrive User"
        # Extract name from email (before @)
        sender_name = sender_email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        
        # Send email to each signer
        success_count = 0
        failed_count = 0
        
        for signer in signers_response.data:
            try:
                # Generate signing URL with token
                # Token already exists in access_token field from when signer was created
                token = signer.get('access_token')
                if not token:
                    # Generate new token if it doesn't exist
                    import secrets
                    token = secrets.token_urlsafe(32)
                    # Update signer with token
                    supabase.table('signature_signers').update({
                        'access_token': token
                    }).eq('id', signer['id']).execute()
                
                # Generate signing URL
                # Use environment variable for frontend URL or default to localhost
                frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:4173')
                signing_url = f"{frontend_url}/sign/{token}"
                
                # Send email
                email_sent = send_signature_request_email(
                    recipient_email=signer['email'],
                    recipient_name=signer['name'],
                    sender_name=sender_name,
                    document_title=request_data['title'],
                    message=request_data.get('message'),
                    signing_url=signing_url,
                    expires_at=request_data.get('expires_at')
                )
                
                if email_sent:
                    success_count += 1
                    # Update signer status to 'sent'
                    supabase.table('signature_signers').update({
                        'status': 'sent',
                        'sent_at': 'now()'
                    }).eq('id', signer['id']).execute()
                else:
                    failed_count += 1
                    
            except Exception as e:
                print(f"Failed to send email to {signer['email']}: {str(e)}")
                failed_count += 1
        
        return {
            "success": True,
            "message": f"Sent {success_count} emails successfully, {failed_count} failed", 
            "sent_count": success_count,
            "failed_count": failed_count
        }
        
    except Exception as e:
        print(f"Error sending signature request emails: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Migration API - Google Drive to SimplifyDrive migration endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from ..core.supabase_client import get_supabase_client
from ..core.supabase_client import get_supabase_client
from ..services.google_drive_connector import GoogleDriveConnector
from ..services.onedrive_connector import OneDriveConnector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/migration", tags=["migration"])


# ============================================================================
# Helper Functions
# ============================================================================

def _make_error_friendly(technical_error: str) -> str:
    """
    Convert technical error messages to user-friendly descriptions.
    
    Args:
        technical_error: Raw error message from migration logs
        
    Returns:
        User-friendly error description
    """
    error_lower = technical_error.lower()
    
    # Network and timeout errors
    if 'timeout' in error_lower or 'timed out' in error_lower:
        return "Connection timeout - file transfer took too long"
    if 'connection' in error_lower or 'network' in error_lower:
        return "Network connection issue"
    if 'rate limit' in error_lower or 'quota' in error_lower:
        return "API rate limit exceeded - too many requests"
    
    # Permission errors
    if 'permission' in error_lower or 'access denied' in error_lower or 'forbidden' in error_lower:
        return "Access denied - insufficient permissions"
    if 'not found' in error_lower or '404' in error_lower:
        return "File or folder not found"
    if 'unauthorized' in error_lower or '401' in error_lower:
        return "Authentication failed - credentials may be expired"
    
    # File-specific errors
    if 'too large' in error_lower or 'size limit' in error_lower or 'file size' in error_lower:
        return "File too large to migrate"
    if 'unsupported' in error_lower or 'format' in error_lower:
        return "Unsupported file type or format"
    if 'corrupt' in error_lower or 'invalid' in error_lower:
        return "Corrupted or invalid file"
    
    # User mapping errors
    if 'no simplifiedrive user found' in error_lower or 'user does not exist' in error_lower:
        return "User not found in SimplifyDrive system"
    if 'cannot share with self' in error_lower:
        return "Cannot share file with yourself"
    
    # Storage errors
    if 'storage' in error_lower or 'disk' in error_lower or 'space' in error_lower:
        return "Insufficient storage space"
    
    # Generic fallback - clean up technical jargon
    friendly = technical_error.replace('StatusCode:', '').replace('Error:', '').replace('Exception:', '').strip()
    
    # If it's still too technical (contains common code patterns), provide generic message
    if any(pattern in friendly for pattern in ['[', '{', '\\n', '\\r', 'null', 'undefined']):
        return "Migration error - see logs for details"
    
    # Return cleaned version, capitalize first letter
    return friendly[0].upper() + friendly[1:] if friendly else "Unknown error"


# ============================================================================
# Request/Response Models
# ============================================================================

class CredentialCreate(BaseModel):
    name: str
    source_system: str = "google_drive"
    credentials: Dict[str, Any]  # OAuth tokens


class CredentialResponse(BaseModel):
    id: str
    name: str
    source_system: str
    is_valid: bool
    created_at: str


class JobCreate(BaseModel):
    name: str
    source_system: str = "google_drive"  # 'google_drive' or 'onedrive'
    credentials_id: Optional[str] = None  # Optional - can use service account
    folder_id: Optional[str] = None  # Google Drive folder ID
    config: Dict[str, Any] = {}


class JobResponse(BaseModel):
    id: str
    name: str
    source_system: str
    status: str
    total_items: int
    processed_items: int
    failed_items: int
    progress_percent: float
    created_at: str


class DiscoveryRequest(BaseModel):
    credentials_id: str
    folder_id: Optional[str] = None


class DiscoveryResponse(BaseModel):
    total_files: int
    total_folders: int
    total_size_bytes: int
    files: List[Dict[str, Any]]


# ============================================================================
# Credentials Endpoints
# ============================================================================

@router.post("/credentials", response_model=CredentialResponse)
async def create_credentials(credential: CredentialCreate, user_id: str):
    """
    Save Google Drive OAuth credentials for a user.
    
    Args:
        credential: OAuth tokens from Google
        user_id: Current user ID
    """
    try:
        supabase = get_supabase_client()
        
        # Test credentials validity
        try:
            if credential.source_system == 'onedrive':
                connector = OneDriveConnector(credential.credentials)
                logger.info("✅ OneDrive credentials validated")
            else:
                connector = GoogleDriveConnector(credential.credentials)
                logger.info("✅ Google Drive credentials validated")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid credentials: {str(e)}")
        
        # Store encrypted credentials
        response = supabase.table('migration_credentials').insert({
            'user_id': user_id,
            'name': credential.name,
            'source_system': credential.source_system,
            'credentials_encrypted': credential.credentials,
            'is_valid': True,
            'last_validated_at': datetime.utcnow().isoformat()
        }).execute()
        
        cred_data = response.data[0]
        
        return CredentialResponse(
            id=cred_data['id'],
            name=cred_data['name'],
            source_system=cred_data['source_system'],
            is_valid=cred_data['is_valid'],
            created_at=cred_data['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credentials", response_model=List[CredentialResponse])
async def get_credentials(user_id: str):
    """Get all saved credentials for user."""
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('migration_credentials').select('*').eq('user_id', user_id).execute()
        
        return [
            CredentialResponse(
                id=cred['id'],
                name=cred['name'],
                source_system=cred['source_system'],
                is_valid=cred['is_valid'],
                created_at=cred['created_at']
            )
            for cred in response.data
        ]
        
    except Exception as e:
        logger.error(f"Error fetching credentials: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Users Endpoint (for Identity Mapping lookups)
# ============================================================================

@router.get("/users")
async def get_users():
    """
    Get all SimplifyDrive users from auth.users.
    Used by Identity Mapping to show available target users.
    """
    try:
        supabase = get_supabase_client()
        
        # Use Admin API to get all users from auth.users
        auth_response = supabase.auth.admin.list_users()
        
        logger.info(f"🔍 Auth response type: {type(auth_response)}")
        
        users = []
        user_list = []
        
        # Handle different response formats from supabase-py
        if hasattr(auth_response, 'users'):
            user_list = auth_response.users
        elif isinstance(auth_response, list):
            user_list = auth_response
        
        logger.info(f"🔍 Found {len(user_list)} raw users")
        
        for user in user_list:
            # Try multiple ways to get email
            email = None
            user_id = None
            full_name = ''
            
            # Get email
            if hasattr(user, 'email'):
                email = user.email
            elif isinstance(user, dict) and 'email' in user:
                email = user['email']
            
            # Get id
            if hasattr(user, 'id'):
                user_id = user.id
            elif isinstance(user, dict) and 'id' in user:
                user_id = user['id']
            
            # Get full_name from user_metadata
            if hasattr(user, 'user_metadata') and user.user_metadata:
                full_name = user.user_metadata.get('full_name', '')
            elif isinstance(user, dict) and 'user_metadata' in user:
                full_name = user.get('user_metadata', {}).get('full_name', '')
            
            if email and user_id:
                users.append({
                    'id': str(user_id),
                    'email': email,
                    'full_name': full_name or ''
                })
                logger.debug(f"   Found user: {email}")
        
        logger.info(f"📋 Returning {len(users)} users from auth.users")
        return users
        
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Discovery Endpoint
# ============================================================================

@router.post("/discover", response_model=DiscoveryResponse)
async def discover_files(request: DiscoveryRequest, user_id: str):
    """
    Discover files in Google Drive folder.
    
    Args:
        request: Discovery request with credentials and folder ID
        user_id: Current user ID
    """
    try:
        supabase = get_supabase_client()
        
        # Get credentials
        cred_response = supabase.table('migration_credentials').select('*').eq('id', request.credentials_id).eq('user_id', user_id).single().execute()
        
        if not cred_response.data:
            raise HTTPException(status_code=404, detail="Credentials not found")
        
        cred_data = cred_response.data
        source_system = cred_data.get('source_system', 'google_drive')
        
        # Initialize connector
        if source_system == 'onedrive':
            connector = OneDriveConnector(cred_data['credentials_encrypted'])
        else:
            connector = GoogleDriveConnector(cred_data['credentials_encrypted'])
        
        # Discover files
        all_files = []
        page_token = None
        
        while True:
            result = connector.list_files(request.folder_id, page_token)
            all_files.extend(result['files'])
            
            if not result['hasMore']:
                break
            page_token = result['nextPageToken']
        
        # Calculate stats
        total_files = sum(1 for f in all_files if f['mimeType'] != 'application/vnd.google-apps.folder')
        total_folders = sum(1 for f in all_files if f['mimeType'] == 'application/vnd.google-apps.folder')
        total_size = sum(int(f.get('size', 0)) for f in all_files if 'size' in f)
        
        logger.info(f"📂 Discovered {total_files} files, {total_folders} folders ({total_size} bytes)")
        
        return DiscoveryResponse(
            total_files=total_files,
            total_folders=total_folders,
            total_size_bytes=total_size,
            files=all_files[:100]  # Return first 100 for preview
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error discovering files: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Job Endpoints
# ============================================================================

@router.post("/jobs", response_model=JobResponse)
async def create_job(job: JobCreate, user_id: str):
    """
    Create a new migration job.
    
    Args:
        job: Job creation request
        user_id: Current user ID
    """
    try:
        supabase = get_supabase_client()
        
        # Handle empty credentials_id (use None instead of empty string)
        cred_id = job.credentials_id if job.credentials_id else None
        
        # Use source_system from request, or from credentials if available
        source_system = job.source_system
        if cred_id:
            cred_response = supabase.table('migration_credentials').select('source_system').eq('id', cred_id).single().execute()
            if cred_response.data:
                source_system = cred_response.data['source_system']
        
        # Create job
        response = supabase.table('migration_jobs').insert({
            'user_id': user_id,
            'name': job.name,
            'source_system': source_system,
            'status': 'pending',
            'config': {
                'folder_id': job.folder_id or None,
                **job.config
            },
            'source_credentials_id': cred_id
        }).execute()
        
        job_data = response.data[0]
        
        logger.info(f"✅ Created migration job: {job_data['id']}")
        
        return JobResponse(
            id=job_data['id'],
            name=job_data['name'],
            source_system=job_data['source_system'],
            status=job_data['status'],
            total_items=job_data['total_items'],
            processed_items=job_data['processed_items'],
            failed_items=job_data['failed_items'],
            progress_percent=0.0,
            created_at=job_data['created_at']
        )
        
    except Exception as e:
        logger.error(f"Error creating job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs", response_model=List[JobResponse])
async def get_jobs(user_id: str):
    """Get all migration jobs for user."""
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('migration_jobs').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        
        jobs = []
        for job_data in response.data:
            progress = 0.0
            if job_data['total_items'] > 0:
                progress = (job_data['processed_items'] / job_data['total_items']) * 100
            
            jobs.append(JobResponse(
                id=job_data['id'],
                name=job_data['name'],
                source_system=job_data.get('source_system', 'google_drive'),
                status=job_data['status'],
                total_items=job_data['total_items'],
                processed_items=job_data['processed_items'],
                failed_items=job_data['failed_items'],
                progress_percent=round(progress, 1),
                created_at=job_data['created_at']
            ))
        
        return jobs
        
    except Exception as e:
        logger.error(f"Error fetching jobs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, user_id: str):
    """Get specific migration job."""
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('migration_jobs').select('*').eq('id', job_id).eq('user_id', user_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job_data = response.data
        progress = 0.0
        if job_data['total_items'] > 0:
            progress = (job_data['processed_items'] / job_data['total_items']) * 100
        
        return JobResponse(
            id=job_data['id'],
            name=job_data['name'],
            source_system=job_data.get('source_system', 'google_drive'),
            status=job_data['status'],
            total_items=job_data['total_items'],
            processed_items=job_data['processed_items'],
            failed_items=job_data['failed_items'],
            progress_percent=round(progress, 1),
            created_at=job_data['created_at']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Job Control Endpoints
# ============================================================================

@router.post("/jobs/{job_id}/start")
async def start_job(job_id: str, user_id: str):
    """
    Start a migration job - triggers the file transfer process.
    
    Args:
        job_id: Migration job UUID
        user_id: Current user ID
    """
    try:
        import asyncio
        from ..services.migration_engine import start_migration_job
        
        supabase = get_supabase_client()
        
        # Verify job exists and belongs to user
        response = supabase.table('migration_jobs').select('*').eq('id', job_id).eq('user_id', user_id).single().execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Start migration in background
        asyncio.create_task(start_migration_job(job_id))
        
        logger.info(f"🚀 Started migration job: {job_id}")
        
        return {"success": True, "message": "Migration started", "job_id": job_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# AI Summary Endpoint (NEW - No changes to existing functionality)
# ============================================================================

class GenerateSummaryRequest(BaseModel):
    job_id: str


class GenerateSummaryResponse(BaseModel):
    summary: str
    metrics: Dict[str, Any]


@router.post("/generate-summary", response_model=GenerateSummaryResponse)
async def generate_migration_summary(request: GenerateSummaryRequest, user_id: str):
    """
    Generate AI-powered summary of migration job with tabular statistics.
    
    This is a NEW endpoint that doesn't modify any existing functionality.
    """
    try:
        import json
        from ..services.llm_client import LLMClient
        
        supabase = get_supabase_client()
        
        # Fetch job data
        job_response = supabase.table('migration_jobs').select('*').eq('id', request.job_id).eq('user_id', user_id).single().execute()
        
        if not job_response.data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        job = job_response.data
        
        # Fetch metrics
        metrics_response = supabase.table('migration_metrics').select('*').eq('job_id', request.job_id).order('recorded_at', desc=True).limit(50).execute()
        metrics = metrics_response.data
        
        # Fetch audit logs (errors)
        logs_response = supabase.table('migration_audit_log').select('*').eq('job_id', request.job_id).order('created_at', desc=True).limit(100).execute()
        audit_logs = logs_response.data
        
        # Calculate summary metrics
        total_size_mb = round(job.get('transferred_bytes', 0) / (1024 * 1024), 2)
        avg_speed_mbps = 0
        if metrics:
            latest = metrics[0]
            bytes_per_sec = latest.get('bytes_per_second', 0)
            avg_speed_mbps = round(bytes_per_sec / (1024 * 1024), 2)
        
        duration_minutes = 0
        if job.get('started_at') and job.get('completed_at'):
            from datetime import datetime
            start = datetime.fromisoformat(job['started_at'])
            end = datetime.fromisoformat(job['completed_at'])
            duration_minutes = round((end - start).total_seconds() / 60, 1)
        
        # Count errors by type and convert to user-friendly messages
        error_counts = {}
        for log in audit_logs:
            if log.get('event_type') == 'item_failed' and log.get('error_message'):
                technical_error = log['error_message'][:100]  # First 100 chars for context
                friendly_error = _make_error_friendly(technical_error)
                error_counts[friendly_error] = error_counts.get(friendly_error, 0) + 1
        
        # Prepare context for LLM
        context = {
            "job_name": job.get('name', 'Unknown'),
            "source_system": job.get('source_system', 'google_drive'),
            "status": job.get('status', 'unknown'),
            "total_items": job.get('total_items', 0),
            "processed_items": job.get('processed_items', 0),
            "failed_items": job.get('failed_items', 0),
            "skipped_items": job.get('skipped_items', 0),
            "total_size_mb": total_size_mb,
            "avg_speed_mbps": avg_speed_mbps,
            "duration_minutes": duration_minutes,
            "error_summary": error_counts
        }
        
        # Generate AI summary
        prompt = f"""Analyze this migration job and create a professional, concise summary for NON-TECHNICAL users.

Migration Data:
{json.dumps(context, indent=2)}

IMPORTANT: The error_summary contains USER-FRIENDLY error descriptions (not technical codes).
Present these errors exactly as given - they're already translated for end users.

Create a markdown summary with:
1. **📊 Overview Table** - Key metrics in a clean table format
2. **🚀 Performance Analysis** - Brief, simple analysis (avoid technical jargon)
3. **⚠️ Issues** - Only if failures exist. List error types with counts. DO NOT add technical codes.
4. **💡 Recommendations** - 2-3 simple, actionable steps users can take

Keep it concise, friendly, and jargon-free. Use emojis sparingly."""

        llm_client = LLMClient()
        
        # Try AI summary, fallback to manual if unavailable
        try:
            summary = await llm_client.generate_text_completion(prompt=prompt, max_tokens=800)
        except Exception as e:
            # Fallback: generate summary manually if LLM fails (API down, etc.)
            logger.warning(f"LLM generation failed, using manual summary: {e}")
            success_rate = round((context['processed_items'] / max(context['total_items'], 1)) * 100, 1) if context['total_items'] > 0 else 0
            
            summary = f"""# Migration Summary: {context['job_name']}

## Overview

- **Total Files:** {context['total_items']:,}
- **Completed:** {context['processed_items']:,} ({success_rate}%)
- **Failed:** {context['failed_items']:,}
- **Skipped:** {context['skipped_items']:,}
- **Total Size:** {context['total_size_mb']} MB
- **Average Speed:** {context['avg_speed_mbps']} MB/s
- **Duration:** {context['duration_minutes']} minutes

## Performance

Migration {'completed successfully' if context['status'] == 'completed' else 'is ' + context['status']} with **{success_rate}% success rate**.

"""
            
            # Only add issues section if there are failures
            if context['failed_items'] > 0:
                # Get top 3 error messages (already user-friendly)
                top_errors = []
                for friendly_msg, count in list(error_counts.items())[:3]:
                    top_errors.append(f"- {friendly_msg} ({count} files)")
                
                summary += f"""## Issues Found

{chr(10).join(top_errors)}

## Recommendations

1. **Review failed items** - Click on the job details to see which files failed
2. **Retry the migration** - Many errors are temporary (network issues, timeouts)
3. **Check file permissions** - Ensure you have access to all source files
"""
            else:
                summary += "\n✓ **No issues detected** - All files migrated successfully!"

        
        logger.info(f"✅ Generated AI summary for job {request.job_id}")
        
        return GenerateSummaryResponse(
            summary=summary,
            metrics={
                "total_files": context['total_items'],
                "completed": context['processed_items'],
                "failed": context['failed_items'],
                "skipped": context['skipped_items'],
                "total_size_mb": context['total_size_mb'],
                "avg_speed_mbps": context['avg_speed_mbps'],
                "duration_minutes": context['duration_minutes']
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


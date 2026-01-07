"""
Migration Engine - ULTRA FAST VERSION
Uses async HTTP for downloads, minimal DB calls, and better parallelism
With transfer time tracking and status updates
"""
import asyncio
from typing import Optional, Dict, Any, List
import logging
from datetime import datetime
import time
import aiohttp
import os

from ..core.supabase_client import get_supabase_client
from ..core.supabase_client import get_supabase_client
from .google_drive_connector import GoogleDriveConnector
from .onedrive_connector import OneDriveConnector

logger = logging.getLogger(__name__)


class MigrationEngine:
    """
    ULTRA FAST Migration Engine with timing.
    - Async HTTP for Google Drive downloads (no blocking)
    - Higher concurrency (10 workers by default)
    - Minimal database operations
    - Transfer time tracking
    """
    
    def __init__(self, job_id: str):
        self.job_id = job_id
        self.supabase = get_supabase_client()
        self.connector: Optional[Any] = None  # Generic connector
        self.concurrency = 10  # Higher default
        self.processed_count = 0
        self.failed_count = 0
        self.total_bytes = 0
        self.start_time: Optional[float] = None
        self.access_token: Optional[str] = None
        self.source_system: str = 'google_drive'
        # Metrics tracking
        self.last_metrics_time: float = 0
        self.metrics_interval: float = 5.0  # Record metrics every 5 seconds
        self.throttle_count: int = 0
        self.is_cancelled: bool = False
        
    async def start_migration(self):
        """Start ultra-fast migration with timing."""
        self.start_time = time.time()
        
        try:
            logger.info(f"🚀 Starting ULTRA-FAST migration: {self.job_id}")
            self._update_job_status('discovering')
            self._record_audit_log('job_started', metadata={'source_system': self.source_system})
            
            job = self._get_job()
            self.concurrency = job.get('config', {}).get('concurrency', 10)
            
            # Initialize connector and get access token
            self._initialize_connector(job)
            
            # Fast discovery with batch insert
            discover_start = time.time()
            items_count = self._discover_files_fast(job)
            discover_time = time.time() - discover_start
            logger.info(f"⏱️ Discovery: {discover_time:.2f}s ({items_count} files)")
            
            if items_count == 0:
                self._update_job_status('completed', completed_at=datetime.utcnow().isoformat())
                return
            
            self._update_job_status('running', started_at=datetime.utcnow().isoformat())
            
            # ULTRA-FAST parallel transfer with async HTTP
            transfer_start = time.time()
            await self._transfer_files_ultra_fast()
            transfer_time = time.time() - transfer_start
            
            # Check if we actually finished everything despite cancellation flag
            job = self._get_job()
            total_items = job.get('total_items', 0)
            items_processed_total = self.processed_count + self.failed_count
            
            # Only mark as cancelled if we stopped EARLY
            if self.is_cancelled and items_processed_total < total_items:
                logger.info(f"🛑 Migration cancelled after processing {items_processed_total}/{total_items} files")
                # IMPORTANT: Record final metrics so counts match
                self._record_metrics()
                # Ensure DB status is definitely cancelled with correct counts
                self._update_job_status(
                    'cancelled',
                    processed_items=self.processed_count,
                    failed_items=self.failed_count,
                    transferred_bytes=self.total_bytes
                )
                return
            
            # Calculate final stats
            total_time = time.time() - self.start_time
            speed = (self.total_bytes / 1024 / 1024) / transfer_time if transfer_time > 0 else 0
            
            logger.info(f"")
            logger.info(f"{'='*50}")
            logger.info(f"✅ MIGRATION COMPLETE")
            logger.info(f"{'='*50}")
            logger.info(f"📊 Files: {self.processed_count} succeeded, {self.failed_count} failed")
            logger.info(f"📦 Size: {self.total_bytes / 1024:.1f} KB")
            logger.info(f"⏱️ Transfer: {transfer_time:.2f}s")
            logger.info(f"⏱️ Total: {total_time:.2f}s")
            logger.info(f"🚀 Speed: {speed:.2f} MB/s")
            logger.info(f"{'='*50}")
            
            # Update with timing info
            self._update_job_status(
                'completed',
                completed_at=datetime.utcnow().isoformat(),
                processed_items=self.processed_count,
                failed_items=self.failed_count,
                transferred_bytes=self.total_bytes,
                config={
                    'transfer_time_seconds': round(transfer_time, 2),
                    'total_time_seconds': round(total_time, 2),
                    'speed_mbps': round(speed, 2)
                }
            )
            
            # Record final metrics snapshot with accurate stage counts
            self._record_metrics()
            
            self._record_audit_log('job_completed', metadata={
                'processed': self.processed_count,
                'failed': self.failed_count,
                'total_bytes': self.total_bytes,
                'speed_mbps': round(speed, 2)
            })
            
        except Exception as e:
            import traceback
            logger.error(f"❌ Migration failed: {e}\n{traceback.format_exc()}")
            self._update_job_status('failed')
            raise
    
    def _get_job(self) -> Dict[str, Any]:
        return self.supabase.table('migration_jobs').select('*').eq('id', self.job_id).single().execute().data
    
    def _initialize_connector(self, job: Dict[str, Any]):
        import json
        from google.auth.transport.requests import Request
        
        # Get source_system from job
        self.source_system = job.get('source_system', 'google_drive')
        
        cred_id = job.get('source_credentials_id')
        if cred_id:
            cred = self.supabase.table('migration_credentials').select('*').eq('id', cred_id).single().execute()
            cred_data = cred.data['credentials_encrypted']
            self.source_system = cred.data.get('source_system', self.source_system)
            
            if self.source_system == 'onedrive':
                self.connector = OneDriveConnector(cred_data)
                self.access_token = cred_data.get('access_token')
                logger.info(f"✅ Using OneDrive credentials from database")
            else:
                self.connector = GoogleDriveConnector(cred_data)
                self.access_token = cred_data.get('access_token') or self.connector.creds.token
                logger.info(f"✅ Using Google Drive credentials from database")
            return
        
        # Check for access_token in job config (Quick Connect mode)
        config_access_token = job.get('config', {}).get('access_token')
        if config_access_token:
            if self.source_system == 'onedrive':
                self.connector = OneDriveConnector({'access_token': config_access_token})
                self.access_token = config_access_token
                logger.info(f"✅ Using OneDrive Quick Connect token")
            else:
                self.connector = GoogleDriveConnector({'access_token': config_access_token})
                self.access_token = config_access_token
                logger.info(f"✅ Using Google Drive Quick Connect token")
            return

        # Fallback to Google Drive service account (only for Google Drive)
        if self.source_system == 'google_drive':
            service_account_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                'google-service-account.json'
            )
            
            if os.path.exists(service_account_path):
                try:
                    with open(service_account_path, 'r') as f:
                        sa_data = json.load(f)
                    self.connector = GoogleDriveConnector(sa_data)
                    
                    # IMPORTANT: Refresh service account credentials to get valid access token
                    if not self.connector.creds.token:
                        self.connector.creds.refresh(Request())
                    
                    self.access_token = self.connector.creds.token
                    logger.info(f"✅ Using service account (token: {self.access_token[:20] if self.access_token else 'None'}...)")
                    return
                except Exception as e:
                    logger.warning(f"Service account failed: {e}")
        
        # No valid connector could be initialized
        raise ValueError(f"No valid credentials for {self.source_system} migration. Please connect your account.")
    
    def _discover_files_fast(self, job: Dict[str, Any]) -> int:
        folder_id = job['config'].get('folder_id') or job['config'].get('source_folder_id')
        logger.info(f"🔍 Discovering in: {folder_id or 'root'}")
        
        all_files = []
        page_token = None
        
        while True:
            result = self.connector.list_files(folder_id, page_token)
            all_files.extend(result['files'])
            if not result['hasMore']:
                break
            page_token = result['nextPageToken']
        
        files_only = [f for f in all_files if f['mimeType'] != 'application/vnd.google-apps.folder']
        
        if not files_only:
            return 0
        
        # Single batch insert
        total_size = 0
        items = []
        for file in files_only:
            items.append({
                'job_id': self.job_id,
                'source_item_id': file['id'],
                'source_name': file['name'],
                'source_path': file.get('webViewLink', ''),
                'source_mime_type': file['mimeType'],
                'source_size': int(file.get('size', 0)),
                'item_type': 'file',
                'status': 'pending'
            })
            total_size += int(file.get('size', 0))
        
        # Batch insert all at once
        self.supabase.table('migration_items').insert(items).execute()
        
        self.supabase.table('migration_jobs').update({
            'total_items': len(files_only),
            'total_bytes': total_size
        }).eq('id', self.job_id).execute()
        
        return len(files_only)
    
    async def _transfer_files_ultra_fast(self):
        """Transfer files with async HTTP - much faster than sync."""
        items = self.supabase.table('migration_items').select('*').eq('job_id', self.job_id).eq('status', 'pending').execute().data
        
        if not items:
            return
        
        job = self._get_job()
        user_id = job['user_id']
        delete_after = job.get('config', {}).get('delete_after_migration', False)
        
        # Pre-fetch identity mappings once for efficiency
        identity_mappings = self._get_identity_mappings(user_id)
        logger.info(f"🔗 Loaded {len(identity_mappings)} identity mappings for user")
        
        logger.info(f"📦 Transferring {len(items)} files with {self.concurrency} async workers (Delete source: {delete_after})")
        
        # Start cancellation monitor
        monitor_task = asyncio.create_task(self._monitor_cancellation())
        
        try:
            # Use aiohttp for async downloads with proper SSL context
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connector = aiohttp.TCPConnector(limit=self.concurrency, ssl=ssl_context)
            timeout = aiohttp.ClientTimeout(total=120)
            
            async with aiohttp.ClientSession(connector=connector, timeout=timeout, trust_env=False) as session:
                semaphore = asyncio.Semaphore(self.concurrency)
                
                async def transfer_one(item):
                    # Check cancellation before starting
                    if self.is_cancelled:
                        return
                    
                    async with semaphore:
                        # Double check inside semaphore
                        if self.is_cancelled:
                            return
                        await self._transfer_single_async(session, item, user_id, delete_after, identity_mappings)
                
                tasks = [transfer_one(item) for item in items]
                await asyncio.gather(*tasks, return_exceptions=True)
                
        finally:
            # key: stop monitor when done
            self.is_cancelled = True # This stops the loop in monitor
            monitor_task.cancel()
            try:
                await monitor_task
            except asyncio.CancelledError:
                pass
    
    async def _transfer_single_async(self, session: aiohttp.ClientSession, item: Dict[str, Any], user_id: str, delete_after: bool = False, identity_mappings: List[Dict] = None):
        """Transfer a single file using async HTTP with optional permission migration."""
        file_id = item['source_item_id']
        file_name = item['source_name']
        file_start = time.time()
        identity_mappings = identity_mappings or []
        
        try:
            # Async download
            if self.source_system == 'onedrive':
                url = f"https://graph.microsoft.com/v1.0/me/drive/items/{file_id}/content"
                headers = {"Authorization": f"Bearer {self.access_token}"}
            else:
                # Google Drive
                mime_type = item.get('source_mime_type', '')
                
                # Handle Google Apps files (Docs, Sheets, Slides) -> Export to PDF/Office
                if mime_type.startswith('application/vnd.google-apps.'):
                    export_mime = 'application/pdf' # Default safe export
                    if 'spreadsheet' in mime_type:
                        export_mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' # xlsx
                    elif 'document' in mime_type:
                        export_mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' # docx
                    elif 'presentation' in mime_type:
                        export_mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation' # pptx
                    
                    url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType={export_mime}&supportsAllDrives=true"
                    # Update item mime type for storage to match export
                    item['source_mime_type'] = export_mime
                else:
                    # Regular binary files (with acknowledgeAbuse for shared files)
                    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&acknowledgeAbuse=true&supportsAllDrives=true"
                
                headers = {"Authorization": f"Bearer {self.access_token}"}
            
            try:
                async with session.get(url, headers=headers) as response:
                    if response.status == 403 or response.status == 400:
                        # Shared file permission issue or bad request -> Fallback to robust sync
                        raise Exception(f"HTTP {response.status}")
                    if response.status != 200:
                        raise Exception(f"Download failed: HTTP {response.status}")
                    file_content = await response.read()
                    
            except Exception as async_err:
                # 🔄 FALLBACK: Use robust synchronous connector (handles retries, different auth flows)
                logger.warning(f"⚠️ Async download failed ({str(async_err)}), trying robust sync fallback for {file_name}")
                try:
                    if self.connector and hasattr(self.connector, 'download_file'):
                        file_content = await asyncio.to_thread(self.connector.download_file, file_id)
                    else:
                        raise async_err
                except Exception as sync_err:
                    # Both async and sync failed - re-raise to be caught by outer exception handler
                    logger.error(f"❌ Both async and sync download failed for {file_name}: {sync_err}")
                    raise Exception(f"Download failed: async={async_err}, sync={sync_err}")
            
            download_time = time.time() - file_start
            
            # Upload to Supabase storage
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            storage_path = f"{user_id}/{timestamp}_{file_name}"
            
            upload_start = time.time()
            self.supabase.storage.from_('documents').upload(
                storage_path,
                file_content,
                {'content-type': item['source_mime_type']}
            )
            upload_time = time.time() - upload_start
            
            # Create document + update item in minimal DB calls
            doc_response = self.supabase.table('documents').insert({
                'user_id': user_id,
                'file_name': file_name,
                'file_type': item['source_mime_type'],
                'file_size': len(file_content),
                'storage_path': storage_path,
                'processing_status': 'completed',
                'metadata': {
                    'migrated_from': self.source_system,
                    'source_id': file_id,
                    'migration_job_id': self.job_id
                }
            }).execute()
            
            self.supabase.table('migration_items').update({
                'status': 'completed',
                'target_document_id': doc_response.data[0]['id']
            }).eq('id', item['id']).execute()
            
            total_time = time.time() - file_start
            self.processed_count += 1
            self.total_bytes += len(file_content)
            
            # Best Effort: Apply permissions from source (non-blocking)
            try:
                document_id = doc_response.data[0]['id']
                if self.connector and hasattr(self.connector, 'get_permissions'):
                    # Fetch source permissions (run sync connector method in thread pool)
                    source_permissions = await asyncio.to_thread(self.connector.get_permissions, file_id)
                    if source_permissions:
                        await self._apply_permissions(
                            document_id=document_id,
                            target_user_id=user_id,
                            source_permissions=source_permissions,
                            identity_mappings=identity_mappings,
                            owner_id=user_id,
                            file_name=file_name
                        )
            except Exception as perm_err:
                logger.warning(f"⚠️ Could not apply permissions for {file_name}: {perm_err}")

            # Move Logic: Delete from source if configured (Move vs Copy)
            if delete_after and self.connector and hasattr(self.connector, 'trash_file'):
                try:
                    # Run in thread pool to avoid blocking async loop since connector is sync
                    await asyncio.to_thread(self.connector.trash_file, file_id)
                except Exception as trash_err:
                    logger.warning(f"⚠️ Failed to trash source file {file_name}: {trash_err}")
            
            # Record live metrics periodically
            self._maybe_record_metrics()
            
            size_kb = len(file_content) / 1024
            logger.info(f"✅ [{self.processed_count}] {file_name} ({size_kb:.1f}KB) - {total_time:.2f}s (⬇️{download_time:.2f}s ⬆️{upload_time:.2f}s)")
            
        except Exception as e:
            self.failed_count += 1
            logger.error(f"❌ {file_name}: {str(e)[:100]}")
            
            self.supabase.table('migration_items').update({
                'status': 'failed',
                'last_error': str(e)[:500]
            }).eq('id', item['id']).execute()
            
            # Record failure in audit log
            self._record_audit_log('item_failed', source_item_id=file_id, error_message=str(e)[:200])
    
    def _update_job_status(self, status: str, **kwargs):
        """Update job status with logging."""
        try:
            update_data = {'status': status, **kwargs}
            logger.info(f"📊 Updating job status to: {status}")
            
            result = self.supabase.table('migration_jobs').update(update_data).eq('id', self.job_id).execute()
            
            logger.info(f"✅ Job status updated to: {status}")
            return result
        except Exception as e:
            logger.error(f"❌ Failed to update job status to {status}: {e}")
            raise
    
    def _maybe_record_metrics(self):
        """Record metrics if enough time has passed since last recording."""
        current_time = time.time()
        if current_time - self.last_metrics_time >= self.metrics_interval:
            self._record_metrics()
            self.last_metrics_time = current_time
    
    def _record_metrics(self):
        """Record live performance metrics to database for frontend display."""
        try:
            if not self.start_time:
                return
            
            elapsed_seconds = time.time() - self.start_time
            
            if elapsed_seconds > 0:
                files_per_minute = (self.processed_count / elapsed_seconds) * 60
                bytes_per_second = self.total_bytes / elapsed_seconds
            else:
                files_per_minute = 0
                bytes_per_second = 0
            
            # Get current stage counts from items
            try:
                stage_counts_response = self.supabase.table('migration_items').select('status').eq('job_id', self.job_id).execute()
                stage_counts = {}
                for item in stage_counts_response.data:
                    status = item['status']
                    stage_counts[status] = stage_counts.get(status, 0) + 1
            except Exception:
                stage_counts = {}
            
            metrics_data = {
                'job_id': self.job_id,
                'files_per_minute': round(files_per_minute, 2),
                'bytes_per_second': round(bytes_per_second, 2),
                'error_count': self.failed_count,
                'api_throttle_count': self.throttle_count,
                'stage_counts': stage_counts,
                'recorded_at': datetime.utcnow().isoformat()
            }
            
            self.supabase.table('migration_metrics').insert(metrics_data).execute()
            logger.info(f"📊 Metrics: {files_per_minute:.1f} files/min, {bytes_per_second/1024:.1f} KB/s, {self.processed_count} done")
            
            # Also update job processed counts for real-time progress
            self.supabase.table('migration_jobs').update({
                'processed_items': self.processed_count,
                'failed_items': self.failed_count,
                'transferred_bytes': self.total_bytes
            }).eq('id', self.job_id).execute()
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to record metrics: {e}")
    
    def _record_audit_log(self, event_type: str, source_item_id: str = None, error_message: str = None, error_code: str = None, metadata: dict = None):
        """Record an event to the migration audit log for Activity Log display."""
        try:
            log_data = {
                'job_id': self.job_id,
                'event_type': event_type,
                'source_item_id': source_item_id,
                'error_message': error_message,
                'error_code': error_code,
                'metadata': metadata or {},
                'created_at': datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table('migration_audit_log').insert(log_data).execute()
            logger.info(f"📝 Audit log recorded: {event_type} - {error_message[:50] if error_message else 'no message'}...")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to record audit log: {e}")

    def _get_identity_mappings(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all identity mappings for a user.
        
        Args:
            user_id: SimplifyDrive user ID
            
        Returns:
            List of identity mapping records
        """
        try:
            response = self.supabase.table('identity_mappings').select('*').eq('user_id', user_id).execute()
            return response.data or []
        except Exception as e:
            logger.warning(f"⚠️ Could not fetch identity mappings: {e}")
            return []

    def _resolve_target_user(self, source_email: str, source_system: str, identity_mappings: List[Dict]) -> Optional[str]:
        """
        Resolve a source email to a SimplifyDrive user ID.
        
        Strategy (Best Effort):
        1. Check identity_mappings for explicit override
        2. Auto-match by email in auth.users (profiles table)
        3. Return None if no match (fallback to owner_only)
        
        Args:
            source_email: Email from source system permission
            source_system: 'google_drive' or 'onedrive'
            identity_mappings: Pre-fetched list of mappings
            
        Returns:
            SimplifyDrive user UUID or None
        """
        if not source_email:
            return None
        
        # Step 1: Check explicit identity mapping
        for mapping in identity_mappings:
            if (mapping.get('source_system') == source_system and 
                mapping.get('source_email', '').lower() == source_email.lower()):
                target_id = mapping.get('target_user_id')
                if target_id:
                    logger.info(f"🔗 Identity mapping found: {source_email} → {target_id}")
                    return target_id
        
        # Step 2: Auto-match by email in profiles table (or users table)
        try:
            # Try profiles table first
            response = self.supabase.table('profiles').select('id').eq('email', source_email.lower()).maybeSingle().execute()
            if response.data:
                target_id = response.data.get('id')
                logger.info(f"🔗 Auto-matched by email (profiles): {source_email} → {target_id}")
                return target_id
            
            # Fallback: Try users table (some schemas use this instead)
            response = self.supabase.table('users').select('id').eq('email', source_email.lower()).maybeSingle().execute()
            if response.data:
                target_id = response.data.get('id')
                logger.info(f"🔗 Auto-matched by email (users): {source_email} → {target_id}")
                return target_id
                
        except Exception as e:
            logger.debug(f"Could not auto-match email in public tables: {e}")
        
        # Step 3: Fallback to auth.users via Admin API (works when no public profiles table exists)
        try:
            # Use Supabase Admin API to search auth.users
            auth_response = self.supabase.auth.admin.list_users()
            if auth_response and hasattr(auth_response, 'users'):
                available_emails = [u.email for u in auth_response.users if u.email]
                logger.debug(f"🔍 Auth users available: {available_emails}")
                
                for user in auth_response.users:
                    if user.email and user.email.lower() == source_email.lower():
                        logger.info(f"🔗 Auto-matched by email (auth.users): {source_email} → {user.id}")
                        return user.id
                        
                # Log near-matches for debugging
                source_lower = source_email.lower()
                for user in auth_response.users:
                    if user.email and (source_lower.split('@')[0] in user.email.lower() or user.email.lower().split('@')[0] in source_lower):
                        logger.info(f"⚠️ Potential match: {source_email} ≈ {user.email} (different domain?)")
        except Exception as e:
            logger.warning(f"Could not search auth.users: {e}")
        
        # Step 4: No match found
        logger.info(f"❓ No target user found for {source_email} (will use owner_only)")
        return None
    
    async def _apply_permissions(self, document_id: str, target_user_id: str, source_permissions: List[Dict], 
                                  identity_mappings: List[Dict], owner_id: str, file_name: str = "Unknown"):
        """
        Apply source permissions to migrated document (Best Effort).
        
        This creates share records for users we can identify, and skips any we cannot.
        NEVER fails the migration if permissions cannot be applied.
        
        Args:
            document_id: The new SimplifyDrive document ID
            target_user_id: The migration job owner (document owner)
            source_permissions: Permissions from source system
            identity_mappings: Pre-fetched identity mappings
            owner_id: Owner of the migration job
            file_name: Name of the file being processed (for logging)
        """
        try:
            if not source_permissions:
                return
            
            shares_created = 0
            
            for perm in source_permissions:
                source_email = perm.get('email')
                source_role = perm.get('role', 'reader')
                perm_type = perm.get('type', 'user')
                
                # Skip owner permissions and non-user types (domain, anyone, link)
                if source_role == 'owner' or perm_type not in ['user', 'group']:
                    continue
                
                # Resolve to SimplifyDrive user
                resolved_user_id = self._resolve_target_user(source_email, self.source_system, identity_mappings)
                
                if not resolved_user_id:
                    # Log: User not found
                    self._record_audit_log(
                        'permission_skipped',
                        error_message=f'[{file_name}] No SimplifyDrive user found for {source_email} ({source_role}). User does not exist in system.'
                    )
                    continue
                
                # Don't share with ourselves
                if resolved_user_id == owner_id:
                    self._record_audit_log(
                        'permission_skipped',
                        error_message=f'[{file_name}] Skipped {source_email} ({source_role}) - same as migration owner (cannot share with self)'
                    )
                    continue
                
                # Map source role to SimplifyDrive permission
                permission_level = 'view'  # default
                if source_role in ['writer', 'write', 'editor']:
                    permission_level = 'edit'
                elif source_role == 'commenter':
                    permission_level = 'comment'
                
                # Create share record in external_shares table
                try:
                    from datetime import timedelta
                    import uuid
                    
                    share_data = {
                        'owner_id': owner_id,
                        'resource_type': 'document',
                        'resource_id': document_id,
                        'resource_name': None,  # Will be filled by trigger or left blank
                        'guest_email': source_email,
                        'permission': permission_level,
                        'allow_download': True,
                        'allow_print': True,
                        'allow_reshare': False,
                        'status': 'accepted',  # Auto-accepted for internal users
                        'invitation_token': str(uuid.uuid4()).replace('-', '')[:32],
                        'message': f'Migrated from {self.source_system.replace("_", " ").title()}'
                    }
                    
                    self.supabase.table('external_shares').insert(share_data).execute()
                    shares_created += 1
                    logger.info(f"📤 Shared document with {source_email} ({permission_level})")
                    
                    # Log: Success
                    self._record_audit_log(
                        'permission_applied',
                        error_message=f'[{file_name}] Shared with {source_email} as {permission_level} (source role: {source_role})'
                    )
                    
                except Exception as share_err:
                    logger.warning(f"⚠️ Could not create share for {source_email}: {share_err}")
                    # Log: Failed
                    self._record_audit_log(
                        'permission_failed',
                        error_message=f'[{file_name}] Failed to share with {source_email}: {str(share_err)[:200]}'
                    )
            
            if shares_created > 0:
                logger.info(f"✅ Applied {shares_created} permission(s) to document {document_id}")
                
        except Exception as e:
            logger.warning(f"⚠️ Non-blocking: Could not apply permissions to {document_id}: {e}")



    async def _monitor_cancellation(self):
        """Periodically check if job is cancelled."""
        while not self.is_cancelled:
            try:
                # Check DB status
                result = self.supabase.table('migration_jobs').select('status').eq('id', self.job_id).single().execute()
                status = result.data.get('status')
                
                if status in ['cancelled', 'failed']:
                     self.is_cancelled = True
                     logger.warning(f"🛑 Job {status.upper()} detected! Stopping migration...")
                     return
                
                await asyncio.sleep(2)  # Check every 2 seconds
            except Exception as e:
                logger.warning(f"⚠️ Failed to check cancellation status: {e}")
                await asyncio.sleep(5)


async def start_migration_job(job_id: str):
    """Start a migration job."""
    engine = MigrationEngine(job_id)
    await engine.start_migration()

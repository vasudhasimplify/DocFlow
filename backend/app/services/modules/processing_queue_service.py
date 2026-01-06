"""
Processing Queue Service
Manages document processing queue updates and status tracking
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)


class ProcessingQueueService:
    """Service to manage document processing queue updates."""
    
    def __init__(self):
        """Initialize the processing queue service."""
        self.supabase = get_supabase_client()
        self.stages = [
            'uploaded',
            'virus_scan',
            'text_extraction',
            'classification',
            'embedding',
            'indexing',
            'completed'
        ]
    
    def _get_progress_percent(self, stage: str) -> int:
        """Calculate progress percentage based on current stage."""
        try:
            stage_idx = self.stages.index(stage)
            return int((stage_idx / (len(self.stages) - 1)) * 100)
        except ValueError:
            return 0
    
    def create_queue_entry(
        self,
        document_id: str,
        user_id: str,
        priority: int = 100
    ) -> Optional[str]:
        """
        Create a new processing queue entry for a document.
        Checks if entry already exists to prevent duplicates.
        
        Args:
            document_id: Document ID
            user_id: User ID
            priority: Queue priority (default: 100)
            
        Returns:
            Queue entry ID or None if failed
        """
        try:
            # Check if entry already exists
            existing = self.supabase.table('document_processing_queue').select(
                'id'
            ).eq('document_id', document_id).execute()
            
            if existing.data and len(existing.data) > 0:
                queue_id = existing.data[0]['id']
                logger.info(f"ℹ️ Queue entry already exists for document {document_id}: {queue_id}")
                return queue_id
            
            # Create new entry
            result = self.supabase.table('document_processing_queue').insert({
                'document_id': document_id,
                'user_id': user_id,
                'stage': 'uploaded',
                'priority': priority,
                'progress_percent': 0,
                'attempts': 0,
                'max_attempts': 3,
                'stage_metadata': {}
            }).execute()
            
            if result.data and len(result.data) > 0:
                queue_id = result.data[0]['id']
                logger.info(f"✅ Created processing queue entry {queue_id} for document {document_id}")
                return queue_id
            return None
            
        except Exception as e:
            logger.error(f"❌ Failed to create queue entry: {e}")
            return None
    
    def update_stage(
        self,
        document_id: str,
        stage: str,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """
        Update the processing stage for a document.
        
        Args:
            document_id: Document ID
            stage: New processing stage
            metadata: Optional metadata about the stage
            error_message: Optional error message if stage failed
            
        Returns:
            True if successful, False otherwise
        """
        try:
            progress = self._get_progress_percent(stage)
            
            update_data = {
                'stage': stage,
                'progress_percent': progress
            }
            
            # Set started_at if this is the first non-uploaded stage
            if stage != 'uploaded' and stage != 'failed':
                update_data['started_at'] = datetime.utcnow().isoformat()
            
            # Set completed_at if stage is completed
            if stage == 'completed':
                update_data['completed_at'] = datetime.utcnow().isoformat()
                update_data['progress_percent'] = 100
            
            # Add error information if failed
            if stage == 'failed' and error_message:
                update_data['last_error'] = error_message
                update_data['completed_at'] = datetime.utcnow().isoformat()
            
            # Update stage metadata
            if metadata:
                update_data['stage_metadata'] = metadata
            
            result = self.supabase.table('document_processing_queue').update(
                update_data
            ).eq('document_id', document_id).execute()
            
            if result.data:
                logger.info(f"✅ Updated queue stage to '{stage}' for document {document_id} ({progress}%)")
                return True
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to update queue stage: {e}")
            return False
    
    def advance_to_next_stage(self, document_id: str) -> bool:
        """
        Advance document to the next processing stage.
        
        Args:
            document_id: Document ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current stage
            result = self.supabase.table('document_processing_queue').select(
                'stage'
            ).eq('document_id', document_id).single().execute()
            
            if not result.data:
                logger.warning(f"⚠️ No queue entry found for document {document_id}")
                return False
            
            current_stage = result.data.get('stage')
            
            if current_stage == 'completed' or current_stage == 'failed':
                return True
            
            # Find next stage
            try:
                current_idx = self.stages.index(current_stage)
                if current_idx < len(self.stages) - 1:
                    next_stage = self.stages[current_idx + 1]
                    return self.update_stage(document_id, next_stage)
            except ValueError:
                logger.error(f"❌ Unknown stage: {current_stage}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to advance stage: {e}")
            return False
    
    def mark_completed(self, document_id: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Mark document processing as completed.
        
        Args:
            document_id: Document ID
            metadata: Optional completion metadata
            
        Returns:
            True if successful, False otherwise
        """
        return self.update_stage(document_id, 'completed', metadata)
    
    def mark_failed(self, document_id: str, error_message: str) -> bool:
        """
        Mark document processing as failed.
        
        Args:
            document_id: Document ID
            error_message: Error message describing the failure
            
        Returns:
            True if successful, False otherwise
        """
        return self.update_stage(document_id, 'failed', error_message=error_message)
    
    def increment_attempts(self, document_id: str) -> bool:
        """
        Increment the attempt counter for a document.
        
        Args:
            document_id: Document ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current attempts
            result = self.supabase.table('document_processing_queue').select(
                'attempts'
            ).eq('document_id', document_id).single().execute()
            
            if not result.data:
                return False
            
            current_attempts = result.data.get('attempts', 0)
            
            # Update attempts
            self.supabase.table('document_processing_queue').update({
                'attempts': current_attempts + 1
            }).eq('document_id', document_id).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to increment attempts: {e}")
            return False
    
    def update_search_index_queue(
        self,
        document_id: str,
        status: str = 'completed'
    ) -> bool:
        """
        Update search index queue status.
        
        Args:
            document_id: Document ID
            status: New status ('completed', 'failed', etc.)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            update_data = {
                'status': status
            }
            
            if status == 'completed':
                update_data['processed_at'] = datetime.utcnow().isoformat()
            
            result = self.supabase.table('search_index_queue').update(
                update_data
            ).eq('document_id', document_id).execute()
            
            if result.data:
                logger.info(f"✅ Updated search index queue to '{status}' for document {document_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to update search index queue: {e}")
            return False
    
    def remove_from_queue(self, document_id: str) -> bool:
        """
        Remove a document from the processing queue.
        
        Args:
            document_id: Document ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.supabase.table('document_processing_queue').delete().eq(
                'document_id', document_id
            ).execute()
            
            logger.info(f"✅ Removed document {document_id} from processing queue")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to remove from queue: {e}")
            return False
    
    def get_queue_entry(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Get the queue entry for a document.
        
        Args:
            document_id: Document ID
            
        Returns:
            Queue entry dict or None if not found
        """
        try:
            result = self.supabase.table('document_processing_queue').select(
                '*'
            ).eq('document_id', document_id).single().execute()
            
            return result.data if result.data else None
            
        except Exception as e:
            logger.error(f"❌ Failed to get queue entry: {e}")
            return None

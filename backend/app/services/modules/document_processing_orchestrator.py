"""
Document Processing Orchestrator
Coordinates parallel execution of document type detection and content extraction
"""

import logging
import asyncio
import threading
from typing import Optional, Dict, Any, Tuple, List
from datetime import datetime
import uuid
from app.services.modules.processing_queue_service import ProcessingQueueService
from app.services.workflow_trigger_service import WorkflowTriggerService

logger = logging.getLogger(__name__)


class DocumentProcessingOrchestrator:
    """
    Orchestrates document processing with parallel type detection and extraction.
    
    Flow:
    1. Receive document
    2. Start type detection (first 2 pages) and extraction in parallel
    3. Wait for both to complete
    4. Save to appropriate bucket based on detected type
    5. Return combined results
    """
    
    def __init__(
        self,
        type_detector,
        document_analyzer,
        bucket_manager,
        database_service
    ):
        """
        Initialize orchestrator with required services.
        
        Args:
            type_detector: DocumentTypeDetector instance
            document_analyzer: DocumentAnalysisService instance
            bucket_manager: BucketManager instance
            database_service: DatabaseService instance
        """
        self.type_detector = type_detector
        self.document_analyzer = document_analyzer
        self.bucket_manager = bucket_manager
        self.database_service = database_service
        self.queue_service = ProcessingQueueService()
        self.workflow_trigger_service = None  # Will be initialized when needed
        
    async def process_document(
        self,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        template_id: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process document with parallel type detection and extraction.
        
        Args:
            pdf_bytes: PDF file content
            filename: Original filename
            user_id: User ID for storage
            template_id: Optional template ID
            options: Additional processing options (can include document_id for queue tracking)
            
        Returns:
            Complete processing result with type and extracted data
        """
        start_time = datetime.now()
        processing_id = str(uuid.uuid4())
        document_id = options.get('document_id') if options else None
        
        logger.info(f"[{processing_id}] Starting parallel document processing for: {filename}")
        
        try:
            # Stage 1: Virus scan (placeholder - would integrate with actual scanner)
            if document_id:
                self.queue_service.update_stage(document_id, 'virus_scan')
            
            # Stage 2: Text extraction and type detection (parallel)
            if document_id:
                self.queue_service.update_stage(document_id, 'text_extraction')
            
            # Run type detection and extraction in parallel
            type_result, extraction_result = await self._parallel_process(
                pdf_bytes=pdf_bytes,
                filename=filename,
                user_id=user_id,
                template_id=template_id,
                options=options or {}
            )
            
            # Get document type info
            document_type = type_result.get("document_type", "unknown")
            bucket_name = "documents"  # All documents use single bucket
            
            logger.info(f"[{processing_id}] Detected type: {document_type} (confidence: {type_result.get('confidence', 0):.2f})")
            
            # Stage 3: Classification
            if document_id:
                self.queue_service.update_stage(document_id, 'classification', {
                    'document_type': document_type,
                    'confidence': type_result.get('confidence', 0)
                })
            
            # Upload to type-specific bucket
            upload_result = await self._upload_to_bucket(
                pdf_bytes=pdf_bytes,
                filename=filename,
                user_id=user_id,
                document_type=document_type,
                bucket_name=bucket_name
            )
            
            # Stage 4: Embedding
            if document_id:
                self.queue_service.update_stage(document_id, 'embedding')
            
            # Combine results
            combined_result = {
                "processing_id": processing_id,
                "filename": filename,
                "document_type": document_type,
                "type_detection": type_result,
                "extraction": extraction_result,
                "storage": upload_result,
                "processing_time_ms": (datetime.now() - start_time).total_seconds() * 1000
            }
            
            # Save to database with document type
            if extraction_result.get("success"):
                # Stage 5: Indexing
                if document_id:
                    self.queue_service.update_stage(document_id, 'indexing')
                
            if extraction_result.get("success") and options.get("save_to_database", True):
                await self._save_to_database(
                    user_id=user_id,
                    filename=filename,
                    document_type=document_type,
                    extraction_result=extraction_result,
                    storage_result=upload_result,
                    skip_workflow_trigger=options.get("skip_workflow_trigger", False)
                )
                
                # Stage 6: Completed
                if document_id:
                    self.queue_service.mark_completed(document_id, {
                        'processing_time_ms': combined_result['processing_time_ms'],
                        'document_type': document_type
                    })
                    # Also update search index queue
                    self.queue_service.update_search_index_queue(document_id, 'completed')
            
            logger.info(f"[{processing_id}] Processing complete in {combined_result['processing_time_ms']:.0f}ms")
            
            return combined_result
            
        except Exception as e:
            logger.error(f"[{processing_id}] Error in document processing: {e}")
            
            # Mark as failed in queue
            if document_id:
                self.queue_service.mark_failed(document_id, str(e))
                self.queue_service.update_search_index_queue(document_id, 'failed')
            
            return {
                "processing_id": processing_id,
                "filename": filename,
                "success": False,
                "error": str(e),
                "processing_time_ms": (datetime.now() - start_time).total_seconds() * 1000
            }
    
    async def _parallel_process(
        self,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        template_id: Optional[str],
        options: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Run type detection and extraction in parallel.
        
        Returns:
            Tuple of (type_result, extraction_result)
        """
        # Create tasks for parallel execution
        type_task = asyncio.create_task(
            self.type_detector.detect_type(pdf_bytes, filename)
        )
        
        extraction_task = asyncio.create_task(
            self._run_extraction(pdf_bytes, filename, user_id, template_id, options)
        )
        
        # Wait for both to complete
        type_result, extraction_result = await asyncio.gather(
            type_task,
            extraction_task,
            return_exceptions=True
        )
        
        # Handle exceptions
        if isinstance(type_result, Exception):
            logger.error(f"Type detection failed: {type_result}")
            type_result = {
                "document_type": "unknown",
                "confidence": 0.0,
                "error": str(type_result)
            }
            
        if isinstance(extraction_result, Exception):
            logger.error(f"Extraction failed: {extraction_result}")
            extraction_result = {
                "success": False,
                "error": str(extraction_result)
            }
        
        return type_result, extraction_result
    
    async def _run_extraction(
        self,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        template_id: Optional[str],
        options: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run document extraction."""
        try:
            import base64
            # Convert bytes to base64 data URL for DocumentAnalysisService
            base64_data = base64.b64encode(pdf_bytes).decode('utf-8')
            document_data = f"data:application/pdf;base64,{base64_data}"
            
            # Use existing document analyzer with correct parameters
            result = await self.document_analyzer.analyze_document(
                document_data=document_data,
                task=options.get("task", "without_template_extraction"),
                document_name=filename,
                templates=options.get("templates"),
                save_to_database=False,  # We'll save with document_type later
                user_id=user_id,
                document_id=options.get("document_id"),  # Pass document_id if provided
                max_workers=options.get("max_workers"),
                max_threads=options.get("max_threads"),
                yolo_signature_enabled=options.get("yolo_signature_enabled"),
                yolo_face_enabled=options.get("yolo_face_enabled"),
                cancellation_token=options.get("cancellation_token"),
                request_id=options.get("request_id")
            )
            
            # result is a DocumentAnalysisResponse object, access its attributes
            return {
                "success": result.success if hasattr(result, 'success') else True,
                "hierarchical_data": result.result if hasattr(result, 'result') else {},
                "extracted_text": "",  # Text is within result
                "page_count": 0,
                "processing_details": {},
                "usage": result.usage if hasattr(result, 'usage') else None,
                "savedDocument": result.savedDocument if hasattr(result, 'savedDocument') else None,
                "convertedImages": result.convertedImages if hasattr(result, 'convertedImages') else None,
                "warnings": result.warnings if hasattr(result, 'warnings') else None
            }
            
        except Exception as e:
            logger.error(f"Extraction error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _upload_to_bucket(
        self,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        document_type: str,
        bucket_name: str = None
    ) -> Dict[str, Any]:
        """Upload document to the documents bucket."""
        try:
            # Generate unique file path
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
            file_path = f"{user_id}/{timestamp}_{safe_filename}"
            
            # Upload to 'documents' bucket (bucket_name parameter is ignored)
            result = await self.bucket_manager.upload_to_bucket(
                file_path=file_path,
                file_bytes=pdf_bytes,
                content_type="application/pdf"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Upload error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _save_to_database(
        self,
        user_id: str,
        filename: str,
        document_type: str,
        extraction_result: Dict[str, Any],
        storage_result: Dict[str, Any],
        skip_workflow_trigger: bool = False
    ) -> None:
        """Save processed document to database."""
        try:
            # Document is already saved by DocumentAnalysisService
            # We just need to update the document_type if there's a saved document
            saved_doc = extraction_result.get("savedDocument")
            if saved_doc and saved_doc.get("id"):
                doc_id = saved_doc["id"]
                # Update the document with document_type AND processing_status
                if self.database_service.supabase:
                    self.database_service.supabase.table("documents").update({
                        "document_type": document_type,
                        "processing_status": "completed"  # Mark processing as complete!
                    }).eq("id", doc_id).execute()
                    logger.info(f"Document {doc_id} updated with type: {document_type}, status: completed")
                    logger.info(f"Document {doc_id} updated with type: {document_type}")
                    
                    # Trigger workflows if enabled
                    if not skip_workflow_trigger:
                        logger.info(f"🔍 WORKFLOW CHECK: Triggering workflows for document type: {document_type}")
                        try:
                            # Initialize workflow trigger service if not already done
                            if self.workflow_trigger_service is None:
                                self.workflow_trigger_service = WorkflowTriggerService(
                                    supabase=self.database_service.supabase
                                )
                            
                            # Trigger workflows
                            await self.workflow_trigger_service.check_and_trigger_on_document_upload(
                                document_id=doc_id,
                                document_name=filename,
                                document_type=document_type,
                                user_id=user_id
                            )
                        except Exception as workflow_error:
                            logger.error(f"❌ Error triggering workflows: {workflow_error}")
                            logger.exception("Workflow trigger error:")
                    else:
                        logger.info(f"⏭️  WORKFLOW CHECK: Skipped (user disabled auto-start)")
            else:
                logger.info(f"No saved document to update with type: {document_type}")
            
        except Exception as e:
            logger.error(f"Database save error: {e}")
    
    async def detect_type_only(
        self,
        pdf_bytes: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Detect document type without full extraction.
        Useful for quick categorization.
        
        Args:
            pdf_bytes: PDF file content
            filename: Original filename
            
        Returns:
            Type detection result
        """
        return await self.type_detector.detect_type(pdf_bytes, filename)
    
    async def get_processing_stats(self) -> Dict[str, Any]:
        """Get processing statistics."""
        try:
            buckets = await self.bucket_manager.list_buckets()
            
            stats = {
                "total_buckets": len(buckets),
                "buckets": []
            }
            
            for bucket in buckets:
                bucket_stats = await self.bucket_manager.get_bucket_stats(
                    bucket["name"]
                )
                stats["buckets"].append(bucket_stats)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"error": str(e)}

    async def analyze_document(
        self,
        document_data: str,
        task: str,
        document_name: Optional[str] = None,
        user_id: str = "",
        save_to_database: bool = True,
        document_id: Optional[str] = None,  # If provided, document already exists - skip creating new
        templates: Optional[List[Dict[str, Any]]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        yolo_signature_enabled: Optional[bool] = None,
        yolo_face_enabled: Optional[bool] = None,
        cancellation_token: Optional[threading.Event] = None,
        request_id: Optional[str] = None,
        document_type: Optional[str] = None,
        skip_workflow_trigger: bool = False
    ) -> Dict[str, Any]:
        """
        Compatibility method that matches the old DocumentAnalysisService signature.
        Converts parameters and calls the new process_document method.
        """
        try:
            # Convert document_data (base64 data URL) to bytes
            if document_data.startswith('data:'):
                # Remove data URL prefix
                import base64
                header, encoded = document_data.split(',', 1)
                pdf_bytes = base64.b64decode(encoded)
            else:
                pdf_bytes = document_data.encode('utf-8')

            # Use document_name or generate one
            filename = document_name or "document.pdf"

            # Convert options
            options = {
                "task": task,
                "templates": templates or [],
                "max_workers": max_workers,
                "max_threads": max_threads,
                "yolo_signature_enabled": yolo_signature_enabled,
                "yolo_face_enabled": yolo_face_enabled,
                "cancellation_token": cancellation_token,
                "request_id": request_id,
                "save_to_database": save_to_database,
                "document_id": document_id  # Pass document_id for update instead of create
                "save_to_database": save_to_database,
                "skip_workflow_trigger": skip_workflow_trigger
            }

            # Call the new process_document method
            result = await self.process_document(
                pdf_bytes=pdf_bytes,
                filename=filename,
                user_id=user_id,
                template_id=None,  # Could be enhanced to support templates
                options=options
            )

            # Convert result to match DocumentAnalysisResponse format
            extraction_data = result.get("extraction", {})
            return {
                "success": True,
                "task": task,
                "result": extraction_data.get("hierarchical_data", {}),  # Required field
                "usage": extraction_data.get("usage"),
                "savedDocument": extraction_data.get("savedDocument"),
                "convertedImages": extraction_data.get("convertedImages"),
                "warnings": extraction_data.get("warnings"),
                "requestId": request_id,
                "document_type": result.get("document_type"),
                "storage_info": result.get("storage", {}),
                "type_detection": result.get("type_detection", {})
            }

        except Exception as e:
            logger.error(f"Error in compatibility analyze_document: {e}")
            return {
                "success": False,
                "error": str(e),
                "task": task,
                "documentName": document_name,
                "userId": user_id
            }

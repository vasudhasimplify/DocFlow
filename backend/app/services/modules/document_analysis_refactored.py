"""
Document Analysis Service - Refactored
Main orchestrator for document analysis using modular services
"""

import logging
import json
import base64
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import HTTPException

from ...models.schemas import DocumentAnalysisResponse
from .llm_client import LLMClient
from .database_service import DatabaseService
from .prompt_service import PromptService
from .pdf_processing_service import PDFProcessingService
from .embedding_service import EmbeddingService
from .yolo_signature_detector import YOLOSignatureDetector
from .yolo_face_detector import YOLOFaceDetector

logger = logging.getLogger(__name__)

class DocumentAnalysisService:
    """Main service for document analysis using modular architecture"""
    
    def __init__(self):
        # Initialize all service modules
        self.llm_client = LLMClient()
        self.prompt_service = PromptService()
        self.database_service = DatabaseService()
        self.yolo_detector = YOLOSignatureDetector()
        self.face_detector = YOLOFaceDetector()
        # Pass YOLO detectors to PDF processing service so it uses the same instances
        self.pdf_processing_service = PDFProcessingService(
            self.llm_client, self.prompt_service, self.yolo_detector, self.face_detector
        )
        self.embedding_service = EmbeddingService()
        
        logger.info("🚀 DocumentAnalysisService initialized with modular architecture")

    async def analyze_document(
        self,
        document_data: str,
        task: str,
        document_name: Optional[str] = None,
        templates: Optional[List[Dict[str, Any]]] = None,
        save_to_database: bool = True,
        user_id: Optional[str] = None,
        document_id: Optional[str] = None,  # If provided, document already exists - skip creating new
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        yolo_signature_enabled: Optional[bool] = None,
        yolo_face_enabled: Optional[bool] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
        document_type: Optional[str] = None,
        skip_workflow_trigger: bool = False
    ) -> DocumentAnalysisResponse:
        """
        Main entry point for document analysis
        """
        # Store original YOLO enabled states for restoration
        original_yolo_enabled = None
        original_face_enabled = None
        try:
            logger.info(f"🔍 Starting document analysis for task: {task}")
            
            # Override YOLO signature detection if provided in request
            if yolo_signature_enabled is not None:
                # Temporarily override the YOLO detector's enabled state
                original_yolo_enabled = self.yolo_detector.enabled
                self.yolo_detector.enabled = yolo_signature_enabled
                logger.info(f"🔧 YOLO signature detection {'enabled' if yolo_signature_enabled else 'disabled'} via request parameter (overriding env: {original_yolo_enabled})")
            
            # Override YOLO face detection if provided in request
            if yolo_face_enabled is not None:
                # Temporarily override the face detector's enabled state
                original_face_enabled = self.face_detector.enabled
                self.face_detector.enabled = yolo_face_enabled
                logger.info(f"🔧 YOLO face detection {'enabled' if yolo_face_enabled else 'disabled'} via request parameter (overriding env: {original_face_enabled})")
            
            # Determine processing approach based on document type and task
            is_pdf = self._is_pdf_document(document_data)
            
            failed_pages_info = []
            if is_pdf:
                logger.info("📄 Processing PDF document")
                processed_result, usage_info, converted_images, failed_pages_info = await self._process_pdf_document(
                    document_data, task, document_name, templates, max_workers, max_threads,
                    cancellation_token=cancellation_token, request_id=request_id, document_type=document_type
                )
            else:
                logger.info("🖼️ Processing image document")
                processed_result, usage_info, converted_images, failed_pages_info = await self._process_image_document(
                    document_data, task, document_name, templates
                )
            
            # Validation disabled for simplicity
            # if task == "without_template_extraction" and processed_result.get("fields"):
            #     logger.info("🔍 Validation disabled for simplicity")
            
            # =========================================================================
            # AUTO-SAVE: Save extracted data immediately WITH vector embeddings
            # Generate embeddings for semantic search and chatbot querying
            # ALL embeddings are stored in document_chunks table (no duplicates)
            # If document_id is provided, the document already exists (created by frontend)
            # so we UPDATE instead of creating a new one (prevents duplicate queue entries)
            # =========================================================================
            auto_saved_document = None
            chunks_data = None
            extraction_tasks = ['template_guided_extraction', 'without_template_extraction', 'field_extraction', 'data_extraction']
            tasks_skip_embeddings = ['field_detection', 'form_creation']
            
            if user_id and task in extraction_tasks:
                try:
                    # Generate vector embeddings for auto-save
                    if task not in tasks_skip_embeddings:
                        try:
                            logger.info("🔍 AUTO-SAVE: Generating vector embeddings for semantic search...")
                            
                            # Convert analysis result to text first
                            text = self.embedding_service.convert_analysis_result_to_text(processed_result)
                            text_length = len(text)
                            
                            # Decide whether to use chunking based on text length
                            # Use chunking if text is longer than 3000 characters (roughly 750 tokens)
                            if text_length > 3000:
                                logger.info(f"📊 Text is large ({text_length} chars), using chunked embeddings...")
                                chunks_data = await self.embedding_service.generate_embeddings_for_chunks(
                                    text, chunk_size=1500, overlap=200
                                )
                                if chunks_data:
                                    logger.info(f"✅ Generated {len(chunks_data)} chunk embeddings")
                                else:
                                    logger.warning("⚠️ Failed to generate chunk embeddings")
                            else:
                                logger.info(f"📊 Text is small ({text_length} chars), using single embedding...")
                                # For small documents, create a single chunk
                                embedding = await self.embedding_service.generate_embedding(text)
                                if embedding:
                                    chunks_data = [{"chunk": text, "embedding": embedding}]
                                    logger.info(f"✅ Generated single embedding with {len(embedding)} dimensions")
                                else:
                                    logger.warning("⚠️ Failed to generate vector embedding")
                        except Exception as e:
                            logger.error(f"❌ Error generating vector embedding: {e}")
                            chunks_data = None
                    
                    # If document_id is provided, document already exists (created by frontend)
                    # Update it instead of creating a new one (avoids duplicate queue entries)
                    if document_id:
                        logger.info(f"💾 AUTO-SAVE: Updating existing document {document_id} (frontend already created it)")
                        auto_saved_document = await self.database_service.update_document_in_database(
                            document_id=document_id,
                            result=processed_result,
                            user_id=user_id,
                            chunks_data=chunks_data
                        )
                        if auto_saved_document:
                            logger.info(f"✅ AUTO-SAVE: Document {document_id} updated successfully")
                        else:
                            logger.warning(f"⚠️ AUTO-SAVE: Failed to update document {document_id}")
                    else:
                        logger.info("💾 AUTO-SAVE: Saving new document to database (with embeddings)...")
                        auto_saved_document = await self.database_service.save_document_to_database(
                            document_data, processed_result, task, user_id, document_name, 
                            chunks_data=chunks_data,  # All embeddings go to document_chunks table
                            skip_workflow_trigger=skip_workflow_trigger
                        )
                        if auto_saved_document:
                            logger.info(f"✅ AUTO-SAVE: Document saved with ID: {auto_saved_document.get('id')}")
                        else:
                            logger.warning("⚠️ AUTO-SAVE: Failed to save document")
                except Exception as e:
                    logger.error(f"❌ AUTO-SAVE error: {e}")
                    auto_saved_document = None
            
            # =========================================================================
            # MANUAL SAVE: Update document with new embeddings if data was edited
            # This happens when user clicks "Save to Database" button after editing
            # ALL embeddings are stored in document_chunks table (no duplicates)
            # =========================================================================
            manual_saved_document = None
            if save_to_database and user_id and task not in tasks_skip_embeddings:
                try:
                    # Regenerate embeddings in case user edited the data
                    logger.info("🔍 MANUAL SAVE: Regenerating vector embeddings for edited data...")
                    
                    # Convert analysis result to text
                    text = self.embedding_service.convert_analysis_result_to_text(processed_result)
                    text_length = len(text)
                    
                    # Regenerate chunks
                    manual_chunks_data = None
                    if text_length > 3000:
                        logger.info(f"📊 Text is large ({text_length} chars), regenerating chunked embeddings...")
                        manual_chunks_data = await self.embedding_service.generate_embeddings_for_chunks(
                            text, chunk_size=1500, overlap=200
                        )
                        if manual_chunks_data:
                            logger.info(f"✅ Regenerated {len(manual_chunks_data)} chunk embeddings")
                        else:
                            logger.warning("⚠️ Failed to regenerate chunk embeddings")
                    else:
                        logger.info(f"📊 Text is small ({text_length} chars), regenerating single embedding...")
                        # For small documents, create a single chunk
                        embedding = await self.embedding_service.generate_embedding(text)
                        if embedding:
                            manual_chunks_data = [{"chunk": text, "embedding": embedding}]
                            logger.info(f"✅ Regenerated single embedding with {len(embedding)} dimensions")
                        else:
                            logger.warning("⚠️ Failed to regenerate vector embedding")
                except Exception as e:
                    logger.error(f"❌ Error regenerating vector embedding: {e}")
                    manual_chunks_data = None
                
                # If auto-save already happened, update with new embeddings; otherwise save fresh
                # Also handle case where document_id was provided from frontend
                target_document_id = (auto_saved_document.get("id") if auto_saved_document else None) or document_id
                
                if target_document_id:
                    # Update existing document with new embeddings (user may have edited data)
                    manual_saved_document = await self.database_service.update_document_in_database(
                        target_document_id, processed_result, user_id, manual_chunks_data
                    )
                else:
                    # Save fresh with embeddings (no existing document)
                    manual_saved_document = await self.database_service.save_document_to_database(
                        document_data, processed_result, task, user_id, document_name, manual_chunks_data
                    )
            elif task in tasks_skip_embeddings:
                logger.debug(f"⏭️ Skipping embedding generation for task: {task}")
            
            # Use manual save result if available, otherwise use auto-save result
            saved_document = manual_saved_document or auto_saved_document
            
            logger.debug(f"🖼️ Returning response with {len(converted_images) if converted_images else 0} converted images")
            
            # Simplify the result structure to avoid circular references
            simplified_result = self._simplify_result_structure(processed_result)
            # Removed verbose debug logs for result structure to reduce log size
            json_safe_result = self._json_safe(simplified_result)
            
            return DocumentAnalysisResponse(
                success=True,
                task=task,
                result=json_safe_result,
                usage=self._json_safe(usage_info),
                savedDocument=self._json_safe(saved_document),
                convertedImages=self._json_safe(converted_images),
                warnings=failed_pages_info if failed_pages_info else None,
                requestId=request_id
            )
            
        except Exception as e:
            logger.error(f"Document analysis error: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return DocumentAnalysisResponse(
                success=False,
                task=task,
                result={},
                error=str(e),
                timestamp=datetime.now().isoformat(),
                requestId=request_id
            )
        finally:
            # Restore original YOLO enabled states if they were overridden
            if original_yolo_enabled is not None:
                self.yolo_detector.enabled = original_yolo_enabled
                logger.debug(f"🔧 Restored YOLO signature detection to original state: {original_yolo_enabled}")
            
            if original_face_enabled is not None:
                self.face_detector.enabled = original_face_enabled
                logger.debug(f"🔧 Restored YOLO face detection to original state: {original_face_enabled}")
            
            # CRITICAL FIX #2: Ensure PDF cache is cleared even if processing fails
            try:
                self.pdf_processing_service.pdf_processor.clear_pdf_cache()
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache in finally block: {e}")

    async def _process_pdf_document(
        self,
        pdf_data: str,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]],
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
        document_type: Optional[str] = None
    ) -> tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str]]:
        """Process PDF document based on task type"""
        
        # Log document type if provided
        if document_type:
            logger.info(f"📋 Document type: {document_type}")
        
        # Fetch database templates if needed (fallback to provided templates if DB empty)
        db_templates = None
        if task in ["template_matching", "db_template_matching", "template_guided_extraction"]:
            db_templates = await self.database_service.fetch_active_templates()
            # Allow proceeding if client provided templates; only error if neither exists
            if not db_templates and not templates:
                raise ValueError("template_matching requires db_templates or provided templates")
        
        # Determine processing approach
        if task in ["template_guided_extraction", "template_matching"]:
            # Use multi-page processing for template tasks
            logger.info(f"🎯 Using multi-page processing for task: {task}")
            processed_result, usage_info, converted_images, failed_pages_info = await self.pdf_processing_service.process_pdf_multi_page(
                pdf_data, task, document_name, templates, db_templates, max_workers, max_threads,
                cancellation_token=cancellation_token, request_id=request_id
            )
            # Enrich with matches only for template_matching, not template_guided_extraction
            if task == "template_matching":
                try:
                    processed_result = self._enrich_template_matching_result(
                        processed_result, (db_templates or templates or [])
                    )
                except Exception as e:
                    logger.warning(f"Failed to enrich template matching result (pdf): {e}")
            return self._json_safe(processed_result), usage_info, converted_images, failed_pages_info
        elif task in ["field_detection", "without_template_extraction", "form_creation"]:
            # Use page-by-page processing for non-template tasks (including form creation)
            logger.info(f"🎯 Using page-by-page processing for task: {task}")
            return await self.pdf_processing_service.process_pdf_page_by_page(
                pdf_data, task, document_name, templates, None, max_workers, max_threads,
                cancellation_token=cancellation_token, request_id=request_id, document_type=document_type
            )
        else:
            raise ValueError(f"Unknown task: {task}")

    async def _process_image_document(
        self,
        image_data: str,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]]
    ) -> tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """Process single image document"""
        
        # Fetch database templates if needed (fallback to provided templates if DB empty)
        db_templates = None
        if task in ["template_matching", "db_template_matching", "template_guided_extraction"]:
            db_templates = await self.database_service.fetch_active_templates()
            # Allow proceeding if client provided templates; only error if neither exists
            if not db_templates and not templates:
                raise ValueError("template_matching requires db_templates or provided templates")
        
        # Use two-step approach for template_guided_extraction
        if task == "template_guided_extraction":
            logger.debug("🎯 Using two-step template-guided extraction for image document")
            return await self._process_image_template_guided_extraction_two_step(
                image_data, document_name, templates, db_templates
            )
        
        # Get prompt for this task (image-based extraction for image documents)
        prompt, response_format = self.prompt_service.get_task_prompt(task, templates, db_templates, content_type="image")
        
        # Make API call (already returns processed result)
        processed_result = await self.llm_client.call_api(
            prompt, image_data, response_format, task, document_name
        )
        # Enrich with matches only for template_matching, not template_guided_extraction
        if task == "template_matching":
            try:
                processed_result = self._enrich_template_matching_result(
                    processed_result, (db_templates or templates or [])
                )
            except Exception as e:
                logger.warning(f"Failed to enrich template matching result (image): {e}")
        
        # Check if LLM indicated signature presence and run YOLO if needed
        yolo_signatures = []
        yolo_enabled = self.yolo_detector.is_enabled()
        logger.debug(f"🔍 Signature detection check: task={task}, yolo_enabled={yolo_enabled}")
        if task == "without_template_extraction" and yolo_enabled:
            # Check LLM response for has_signature flag
            page_data_parsed = processed_result.get("_parsed", {})
            has_signature = page_data_parsed.get("has_signature", False)
            logger.debug(f"   Checked _parsed: has_signature={has_signature}")
            
            # Also check hierarchical_data
            if not has_signature and processed_result.get("hierarchical_data"):
                hierarchical_data = processed_result.get("hierarchical_data", {})
                has_signature = hierarchical_data.get("has_signature", False)
                logger.debug(f"   Checked hierarchical_data: has_signature={has_signature}")
                # Also check if "has_signature" is in any nested section
                if not has_signature:
                    for key, value in hierarchical_data.items():
                        if isinstance(value, dict) and value.get("has_signature"):
                            has_signature = True
                            logger.debug(f"   Found has_signature in section '{key}': {value.get('has_signature')}")
                            break
            
            if has_signature:
                logger.info(f"🔍 LLM indicated signature presence - running YOLO on ORIGINAL uploaded image")
                # Run YOLO on original uploaded image (before any processing)
                import base64
                import io
                from PIL import Image
                
                # Decode base64 image to PIL Image (this is the original uploaded image)
                if image_data.startswith("data:image/"):
                    base64_data = image_data.split("base64,")[1]
                else:
                    base64_data = image_data
                
                image_bytes = base64.b64decode(base64_data)
                original_image = Image.open(io.BytesIO(image_bytes))
                logger.debug(f"   Original image: size={original_image.size}, mode={original_image.mode}")
                
                # Run YOLO detection on original unprocessed image
                detections = self.yolo_detector.detect_signatures_in_image(original_image)
                
                for detection in detections:
                    if detection.get("is_signature"):
                        # YOLO bbox is relative to original image
                        yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax]
                        
                        if len(yolo_bbox) == 4:
                            # Crop signature from original image using YOLO bbox
                            xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                            cropped_signature = original_image.crop((xmin, ymin, xmax, ymax))
                            
                            # Convert RGBA to RGB if needed (JPEG doesn't support alpha channel)
                            if cropped_signature.mode == "RGBA":
                                # Create a white background
                                rgb_image = Image.new("RGB", cropped_signature.size, (255, 255, 255))
                                rgb_image.paste(cropped_signature, mask=cropped_signature.split()[3])  # Use alpha channel as mask
                                cropped_signature = rgb_image
                            elif cropped_signature.mode != "RGB":
                                cropped_signature = cropped_signature.convert("RGB")
                            
                            # Encode cropped signature as base64
                            img_buffer = io.BytesIO()
                            cropped_signature.save(img_buffer, format="JPEG", quality=85)
                            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                            image_data_url = f"data:image/jpeg;base64,{img_base64}"
                            
                            # Get image size for reference
                            img_width, img_height = original_image.size
                            
                            yolo_signatures.append({
                                "label": "signature",
                                "bbox": yolo_bbox,
                                "confidence": detection.get("confidence", 0.5),
                                "source": "yolo",
                                "image_base64": image_data_url,
                                "image_size": {"width": img_width, "height": img_height}
                            })
                
                if yolo_signatures:
                    logger.info(f"✅ YOLO detected {len(yolo_signatures)} signature(s) in full page image")
                    
                    # Create debug image with YOLO bboxes drawn (for View Images feature)
                    try:
                        import io
                        from PIL import Image
                        
                        # Decode the original image to draw bboxes on it
                        if image_data.startswith("data:image/"):
                            base64_data = image_data.split("base64,")[1]
                        else:
                            base64_data = image_data
                        
                        img_bytes = base64.b64decode(base64_data)
                        debug_img = Image.open(io.BytesIO(img_bytes))
                        
                        # Draw all YOLO bboxes on the image
                        for i, sig in enumerate(yolo_signatures):
                            bbox = sig.get('bbox', [])
                            if len(bbox) == 4:
                                # Draw bbox on debug image
                                self.pdf_processing_service.pdf_processor._draw_bbox_on_image(debug_img, bbox)
                                logger.debug(f"🔍 Drew YOLO bbox {i+1}/{len(yolo_signatures)}: {bbox}")
                        
                        # Encode debug image
                        debug_data_url = self.pdf_processing_service.pdf_processor._encode_image_simple(debug_img)
                        
                        # Store debug image for page 1 (image documents are single "page")
                        self.pdf_processing_service.pdf_processor._debug_images_by_page[1] = debug_data_url
                        logger.debug(f"🔍 Created debug image with {len(yolo_signatures)} YOLO bbox(es) drawn for image document")
                    except Exception as e:
                        logger.warning(f"⚠️ Failed to create debug image with YOLO bboxes: {e}")
                else:
                    logger.info(f"⚠️ YOLO found no signatures in full page image (LLM indicated signature but YOLO didn't detect any)")
            else:
                logger.debug(f"   LLM did not indicate signature presence (has_signature=False or not found)")
        elif task == "without_template_extraction" and not yolo_enabled:
            logger.warning(f"⚠️ YOLO signature detection is disabled (set YOLO_SIGNATURE_ENABLED=true to enable)")
        elif task != "without_template_extraction":
            logger.debug(f"⏭️ Skipping signature detection for task: {task}")
        
        # =========================================================================
        # FACE/PHOTO ID DETECTION (similar to signature detection above)
        # =========================================================================
        yolo_faces = []
        face_enabled = self.face_detector.is_enabled() if self.face_detector else False
        logger.debug(f"📸 Face detection check: task={task}, face_enabled={face_enabled}")
        if task == "without_template_extraction" and face_enabled:
            # Check LLM response for has_photo_id flag
            page_data_parsed = processed_result.get("_parsed", {})
            has_photo_id = page_data_parsed.get("has_photo_id", False)
            logger.debug(f"   Checked _parsed: has_photo_id={has_photo_id}")
            
            # Also check hierarchical_data
            if not has_photo_id and processed_result.get("hierarchical_data"):
                hierarchical_data = processed_result.get("hierarchical_data", {})
                has_photo_id = hierarchical_data.get("has_photo_id", False)
                logger.debug(f"   Checked hierarchical_data: has_photo_id={has_photo_id}")
                # Also check if "has_photo_id" is in any nested section
                if not has_photo_id:
                    for key, value in hierarchical_data.items():
                        if isinstance(value, dict) and value.get("has_photo_id"):
                            has_photo_id = True
                            logger.debug(f"   Found has_photo_id in section '{key}': {value.get('has_photo_id')}")
                            break
            
            if has_photo_id:
                logger.info(f"📸 LLM indicated photo ID/face presence - running YOLO face detection on ORIGINAL uploaded image")
                # Run YOLO on original uploaded image (before any processing)
                import base64
                import io
                from PIL import Image
                
                # Decode base64 image to PIL Image (this is the original uploaded image)
                if image_data.startswith("data:image/"):
                    base64_data = image_data.split("base64,")[1]
                else:
                    base64_data = image_data
                
                image_bytes = base64.b64decode(base64_data)
                original_image = Image.open(io.BytesIO(image_bytes))
                logger.debug(f"   Original image for face detection: size={original_image.size}, mode={original_image.mode}")
                
                # Run YOLO face detection on original unprocessed image
                detections = self.face_detector.detect_faces_in_image(original_image)
                
                for detection in detections:
                    if detection.get("is_face"):
                        # YOLO bbox is relative to original image
                        yolo_bbox = detection.get("bbox", [])  # [xmin, ymin, xmax, ymax]
                        
                        if len(yolo_bbox) == 4:
                            # Get image dimensions
                            img_width, img_height = original_image.size
                            
                            # Apply expanded cropping (same as yolo_face_helpers.py)
                            xmin, ymin, xmax, ymax = [int(coord) for coord in yolo_bbox]
                            bbox_width = xmax - xmin
                            bbox_height = ymax - ymin
                            
                            # Expand the crop area (50% left/right, 30% top, 110% bottom)
                            left_expand = int(bbox_width * 0.5)
                            right_expand = int(bbox_width * 0.5)
                            top_expand = int(bbox_height * 0.3)
                            bottom_expand = int(bbox_height * 1.1)  # 110% expansion
                            
                            # Apply expansion with bounds checking
                            expanded_xmin = max(0, xmin - left_expand)
                            expanded_ymin = max(0, ymin - top_expand)
                            expanded_xmax = min(img_width, xmax + right_expand)
                            expanded_ymax = min(img_height, ymax + bottom_expand)
                            
                            logger.debug(f"   Face bbox expansion: [{xmin}, {ymin}, {xmax}, {ymax}] -> [{expanded_xmin}, {expanded_ymin}, {expanded_xmax}, {expanded_ymax}]")
                            
                            # Ensure we're working with RGB image for cropping
                            if original_image.mode != "RGB":
                                crop_source = original_image.convert("RGB")
                            else:
                                crop_source = original_image
                            
                            # Crop face from original image using expanded bbox
                            cropped_face = crop_source.crop((expanded_xmin, expanded_ymin, expanded_xmax, expanded_ymax))
                            
                            # Encode cropped face as base64 PNG (preserve quality)
                            img_buffer = io.BytesIO()
                            cropped_face.save(img_buffer, format="PNG")
                            img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
                            image_data_url = f"data:image/png;base64,{img_base64}"
                            
                            yolo_faces.append({
                                "label": "face",
                                "bbox": [expanded_xmin, expanded_ymin, expanded_xmax, expanded_ymax],
                                "original_bbox": yolo_bbox,
                                "confidence": detection.get("confidence", 0.5),
                                "source": "yolo",
                                "image_base64": image_data_url,
                                "image_size": {"width": img_width, "height": img_height}
                            })
                
                if yolo_faces:
                    logger.info(f"✅ YOLO detected {len(yolo_faces)} face(s)/photo ID(s) in image document")
                    
                    # Add faces to the result
                    if processed_result.get("hierarchical_data"):
                        hierarchical_data = processed_result["hierarchical_data"]
                        hierarchical_data["faces"] = yolo_faces
                        
                        # Ensure "faces" is in _keyOrder if it exists (for frontend ordering)
                        if "_keyOrder" in hierarchical_data and isinstance(hierarchical_data["_keyOrder"], list):
                            if "faces" not in hierarchical_data["_keyOrder"]:
                                hierarchical_data["_keyOrder"].append("faces")
                                logger.debug(f"   Added 'faces' to _keyOrder")
                        
                        logger.info(f"✅ Added {len(yolo_faces)} face(s) to hierarchical_data")
                    else:
                        # Create hierarchical_data if it doesn't exist
                        if "hierarchical_data" not in processed_result:
                            processed_result["hierarchical_data"] = {"faces": yolo_faces, "_keyOrder": ["faces"]}
                            logger.info(f"✅ Created hierarchical_data and added {len(yolo_faces)} face(s)")
                        else:
                            processed_result["hierarchical_data"]["faces"] = yolo_faces
                else:
                    logger.info(f"⚠️ YOLO found no faces in image (LLM indicated photo ID but YOLO didn't detect any)")
            else:
                logger.debug(f"   LLM did not indicate photo ID presence (has_photo_id=False or not found)")
        elif task == "without_template_extraction" and not face_enabled:
            logger.debug(f"⏭️ YOLO face detection is disabled (set YOLO_FACE_ENABLED=true to enable)")
        elif task != "without_template_extraction":
            logger.debug(f"⏭️ Skipping face detection for task: {task}")
        
        # Process signatures if present (for without_template_extraction task)
        if task == "without_template_extraction":
            # Use YOLO signatures if available, otherwise check LLM response
            if yolo_signatures:
                # Add YOLO signatures to the result
                # Check if signatures field exists in fields array
                signatures_field = None
                if processed_result.get("fields"):
                    for field in processed_result["fields"]:
                        if field.get("label") == "signatures":
                            signatures_field = field
                            break
                
                if not signatures_field:
                    # Create new signatures field
                    if "fields" not in processed_result:
                        processed_result["fields"] = []
                    signatures_field = {"label": "signatures", "type": "signature", "value": []}
                    processed_result["fields"].append(signatures_field)
                
                # Update with YOLO signatures
                signatures_field["value"] = yolo_signatures
                logger.debug(f"✅ Updated signatures field with {len(yolo_signatures)} YOLO-detected signature(s)")
                
                # Also add to hierarchical_data if it exists
                if processed_result.get("hierarchical_data"):
                    hierarchical_data = processed_result["hierarchical_data"]
                    hierarchical_data["signatures"] = yolo_signatures
                    
                    # Ensure "signatures" is in _keyOrder if it exists (for frontend ordering)
                    if "_keyOrder" in hierarchical_data and isinstance(hierarchical_data["_keyOrder"], list):
                        if "signatures" not in hierarchical_data["_keyOrder"]:
                            hierarchical_data["_keyOrder"].append("signatures")
                            logger.debug(f"   Added 'signatures' to _keyOrder")
                    
                    logger.debug(f"✅ Added {len(yolo_signatures)} signature(s) to hierarchical_data")
                    # Debug: Log signature structure
                    if yolo_signatures:
                        for i, sig in enumerate(yolo_signatures):
                            has_image = "image_base64" in sig and sig.get("image_base64")
                            image_len = len(sig.get("image_base64", "")) if has_image else 0
                            logger.info(f"   Signature {i+1}: label={sig.get('label')}, has_image_base64={bool(has_image)}, image_length={image_len}")
                            if has_image:
                                logger.debug(f"      image_base64 preview: {sig.get('image_base64', '')[:50]}...")
                else:
                    logger.warning(f"⚠️ hierarchical_data not found in processed_result, cannot add signatures")
                    logger.debug(f"   processed_result keys: {list(processed_result.keys())}")
                    # Try to create hierarchical_data if it doesn't exist
                    if "hierarchical_data" not in processed_result:
                        processed_result["hierarchical_data"] = {"signatures": yolo_signatures, "_keyOrder": ["signatures"]}
                        logger.info(f"✅ Created hierarchical_data and added {len(yolo_signatures)} signature(s)")
            elif processed_result.get("fields"):
                # Legacy LLM signature processing (if YOLO didn't detect any)
                # Find signatures field and process it
                for field in processed_result["fields"]:
                    if field.get("label") == "signatures" and isinstance(field.get("value"), list):
                        signatures = field["value"]
                        logger.info(f"🔍 Found {len(signatures)} signatures in image document (LLM-detected)")
                    
                    # Get image size from the image_size field
                    image_size = None
                    for size_field in processed_result["fields"]:
                        if size_field.get("label") == "image_size":
                            image_size = size_field.get("value", {})
                            break
                    
                    if image_size:
                        llm_width = image_size.get("width", 848)
                        llm_height = image_size.get("height", 1200)
                        
                        # Get actual image dimensions that will be used for cropping
                        import base64
                        import io
                        from PIL import Image
                        
                        if image_data.startswith("data:image/"):
                            base64_data = image_data.split("base64,")[1]
                        else:
                            base64_data = image_data
                        
                        img_bytes = base64.b64decode(base64_data)
                        actual_img = Image.open(io.BytesIO(img_bytes))
                        actual_width = actual_img.width
                        actual_height = actual_img.height
                        
                        # Calculate scaling factors with higher precision
                        scale_x = actual_width / llm_width
                        scale_y = actual_height / llm_height
                        
                        # Use consistent scaling if factors are very close (within 1%)
                        if abs(scale_x - scale_y) / max(scale_x, scale_y) < 0.01:
                            avg_scale = (scale_x + scale_y) / 2
                            scale_x = scale_y = avg_scale
                            logger.info(f"   Using consistent scale factor: {avg_scale:.6f}")
                        
                        logger.info(f"🔍 Image size conversion:")
                        logger.info(f"   LLM image size: {llm_width}x{llm_height}")
                        logger.info(f"   Actual image size for cropping: {actual_width}x{actual_height}")
                        logger.info(f"   Scale factors: x={scale_x:.3f}, y={scale_y:.3f}")
                        
                        # Convert bbox coordinates from LLM size to actual size
                        converted_signatures = []
                        for sig in signatures:
                            bbox = sig.get("bbox", [])
                            if len(bbox) == 4:
                                # Use centralized coordinate conversion method
                                converted_bbox = self.pdf_processing_service.pdf_processor.convert_signature_coordinates(
                                    bbox=bbox,
                                    llm_width=llm_width,
                                    llm_height=llm_height,
                                    actual_width=actual_width,
                                    actual_height=actual_height
                                )
                                
                                converted_sig = sig.copy()
                                converted_sig["bbox"] = converted_bbox
                                converted_signatures.append(converted_sig)
                            else:
                                converted_signatures.append(sig)
                        
                        # Crop signatures from the original image
                        logger.info(f"🔍 Cropping signatures from image document")
                        # Pass page_number=1 for image documents (single "page")
                        cropped_signatures = self.pdf_processing_service.pdf_processor.crop_signatures_from_page(
                            image_data, converted_signatures, create_debug_image=True, page_number=1
                        )
                        
                        # Debug: Check what cropped_signatures contains
                        logger.info(f"🔍 DEBUG: cropped_signatures result:")
                        logger.info(f"   Type: {type(cropped_signatures)}")
                        logger.info(f"   Length: {len(cropped_signatures) if cropped_signatures else 'None'}")
                        if cropped_signatures:
                            for i, sig in enumerate(cropped_signatures):
                                logger.info(f"   Signature {i}: {type(sig)}")
                                if isinstance(sig, dict):
                                    logger.info(f"     Keys: {list(sig.keys())}")
                                    if 'image_base64' in sig:
                                        logger.info(f"     Has image_base64: {len(sig['image_base64'])} chars")
                                    else:
                                        logger.info(f"     No image_base64, has: {list(sig.keys())}")
                        
                        # Get debug image with bbox drawn
                        debug_image = self.pdf_processing_service.pdf_processor.get_last_debug_image()
                        if debug_image:
                            logger.debug(f"🔍 Debug image with bbox created for image document")
                        
                        # Update the signatures field with cropped images
                        field["value"] = cropped_signatures
                        logger.debug(f"✅ Updated signatures field with cropped images")
                    
                    break
        
        # Remove internal fields from frontend response (only needed for backend processing)
        # Remove image_size, has_signature, and has_photo_id from fields array
        if processed_result.get("fields"):
            processed_result["fields"] = [
                field for field in processed_result["fields"] 
                if field.get("label") not in ["image_size", "has_signature", "has_photo_id"]
            ]
            logger.debug("🗑️ Removed internal fields (image_size, has_signature, has_photo_id) from fields array")
        
        # Remove has_signature and has_photo_id from hierarchical_data (only for internal YOLO triggering)
        if processed_result.get("hierarchical_data"):
            hierarchical_data = processed_result["hierarchical_data"]
            if "has_signature" in hierarchical_data:
                del hierarchical_data["has_signature"]
                logger.debug("🗑️ Removed 'has_signature' from hierarchical_data (internal field only)")
            if "has_photo_id" in hierarchical_data:
                del hierarchical_data["has_photo_id"]
                logger.debug("🗑️ Removed 'has_photo_id' from hierarchical_data (internal field only)")
            # Also remove from _keyOrder if it exists
            if "_keyOrder" in hierarchical_data and isinstance(hierarchical_data["_keyOrder"], list):
                hierarchical_data["_keyOrder"] = [k for k in hierarchical_data["_keyOrder"] if k not in ["has_signature", "has_photo_id"]]
        
        # Track usage (get from the original result if needed)
        usage_info = None
        
        # Return images as list for consistency (original + debug image if available)
        converted_images = [image_data]
        
        # Add debug image if available (check both methods for compatibility)
        debug_images_by_page = self.pdf_processing_service.pdf_processor.get_debug_images_by_page()
        if debug_images_by_page:
            # For image documents, there's only one "page" (page 1)
            debug_image = debug_images_by_page.get(1)
            if debug_image:
                converted_images.append(debug_image)
                logger.debug(f"🔍 Added debug image with bbox to converted_images (from page 1)")
            else:
                # Fallback to legacy method
                debug_image = self.pdf_processing_service.pdf_processor.get_last_debug_image()
                if debug_image:
                    converted_images.append(debug_image)
                    logger.debug(f"🔍 Added debug image with bbox to converted_images (legacy method)")
        else:
            # Fallback to legacy method if no debug images by page
            debug_image = self.pdf_processing_service.pdf_processor.get_last_debug_image()
            if debug_image:
                converted_images.append(debug_image)
                logger.info(f"🔍 Added debug image with bbox to converted_images (legacy method)")
        
        return self._json_safe(processed_result), usage_info, converted_images, []

    def _enrich_template_matching_result(self, result: Dict[str, Any], available_templates: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Synthesize a matches[] array from extracted fields and available templates when
        the LLM returns only matched_template_id/name + confidence."""
        try:
            if not isinstance(result, dict):
                return result
            if isinstance(result.get("matches"), list) and result["matches"]:
                return result

            fields = result.get("fields") or []
            # read hints
            matched_id = None
            matched_name = None
            if isinstance(fields, list):
                for f in fields:
                    label = str((f or {}).get("label", "")).lower()
                    if label == "matched_template_id":
                        matched_id = (f or {}).get("value")
                    elif label == "matched_template_name":
                        matched_name = (f or {}).get("value")
            matched_id = matched_id or result.get("matched_template_id")
            matched_name = matched_name or result.get("matched_template_name")

            if not matched_id and not matched_name:
                return result

            def norm(s):
                return str(s or "").lower().replace(" ", "").replace("_", "")

            chosen = None
            if matched_id:
                nid = norm(matched_id)
                chosen = next((t for t in available_templates if norm(t.get("id")) == nid), None)
            if not chosen and matched_name:
                nn = norm(matched_name)
                chosen = next((t for t in available_templates if norm(t.get("name")) == nn), None)
                if not chosen:
                    chosen = next((t for t in available_templates if nn in norm(t.get("name")) or norm(t.get("name")) in nn), None)
            if not chosen:
                return result

            import re
            def nlabel(x):
                return re.sub(r"[^a-z0-9]", "", str(x or "").lower())

            extracted_labels = set()
            if isinstance(fields, list):
                for f in fields:
                    extracted_labels.add(nlabel((f or {}).get("label") or (f or {}).get("name") or (f or {}).get("id")))

            t_fields = chosen.get("fields") or []
            t_labels = [nlabel(tf.get("label") or tf.get("name") or tf.get("id")) for tf in t_fields]
            matched_names = []
            matched_count = 0
            for tl in t_labels:
                if tl and tl in extracted_labels:
                    matched_count += 1
                    matched_names.append(tl)
            total_fields = chosen.get("field_count") or len(t_fields)

            # read confidence if present
            confidence = 0.0
            for f in fields:
                if str((f or {}).get("label", "")).lower() == "confidence":
                    try:
                        confidence = float((f or {}).get("value") or 0)
                    except Exception:
                        confidence = 0.0
                    break
            
            # If no confidence found in fields, try to get it from result directly
            if confidence == 0.0:
                confidence = result.get("confidence", 0.0)
            
            # For template matching (no extracted fields), estimate matched fields based on confidence
            if matched_count == 0 and total_fields > 0:
                # Use confidence to estimate how many fields would match
                estimated_matched = int(round(confidence * total_fields))
                matched_count = max(1, estimated_matched)  # At least 1 field if confidence > 0
                # Use actual template field names for display
                matched_names = t_labels[:matched_count] if t_labels else [f"field_{i+1}" for i in range(matched_count)]

            result["matches"] = [{
                "id": chosen.get("id"),
                "name": chosen.get("name"),
                "version": chosen.get("version") or "1.0",
                "documentType": chosen.get("document_type") or "General",
                "confidence": min(1.0, max(0.0, confidence if confidence else (matched_count / total_fields if total_fields else 0.0))),
                "matchedFields": matched_count,
                "totalFields": total_fields,
                "totalExtractedFields": len(fields) if isinstance(fields, list) else 0,
                "matchedFieldNames": matched_names
            }]
            return result
        except Exception as e:
            logger.warning(f"_enrich_template_matching_result error: {e}")
            return result

    def _is_pdf_document(self, document_data: str) -> bool:
        """Check if document data is a PDF"""
        try:
            # Check if it's a data URL with PDF content
            if document_data.startswith("data:application/pdf"):
                return True
            
            # Check if it's base64 PDF data
            if document_data.startswith("data:application/pdf;base64,"):
                return True
                
            # Try to decode and check PDF header
            if document_data.startswith("data:application/pdf;base64,"):
                base64_data = document_data.split("base64,")[1]
                decoded_data = base64.b64decode(base64_data)
                return decoded_data.startswith(b'%PDF')
                
            return False
        except Exception as e:
            logger.error(f"Error checking PDF data: {e}")
            return False


    def _json_safe(self, data: Any) -> Any:
        """Ensure the result is JSON-serializable and without circular refs."""
        try:
            import json
            
            # Handle different data types
            if data is None:
                return None
            elif isinstance(data, (str, int, float, bool)):
                return data
            elif isinstance(data, list):
                return [self._json_safe(item) for item in data]
            elif isinstance(data, dict):
                # Create a new dict with JSON-safe values
                safe_dict = {}
                for key, value in data.items():
                    try:
                        safe_dict[key] = self._json_safe(value)
                    except Exception:
                        safe_dict[key] = str(value)
                return safe_dict
            else:
                # For complex objects, try to serialize with fallback
                try:
                    return json.loads(json.dumps(data, default=lambda o: str(o)))
                except Exception:
                    return str(data)
        except Exception as e:
            logger.warning(f"Failed to make data JSON-safe: {e}")
            return str(data) if data is not None else None

    def _simplify_result_structure(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Simplify complex nested structures to avoid circular references."""
        try:
            if not isinstance(result, dict):
                return result
            
            # Removed verbose debug logs to reduce log size
            
            simplified = {}
            
            # Keep top-level fields
            for key in ['template_used', 'confidence', 'fields', 'hierarchical_data']:
                if key in result:
                    # Removed verbose debug log to reduce log size
                    if key == 'fields' and isinstance(result[key], list):
                        # Simplify fields array
                        simplified_fields = []
                        for field in result[key]:
                            if isinstance(field, dict):
                                # Extract only essential field data
                                simplified_field = {
                                    'id': field.get('id', ''),
                                    'label': field.get('label', ''),
                                    'type': field.get('type', 'text'),
                                    'value': field.get('value', ''),
                                    'confidence': field.get('confidence', 0.0)
                                }
                                simplified_fields.append(simplified_field)
                        simplified[key] = simplified_fields
                        # Removed verbose debug log to reduce log size
                    elif key == 'hierarchical_data':
                        # Keep hierarchical_data as-is (it's already simplified from LLM)
                        simplified[key] = result[key]
                        # Removed verbose debug log to reduce log size
                    else:
                        simplified[key] = result[key]
                        # Removed verbose debug log to reduce log size
            
            # Removed verbose debug log to reduce log size
            return simplified
        except Exception as e:
            logger.warning(f"Failed to simplify result structure: {e}")
            return result

    async def _process_image_template_guided_extraction_two_step(
        self,
        image_data: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]],
        db_templates: Optional[List[Dict[str, Any]]]
    ) -> tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str]]:
        """Two-step template-guided extraction for image documents"""
        try:
            logger.info("🎯 Step 1: Extracting all data from image...")
            
            # Step 1: Extract all data using without_template_extraction (image-based for image documents)
            without_template_prompt, without_template_response_format = self.prompt_service.get_task_prompt(
                "without_template_extraction", templates, db_templates, content_type="image"
            )
            
            # Make API call to extract all data
            all_extracted_data = await self.llm_client.call_api(
                without_template_prompt, image_data, without_template_response_format, 
                "without_template_extraction", document_name
            )
            
            logger.info("🎯 Step 2: Organizing extracted data according to template structure...")
            
            # Step 2: Use template structure to organize extracted data
            # Get template structure for organization
            template_structure = self._format_template_structure_for_organization(templates or db_templates or [])
            
            # Create organization prompt
            organization_prompt = f"""
You are a document data organization expert. You have extracted data from a document and need to organize it according to a specific template structure.

EXTRACTED DATA:
{self._format_extracted_data_for_organization(all_extracted_data)}

TEMPLATE STRUCTURE:
{template_structure}

TASK: Organize the extracted data according to the template structure
1. Map extracted data to template fields
2. Maintain the exact template structure and field names
3. Use extracted values where available, leave empty if not found
4. Preserve data types and formats from the template
5. Return organized data in the EXACT template structure

IMPORTANT: Return the data in the EXACT same hierarchical structure as shown in the template structure above. Do NOT return a flat fields array. Return the data organized in the same structure as the template.

Example: If template structure is:
{{
  "personal_details": {{
    "name": null,
    "age": null
  }},
  "address": {{
    "street": null,
    "city": null
  }}
}}

Return:
{{
  "personal_details": {{
    "name": "John Doe",
    "age": "25"
  }},
  "address": {{
    "street": "123 Main St",
    "city": "New York"
  }}
}}
"""
            
            # Make API call with text-only prompt (no images)
            # Use response_schema for structured output
            response_schema = {
                "type": "object",
                "additionalProperties": True
            }
            
            request_body = {
                "model": self.llm_client.extraction_model,
                "messages": [
                    {"role": "user", "content": organization_prompt}
                ],
                "max_tokens": 4000,
                "temperature": 0.1,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "template_organization_response",
                        "strict": False,
                        "schema": response_schema
                    }
                }
            }
            
            # Make the API call
            result = await self.llm_client._call_api_with_retry(
                request_body,
                f"{self.llm_client.litellm_api_url.rstrip('/')}/v1/chat/completions"
            )
            
            # Process the result
            processed_result = self.llm_client.process_api_result(result, "template_guided_extraction")
            usage_info = result.get("usage", {})
            
            logger.info("✅ Two-step template-guided extraction complete for image document")
            logger.info(f"📊 Usage: {usage_info.get('total_tokens', 0)} tokens")
            
            return processed_result, usage_info, [image_data], []
            
        except Exception as e:
            logger.error(f"Error in two-step image template-guided extraction: {e}")
            raise

    def _format_template_structure_for_organization(self, templates: List[Dict[str, Any]]) -> str:
        """Format template structure for data organization - only uses metadata.template_structure"""
        if not templates:
            return "No templates available."
        
        formatted_text = ""
        for i, template in enumerate(templates, 1):
            template_name = template.get("name", f"Template {i}")
            
            # Debug: Log the entire template structure
            logger.info(f"🔍 Template {i} keys: {list(template.keys())}")
            logger.info(f"🔍 Template {i} has metadata: {'metadata' in template}")
            if template.get("metadata"):
                logger.info(f"🔍 Template {i} metadata keys: {list(template['metadata'].keys())}")
                logger.info(f"🔍 Template {i} has template_structure: {'template_structure' in template['metadata']}")
            
            # Try to get template_structure from metadata, fallback to fields array
            template_structure = None
            if template.get("metadata") and template["metadata"].get("template_structure"):
                template_structure = template["metadata"]["template_structure"]
                logger.info(f"🎯 Using template_structure for {template_name}")
            elif template.get("fields"):
                # Fallback: Convert fields array to hierarchical structure
                template_structure = self._convert_fields_to_hierarchical(template["fields"])
                logger.info(f"🔄 Converted fields array to hierarchical structure for {template_name}")
            else:
                logger.warning(f"⚠️ No template_structure or fields found for {template_name}")
            
            formatted_text += f"\nTemplate {i}: {template_name}\n"
            if template_structure:
                # Use the hierarchical structure directly
                import json
                formatted_text += f"Expected structure:\n{json.dumps(template_structure, indent=2)}\n"
            else:
                formatted_text += "  - No template_structure available in metadata\n"
        
        return formatted_text

    def _format_extracted_data_for_organization(self, extracted_data: Dict[str, Any]) -> str:
        """Format extracted data for organization prompt"""
        if not extracted_data:
            return "No data extracted from document."
        
        # Use the _parsed field if available (contains the raw hierarchical data)
        if extracted_data.get("_parsed"):
            import json
            return f"Raw extracted data:\n{json.dumps(extracted_data['_parsed'], indent=2)}"
        
        # Fallback to fields array
        if extracted_data.get("fields"):
            fields_text = ""
            for field in extracted_data["fields"]:
                fields_text += f"- {field.get('label', 'Unknown')}: {field.get('value', '')}\n"
            return f"Extracted fields:\n{fields_text}"
        
        return "No extractable data found."

    def _convert_fields_to_hierarchical(self, fields: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Convert flat fields array to hierarchical structure"""
        hierarchical = {}
        
        for field in fields:
            section = field.get("section", "general")
            field_name = field.get("label", field.get("id", "unknown"))
            
            # Create section if it doesn't exist
            if section not in hierarchical:
                hierarchical[section] = {}
            
            # Add field to section
            hierarchical[section][field_name] = None  # Placeholder for extracted value
        
        return hierarchical

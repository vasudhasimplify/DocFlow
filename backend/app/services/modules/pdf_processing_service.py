"""
PDF Processing Service
Handles PDF processing logic for document analysis
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from ..pdf_processor import PDFProcessor
from .llm_client import LLMClient
from .prompt_service import PromptService
from .parallel_processor import ParallelPageProcessor
from .yolo_signature_detector import YOLOSignatureDetector
from .yolo_face_detector import YOLOFaceDetector
from ...core.config import settings

logger = logging.getLogger(__name__)

def calculate_and_log_cost(usage: Dict[str, int], model_name: str = "Gemini 2.5 Flash") -> None:
    """
    Calculate and log the estimated cost in Indian Rupees for LLM API usage.
    
    Args:
        usage: Dictionary with 'prompt_tokens', 'completion_tokens', and 'total_tokens'
        model_name: Name of the model being used (default: "Gemini 2.5 Flash")
    """
    # Gemini 2.5 Flash pricing (Official - January 2026)
    # Input: $0.30 per 1M tokens
    # Output: $2.50 per 1M tokens
    # Exchange rate: 1 USD = 83.5 INR (approximate, can be updated)
    USD_TO_INR_RATE = 83.5
    INPUT_COST_PER_MILLION_USD = 0.30
    OUTPUT_COST_PER_MILLION_USD = 2.50
    
    prompt_tokens = usage.get("prompt_tokens", 0)
    completion_tokens = usage.get("completion_tokens", 0)
    
    input_cost_usd = (prompt_tokens / 1_000_000) * INPUT_COST_PER_MILLION_USD
    output_cost_usd = (completion_tokens / 1_000_000) * OUTPUT_COST_PER_MILLION_USD
    total_cost_usd = input_cost_usd + output_cost_usd
    total_cost_inr = total_cost_usd * USD_TO_INR_RATE
    
    logger.info(f"💰 Estimated cost ({model_name}): ₹{total_cost_inr:.4f} INR (${total_cost_usd:.6f} USD)")

class PDFProcessingService:
    """Service for PDF processing operations"""
    
    def __init__(
        self, 
        llm_client: LLMClient, 
        prompt_service: PromptService, 
        yolo_detector: Optional[YOLOSignatureDetector] = None,
        face_detector: Optional[YOLOFaceDetector] = None
    ):
        self.pdf_processor = PDFProcessor()
        self.llm_client = llm_client
        self.prompt_service = prompt_service
        # Use provided YOLO detector or create a new one
        self.yolo_detector = yolo_detector
        self.face_detector = face_detector
        self.parallel_processor = ParallelPageProcessor(
            self.pdf_processor, self.llm_client, self.prompt_service, self.yolo_detector, self.face_detector
        )

    async def process_pdf_multi_page(
        self,
        pdf_data: str,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]] = None,
        db_templates: Optional[List[Dict[str, Any]]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """Process PDF with multi-page approach"""
        try:
            # For template_matching, use field-first approach
            if task == "template_matching":
                return await self._process_template_matching_field_first(
                    pdf_data, task, document_name, templates, db_templates, max_workers, max_threads,
                    cancellation_token=cancellation_token, request_id=request_id
                )
            
            # For template_guided_extraction, use two-step approach
            if task == "template_guided_extraction":
                return await self._process_template_guided_extraction_two_step(
                    pdf_data, document_name, templates, db_templates, max_workers, max_threads,
                    cancellation_token=cancellation_token, request_id=request_id
                )
            
            # For other tasks, use original multi-page approach
            # Convert PDF to images
            converted_images = await self.pdf_processor.convert_pdf_to_images(pdf_data)
            
            if not converted_images:
                raise ValueError("Failed to convert PDF to images")
            
            logger.info(f"📄 Converted PDF to {len(converted_images)} images")
            logger.info(f"🔍 Using PROCESSED (GRAYSCALE) images for task: {task}")
            
            # Get prompt for this task
            prompt, response_format = self.prompt_service.get_task_prompt(task, templates, db_templates)
            
            # Prepare and make API call with all images
            request_body = self.llm_client._prepare_request_body(
                prompt, converted_images[0], response_format, document_name
            )
            
            # Add all images to the request
            if len(converted_images) > 1:
                additional_images = []
                for img in converted_images[1:]:
                    additional_images.append({
                        "type": "image_url",
                        "image_url": {
                            "url": img  # Image already has correct data URL format from _encode_image_simple
                        }
                    })
                
                # Insert additional images before the prompt text
                request_body["messages"][0]["content"][1:1] = additional_images
            
            # Build API URL (same as used in LLMClient.call_api)
            base_url = self.llm_client.litellm_api_url.rstrip('/')
            api_url = f"{base_url}/v1/chat/completions"
            result = await self.llm_client._call_api_with_retry(request_body, api_url)
            processed_result = self.llm_client.process_api_result(result, task)
            
            # Track usage
            usage_info = result.get("usage")
            
            return processed_result, usage_info, converted_images, []
            
        except Exception as e:
            logger.error(f"Error in multi-page PDF processing: {e}")
            raise
        finally:
            # CRITICAL FIX #2: Ensure PDF cache is cleared even on errors
            try:
                self.pdf_processor.clear_pdf_cache()
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache: {e}")

    async def _process_template_matching_field_first(
        self,
        pdf_data: str,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]] = None,
        db_templates: Optional[List[Dict[str, Any]]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str]]:
        """
        Process template matching using field-first approach:
        1. Extract fields from all pages (page-by-page)
        2. Combine all fields
        3. Send fields + templates to LLM for template matching
        """
        try:
            logger.info("🎯 Using field-first approach for template matching")
            
            # Step 1: Extract fields from all pages using parallel processing
            logger.info("📄 Step 1: Extracting fields from all pages (parallel)...")
            all_fields = []
            converted_images = []
            total_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            
            # Get page count
            page_count = self.pdf_processor.get_pdf_page_count(pdf_data)
            logger.info(f"📄 Processing {page_count} pages for field extraction")
            
            # Process all pages in parallel
            # Step 1 uses without_template_extraction to extract fields from all pages
            process_context = {
                "document_name": document_name,
                "task": "without_template_extraction",  # Step 1 extracts fields without template structure
                "templates": templates,
                "db_templates": db_templates
            }
            page_results = await self.parallel_processor.process_pages_parallel(
                pdf_data,
                page_count,
                self.parallel_processor.process_page_for_template_matching,
                process_context,
                max_workers,
                max_threads,
                cancellation_token=cancellation_token,
                request_id=request_id
            )
            
            # Check if all pages failed
            error_pages = [r for r in page_results if "error" in r]
            if len(error_pages) == len(page_results) and len(page_results) > 0:
                error_messages = [r.get('error', 'Unknown error') for r in error_pages]
                error_msg = f"All {len(page_results)} page(s) failed: " + "; ".join(error_messages[:3])
                logger.error(f"❌ {error_msg}")
                raise Exception(error_msg)
            
            # Sort page_results by page_num to ensure correct page sequence
            page_results_sorted = sorted(page_results, key=lambda x: x.get("page_num", 0))
            
            # Aggregate results from all pages
            for page_result_data in page_results_sorted:
                if "error" in page_result_data:
                    logger.warning(f"⚠️ Page {page_result_data.get('page_num', 'unknown')} had error: {page_result_data['error']}")
                    continue
                
                page_fields = page_result_data.get("page_fields", [])
                page_image_processed = page_result_data.get("page_image_processed")
                page_result = page_result_data.get("page_result", {})
                page_num = page_result_data.get("page_num", 0)
                
                # Store final processed image that was sent to LLM (grayscale processed image for IMAGE path)
                # For TEXT path pages, page_image_processed will be None (no image sent to LLM)
                if page_image_processed:
                    converted_images.append(page_image_processed)
                    logger.debug(f"📸 Added processed image for page {page_num + 1} to converted_images (final image sent to LLM)")
                
                # Collect fields
                if page_fields:
                    all_fields.extend(page_fields)
                    logger.info(f"✅ Extracted {len(page_fields)} fields from page {page_num + 1}")
                else:
                    logger.info(f"ℹ️ No fields found on page {page_num + 1}")
                
                # Track usage
                if page_result.get("usage"):
                    usage = page_result["usage"]
                    total_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
                    total_usage["completion_tokens"] += usage.get("completion_tokens", 0)
                    total_usage["total_tokens"] += usage.get("total_tokens", 0)
            
            logger.info(f"📊 Step 1 Complete: Extracted {len(all_fields)} total fields from {page_count} pages")
            
            # Step 2: Template matching using extracted fields
            logger.info("🎯 Step 2: Template matching using extracted fields...")
            
            # Get template matching prompt with fields and templates
            template_prompt, template_response_format = self.prompt_service.get_task_prompt(
                "template_matching", templates, db_templates
            )
            
            # Create a text-based request with fields and templates
            fields_text = self._format_fields_for_template_matching(all_fields)
            templates_text = self._format_templates_for_matching(templates or db_templates or [])
            
            # Create a text prompt that includes fields and templates
            enhanced_prompt = f"""
{template_prompt}

EXTRACTED FIELDS FROM DOCUMENT:
{fields_text}

AVAILABLE TEMPLATES:
{templates_text}

Please analyze the extracted fields and match them to the most appropriate template.
"""
            
            # Make API call using the unified call_api method which handles provider routing
            # This works with both gemini_direct and litellm providers
            # Note: call_api() already processes the result, so we use it directly
            processed_result = await self.llm_client.call_api(
                prompt=enhanced_prompt,
                image_data=None,  # Text-only request for template matching
                response_format=template_response_format,
                task="template_matching",
                document_name=document_name
            )
            
            # Add extracted fields to result for reference
            processed_result["extracted_fields"] = all_fields
            processed_result["field_count"] = len(all_fields)
            processed_result["page_count"] = page_count
            
            # Track usage from _timing info if available
            if processed_result.get("_timing"):
                # Usage tracking would come from the response if available
                pass
            
            logger.info(f"✅ Template matching complete using {len(all_fields)} fields from {page_count} pages")
            logger.info(f"📊 Total usage: {total_usage['total_tokens']} tokens")
            calculate_and_log_cost(total_usage)
            
            return processed_result, total_usage, converted_images, []
            
        except Exception as e:
            logger.error(f"Error in field-first template matching: {e}")
            raise
        finally:
            # CRITICAL FIX #2: Ensure PDF cache is cleared even on errors
            try:
                self.pdf_processor.clear_pdf_cache()
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache: {e}")

    def _format_fields_for_template_matching(self, fields: List[Dict[str, Any]]) -> str:
        """Format extracted fields for template matching prompt"""
        if not fields:
            return "No fields extracted from document."
        
        # Group fields by page
        fields_by_page = {}
        for field in fields:
            page = field.get("page", 1)
            if page not in fields_by_page:
                fields_by_page[page] = []
            fields_by_page[page].append(field)
        
        formatted_text = ""
        for page_num in sorted(fields_by_page.keys()):
            page_fields = fields_by_page[page_num]
            formatted_text += f"\nPage {page_num}:\n"
            for field in page_fields:
                field_type = field.get("type", "text")
                field_label = field.get("label", "Unknown")
                field_value = field.get("value", "")
                formatted_text += f"  - {field_label} ({field_type}): {field_value}\n"
        
        return formatted_text

    def _format_templates_for_matching(self, templates: List[Dict[str, Any]]) -> str:
        """Format templates for template matching prompt - includes template_structure from metadata"""
        if not templates:
            return "No templates available."
        
        formatted_text = ""
        for i, template in enumerate(templates, 1):
            template_name = template.get("name", f"Template {i}")
            template_type = template.get("document_type", "Unknown")
            template_fields = template.get("fields", [])
            
            formatted_text += f"\n{'='*60}\nTemplate {i}: {template_name} ({template_type})\n{'='*60}\n"
            
            # Parse metadata if it's a string (JSON from database)
            metadata = template.get("metadata")
            if metadata and isinstance(metadata, str):
                try:
                    metadata = json.loads(metadata)
                except (json.JSONDecodeError, TypeError):
                    logger.warning(f"⚠️ Failed to parse metadata JSON for {template_name}")
                    metadata = None
            
            # Get template_structure from parsed metadata
            template_structure = None
            if metadata and isinstance(metadata, dict) and metadata.get("template_structure"):
                template_structure = metadata["template_structure"]
                logger.debug(f"🎯 Using template_structure from metadata for template matching: {template_name}")
                formatted_text += f"\nExpected Template Structure:\n"
                formatted_text += f"{json.dumps(template_structure, indent=2)}\n"
            else:
                logger.warning(f"⚠️ No template_structure in metadata for {template_name}, skipping template structure")
                formatted_text += f"\n⚠️ Template structure not available (not found in metadata column)\n"
        
        return formatted_text

    async def _process_template_guided_extraction_two_step(
        self,
        pdf_data: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]] = None,
        db_templates: Optional[List[Dict[str, Any]]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str], List[Dict[str, Any]]]:
        """
        Process template-guided extraction using two-step approach:
        1. Extract all data using without_template_extraction (page-by-page)
        2. Use template structure to organize and format the extracted data
        """
        try:
            logger.info("🎯 Using two-step approach for template-guided extraction")
            
            # Log template sources for debugging
            logger.debug(f"🔍 Templates from request: {len(templates) if templates else 0}")
            logger.debug(f"🔍 DB templates: {len(db_templates) if db_templates else 0}")
            if templates:
                logger.debug(f"🔍 First template keys: {list(templates[0].keys()) if templates and len(templates) > 0 else 'None'}")
                logger.debug(f"🔍 First template has metadata: {'metadata' in templates[0] if templates and len(templates) > 0 else False}")
                if templates[0].get("metadata"):
                    logger.debug(f"🔍 First template metadata keys: {list(templates[0]['metadata'].keys()) if isinstance(templates[0].get('metadata'), dict) else 'Not a dict'}")
            if db_templates:
                logger.debug(f"🔍 First DB template keys: {list(db_templates[0].keys()) if db_templates and len(db_templates) > 0 else 'None'}")
                logger.debug(f"🔍 First DB template has metadata: {'metadata' in db_templates[0] if db_templates and len(db_templates) > 0 else False}")
                if db_templates[0].get("metadata"):
                    logger.debug(f"🔍 First DB template metadata keys: {list(db_templates[0]['metadata'].keys()) if isinstance(db_templates[0].get('metadata'), dict) else 'Not a dict'}")
            
            # Step 1: Extract all data using without_template_extraction (parallel processing)
            logger.info("📄 Step 1 of Template-Guided Extraction: Extracting all data from document (parallel processing)...")
            all_extracted_data = {}
            converted_images = []
            total_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            
            # Get page count
            page_count = self.pdf_processor.get_pdf_page_count(pdf_data)
            logger.info(f"📄 Processing {page_count} pages for data extraction (Step 1 of template-guided extraction)")
            
            # Process all pages in parallel
            # Step 1 uses without_template_extraction to extract all data
            process_context = {
                "document_name": document_name,
                "task": "without_template_extraction",  # Step 1 extracts all data without template structure
                "templates": templates,
                "db_templates": db_templates
            }
            page_results = await self.parallel_processor.process_pages_parallel(
                pdf_data,
                page_count,
                self.parallel_processor.process_page_for_template_extraction,
                process_context,
                max_workers,
                max_threads,
                cancellation_token=cancellation_token,
                request_id=request_id
            )
            
            # Aggregate results from all pages
            # IMPORTANT: Sort by page_num to maintain page order (parallel processing returns in completion order)
            sorted_page_results = sorted(page_results, key=lambda x: x.get("page_num", 0))
            logger.debug(f"📊 Sorted {len(sorted_page_results)} page results by page number for correct ordering")
            
            for page_result_data in sorted_page_results:
                if "error" in page_result_data:
                    logger.warning(f"⚠️ Page {page_result_data.get('page_num', 'unknown')} had error: {page_result_data['error']}")
                    continue
                
                page_data = page_result_data.get("page_data", {})
                page_image_processed = page_result_data.get("page_image_processed")
                page_result = page_result_data.get("page_result", {})
                page_key_order = page_result_data.get("page_key_order", [])
                page_num = page_result_data.get("page_num", 0)
                
                # Store final processed image that was sent to LLM (grayscale processed image for IMAGE path)
                # For TEXT path pages, page_image_processed will be None (no image sent to LLM)
                if page_image_processed:
                    converted_images.append(page_image_processed)
                    logger.debug(f"📸 Added processed image for page {page_num + 1} to converted_images (final image sent to LLM)")
                
                # Process extracted data from this page
                if page_data:
                    # Process keys in the correct order
                    page_keys = []
                    keys_to_process = page_key_order if isinstance(page_key_order, list) and len(page_key_order) > 0 else []
                    if not keys_to_process:
                        keys_to_process = [k for k in page_data.keys() if not k.startswith('_')]
                    
                    for key in keys_to_process:
                        if key not in page_data or key.startswith('_'):
                            continue
                        
                        value = page_data[key]
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        
                        all_extracted_data[new_key] = value
                        page_keys.append(new_key)
                    
                    # Process any remaining keys
                    for key, value in page_data.items():
                        if key.startswith('_') or key in [k.replace(f"_page_{page_num + 1}", "") for k in page_keys]:
                            continue
                        
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        all_extracted_data[new_key] = value
                        page_keys.append(new_key)
                    
                    # Update _keyOrder
                    if page_keys:
                        if '_keyOrder' not in all_extracted_data:
                            all_extracted_data['_keyOrder'] = []
                        for key in page_keys:
                            if key not in all_extracted_data['_keyOrder']:
                                all_extracted_data['_keyOrder'].append(key)
                    
                    logger.info(f"✅ [Template-Guided Step 1] Extracted data from page {page_num + 1}: {len(page_keys)} keys (order preserved)")
                else:
                    logger.info(f"ℹ️ [Template-Guided Step 1] No data found on page {page_num + 1}")
                
                # Track usage
                if page_result.get("usage"):
                    usage = page_result["usage"]
                    total_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
                    total_usage["completion_tokens"] += usage.get("completion_tokens", 0)
                    total_usage["total_tokens"] += usage.get("total_tokens", 0)
            
            logger.info(f"📊 [Template-Guided Extraction] Step 1 Complete: Extracted data from {page_count} pages")
            
            # Step 2: Use template structure to organize extracted data
            logger.info("🎯 [Template-Guided Extraction] Step 2: Organizing extracted data according to template structure...")
            
            # If user selected specific templates, match them with db_templates to get full metadata
            templates_to_use = []
            if templates and db_templates:
                # User selected specific templates - match them with db_templates to get full metadata
                logger.info(f"📋 User selected {len(templates)} template(s), matching with db_templates...")
                for selected_template in templates:
                    # Try to match by ID first, then by name
                    selected_id = selected_template.get("id") or selected_template.get("uuid")
                    selected_name = selected_template.get("name")
                    
                    matched = None
                    for db_template in db_templates:
                        db_id = db_template.get("id") or db_template.get("uuid")
                        db_name = db_template.get("name")
                        
                        # Match by ID or name
                        if selected_id and db_id and str(selected_id) == str(db_id):
                            matched = db_template
                            logger.debug(f"✅ Matched template '{selected_name}' by ID: {selected_id}")
                            break
                        elif selected_name and db_name and str(selected_name).strip().lower() == str(db_name).strip().lower():
                            matched = db_template
                            logger.debug(f"✅ Matched template '{selected_name}' by name")
                            break
                    
                    if matched:
                        templates_to_use.append(matched)
                        logger.info(f"✅ Using template '{matched.get('name')}' for organization")
                    else:
                        logger.warning(f"⚠️ Could not find selected template '{selected_name}' in db_templates, skipping")
            elif db_templates:
                # No specific selection, use all db_templates (fallback)
                templates_to_use = db_templates
                logger.info(f"📋 No specific template selection, using all {len(db_templates)} db_templates")
            elif templates:
                # Only provided templates (may not have metadata)
                templates_to_use = templates
                logger.warning(f"⚠️ Using provided templates without metadata enrichment")
            else:
                logger.warning("⚠️ No templates available for organization")
            
            logger.info(f"📋 Using {len(templates_to_use)} template(s) for organization")
            
            # Get template structure for organization
            template_structure = self._format_template_structure_for_organization(templates_to_use or [])
            
            # Log the template structure being passed to LLM (only once, not duplicated)
            # Note: Template structure JSON is already logged above at line 656, so we skip duplicate logging here
            if not (template_structure and template_structure != "No templates available."):
                logger.warning("⚠️ [Template-Guided Extraction] No template structure available to pass to LLM")
            
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
            request_body = {
                "model": self.llm_client.extraction_model,
                "messages": [
                    {
                        "role": "user",
                        "content": organization_prompt
                    }
                ],
                "max_tokens": 15000,
                "temperature": 0.1,
                "response_format": {
                    "type": "json_object"
                }
            }
            
            result = await self.llm_client._call_api_with_retry(
                request_body,
                f"{self.llm_client.litellm_api_url.rstrip('/')}/v1/chat/completions"
            )
            
            # Process the result
            processed_result = self.llm_client.process_api_result(result, "template_guided_extraction")
            
            # Log the processed result structure (hierarchical_data from LLM response) - DEBUG level to avoid cluttering logs
            if isinstance(processed_result, dict) and "hierarchical_data" in processed_result:
                hierarchical_data_response = processed_result.get("hierarchical_data")
                try:
                    response_structure_json = json.dumps(hierarchical_data_response, indent=2, ensure_ascii=False)
                    # Removed full JSON dump to reduce log size - only log keys
                    logger.debug(f"📋 [Template-Guided Step 2] LLM response structure keys: {list(hierarchical_data_response.keys()) if isinstance(hierarchical_data_response, dict) else 'N/A'}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to serialize LLM response structure: {e}")
            
            # Rebuild all_extracted_data in the correct order based on _keyOrder if it exists
            if isinstance(all_extracted_data, dict) and '_keyOrder' in all_extracted_data:
                key_order = all_extracted_data['_keyOrder']
                if isinstance(key_order, list) and len(key_order) > 0:
                    logger.debug(f"🔍 [Template-Guided Step 2] Rebuilding all_extracted_data with {len(key_order)} keys in order: {key_order[:5]}...")
                    # Create a new ordered dict based on _keyOrder
                    ordered_extracted_data = {}
                    # First, add keys in the order specified by _keyOrder
                    for key in key_order:
                        if key in all_extracted_data:
                            ordered_extracted_data[key] = all_extracted_data[key]
                    # Then, add any keys not in _keyOrder (shouldn't happen, but safety check)
                    for key, value in all_extracted_data.items():
                        if key not in ordered_extracted_data and not key.startswith('_'):
                            ordered_extracted_data[key] = value
                            logger.warning(f"⚠️ Key '{key}' found in all_extracted_data but not in _keyOrder")
                    # Finally, add _keyOrder metadata at the end
                    ordered_extracted_data['_keyOrder'] = key_order
                    all_extracted_data = ordered_extracted_data
                    logger.info(f"✅ [Template-Guided Step 2] Rebuilt all_extracted_data with {len(ordered_extracted_data)} keys (page sequence preserved)")
                    logger.debug(f"🔍 Final key order: {list(ordered_extracted_data.keys())[:10]}...")
            
            # Add extracted data to result for reference
            processed_result["raw_extracted_data"] = all_extracted_data
            processed_result["page_count"] = page_count
            
            # Track final usage
            if result.get("usage"):
                final_usage = result["usage"]
                total_usage["prompt_tokens"] += final_usage.get("prompt_tokens", 0)
                total_usage["completion_tokens"] += final_usage.get("completion_tokens", 0)
                total_usage["total_tokens"] += final_usage.get("total_tokens", 0)
            
            logger.info(f"✅ [Template-Guided Extraction] Complete! Extracted and organized data using template structure from {page_count} pages")
            logger.info(f"📊 Total usage: {total_usage['total_tokens']} tokens")
            calculate_and_log_cost(total_usage)
            
            return processed_result, total_usage, converted_images, []
            
        except Exception as e:
            logger.error(f"Error in two-step template-guided extraction: {e}")
            raise
        finally:
            # CRITICAL FIX #2: Ensure PDF cache is cleared even on errors
            try:
                self.pdf_processor.clear_pdf_cache()
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache: {e}")

    def _format_template_structure_for_organization(self, templates: List[Dict[str, Any]]) -> str:
        """Format template structure for data organization - only uses metadata.template_structure"""
        if not templates:
            return "No templates available."
        
        formatted_text = ""
        for i, template in enumerate(templates, 1):
            template_name = template.get("name", f"Template {i}")
            
            # Debug: Log what we received
            logger.debug(f"🔍 [Template {i}] '{template_name}' - Checking metadata...")
            metadata = template.get("metadata")
            if metadata:
                logger.debug(f"🔍 [Template {i}] Metadata type: {type(metadata)}")
                logger.debug(f"🔍 [Template {i}] Metadata keys: {list(metadata.keys()) if isinstance(metadata, dict) else 'Not a dict'}")
                # Check if metadata is a string that needs parsing
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                        logger.debug(f"🔍 [Template {i}] Parsed metadata string to dict")
                    except Exception as e:
                        logger.warning(f"⚠️ [Template {i}] Failed to parse metadata string: {e}")
                if isinstance(metadata, dict):
                    if "template_structure" in metadata:
                        logger.debug(f"🔍 [Template {i}] Found template_structure key in metadata")
                    else:
                        logger.warning(f"⚠️ [Template {i}] template_structure key not found in metadata. Available keys: {list(metadata.keys())}")
            else:
                logger.warning(f"⚠️ [Template {i}] No metadata found for template")
            
            # Only get template_structure from metadata column
            template_structure = None
            if metadata and isinstance(metadata, dict) and metadata.get("template_structure"):
                template_structure = metadata["template_structure"]
                logger.info(f"✅ [Template {i}] Using template_structure from metadata for '{template_name}'")
            else:
                logger.warning(f"⚠️ [Template {i}] No template_structure in metadata for '{template_name}', skipping this template")
                formatted_text += f"\nTemplate {i}: {template_name}\n"
                formatted_text += "  - No template structure available (template_structure not found in metadata)\n"
                continue
            
            formatted_text += f"\nTemplate {i}: {template_name}\n"
            if template_structure:
                # Use the hierarchical structure directly
                template_structure_json = json.dumps(template_structure, indent=2)
                formatted_text += f"Expected structure:\n{template_structure_json}\n"
                # Log the JSON structure for this template
                logger.info(f"📋 Template '{template_name}' structure JSON:\n{template_structure_json}")
            else:
                formatted_text += "  - No template structure available\n"
        
        return formatted_text


    def _format_extracted_data_for_organization(self, extracted_data: Dict[str, Any]) -> str:
        """Format extracted data for organization prompt"""
        if not extracted_data:
            return "No data extracted from document."
        
        formatted_text = ""
        for key, value in extracted_data.items():
            if isinstance(value, dict):
                formatted_text += f"\n{key}:\n"
                for sub_key, sub_value in value.items():
                    formatted_text += f"  - {sub_key}: {sub_value}\n"
            elif isinstance(value, list):
                formatted_text += f"\n{key}:\n"
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        formatted_text += f"  Item {i+1}:\n"
                        for sub_key, sub_value in item.items():
                            formatted_text += f"    - {sub_key}: {sub_value}\n"
                    else:
                        formatted_text += f"  - {item}\n"
            else:
                formatted_text += f"\n{key}: {value}\n"
        
        return formatted_text

    async def _process_bank_statement_pages(
        self,
        pdf_data: str,
        total_pages: int,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]],
        db_templates: Optional[List[Dict[str, Any]]],
        document_type: str,
        max_workers: Optional[int],
        max_threads: Optional[int],
        cancellation_token: Optional[Any],
        request_id: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Process bank statement pages with sequential header detection.
        
        1. Process first 2-3 pages sequentially to detect table headers
        2. Once headers are found, process remaining pages in parallel with headers context
        """
        all_page_results = []
        bank_statement_headers = []
        headers_found = False
        max_pages_to_check_for_headers = min(3, total_pages)
        
        logger.info(f"🏦 Bank Statement: Processing first {max_pages_to_check_for_headers} pages sequentially for header detection")
        
        # Step 1: Process first pages sequentially to find headers
        for page_num in range(max_pages_to_check_for_headers):
            if headers_found:
                break
                
            logger.info(f"📄 [Page {page_num + 1}] Processing for header detection...")
            
            # Create context for first page (header detection mode)
            process_context = {
                "task": task,
                "document_name": document_name,
                "templates": templates,
                "db_templates": db_templates,
                "prefer_text": settings.PDF_PREFER_TEXT_EXTRACTION,
                "text_confidence_threshold": settings.PDF_TEXT_CONFIDENCE_THRESHOLD,
                "document_type": document_type,
                "is_first_page": True,  # Use header detection prompt
                "table_headers": [],
                "page_number": page_num + 1
            }
            
            # Process this page synchronously
            try:
                result = self.parallel_processor.process_page_for_extraction_sync(
                    page_num,
                    pdf_data,
                    process_context
                )
                all_page_results.append(result)
                
                # Try to extract headers from the result
                if "error" not in result:
                    page_hierarchical_data = result.get("page_hierarchical_data", {})
                    if page_hierarchical_data and isinstance(page_hierarchical_data, dict):
                        # Check for explicit _table_headers
                        found_headers = page_hierarchical_data.get('_table_headers', [])
                        if found_headers and len(found_headers) > 2:
                            bank_statement_headers = found_headers
                            headers_found = True
                            logger.info(f"📋 Found table headers on page {page_num + 1}: {bank_statement_headers}")
                        else:
                            # Try to infer from transactions
                            transactions = page_hierarchical_data.get('transactions', [])
                            if transactions and isinstance(transactions, list) and len(transactions) > 0:
                                first_row = transactions[0]
                                if isinstance(first_row, dict) and len(first_row.keys()) > 2:
                                    bank_statement_headers = list(first_row.keys())
                                    headers_found = True
                                    logger.info(f"📋 Inferred headers from transactions on page {page_num + 1}: {bank_statement_headers}")
            except Exception as e:
                logger.error(f"❌ Error processing page {page_num + 1} for headers: {e}")
                all_page_results.append({
                    "page_num": page_num,
                    "error": str(e),
                    "failed_stage": "header_detection"
                })
        
        if not headers_found:
            logger.warning("⚠️ No table headers found in first 3 pages, continuation pages will use auto-detection")
        else:
            logger.info(f"✅ Headers detected: {bank_statement_headers}")
        
        # Step 2: Process remaining pages in parallel (or sequentially if single-threaded)
        pages_already_processed = len([r for r in all_page_results if "error" not in r])
        remaining_start_idx = pages_already_processed
        
        if remaining_start_idx < total_pages:
            remaining_count = total_pages - remaining_start_idx
            logger.info(f"🚀 Processing remaining {remaining_count} pages {'with detected headers' if headers_found else 'with auto-detection'}")
            
            # Create context for continuation pages
            process_context = {
                "task": task,
                "document_name": document_name,
                "templates": templates,
                "db_templates": db_templates,
                "prefer_text": settings.PDF_PREFER_TEXT_EXTRACTION,
                "text_confidence_threshold": settings.PDF_TEXT_CONFIDENCE_THRESHOLD,
                "document_type": document_type,
                "is_first_page": not headers_found,  # If no headers found, use detection mode
                "table_headers": bank_statement_headers if headers_found else [],
            }
            
            # Process remaining pages
            remaining_results = await self.parallel_processor.process_pages_parallel(
                pdf_data,
                total_pages,
                self.parallel_processor.process_page_for_extraction_sync,
                process_context,
                max_workers,
                max_threads,
                cancellation_token=cancellation_token,
                request_id=request_id,
                start_page=remaining_start_idx  # Start from where we left off
            )
            
            all_page_results.extend(remaining_results)
        
        return all_page_results

    async def process_pdf_page_by_page(
        self,
        pdf_data: str,
        task: str,
        document_name: Optional[str],
        templates: Optional[List[Dict[str, Any]]] = None,
        db_templates: Optional[List[Dict[str, Any]]] = None,
        max_workers: Optional[int] = None,
        max_threads: Optional[int] = None,
        cancellation_token: Optional[Any] = None,
        request_id: Optional[str] = None,
        document_type: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]], List[str]]:
        """Process PDF with page-by-page approach"""
        logger.debug(f"🚀 PDF Processing Service: Starting process_pdf_page_by_page for task: {task}")
        try:
            # Get total page count
            total_pages = self.pdf_processor.get_pdf_page_count(pdf_data)
            logger.debug(f"📄 Processing PDF with {total_pages} pages individually")
            
            # Process all pages (no limit)
            max_pages_to_process = total_pages
            
            all_fields = []
            all_page_images = []  # Collect all converted images
            field_id_counter = 1
            # Preserve hierarchical structure for form_creation and field_detection
            hierarchical_data: Optional[Dict[str, Any]] = None
            
            # Clear debug images from previous runs
            self.pdf_processor.clear_debug_images()
            
            # Check if this is a bank statement - requires special sequential processing for headers
            is_bank_statement = document_type and document_type.lower() in ["bank_statement", "bank-statement", "bankstatement", "bank statement"]
            
            if is_bank_statement:
                logger.info(f"🏦 Bank Statement mode - sequential header detection enabled")
                page_results = await self._process_bank_statement_pages(
                    pdf_data, total_pages, task, document_name, templates, db_templates,
                    document_type, max_workers, max_threads, cancellation_token, request_id
                )
            else:
                # Standard parallel processing for non-bank-statement documents
                process_context = {
                    "task": task,
                    "document_name": document_name,
                    "templates": templates,
                    "db_templates": db_templates,
                    "prefer_text": settings.PDF_PREFER_TEXT_EXTRACTION,
                    "text_confidence_threshold": settings.PDF_TEXT_CONFIDENCE_THRESHOLD,
                    "document_type": document_type
                }
                page_results = await self.parallel_processor.process_pages_parallel(
                    pdf_data,
                    max_pages_to_process,
                    self.parallel_processor.process_page_for_extraction_sync,
                    process_context,
                    max_workers,
                    max_threads,
                    cancellation_token=cancellation_token,
                    request_id=request_id
                )
            
            # Check if all pages failed
            error_pages = [r for r in page_results if "error" in r]
            if len(error_pages) == len(page_results) and len(page_results) > 0:
                error_messages = [r.get('error', 'Unknown error') for r in error_pages]
                error_msg = f"All {len(page_results)} page(s) failed: " + "; ".join(error_messages[:3])
                logger.error(f"❌ {error_msg}")
                raise Exception(error_msg)
            
            # Sort page_results by page_num to ensure correct page sequence
            page_results_sorted = sorted(page_results, key=lambda x: x.get("page_num", 0))
            
            # Collect failed pages info for warnings
            failed_pages_info = []
            
            # Aggregate results from all pages
            for page_result_data in page_results_sorted:
                if "error" in page_result_data:
                    page_num = page_result_data.get('page_num', 'unknown')
                    error_msg = page_result_data.get('error', 'Unknown error')
                    retry_count = page_result_data.get('retry_count', 0)
                    failed_stage = page_result_data.get('failed_stage', 'Unknown stage')
                    logger.warning(f"⚠️ Page {page_num} failed after {retry_count} retries at {failed_stage}: {error_msg}")
                    failed_pages_info.append({
                        "page_num": page_num,
                        "error": error_msg,
                        "retry_count": retry_count,
                        "failed_stage": failed_stage
                    })
                    continue
                
                page_num = page_result_data.get("page_num", 0)
                page_result = page_result_data.get("page_result", {})
                page_image_processed = page_result_data.get("page_image_processed")
                page_image_original = page_result_data.get("page_image_original")
                page_fields = page_result_data.get("page_fields", [])
                page_hierarchical_data = page_result_data.get("page_hierarchical_data")
                
                # Store processed RGB image (same as sent to LLM) instead of original image
                # This allows users to see the enhanced image that the LLM processes
                if page_image_processed:
                    all_page_images.append(page_image_processed)
                elif page_image_original:
                    # Fallback to original image if processed is not available (shouldn't happen for IMAGE path)
                    all_page_images.append(page_image_original)
                
                # Process hierarchical_data for field_detection and form_creation
                if task in ["field_detection", "form_creation"] and page_hierarchical_data:
                    if hierarchical_data is None:
                        hierarchical_data = {}
                    
                    # Get key order from this page
                    page_key_order = page_hierarchical_data.get('_keyOrder', [])
                    if not isinstance(page_key_order, list) or len(page_key_order) == 0:
                        page_key_order = [k for k in page_hierarchical_data.keys() if not k.startswith('_')]
                    
                    # Process keys in order (excluding has_signature - internal field only)
                    page_hierarchical_keys = []
                    for key in page_key_order:
                        if key not in page_hierarchical_data or key.startswith('_') or key == "has_signature":
                            continue
                        
                        value = page_hierarchical_data[key]
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        hierarchical_data[new_key] = value
                        page_hierarchical_keys.append(new_key)
                    
                    # Process remaining keys (excluding has_signature)
                    for key, value in page_hierarchical_data.items():
                        if key.startswith('_') or key in page_key_order or key == "has_signature":
                            continue
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        hierarchical_data[new_key] = value
                        page_hierarchical_keys.append(new_key)
                    
                    # Update _keyOrder
                    if page_hierarchical_keys:
                        if '_keyOrder' not in hierarchical_data:
                            hierarchical_data['_keyOrder'] = []
                        for key in page_hierarchical_keys:
                            if key not in hierarchical_data['_keyOrder']:
                                hierarchical_data['_keyOrder'].append(key)
                    
                    logger.debug(f"🔍 Preserved hierarchical_data from page {page_num + 1}, total keys: {len(hierarchical_data)}")
                
                # Process hierarchical_data for without_template_extraction
                if task == "without_template_extraction" and page_hierarchical_data:
                    if hierarchical_data is None:
                        hierarchical_data = {}
                    
                    # Get key order from this page
                    page_key_order = page_hierarchical_data.get('_keyOrder', [])
                    if not isinstance(page_key_order, list) or len(page_key_order) == 0:
                        page_key_order = [k for k in page_hierarchical_data.keys() if not k.startswith('_')]
                    
                    # Process keys in order (excluding has_signature - internal field only)
                    page_hierarchical_keys = []
                    for key in page_key_order:
                        if key not in page_hierarchical_data or key.startswith('_') or key == "has_signature":
                            continue
                        
                        value = page_hierarchical_data[key]
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        hierarchical_data[new_key] = value
                        page_hierarchical_keys.append(new_key)
                    
                    # Process remaining keys (excluding has_signature)
                    for key, value in page_hierarchical_data.items():
                        if key.startswith('_') or key in page_key_order or key == "has_signature":
                            continue
                        page_suffix = f"_page_{page_num + 1}"
                        new_key = f"{key}{page_suffix}"
                        hierarchical_data[new_key] = value
                        page_hierarchical_keys.append(new_key)
                    
                    # Update _keyOrder
                    if page_hierarchical_keys:
                        if '_keyOrder' not in hierarchical_data:
                            hierarchical_data['_keyOrder'] = []
                        for key in page_hierarchical_keys:
                            if key not in hierarchical_data['_keyOrder']:
                                hierarchical_data['_keyOrder'].append(key)
                    
                    # Update signatures in hierarchical_data if they were processed
                    page_data = page_result_data.get("page_data", {})
                    if page_data and "signatures" in page_data:
                        signatures = page_data["signatures"]
                        # Add signatures to hierarchical_data
                        # Try both with and without page suffix for compatibility
                        signatures_page_key = f"signatures_page_{page_num + 1}"
                        hierarchical_data[signatures_page_key] = signatures
                        # Also add as "signatures" if it's the first page or if not already set
                        if page_num == 0 or "signatures" not in hierarchical_data:
                            hierarchical_data["signatures"] = signatures
                        logger.info(f"✅ Added {len(signatures)} signature(s) to hierarchical_data for page {page_num + 1}")
                    
                    logger.debug(f"🔍 Preserved hierarchical_data from page {page_num + 1}, total keys: {len(hierarchical_data)}")
                
                # Add page info and renumber IDs
                for field in page_fields:
                    field["page"] = page_num + 1
                    field["id"] = str(field_id_counter)
                    field_id_counter += 1
                    all_fields.append(field)
                
            
            # Remove image_size fields from frontend response (only needed for backend processing)
            filtered_fields = [
                field for field in all_fields 
                if field.get("label") != "image_size"
            ]
            
            # Add debug images with bbox drawn (one per page that has signatures)
            # Get all debug images organized by page number
            debug_images_by_page = self.pdf_processor.get_debug_images_by_page()
            debug_images = []
            # Add debug images in page order (page 1, page 2, etc.)
            for page_num in sorted(debug_images_by_page.keys()):
                debug_images.append(debug_images_by_page[page_num])
                logger.debug(f"🖼️ Added debug image for page {page_num} with bbox")
            
            # Combine processed and debug images
            all_images = all_page_images + debug_images
            
            # Merge results
            logger.debug(f"🎯 Total fields extracted from all pages: {len(filtered_fields)}")
            
            # Aggregate token usage from all pages (using already sorted page_results_sorted)
            combined_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            for page_result_data in page_results_sorted:
                if "error" in page_result_data:
                    continue  # Skip failed pages
                page_result = page_result_data.get("page_result", {})
                if page_result and page_result.get("usage"):
                    usage = page_result["usage"]
                    combined_usage["prompt_tokens"] += usage.get("prompt_tokens", 0)
                    combined_usage["completion_tokens"] += usage.get("completion_tokens", 0)
                    combined_usage["total_tokens"] += usage.get("total_tokens", 0)
            
            # Log total token usage and cost
            logger.info(f"📊 Total LLM token usage: {combined_usage['total_tokens']} tokens (Prompt: {combined_usage['prompt_tokens']}, Completion: {combined_usage['completion_tokens']})")
            calculate_and_log_cost(combined_usage)
            
            logger.debug(f"🖼️ Returning {len(all_images)} converted images ({len(all_page_images)} processed + {len(debug_images)} debug)")
            
            # Rebuild hierarchical_data in the correct order based on _keyOrder if it exists
            if hierarchical_data is not None and isinstance(hierarchical_data, dict) and '_keyOrder' in hierarchical_data:
                key_order = hierarchical_data['_keyOrder']
                if isinstance(key_order, list) and len(key_order) > 0:
                    logger.debug(f"🔍 Rebuilding hierarchical_data with {len(key_order)} keys in order: {key_order[:5]}...")
                    # Create a new ordered dict based on _keyOrder
                    ordered_hierarchical_data = {}
                    # First, add keys in the order specified by _keyOrder (excluding has_signature)
                    for key in key_order:
                        if key in hierarchical_data and key != "has_signature":
                            ordered_hierarchical_data[key] = hierarchical_data[key]
                    # Then, add any keys not in _keyOrder (shouldn't happen, but safety check)
                    for key, value in hierarchical_data.items():
                        if key not in ordered_hierarchical_data and not key.startswith('_') and key != "has_signature":
                            ordered_hierarchical_data[key] = value
                            logger.warning(f"⚠️ Key '{key}' found in hierarchical_data but not in _keyOrder")
                    # Finally, add _keyOrder metadata at the end (filtered to exclude has_signature)
                    filtered_key_order = [k for k in key_order if k != "has_signature"]
                    ordered_hierarchical_data['_keyOrder'] = filtered_key_order
                    hierarchical_data = ordered_hierarchical_data
                    logger.debug(f"✅ Rebuilt hierarchical_data with {len(ordered_hierarchical_data)} keys (page sequence preserved)")
                    logger.debug(f"🔍 Final key order: {list(ordered_hierarchical_data.keys())[:10]}...")
            
            # Remove has_signature and has_photo_id from hierarchical_data if they exist (they're only for internal YOLO triggering)
            if hierarchical_data is not None and isinstance(hierarchical_data, dict):
                # Remove from data
                if "has_signature" in hierarchical_data:
                    del hierarchical_data["has_signature"]
                    logger.debug("🗑️ Removed 'has_signature' from hierarchical_data (internal field only)")
                if "has_photo_id" in hierarchical_data:
                    del hierarchical_data["has_photo_id"]
                    logger.debug("🗑️ Removed 'has_photo_id' from hierarchical_data (internal field only)")
                # Remove from _keyOrder if it exists
                if "_keyOrder" in hierarchical_data and isinstance(hierarchical_data["_keyOrder"], list):
                    hierarchical_data["_keyOrder"] = [k for k in hierarchical_data["_keyOrder"] if k not in ["has_signature", "has_photo_id"]]
            
            result: Dict[str, Any] = {"fields": filtered_fields}
            if hierarchical_data is not None:
                result["hierarchical_data"] = hierarchical_data
            
            # Include failed pages info in result for warnings
            if failed_pages_info:
                result["failed_pages"] = failed_pages_info
            
            return result, combined_usage, all_images, failed_pages_info
            
        except Exception as e:
            logger.error(f"❌ Error in page-by-page processing: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
        finally:
            # CRITICAL FIX #2: Ensure PDF cache is cleared even on errors
            try:
                self.pdf_processor.clear_pdf_cache()
            except Exception as e:
                logger.warning(f"⚠️ Error clearing PDF cache: {e}")
    
    def _convert_hierarchical_to_fields(self, hierarchical_data: Dict[str, Any], page_num: int) -> List[Dict[str, Any]]:
        """Convert hierarchical data structure to flat fields array"""
        fields = []
        field_id = 1
        
        def process_value(key: str, value: Any, parent_key: str = "") -> None:
            nonlocal field_id
            
            # Determine section name from parent_key or key
            section_name = parent_key.replace("_", " ").title() if parent_key else "General"
            logger.debug(f"🔍 Processing field: {key}, parent_key: {parent_key}, section_name: {section_name}")
            
            if isinstance(value, dict):
                # Nested object - process each property with the current key as parent
                for nested_key, nested_value in value.items():
                    process_value(nested_key, nested_value, key)
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                # Array of objects (table) - create table field
                table_columns = list(value[0].keys()) if value else []
                fields.append({
                    "id": str(field_id),
                    "label": key.replace("_", " ").title(),
                    "type": "table",
                    "value": None,
                    "confidence": 0.85,
                    "page": page_num,
                    "section": section_name,
                    "columns": table_columns
                })
                field_id += 1
            elif isinstance(value, list) and value and isinstance(value[0], dict) and "label" in value[0] and "bbox" in value[0]:
                # Signatures array
                for sig in value:
                    fields.append({
                        "id": str(field_id),
                        "label": sig.get("label", "signature"),
                        "type": "signature",
                        "value": None,
                        "confidence": 0.85,
                        "page": page_num,
                        "section": "Signatures",
                        "bbox": sig.get("bbox", [])
                    })
                    field_id += 1
            else:
                # Simple field
                field_type = "text"
                if "date" in key.lower():
                    field_type = "date"
                elif "email" in key.lower():
                    field_type = "email"
                elif "phone" in key.lower() or "mobile" in key.lower():
                    field_type = "phone"
                elif "amount" in key.lower() or "total" in key.lower() or "value" in key.lower():
                    field_type = "number"
                
                fields.append({
                    "id": str(field_id),
                    "label": key.replace("_", " ").title(),
                    "type": field_type,
                    "value": None,
                    "confidence": 0.85,
                    "page": page_num,
                    "section": section_name
                })
                field_id += 1
        
        # Process all top-level keys
        for key, value in hierarchical_data.items():
            # For top-level keys, pass the key as parent_key to determine section
            logger.debug(f"🔍 Processing top-level key: {key}")
            process_value(key, value, key)
        
        return fields

"""
Document Type Detection Service
Detects document type using LLM Vision analysis of first 2 pages
Uses Gemini's native response_schema for guaranteed structured JSON output
"""

import logging
import json
from typing import Optional, Dict, Any, List
import fitz  # PyMuPDF
import base64

logger = logging.getLogger(__name__)


class DocumentTypeDetector:
    """
    Service for detecting document types using LLM Vision.
    Converts first 2 pages to images and sends to LLM for visual analysis.
    Uses Pydantic schema for structured output - Gemini guarantees valid JSON.
    """

    def __init__(self, llm_client=None):
        """
        Initialize detector with LLM client.

        Args:
            llm_client: LLM client for making vision API calls
        """
        self.llm_client = llm_client

    async def detect_type(
        self,
        file_bytes: bytes,
        filename: str = ""
    ) -> Dict[str, Any]:
        """
        Detect document type using LLM Vision model.

        Args:
            file_bytes: PDF or image file content as bytes
            filename: Original filename

        Returns:
            Dict with document_type, confidence, display_name, icon, color
        """
        try:
            logger.info(f"Starting vision-based document type detection for: {filename}")

            if not self.llm_client:
                logger.warning("No LLM client available for document type detection")
                return self._get_type_info("unknown", 0.0)

            # Check if it's an image or PDF
            is_image = self._is_image_file(filename, file_bytes)
            
            if is_image:
                # Single image - send directly
                logger.info(f"Processing image file: {filename}")
                images = [file_bytes]
            else:
                # PDF - convert first 2 pages to images
                logger.info(f"Converting PDF to images: {filename}")
                images = await self._convert_pdf_to_images(file_bytes)
                
                if not images:
                    logger.warning("Could not convert PDF to images")
                    return self._get_type_info("unknown", 0.0)

            # Send images to LLM Vision for type detection
            result = await self._detect_type_from_images(images, filename)
            return result

        except Exception as e:
            logger.error(f"Error detecting document type: {e}")
            return self._get_type_info("unknown", 0.0, error=str(e))

    def _is_image_file(self, filename: str, file_bytes: bytes) -> bool:
        """Check if file is an image based on filename or magic bytes."""
        # Check by filename extension
        if filename:
            ext = filename.lower().split('.')[-1] if '.' in filename else ''
            if ext in {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'}:
                return True
        
        # Check by magic bytes
        if file_bytes[:8].startswith(b'\x89PNG'):
            return True
        if file_bytes[:2] == b'\xff\xd8':  # JPEG
            return True
        if file_bytes[:6] in (b'GIF87a', b'GIF89a'):
            return True
        if len(file_bytes) > 12 and file_bytes[:4] == b'RIFF' and file_bytes[8:12] == b'WEBP':
            return True
        
        return False

    async def _convert_pdf_to_images(self, pdf_bytes: bytes) -> List[bytes]:
        """
        Convert first 2 pages of PDF to images.

        Args:
            pdf_bytes: PDF file content

        Returns:
            List of PNG image bytes for first 2 pages
        """
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            images = []

            # Process only first 2 pages
            pages_to_process = min(2, len(doc))
            
            for page_num in range(pages_to_process):
                page = doc[page_num]
                # Render page to image at 2x scale for better quality
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                # Convert to PNG bytes
                png_bytes = pix.tobytes("png")
                images.append(png_bytes)
                logger.info(f"Converted page {page_num + 1} to image ({len(png_bytes)} bytes)")

            doc.close()
            return images

        except Exception as e:
            logger.error(f"Error converting PDF to images: {e}")
            return []

    async def _detect_type_from_images(self, images: List[bytes], filename: str) -> Dict[str, Any]:
        """
        Detect document type from images using LLM Vision with Pydantic schema.

        Args:
            images: List of image bytes (1 or 2 pages)
            filename: Original filename

        Returns:
            Detection result with confidence
        """
        try:
            # Use first image for detection (usually enough)
            image_bytes = images[0]
            
            # Convert to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Get MIME type
            mime_type = self._get_mime_type(image_bytes)
            
            # Create prompt
            prompt = self._create_prompt(filename, len(images))
            
            # Create image data URL
            image_data = f"data:{mime_type};base64,{base64_image}"
            
            # Call LLM Vision API with document_type_detection task
            # The LLM client will use the native Gemini schema defined in extraction_schemas.py
            response = await self.llm_client.call_api(
                prompt=prompt,
                image_data=image_data,
                response_format={},
                task="document_type_detection",
                document_name=filename
            )

            # Parse response - Gemini's native schema guarantees valid JSON structure
            result = self._parse_response(response)
            logger.info(f"Detected type: {result['document_type']} (confidence: {result['confidence']})")
            return result

        except Exception as e:
            logger.error(f"Vision detection failed: {e}")
            return self._get_type_info("unknown", 0.3)

    def _get_mime_type(self, image_bytes: bytes) -> str:
        """Get MIME type from image bytes."""
        if image_bytes[:8].startswith(b'\x89PNG'):
            return "image/png"
        if image_bytes[:2] == b'\xff\xd8':
            return "image/jpeg"
        if image_bytes[:6] in (b'GIF87a', b'GIF89a'):
            return "image/gif"
        if len(image_bytes) > 12 and image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
            return "image/webp"
        return "image/png"  # Default for converted PDF pages

    def _create_prompt(self, filename: str, num_pages: int) -> str:
        """Create prompt for document type detection."""
        return f"""Analyze this document image and determine its type.

Filename: {filename}
Pages shown: {num_pages}

Look at the document and identify:
- Official headers, logos, or watermarks
- Document structure and layout  
- Key identifying information or fields
- Document format characteristics

Use a descriptive slug format (lowercase, hyphens) for the document_type field.
Examples: pan-card, aadhaar-card, passport, bank-statement, invoice, salary-slip, form-16
"""

    def _parse_response(self, response: Any) -> Dict[str, Any]:
        """
        Parse LLM response to extract document type.
        
        With Gemini's native response_schema, the response is guaranteed to be
        valid JSON with document_type, confidence, and reason fields.
        """
        try:
            # Handle different response formats from LLM client
            data = None
            
            # If response is already a dict with our expected fields
            if isinstance(response, dict):
                if 'document_type' in response:
                    data = response
                # Check nested structures
                elif 'content' in response:
                    content = response['content']
                    if isinstance(content, str):
                        data = json.loads(content)
                    elif isinstance(content, dict):
                        data = content
                elif 'text' in response:
                    data = json.loads(response['text'])
                elif 'choices' in response and response['choices']:
                    msg_content = response['choices'][0].get('message', {}).get('content', '')
                    if isinstance(msg_content, str):
                        data = json.loads(msg_content)
                    elif isinstance(msg_content, dict):
                        data = msg_content
                # If dict has fields but no document_type, try parsing as JSON string
                elif 'fields' in response and response['fields']:
                    # This is the extraction format - shouldn't happen with proper schema
                    logger.warning("Received extraction format instead of type detection format")
                    return self._get_type_info("unknown", 0.3)
                else:
                    # Try to find document_type in any nested dict
                    data = response
            
            # If response is a string, parse as JSON
            elif isinstance(response, str):
                # Clean markdown code blocks if present
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[-1]  # Remove first line
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                data = json.loads(cleaned.strip())
            
            if data is None:
                logger.error(f"Could not parse response: {type(response)}")
                return self._get_type_info("unknown", 0.3)
            
            # Extract fields from parsed data
            doc_type = data.get("document_type", "unknown")
            confidence = float(data.get("confidence", 0.5))
            
            # Normalize to slug format
            doc_type = doc_type.lower().replace(" ", "-").replace("_", "-")
            
            # Low confidence fallback
            if confidence < 0.3:
                doc_type = "unknown"
                confidence = 0.3
            
            return self._get_type_info(doc_type, confidence)

        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            logger.error(f"Failed to parse LLM response: {e}")
            logger.error(f"Response type: {type(response)}, Response: {str(response)[:500]}")
            return self._get_type_info("unknown", 0.3)

    def _get_type_info(
        self,
        doc_type: str,
        confidence: float,
        error: str = None
    ) -> Dict[str, Any]:
        """Build type information dict."""
        display_name = doc_type.replace("-", " ").title()

        result = {
            "document_type": doc_type,
            "display_name": display_name,
            "icon": "FileText",
            "color": "#6366f1",
            "confidence": confidence,
            "bucket_name": "documents"  # All documents use single bucket
        }

        if error:
            result["error"] = error

        return result

    def get_all_document_types(self) -> list[Dict[str, Any]]:
        """Returns empty list - types are determined dynamically by LLM."""
        return []
    async def extract_document_fields(
        self,
        storage_path: str,
        document_type: str,
        schema: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Extract structured fields from document based on schema.
        
        Args:
            storage_path: Path to document in storage
            document_type: Type of document (invoice, po, contract, etc.)
            schema: Field schema defining what to extract
            
        Returns:
            Dict with extracted field values, or None if extraction fails
        """
        try:
            logger.info(f"Extracting fields for document type: {document_type}")
            
            if not self.llm_client:
                logger.warning("No LLM client available for field extraction")
                return None
            
            # Get document bytes from storage
            # NOTE: In production, fetch from Supabase storage
            # For now, assuming we have the file bytes
            try:
                from supabase import create_client
                import os
                
                supabase_url = os.environ.get("SUPABASE_URL")
                supabase_key = os.environ.get("SUPABASE_KEY")
                
                if not supabase_url or not supabase_key:
                    logger.error("Supabase credentials not configured")
                    return None
                
                supabase = create_client(supabase_url, supabase_key)
                
                # Download file from Supabase storage
                bucket_name = "documents"
                file_data = supabase.storage.from_(bucket_name).download(storage_path)
                file_bytes = file_data
                
            except Exception as e:
                logger.error(f"Error downloading document from storage: {e}")
                return None
            
            # Convert PDF to images (reuse existing method)
            if self._is_image_file(storage_path, file_bytes):
                images = [file_bytes]
            else:
                images = await self._convert_pdf_to_images(file_bytes)
                
            if not images:
                logger.warning("Could not convert document to images for extraction")
                return None
            
            # Build extraction prompt based on schema
            prompt = self._build_extraction_prompt(document_type, schema)
            
            # Call LLM Vision to extract fields
            extracted_data = await self._extract_fields_from_images(images, prompt, schema)
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"Error extracting document fields: {e}")
            return None
    
    def _build_extraction_prompt(self, document_type: str, schema: Dict[str, Any]) -> str:
        """Build prompt for field extraction based on schema."""
        
        fields_description = []
        required_fields = []
        
        for field_name, field_config in schema.get("fields", {}).items():
            field_type = field_config.get("type")
            label = field_config.get("label", field_name)
            required = field_config.get("required", False)
            
            if required:
                required_fields.append(label)
            
            fields_description.append(f"- {label} ({field_type})")
        
        prompt = f"""You are an AI assistant specialized in extracting structured data from {schema.get('display_name', document_type)} documents.

Analyze this document image and extract the following fields:

{chr(10).join(fields_description)}

REQUIRED FIELDS: {', '.join(required_fields) if required_fields else 'None'}

Instructions:
1. Extract ALL visible fields accurately
2. For dates, use YYYY-MM-DD format
3. For amounts, extract numeric values only (no currency symbols)
4. For line items/arrays, extract all rows
5. If a field is not visible or unclear, return null for that field
6. Return ONLY valid JSON matching the schema

Return the extracted data as a JSON object."""
        
        return prompt
    
    async def _extract_fields_from_images(
        self,
        images: List[bytes],
        prompt: str,
        schema: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Extract fields from images using LLM Vision."""
        try:
            # Encode images as base64
            import base64
            encoded_images = []
            for img_bytes in images[:2]:  # Use first 2 pages
                b64_image = base64.b64encode(img_bytes).decode('utf-8')
                encoded_images.append(b64_image)
            
            # Call LLM with images and extraction prompt
            # NOTE: Implementation depends on your LLM client interface
            # This is a simplified version
            response = await self.llm_client.extract_fields(
                images=encoded_images,
                prompt=prompt,
                schema=schema
            )
            
            # Parse response
            if isinstance(response, dict):
                return response
            elif isinstance(response, str):
                # Try to parse as JSON
                try:
                    data = json.loads(response.strip())
                    return data
                except json.JSONDecodeError:
                    logger.error(f"Could not parse extraction response as JSON")
                    return None
            else:
                logger.error(f"Unexpected response type: {type(response)}")
                return None
                
        except Exception as e:
            logger.error(f"Error in field extraction: {e}")
            return None
    
    async def extract_fields_from_analysis(
        self,
        analysis_result: Dict[str, Any],
        extracted_text: Optional[str],
        document_type: str,
        schema: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Extract structured fields from EXISTING analysis_result (from RAG system).
        This avoids re-processing documents that were already analyzed during upload.
        
        PERFORMANCE OPTIMIZATION: Reuses existing document analysis instead of
        downloading and re-processing PDFs, saving API calls and processing time.
        
        Args:
            analysis_result: The analysis_result JSON from documents table (RAG extraction)
            extracted_text: The extracted_text from documents table (optional)
            document_type: Type of document (invoice, purchase-order, etc.)
            schema: Field schema for extraction
            
        Returns:
            Dictionary of extracted field values
        """
        try:
            logger.info(f"♻️  Extracting structured fields from existing analysis for {document_type}")
            
            # Build extraction prompt from schema
            prompt = self._build_extraction_prompt(document_type, schema)
            
            # Add context from existing analysis
            prompt += "\n\n## DOCUMENT ANALYSIS DATA:\n"
            prompt += json.dumps(analysis_result, indent=2)
            
            if extracted_text:
                prompt += f"\n\n## EXTRACTED TEXT:\n{extracted_text[:5000]}"  # First 5000 chars
            
            prompt += "\n\nBased on the above analysis data, extract the requested fields and return as JSON."
            
            # Call LLM with text-only (no images needed since we have the analysis)
            if not self.llm_client:
                logger.error("No LLM client available")
                return None
                
            response = await self.llm_client.call_api(
                prompt=prompt,
                image_data=None,  # No image needed - we have the analysis!
                response_format={},
                task="structured_field_extraction",
                document_name=document_type
            )
            
            # Parse and return extracted fields
            fields = self._parse_extraction_response(response, schema)
            if fields:
                logger.info(f"✅ Extracted {len(fields)} fields from existing analysis")
            else:
                logger.warning("⚠️  Failed to extract fields from analysis")
            return fields
            
        except Exception as e:
            logger.error(f"Error extracting fields from analysis: {e}")
            return None
    
    async def extract_fields_dynamic(
        self,
        analysis_result: Dict[str, Any],
        extracted_text: Optional[str],
        document_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        DYNAMIC EXTRACTION: Extract key fields from ANY document type without requiring a schema.
        This is the fallback for documents that don't have predefined schemas.
        
        Production-ready approach:
        - Works for any document type automatically
        - Extracts common fields intelligently
        - No manual schema creation needed
        
        Args:
            analysis_result: The analysis_result JSON from documents table
            extracted_text: The extracted_text from documents table
            document_type: Type of document (for context)
            
        Returns:
            Dictionary of extracted fields (any relevant fields found)
        """
        try:
            logger.info(f"🔄 Dynamic extraction for {document_type} (no schema required)")
            
            # Build intelligent extraction prompt
            prompt = f"""You are a professional data extraction specialist. Extract COMPREHENSIVE information from this {document_type} document.

CRITICAL INSTRUCTIONS:
1. Read through the ENTIRE document content provided below
2. Extract EVERY piece of business-relevant information you can find
3. Be thorough - don't skip any details
4. Use clear, descriptive field names (use underscores for spaces)
5. Organize related data in nested objects or arrays
6. Do NOT include null values - omit fields that are not present

REQUIRED CATEGORIES TO EXTRACT (extract ALL that apply):

📋 Document Identification:
- All document numbers (invoice_number, po_number, contract_number, reference_number, confirmation_number, etc.)
- Document dates (issue_date, invoice_date, due_date, delivery_date, start_date, end_date, booking_date, etc.)
- Document status (if present)

👥 Parties and Entities:
- All party names (vendor_name, client_name, buyer, seller, supplier, customer, passenger_name, etc.)
- All addresses (vendor_address, client_address, billing_address, shipping_address, etc.)
- All contact information (email, phone, fax, mobile, website, etc.)
- Tax IDs, registration numbers, GST numbers, etc.

💰 Financial Information:
- All amounts (total_amount, subtotal, tax_amount, discount, shipping_cost, grand_total, balance_due, etc.)
- Currency
- Payment terms (net_30, payment_due_date, payment_method, etc.)
- Bank details (if present)

📦 Items/Products/Services:
- Line items with ALL details:
  * Item description/name
  * Quantity
  * Unit price
  * Total price
  * SKU/Product code
  * Tax per item
  * Any other item-specific details

✈️ Transaction Details (for bookings, travel, etc.):
- Flight/train/booking details
- Origin and destination
- Dates and times
- Booking codes/PNRs
- Seat/class information

📝 Terms and Conditions:
- Payment terms
- Delivery terms
- Warranty information
- Special conditions or notes
- Cancellation policies

🔖 Additional Details:
- Any other relevant business information
- Notes, comments, or special instructions
- Signatures or approvals (if mentioned)
- Department or cost center codes

OUTPUT FORMAT:
Return a comprehensive JSON object with ALL extracted information organized logically.
Use nested objects for related data and arrays for multiple items.

DOCUMENT CONTENT TO ANALYZE:

## ANALYSIS DATA:
{json.dumps(analysis_result, indent=2) if analysis_result else "No analysis data"}
"""
            
            if extracted_text:
                # Use substantial text sample for comprehensive extraction
                text_sample = extracted_text[:50000] if len(extracted_text) > 50000 else extracted_text
                prompt += f"\n\n## FULL DOCUMENT TEXT:\n{text_sample}"
                
                if len(extracted_text) > 50000:
                    prompt += f"\n\n[Document continues for {len(extracted_text) - 50000} more characters]"
            
            prompt += "\n\nNow extract ALL relevant information as a comprehensive, well-organized JSON object:"
            
            # Call LLM
            if not self.llm_client:
                logger.error("No LLM client available")
                return None
                
            response = await self.llm_client.call_api(
                prompt=prompt,
                image_data=None,
                response_format={},
                task="dynamic_field_extraction",
                document_name=document_type
            )
            
            # Parse response
            if isinstance(response, dict):
                extracted = response
            elif isinstance(response, str):
                try:
                    # Try to extract JSON from response
                    import re
                    json_match = re.search(r'\{.*\}', response, re.DOTALL)
                    if json_match:
                        extracted = json.loads(json_match.group())
                    else:
                        extracted = json.loads(response.strip())
                except json.JSONDecodeError:
                    logger.error("Could not parse dynamic extraction response")
                    return None
            else:
                logger.error(f"Unexpected response type: {type(response)}")
                return None
            
            if extracted and isinstance(extracted, dict):
                logger.info(f"✅ Dynamically extracted {len(extracted)} fields from {document_type}")
                return extracted
            else:
                logger.warning("⚠️  No fields extracted dynamically")
                return None
                
        except Exception as e:
            logger.error(f"Error in dynamic field extraction: {e}")
            return None

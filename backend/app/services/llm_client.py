"""
LLM Client Service
Handles all interactions with LiteLLM API
"""

import json
import logging
import httpx
import os
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class LLMClient:
    """Client for making requests to LiteLLM API"""
    
    def __init__(self):
        env_vars = self._load_env()
        
        if not env_vars["LITELLM_API_URL"] or not env_vars["LITELLM_API_KEY"]:
            raise RuntimeError("Missing LITELLM_API_URL or LITELLM_API_KEY in backend/.env")
        
        self.litellm_api_url = env_vars["LITELLM_API_URL"]
        self.litellm_api_key = env_vars["LITELLM_API_KEY"]
        self.litellm_header_name = env_vars["LITELLM_HEADER_NAME"]
        self.litellm_auth_scheme = env_vars["LITELLM_AUTH_SCHEME"]
        
        # Model configuration - read from .env
        self.extraction_model = os.getenv("EXTRACTION_MODEL", "openrouter/google/gemini-2.5-flash")
        
        logger.info(f"🤖 LLM Client initialized - Model: {self.extraction_model}")

    def _load_env(self):
        """Load environment variables from backend/.env file"""
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        env_file_path = os.path.join(backend_dir, ".env")
        load_dotenv(env_file_path)
        
        return {
            "LITELLM_API_URL": os.getenv("LITELLM_API_URL"),
            "LITELLM_API_KEY": os.getenv("LITELLM_API_KEY"),
            "LITELLM_HEADER_NAME": os.getenv("LITELLM_HEADER_NAME", "Authorization"),
            "LITELLM_AUTH_SCHEME": os.getenv("LITELLM_AUTH_SCHEME", "Bearer")
        }

    def _normalize_model_name(self, model_name: str) -> str:
        """Normalize model name using aliases"""
        return model_name

    def _prepare_request_body(self, prompt: str, image_data: str, response_format: Dict[str, Any], document_name: Optional[str] = None) -> Dict[str, Any]:
        """Prepare request body for LiteLLM API"""
        model = self._normalize_model_name(self.extraction_model)
        
        request_body = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_data}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 32000,  # Reduced from 45000 for Azure compatibility
            "temperature": 0.1,
            "response_format": response_format
        }
        
        if document_name:
            request_body["messages"][0]["content"][0]["text"] = f"Document: {document_name}\n\n{prompt}"
        
        return request_body

    async def _call_api_with_retry(self, request_body: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
        """Call LiteLLM API with retry logic for network issues"""
        last_exception = None
        
        for attempt in range(max_retries):
            try:
                logger.info(f"🌐 Making LiteLLM API call (attempt {attempt + 1}/{max_retries})")
                
                async with httpx.AsyncClient(timeout=120.0) as client:
                    headers = {
                        "Content-Type": "application/json",
                        self.litellm_header_name: f"{self.litellm_auth_scheme} {self.litellm_api_key}"
                    }
                    
                    response = await client.post(
                        self.litellm_api_url,
                        json=request_body,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.info("✅ LiteLLM API call successful")
                        return result
                    else:
                        error_msg = f"API call failed with status {response.status_code}: {response.text}"
                        logger.error(f"❌ {error_msg}")
                        raise HTTPException(status_code=response.status_code, detail=error_msg)
                        
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, 
                   httpx.ConnectError, httpx.RemoteProtocolError) as e:
                last_exception = e
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"⚠️ Network error on attempt {attempt + 1}: {e}")
                logger.info(f"⏳ Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                raise e
        
        # If all retries failed, raise the last network exception
        logger.error(f"❌ All {max_retries} attempts failed")
        raise last_exception

    async def call_api(self, prompt: str, image_data: str, response_format: Dict[str, Any], 
                      document_name: Optional[str] = None) -> Dict[str, Any]:
        """Make API call to LiteLLM"""
        request_body = self._prepare_request_body(prompt, image_data, response_format, document_name)
        result = await self._call_api_with_retry(request_body)
        return result

    async def generate_completion_with_image(self, prompt: str, image_url: str, 
                                            temperature: float = 0.3, max_tokens: int = 150) -> str:
        """
        Generate a text completion for a prompt with an image (vision task).
        For signature verification and other image analysis tasks.
        """
        try:
            logger.info(f"Generating completion with image, max_tokens={max_tokens}, temp={temperature}")
            
            # Extract base64 from data URL if needed
            image_data = image_url.split(",")[1] if "," in image_url else image_url
            
            request_body = {
                "model": self._normalize_model_name(self.extraction_model),
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_data}"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": max_tokens,
                "temperature": temperature
            }
            
            result = await self._call_api_with_retry(request_body)
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            logger.info(f"Vision completion response: {content[:200]}")
            return content
            
        except Exception as e:
            logger.error(f"Error generating completion with image: {e}")
            raise

    async def generate_text_completion(self, prompt: str, max_tokens: int = 500) -> str:
        """
        Generate text completion without image (for migration summaries, etc).
        """
        try:
            logger.info(f"Generating text completion, max_tokens={max_tokens}")
            
            request_body = {
                "model": self._normalize_model_name(self.extraction_model),
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "max_tokens": max_tokens,
                "temperature": 0.3
            }
            
            result = await self._call_api_with_retry(request_body)
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            logger.info(f"Text completion response: {content[:200]}")
            return content
            
        except Exception as e:
            logger.error(f"Error generating text completion: {e}")
            raise

    def process_api_result(self, result: Dict[str, Any], task: str) -> Dict[str, Any]:
        """Process API result and handle JSON parsing"""
        try:
            content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            if not content:
                logger.error("❌ Empty response from LLM")
                raise ValueError("Empty response from LLM")
            
            # Log the complete raw LLM response
            logger.info(f"🔍 COMPLETE LLM JSON RESPONSE for task '{task}':")
            logger.info(f"Raw response content: {content}")
            logger.info(f"Raw response length: {len(content)} characters")
            
            try:
                parsed_result = json.loads(content)
                logger.info(f"✅ Successfully parsed JSON response for task: {task}")
                logger.info(f"📋 Parsed JSON structure: {json.dumps(parsed_result, indent=2)}")
                
                # Normalize structure so frontend always receives {"fields": [...]} when appropriate
                normalized_result = self._normalize_result_structure(parsed_result, task)
                logger.info(f"🔄 Normalized result structure: {json.dumps(normalized_result, indent=2)}")
                return normalized_result
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse JSON response: {e}")
                logger.error(f"Raw AI response (first 500 chars): {content[:500]}")
                logger.error(f"Raw AI response (last 500 chars): {content[-500:]}")
                raise ValueError(f"Failed to parse JSON response from AI: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error processing API result: {e}")
            raise

    def _normalize_result_structure(self, parsed_result: Any, task: str = None) -> Dict[str, Any]:
        """Convert various model outputs into a consistent structure based on task type"""
        try:
            # For without_template_extraction, preserve the simple JSON structure but wrap it for frontend
            if task == "without_template_extraction" and isinstance(parsed_result, dict):
                logger.info("🎯 Preserving simple JSON structure for without_template_extraction")
                # Convert simple JSON structure to fields array format for frontend compatibility
                fields = []
                for idx, (key, value) in enumerate(parsed_result.items(), start=1):
                    fields.append({
                        "id": str(idx),
                        "label": key,
                        "type": "text",
                        "value": json.dumps(value) if isinstance(value, (dict, list)) else str(value),
                        "confidence": 0.85
                    })
                logger.info(f"🔄 Converted {len(fields)} sections to fields array format")
                return {"fields": fields}
            
            # Handle other task types
            if isinstance(parsed_result, dict):
                if "fields" in parsed_result:
                    # Already in correct format
                    return parsed_result
                else:
                    # Convert dict to fields format
                    fields = []
                    for idx, (key, value) in enumerate(parsed_result.items(), start=1):
                        fields.append({
                            "id": str(idx),
                            "label": key,
                            "type": "text",
                            "value": str(value),
                            "confidence": 0.85
                        })
                    return {"fields": fields}
            
            elif isinstance(parsed_result, list):
                # List of fields
                return {"fields": parsed_result}
            
            else:
                # Single value or unexpected format
                return {"fields": [{"id": "1", "label": "result", "type": "text", "value": str(parsed_result), "confidence": 0.85}]}
                
        except Exception as e:
            logger.error(f"Error normalizing result structure: {e}")
            return {"fields": []}

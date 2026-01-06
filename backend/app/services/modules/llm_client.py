"""
LLM Client Service
Handles all interactions with LLM APIs through LiteLLM
"""

import json
import logging
import httpx
import requests
import os
import asyncio
import time
import re
import threading
from typing import Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
from dotenv import load_dotenv
from ...core.config import settings

logger = logging.getLogger(__name__)

# LiteLLM's JSONSchemaValidationError (if using strict validation)
try:
    from litellm import JSONSchemaValidationError
except ImportError:
    # Fallback if litellm not installed or old version
    class JSONSchemaValidationError(Exception):
        def __init__(self, message, raw_response=None):
            super().__init__(message)
            self.raw_response = raw_response

# Try to import Google Generative AI SDK
try:
    from google import genai
    GEMINI_SDK_AVAILABLE = True
except ImportError:
    GEMINI_SDK_AVAILABLE = False
    genai = None

class LLMClient:
    """Client for making requests to LLM APIs through LiteLLM or direct Gemini API"""
    
    def __init__(self):
        env_vars = self._load_env()
        
        # Determine which provider to use
        self.provider = os.getenv("LLM_PROVIDER", "litellm").lower()
        
        if self.provider == "gemini_direct":
            # Use direct Gemini API
            gemini_api_key = os.getenv("GEMINI_API_KEY", "")
            if not gemini_api_key:
                raise RuntimeError("Missing GEMINI_API_KEY in backend/.env for gemini_direct provider")
            if not GEMINI_SDK_AVAILABLE:
                raise RuntimeError("google-genai package not installed. Run: pip install google-genai")
            
            # Configure Gemini SDK with new Client API
            self.gemini_client = genai.Client(api_key=gemini_api_key)
            # Read model from environment variable, default to gemini-2.5-flash
            self.gemini_model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
            self.extraction_model = self.gemini_model_name
            logger.info(f"🔧 Using Direct Gemini API provider ({self.gemini_model_name})")
            
            # Set dummy values for LiteLLM (not used)
            self.litellm_api_url = ""
            self.litellm_api_key = ""
            self.litellm_header_name = ""
            self.litellm_auth_scheme = ""
        else:
            # Use LiteLLM provider (default)
            if not env_vars["LITELLM_API_URL"] or not env_vars["LITELLM_API_KEY"]:
                raise RuntimeError("Missing LITELLM_API_URL or LITELLM_API_KEY in backend/.env")
            
            self.litellm_api_url = env_vars["LITELLM_API_URL"]
            self.litellm_api_key = env_vars["LITELLM_API_KEY"]
            self.litellm_header_name = env_vars["LITELLM_HEADER_NAME"]
            self.litellm_auth_scheme = env_vars["LITELLM_AUTH_SCHEME"]
            self.gemini_client = None
            self.gemini_model_name = None
            logger.info("🔧 Using LiteLLM provider")
            
            # Model configuration - read from .env
            self.extraction_model = os.getenv("EXTRACTION_MODEL", "openrouter/google/gemini-2.5-flash")
        
        # HTTP client with connection pooling (lazy initialization)
        self._http_client: Optional[httpx.AsyncClient] = None
        
        # Thread-local storage for HTTP sessions (each thread gets its own session)
        # This prevents thread contention when multiple threads make concurrent requests
        self._thread_local = threading.local()
        
        # Global session for backward compatibility (used when thread-local not needed)
        self._sync_session: Optional[requests.Session] = None
        self._current_pool_maxsize: Optional[int] = None
        
        # LangSmith tracing configuration (check after loading env)
        langsmith_tracing_env = os.getenv("LANGSMITH_TRACING", "false").lower()
        self.langsmith_enabled = langsmith_tracing_env == "true"
        
        # Import LangSmith only if tracing is enabled
        self.traceable = None
        if self.langsmith_enabled:
            try:
                from langsmith import traceable
                self.traceable = traceable
                
                # Check for required LangSmith environment variables
                langchain_api_key = os.getenv("LANGCHAIN_API_KEY") or os.getenv("LANGSMITH_API_KEY")
                langchain_tracing_v2 = os.getenv("LANGCHAIN_TRACING_V2", "false").lower()
                langchain_project = os.getenv("LANGCHAIN_PROJECT") or os.getenv("LANGSMITH_PROJECT")
                
                if not langchain_api_key:
                    logger.warning("⚠️ LangSmith tracing enabled but LANGCHAIN_API_KEY or LANGSMITH_API_KEY not set. Traces may not be sent.")
                    self.langsmith_enabled = False
                elif langchain_tracing_v2 != "true":
                    logger.warning("⚠️ LangSmith tracing enabled but LANGCHAIN_TRACING_V2 not set to 'true'. Setting it now.")
                    os.environ["LANGCHAIN_TRACING_V2"] = "true"
                
                if langchain_project:
                    logger.info(f"📊 LangSmith tracing enabled - Project: {langchain_project}")
                else:
                    logger.info("📊 LangSmith tracing enabled (no project name set)")
            except ImportError:
                logger.warning("⚠️ LangSmith not installed. Install with: pip install langsmith")
                self.langsmith_enabled = False
                logger.info("📊 LangSmith tracing disabled (package not installed)")
        else:
            logger.info("📊 LangSmith tracing disabled (set LANGSMITH_TRACING=true to enable)")
        
        logger.info(f"🤖 LLM Client initialized - Model: {self.extraction_model}")

    def _load_env(self):
        """Load environment variables from backend/.env file"""
        # Go up 4 levels from modules/ to reach backend/
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        env_file_path = os.path.join(backend_dir, ".env")
        load_dotenv(env_file_path)
        
        return {
            "LITELLM_API_URL": os.getenv("LITELLM_API_URL", ""),
            "LITELLM_API_KEY": os.getenv("LITELLM_API_KEY", ""),
            "LITELLM_HEADER_NAME": os.getenv("LITELLM_HEADER_NAME", "Authorization"),
            "LITELLM_AUTH_SCHEME": os.getenv("LITELLM_AUTH_SCHEME", "Bearer")
        }
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """
        Get or create HTTP client with connection pooling
        Reuses connections to reduce latency and improve performance
        
        Thread-safe initialization to prevent race conditions during parallel processing
        
        Returns:
            Reusable httpx.AsyncClient instance
        """
        if self._http_client is None:
            # Use a lock to prevent multiple coroutines from creating clients simultaneously
            if not hasattr(self, '_client_lock'):
                self._client_lock = asyncio.Lock()
            
            async with self._client_lock:
                # Double-check after acquiring lock (common pattern for lazy initialization)
                if self._http_client is None:
                    limits = httpx.Limits(
                        max_keepalive_connections=20,
                        max_connections=100,
                        keepalive_expiry=30.0
                    )
                    self._http_client = httpx.AsyncClient(
                        timeout=120.0,
                        limits=limits
                    )
                    logger.debug("🌐 Created HTTP client with connection pooling")
        return self._http_client
    
    async def close(self):
        """
        Close HTTP client (call on shutdown or when done processing)
        This should be called to properly clean up connections
        """
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None
            logger.debug("🔌 Closed HTTP client")


    
    def _prepare_request_body(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """
        Prepare request body for LiteLLM API
        
        Args:
            content_type: "text" or "image" - determines how to handle the input data
        """
        # LiteLLM/OpenRouter handles response format conversion internally
        return self._prepare_litellm_request_body(prompt, image_data, response_format, document_name, content_type)
    
    def _prepare_litellm_request_body(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """Prepare request body for LiteLLM API using chat/completions format (supports images and text)"""
        # Use the same model from EXTRACTION_MODEL for both text and image requests
        model = self.extraction_model
        
        # Prepare content array
        if content_type == "text":
            # For text input, include the extracted text in the prompt
            text_content = image_data if image_data else ""  # image_data contains text when content_type is "text"
            # Build full prompt with document name if provided
            if document_name:
                full_prompt = f"Document: {document_name}\n\n{prompt}\n\nExtracted Text Content:\n{text_content}"
            else:
                full_prompt = f"{prompt}\n\nExtracted Text Content:\n{text_content}"
            
            content = [
                {
                    "type": "text",
                    "text": full_prompt
                }
            ]
        else:
            # For image input, use the standard format
            prompt_text = prompt
            if document_name:
                prompt_text = f"Document: {document_name}\n\n{prompt}"
            
            content = [
                {
                    "type": "text",
                    "text": prompt_text
                }
            ]
        
        # Add image only if image_data is provided, not empty, and content_type is "image"
        # When content_type is "text", image_data contains the extracted text (already included in prompt)
        if content_type == "image" and image_data and image_data.strip():
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": image_data
                }
            })
        
        # Always use chat/completions format for vision support
        request_body = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": content
                }
            ],
            # Increased max_tokens to accommodate reasoning tokens + response (Gemini 2.5 Pro uses ~7-8K for reasoning)
            "max_tokens": 32000,
            "temperature": 0.1,
            "response_format": response_format
        }
        
        return request_body

    async def _call_api_with_retry(self, request_body: Dict[str, Any], api_url: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Call LLM API with retry logic for network issues
        Uses connection pooling for improved performance
        """
        last_exception = None
        client = await self._get_http_client()  # Reuse HTTP client with connection pooling
        
        # Prepare headers for LiteLLM
        headers = {
            "Content-Type": "application/json",
            self.litellm_header_name: f"{self.litellm_auth_scheme} {self.litellm_api_key}"
        }
        provider_name = "LiteLLM"
        
        for attempt in range(max_retries):
            try:
                logger.debug(f"🌐 Making {provider_name} API call (attempt {attempt + 1}/{max_retries}) to {api_url}")
                
                # Model logging only (request body keys removed to reduce log size)
                if "model" in request_body:
                    logger.debug(f"🔍 Model: {request_body.get('model')}")
                    
                    # Fix: Add timeout to async HTTP calls to prevent blocking
                    response = await client.post(
                        api_url,
                        json=request_body,
                        headers=headers,
                        timeout=90.0  # 90 second timeout per request
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        logger.debug(f"✅ {provider_name} API call successful on endpoint: {api_url}")
                        return result
                    else:
                        error_msg = f"API call failed with status {response.status_code}: {response.text}"
                        logger.error(f"❌ {error_msg}")
                        # Return a more user-friendly error instead of raising HTTPException
                        raise Exception(f"LLM API Error: {response.status_code} - {response.text}")
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, 
                   httpx.ConnectError, httpx.RemoteProtocolError) as e:
                last_exception = e
                wait_time = 2 ** attempt  # Exponential backoff
                logger.warning(f"⚠️ Network error on attempt {attempt + 1}: {e}")
                logger.debug(f"⏳ Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                logger.error(f"❌ Error type: {type(e).__name__}")
                # If it's not a network error, don't retry
                if not isinstance(e, (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.WriteTimeout, httpx.ConnectError, httpx.RemoteProtocolError)):
                    raise e
                last_exception = e
        
        # If all retries failed, raise the last exception
        logger.error(f"❌ All retries failed for endpoint: {api_url}")
        raise last_exception or Exception(f"All retries failed for endpoint: {api_url}")

    async def call_api(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                      task: str, document_name: Optional[str] = None) -> Dict[str, Any]:
        """Make API call to LLM provider with optional LangSmith monitoring"""
        start_time = time.time()
        
        # Determine which model will be used
        model_to_use = self.extraction_model
        
        # Determine content type based on whether image_data is provided
        content_type = "image" if image_data and image_data.strip() else "text"
        
        # Extract page number from document_name if present (format: "Document.pdf (page X)")
        page_number = None
        trace_name = f"llm_call_{task}"
        if document_name:
            # Look for pattern like "(page 5)" or "(page 1)" in document_name
            page_match = re.search(r'\(page\s+(\d+)\)', document_name, re.IGNORECASE)
            if page_match:
                page_number = int(page_match.group(1))
                trace_name = f"llm_call_{task}_page_{page_number}"
        
        # Route to appropriate provider
        if self.provider == "gemini_direct":
            # Use synchronous Gemini direct API in a thread pool to avoid blocking
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                ThreadPoolExecutor(max_workers=1),
                self._execute_call_sync,
                prompt, image_data, response_format, task, document_name, start_time, model_to_use, content_type, page_number, trace_name
            )
        else:
            # Use async LiteLLM for other providers
            return await self._execute_call(prompt, image_data, response_format, task, document_name, start_time, model_to_use, page_number, trace_name)
    
    async def _execute_call(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                           task: str, document_name: Optional[str],
                           start_time: float, model_to_use: str, page_number: Optional[int] = None, trace_name: Optional[str] = None) -> Dict[str, Any]:
        """Execute the actual LLM API call for LiteLLM provider (async flow)"""
        try:
            # This method is only called for LiteLLM provider (routing done in call_api)
            # Validate LiteLLM API URL is configured
            if not self.litellm_api_url or self.litellm_api_url.strip() == "":
                raise ValueError("LiteLLM API URL is empty or not configured. Set LITELLM_API_URL in backend/.env")
            
            base_url = self.litellm_api_url.rstrip('/')
            # Allow LITELLM_API_URL to be configured as:
            # - base host only: https://proxyllm.ximplify.id
            # - API root:       https://proxyllm.ximplify.id/v1
            # - full endpoint:  https://proxyllm.ximplify.id/v1/chat/completions
            if re.search(r"/chat/completions$", base_url):
                api_url = base_url
            elif re.search(r"/v1$", base_url):
                api_url = f"{base_url}/chat/completions"
            else:
                api_url = f"{base_url}/v1/chat/completions"
            
            logger.debug(f"🔍 Using LiteLLM endpoint: {api_url}")
            
            # Prepare request body (provider-specific format) - NOT included in LangSmith timing
            request_body = self._prepare_request_body(prompt, image_data, response_format, document_name)
            
            # Wrap only the HTTP request with LangSmith tracing (pure LLM response time)
            if self.langsmith_enabled and self.traceable:
                metadata = {
                    "task": task,
                    "model": model_to_use,
                    "document_name": document_name or "unknown",
                    "has_image": bool(image_data)
                }
                if page_number is not None:
                    metadata["page_number"] = page_number
                
                tags = [task, model_to_use]
                if page_number is not None:
                    tags.append(f"page_{page_number}")
                
                @self.traceable(
                    name=trace_name or f"llm_call_{task}",
                    run_type="llm",
                    tags=tags,
                    metadata=metadata
                )
                async def _traced_http_call():
                    # This traces ONLY the HTTP request/response time
                    return await self._call_api_with_retry(request_body, api_url)
                
                result = await _traced_http_call()
            else:
                # No LangSmith tracing - just make the call
                result = await self._call_api_with_retry(request_body, api_url)
            
            # Process the result to normalize the structure
            # This is NOT included in LangSmith timing
            processed_result = self.process_api_result(result, task)
            
            # Calculate duration (total time including prep and processing)
            duration = time.time() - start_time
            
            # Log timing information
            logger.info(f"⏱️ LLM call completed - Task: {task}, Model: {model_to_use}, Duration: {duration:.2f}s")
            
            # Add timing info to result if it's a dict
            if isinstance(processed_result, dict):
                processed_result["_timing"] = {
                    "start_time": start_time,
                    "end_time": time.time(),
                    "duration_seconds": duration
                }
            
            return processed_result
        except Exception as e:
            logger.error(f"❌ Error in LLM API call: {e}")
            raise
    
    def _get_sync_session(self, pool_connections: int = 1, max_connections: Optional[int] = None) -> requests.Session:
        """
        Get or create synchronous HTTP session with connection pooling
        Uses thread-local storage to ensure each thread gets its own session
        This prevents thread contention and allows true parallelism
        
        Thread-safe for use in ThreadPoolExecutor - each thread gets its own session
        
        Args:
            pool_connections: Number of connection pools (default: 1 for single host)
            max_connections: Maximum number of concurrent connections per pool (default: 20, or matches worker count)
        """
        # Use thread-local storage to ensure each thread has its own session
        # This prevents thread contention when multiple threads make concurrent requests
        if not hasattr(self._thread_local, 'session') or self._thread_local.session is None:
            # Determine pool_maxsize
            if max_connections is not None:
                pool_maxsize = max_connections
            elif self._current_pool_maxsize is not None:
                pool_maxsize = self._current_pool_maxsize
            else:
                pool_maxsize = 20  # Default
            
            # Create new session for this thread with connection pooling
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=pool_connections,  # Number of connection pools (typically 1 per unique host)
                pool_maxsize=pool_maxsize,  # Max connections per pool (allows true parallelism)
                max_retries=3
            )
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            
            # Store session in thread-local storage
            self._thread_local.session = session
            self._thread_local.pool_maxsize = pool_maxsize
            
            logger.debug(f"🌐 Created thread-local HTTP session (thread: {threading.current_thread().name}) - pool_connections: {pool_connections}, pool_maxsize: {pool_maxsize}")
        
        # If max_connections is provided and larger than current, recreate session
        elif max_connections is not None and max_connections > self._thread_local.pool_maxsize:
            # CRITICAL FIX #3: Close existing session before creating new one
            if self._thread_local.session:
                try:
                    self._thread_local.session.close()
                    logger.debug(f"🔒 Closed existing thread-local HTTP session before recreation")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing existing session: {e}")
            
            # Create new session with larger pool size
            session = requests.Session()
            adapter = requests.adapters.HTTPAdapter(
                pool_connections=pool_connections,
                pool_maxsize=max_connections,
                max_retries=3
            )
            session.mount('http://', adapter)
            session.mount('https://', adapter)
            
            self._thread_local.session = session
            self._thread_local.pool_maxsize = max_connections
            
            logger.debug(f"🔄 Recreated thread-local HTTP session with larger pool size: {max_connections} (was: {self._thread_local.pool_maxsize})")
        
        # Store global pool_maxsize for reference (used when creating new thread-local sessions)
        if max_connections is not None:
            self._current_pool_maxsize = max_connections
        
        return self._thread_local.session
    
    def _cleanup_thread_session(self):
        """
        CRITICAL FIX #3: Clean up thread-local HTTP session
        Call this after processing completes to prevent memory leaks
        """
        if hasattr(self._thread_local, 'session') and self._thread_local.session is not None:
            try:
                self._thread_local.session.close()
                self._thread_local.session = None
                logger.debug(f"🔒 Cleaned up thread-local HTTP session")
            except Exception as e:
                logger.warning(f"⚠️ Error cleaning up thread session: {e}")
    
    def _call_api_with_retry_sync(self, request_body: Dict[str, Any], api_url: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        Synchronous version: Call LLM API with retry logic for network issues
        Uses connection pooling for improved performance
        Thread-safe for use in ThreadPoolExecutor
        """
        last_exception = None
        session = self._get_sync_session()
        
        # Prepare headers for LiteLLM
        headers = {
            "Content-Type": "application/json",
            self.litellm_header_name: f"{self.litellm_auth_scheme} {self.litellm_api_key}"
        }
        provider_name = "LiteLLM"
        
        for attempt in range(max_retries):
            try:
                attempt_start = time.time()
                logger.debug(f"🌐 Making {provider_name} API call (attempt {attempt + 1}/{max_retries}) to {api_url}")
                
                # Model logging only (request body keys removed to reduce log size)
                if "model" in request_body:
                    logger.debug(f"🔍 Model: {request_body.get('model')}")
                
                # Log request size for debugging
                request_size = len(str(request_body))
                logger.debug(f"📦 Request size: {request_size} bytes")
                
                # Measure HTTP request/response time with accurate timing
                # Note: response.elapsed is the accurate measure from requests library
                # It measures from when the HTTP request actually starts (socket connection) to when headers are received
                request_submit_time = time.time()
                response = session.post(
                    api_url,
                    json=request_body,
                    headers=headers,
                    timeout=90  # Fix: Reduced to 90s per request to prevent blocking (with retries, total can be up to 270s)
                )
                request_complete_time = time.time()
                
                # Use response.elapsed as the accurate HTTP request time (from requests library)
                # This measures from when HTTP request actually starts to when headers are received
                if hasattr(response, 'elapsed') and response.elapsed:
                    ttfb = response.elapsed.total_seconds()
                    # Total HTTP duration includes TTFB + response body transfer
                    http_duration = (request_complete_time - request_submit_time)
                    response_transfer_time = http_duration - ttfb
                else:
                    # Fallback if elapsed is not available
                    http_duration = request_complete_time - request_submit_time
                    ttfb = http_duration
                    response_transfer_time = 0.0
                
                # Log detailed timing breakdown with accurate measurements
                logger.info(f"⏱️ HTTP Request Timing Breakdown:")
                logger.info(f"   📤 Request submitted: {request_submit_time:.3f}s")
                logger.info(f"   📥 Response completed: {request_complete_time:.3f}s")
                logger.info(f"   ⚡ Time-to-First-Byte (TTFB): {ttfb:.3f}s (proxy/LLM processing time)")
                if response_transfer_time > 0:
                    logger.info(f"   📡 Response transfer time: {response_transfer_time:.3f}s")
                logger.info(f"   🌐 Total HTTP duration: {http_duration:.3f}s")
                logger.info(f"   📊 Response status: {response.status_code}")
                logger.info(f"   📏 Response size: {len(response.content)} bytes")
                
                # Check if TTFB is unusually high (indicates network/proxy delay)
                if ttfb > 10.0:
                    logger.warning(f"⚠️ Very High TTFB detected ({ttfb:.2f}s) - proxy/LLM is very slow or overloaded")
                elif ttfb > 5.0:
                    logger.warning(f"⚠️ High TTFB detected ({ttfb:.2f}s) - possible network/proxy latency issue")
                elif ttfb > 2.0:
                    logger.debug(f"ℹ️ Moderate TTFB ({ttfb:.2f}s) - network latency may be affecting performance")
                
                if response.status_code == 200:
                    # Measure response parsing time
                    parse_start = time.time()
                    result = response.json()
                    parse_time = time.time() - parse_start
                    logger.debug(f"✅ {provider_name} API call successful on endpoint: {api_url}")
                    logger.debug(f"   🔄 JSON parsing took: {parse_time*1000:.1f}ms")
                    
                    # Log total attempt time
                    attempt_duration = time.time() - attempt_start
                    logger.debug(f"   ⏱️ Total attempt duration: {attempt_duration:.3f}s")
                    
                    return result
                else:
                    error_msg = f"API call failed with status {response.status_code}: {response.text}"
                    logger.error(f"❌ {error_msg}")
                    raise Exception(f"LLM API Error: {response.status_code} - {response.text}")
                    
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError, 
                   requests.exceptions.RequestException) as e:
                last_exception = e
                wait_time = 2 ** attempt  # Exponential backoff
                error_type = type(e).__name__
                logger.warning(f"⚠️ Network error on attempt {attempt + 1} ({error_type}): {e}")
                logger.debug(f"⏳ Waiting {wait_time} seconds before retry...")
                time.sleep(wait_time)
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                logger.error(f"❌ Error type: {type(e).__name__}")
                # If it's not a network error, don't retry
                if not isinstance(e, (requests.exceptions.Timeout, requests.exceptions.ConnectionError, 
                                    requests.exceptions.RequestException)):
                    raise e
                last_exception = e
        
        # If all retries failed, raise the last exception
        logger.error(f"❌ All retries failed for endpoint: {api_url}")
        raise last_exception or Exception(f"All retries failed for endpoint: {api_url}")
    
    def call_api_sync(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                     task: str, document_name: Optional[str] = None, content_type: str = "image") -> Dict[str, Any]:
        """
        Synchronous version: Make API call to LLM provider through LiteLLM
        Thread-safe for use in ThreadPoolExecutor
        """
        start_time = time.time()
        
        # Use the same model from EXTRACTION_MODEL for both text and image requests
        model_to_use = self.extraction_model
        
        # Extract page number from document_name if present (format: "Document.pdf (page X)")
        page_number = None
        trace_name = f"llm_call_{task}"
        if document_name:
            # Look for pattern like "(page 5)" or "(page 1)" in document_name
            page_match = re.search(r'\(page\s+(\d+)\)', document_name, re.IGNORECASE)
            if page_match:
                page_number = int(page_match.group(1))
                trace_name = f"llm_call_{task}_page_{page_number}"
        
        # Execute the call (LangSmith tracing is now inside _execute_call_sync, wrapping only the HTTP request)
        return self._execute_call_sync(prompt, image_data, response_format, task, document_name, start_time, model_to_use, content_type, page_number, trace_name)
    
    def _execute_call_sync(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any], 
                           task: str, document_name: Optional[str],
                           start_time: float, model_to_use: str, content_type: str, page_number: Optional[int] = None, trace_name: Optional[str] = None) -> Dict[str, Any]:
        """Execute the actual synchronous LLM API call"""
        try:
            # Log which provider is being used for this call
            if self.provider == "gemini_direct" and self.gemini_client:
                logger.info(f"🔧 Using Direct Gemini API for {task} (model: {model_to_use})")
                return self._execute_gemini_direct_call(prompt, image_data, response_format, task, document_name, start_time, content_type)
            else:
                logger.info(f"🔧 Using LiteLLM provider for {task} (model: {model_to_use})")
            
            # Otherwise use LiteLLM provider
            # Determine API URL for LiteLLM
            base_url = self.litellm_api_url.rstrip('/')
            # Allow LITELLM_API_URL to be configured as:
            # - base host only: https://proxyllm.ximplify.id
            # - API root:       https://proxyllm.ximplify.id/v1
            # - full endpoint:  https://proxyllm.ximplify.id/v1/chat/completions
            if re.search(r"/chat/completions$", base_url):
                api_url = base_url
            elif re.search(r"/v1$", base_url):
                api_url = f"{base_url}/chat/completions"
            else:
                api_url = f"{base_url}/v1/chat/completions"
            
            logger.debug(f"🔍 Using LiteLLM endpoint: {api_url}")
            logger.debug(f"🤖 Using model: {model_to_use} (content_type: {content_type})")
            
            # Prepare request body (provider-specific format) - NOT included in LangSmith timing
            prep_start = time.time()
            request_body = self._prepare_request_body(prompt, image_data, response_format, document_name, content_type)
            prep_time = time.time() - prep_start
            logger.debug(f"📝 Request body preparation took: {prep_time*1000:.1f}ms")
            
            # Wrap only the HTTP request with LangSmith tracing (pure LLM response time)
            if self.langsmith_enabled and self.traceable:
                metadata = {
                    "task": task,
                    "model": model_to_use,
                    "document_name": document_name or "unknown",
                    "has_image": bool(image_data),
                    "content_type": content_type
                }
                if page_number is not None:
                    metadata["page_number"] = page_number
                
                tags = [task, model_to_use, "sync"]
                if page_number is not None:
                    tags.append(f"page_{page_number}")
                
                @self.traceable(
                    name=trace_name or f"llm_call_{task}",
                    run_type="llm",
                    tags=tags,
                    metadata=metadata
                )
                def _traced_http_call_sync():
                    # This traces ONLY the HTTP request/response time
                    return self._call_api_with_retry_sync(request_body, api_url)
                
                result = _traced_http_call_sync()
            else:
                # No LangSmith tracing - just make the call
                result = self._call_api_with_retry_sync(request_body, api_url)
            
            # Process the result to normalize the structure
            # This is NOT included in LangSmith timing
            parse_start = time.time()
            processed_result = self.process_api_result(result, task)
            parse_time = time.time() - parse_start
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log comprehensive timing information
            logger.info(f"⏱️ LLM call completed - Task: {task}, Model: {model_to_use}, Duration: {duration:.2f}s")
            logger.debug(f"   📝 Request prep: {prep_time*1000:.1f}ms | 🔄 Response parse: {parse_time*1000:.1f}ms")
            
            # Add timing info to result if it's a dict
            if isinstance(processed_result, dict):
                processed_result["_timing"] = {
                    "start_time": start_time,
                    "end_time": time.time(),
                    "duration_seconds": duration
                }
            
            return processed_result
        except Exception as e:
            logger.error(f"❌ Error in LLM API call: {e}")
            raise

    def _execute_gemini_direct_call(self, prompt: str, image_data: Optional[str], response_format: Dict[str, Any],
                                     task: str, document_name: Optional[str], start_time: float, content_type: str) -> Dict[str, Any]:
        """Execute LLM call using direct Gemini API (google-generativeai SDK)
        
        Uses Gemini's native response_schema for structured output when available.
        This ensures valid JSON output without truncation or formatting issues.
        """
        import base64
        from PIL import Image
        import io
        from .extraction_schemas import get_gemini_schema_for_task, log_schema_usage
        
        try:
            logger.debug(f"🔍 Using Gemini Direct API (content_type: {content_type})")
            
            # Build content for Gemini
            content_parts = []
            
            # Add prompt text
            full_prompt = prompt
            if document_name:
                full_prompt = f"Document: {document_name}\n\n{prompt}"
            
            # Get native Gemini schema for this task
            gemini_schema = get_gemini_schema_for_task(task)
            using_native_schema = gemini_schema is not None
            log_schema_usage(task, using_native_schema)
            
            # If no native schema, fall back to prompt-based schema instruction
            if not using_native_schema:
                json_schema = response_format.get("json_schema", {}).get("schema", {})
                if json_schema:
                    full_prompt += f"\n\nRespond with valid JSON matching this schema:\n{json.dumps(json_schema, indent=2)}"
            
            if content_type == "text":
                # For text input, add text content
                text_content = image_data if image_data else ""
                full_prompt += f"\n\nExtracted Text Content:\n{text_content}"
                content_parts.append(full_prompt)
            else:
                # For image input, decode and add image
                content_parts.append(full_prompt)
                
                if image_data:
                    # Remove data URL prefix if present
                    if "," in image_data:
                        image_data = image_data.split(",", 1)[1]
                    
                    # Decode base64 image
                    image_bytes = base64.b64decode(image_data)
                    pil_image = Image.open(io.BytesIO(image_bytes))
                    content_parts.append(pil_image)
            
            # Make API call with retry
            max_retries = 3
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    api_start = time.time()
                    
                    # Build generation config with optional response_schema
                    # Use configurable max_output_tokens from settings to handle pages with large tables/data
                    # This prevents truncation errors for complex documents
                    
                    # For RAG tasks, use plain text instead of JSON
                    if task in ["rag_question_answering", "document_summarization", "text_completion"]:
                        gen_config_params = {
                            "temperature": 0.1,
                            "max_output_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
                        }
                        logger.debug(f"📝 Using plain text response for RAG task: {task}")
                    else:
                        gen_config_params = {
                            "response_mime_type": "application/json",
                            "temperature": 0.1,
                            "max_output_tokens": settings.LLM_MAX_OUTPUT_TOKENS,
                        }
                    
                    # Add native response_schema if available for this task
                    # This ensures Gemini returns valid JSON matching our schema
                    if using_native_schema and gemini_schema:
                        gen_config_params["response_schema"] = gemini_schema
                        logger.debug(f"📋 Using native response_schema: {json.dumps(gemini_schema, indent=2)[:200]}...")
                    
                    # Create config for new API
                    config = genai.types.GenerateContentConfig(
                        temperature=gen_config_params.get("temperature"),
                        max_output_tokens=gen_config_params.get("max_output_tokens"),
                        response_mime_type=gen_config_params.get("response_mime_type"),
                        response_schema=gen_config_params.get("response_schema")
                    )
                    
                    response = self.gemini_client.models.generate_content(
                        model=self.gemini_model_name,
                        contents=content_parts,
                        config=config
                    )
                    api_duration = time.time() - api_start
                    
                    # Log timing
                    logger.info(f"⏱️ Gemini Direct API call: {api_duration:.2f}s")
                    
                    # Check for truncation (finish_reason)
                    finish_reason = "stop"
                    if response.candidates and len(response.candidates) > 0:
                        candidate = response.candidates[0]
                        if hasattr(candidate, 'finish_reason'):
                            # Map Gemini finish reasons to OpenAI format
                            gemini_finish_reason = str(candidate.finish_reason).upper()
                            if 'MAX_TOKENS' in gemini_finish_reason or 'LENGTH' in gemini_finish_reason:
                                finish_reason = "length"
                                logger.warning(f"⚠️ Response was truncated due to max_tokens limit. Consider increasing LLM_MAX_OUTPUT_TOKENS.")
                            elif 'STOP' in gemini_finish_reason:
                                finish_reason = "stop"
                            else:
                                logger.info(f"📋 Finish reason: {gemini_finish_reason}")
                    
                    # Extract response text
                    response_text = response.text
                    
                    # Convert to OpenAI-compatible format for process_api_result
                    result = {
                        "choices": [{
                            "message": {"content": response_text},
                            "finish_reason": finish_reason
                        }],
                        "usage": {
                            "prompt_tokens": response.usage_metadata.prompt_token_count if response.usage_metadata else 0,
                            "completion_tokens": response.usage_metadata.candidates_token_count if response.usage_metadata else 0,
                            "total_tokens": response.usage_metadata.total_token_count if response.usage_metadata else 0
                        }
                    }
                    
                    # Process result
                    parse_start = time.time()
                    processed_result = self.process_api_result(result, task)
                    parse_time = time.time() - parse_start
                    
                    duration = time.time() - start_time
                    logger.info(f"⏱️ LLM call completed - Task: {task}, Model: gemini-2.0-flash, Duration: {duration:.2f}s")
                    
                    if isinstance(processed_result, dict):
                        processed_result["_timing"] = {
                            "start_time": start_time,
                            "end_time": time.time(),
                            "duration_seconds": duration
                        }
                    
                    return processed_result
                    
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    # Check for rate limit or quota errors
                    if "quota" in error_str or "rate" in error_str or "429" in error_str:
                        wait_time = (attempt + 1) * 5  # 5s, 10s, 15s
                        logger.warning(f"⚠️ Gemini rate limit hit, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                        time.sleep(wait_time)
                    elif attempt < max_retries - 1:
                        logger.warning(f"⚠️ Gemini API error on attempt {attempt + 1}: {e}")
                        time.sleep(1)
                    else:
                        raise
            
            raise last_error or Exception("Max retries exceeded")
            
        except Exception as e:
            logger.error(f"❌ Error in Gemini Direct API call: {e}")
            raise

    def process_api_result(self, result: Dict[str, Any], task: str) -> Dict[str, Any]:
        """Process API result and handle JSON parsing"""
        try:
            # Handle different response formats
            choices = result.get("choices", [])
            if not choices:
                logger.error("❌ No choices in LLM response")
                raise ValueError("No choices in LLM response")
            
            choice = choices[0]
            
            # Check finish_reason to detect token limit or other issues
            finish_reason = choice.get("finish_reason")
            usage = result.get("usage", {})
            completion_tokens_details = usage.get("completion_tokens_details", {})
            reasoning_tokens = completion_tokens_details.get("reasoning_tokens", 0)
            text_tokens = completion_tokens_details.get("text_tokens", 0)
            
            # Detect token limit issues (especially for Gemini models with reasoning)
            if finish_reason == "length":
                if reasoning_tokens > 0 and text_tokens == 0:
                    # Model used all tokens for reasoning without producing output
                    logger.error(f"❌ Token limit exceeded - Model used {reasoning_tokens} reasoning tokens with 0 text tokens")
                    logger.error(f"🔍 This usually means the prompt is too complex or the page content is too large")
                    logger.error(f"🔍 Usage: {json.dumps(usage, indent=2)}")
                    raise ValueError(f"Token limit exceeded: Model used all {reasoning_tokens} reasoning tokens without producing output. The page may be too complex or the prompt too long.")
                else:
                    # Response was truncated but we got some output
                    logger.warning(f"⚠️ Response truncated (finish_reason: length) - Total tokens: {usage.get('total_tokens', 0)}")
            
            # Try chat completions format first (message.content), then completions format (text)
            content = choice.get("message", {}).get("content", "") or choice.get("text", "")
            
            if not content:
                logger.error("❌ Empty response from LLM")
                logger.error(f"🔍 Finish reason: {finish_reason}")
                logger.error(f"🔍 Usage: {json.dumps(usage, indent=2)}")
                logger.error(f"🔍 Full response structure: {json.dumps(result, indent=2)}")
                raise ValueError("Empty response from LLM")
            
            # Log response length only (full content removed to reduce log size)
            logger.debug(f"📊 LLM response length: {len(content)} characters for task '{task}'")
            
            # Fix: Log actual response content if it's suspiciously short (likely empty or minimal response)
            if len(content) < 100:
                logger.debug(f"🔍 LLM response content (short response): {content[:500]}")
            
            # Check if response is suspiciously short (likely only has_signature or empty)
            if task == "without_template_extraction" and len(content) < 500:
                logger.warning(f"⚠️ Suspiciously short LLM response for {task} - may not contain extracted data")
            
            # For RAG tasks, return plain text directly without JSON parsing
            if task in ["rag_question_answering", "document_summarization", "text_completion"]:
                logger.info(f"✅ Returning plain text response for RAG task: {task}")
                return {
                    "success": True,
                    "result": content,
                    "raw_response": content,
                    "model": result.get("model", "unknown"),
                    "usage": result.get("usage", {})
                }
            
            # For document_type_detection, return parsed JSON directly without normalization
            # This task uses a strict Pydantic schema and doesn't need field normalization
            if task == "document_type_detection":
                try:
                    sanitized_content = self._sanitize_json_content(content)
                    parsed_result = json.loads(sanitized_content)
                    logger.info(f"✅ Returning raw JSON for document_type_detection: {parsed_result}")
                    return parsed_result
                except json.JSONDecodeError as e:
                    logger.error(f"❌ Failed to parse document_type_detection response: {e}")
                    return {"document_type": "unknown", "confidence": 0.3, "reason": "Parse error"}
            
            # For non-RAG tasks, parse JSON response
            try:
                sanitized_content = self._sanitize_json_content(content)
                parsed_result = json.loads(sanitized_content)
                logger.debug(f"✅ Successfully parsed JSON response for task: {task}")
                
                # Check if only has_signature (no actual data extracted)
                if task == "without_template_extraction" and isinstance(parsed_result, dict):
                    parsed_keys = list(parsed_result.keys())
                    non_meta_keys = [k for k in parsed_keys if not k.startswith('_')]
                    if len(non_meta_keys) <= 1 and 'has_signature' in non_meta_keys:
                        logger.warning(f"⚠️ Parsed result may only contain 'has_signature' - keys: {parsed_keys}")
                    elif len(non_meta_keys) == 0:
                        logger.warning(f"⚠️ Parsed result has no data keys - only metadata keys: {parsed_keys}")
                
                # Normalize structure so frontend always receives {"fields": [...]} when appropriate
                normalized_result = self._normalize_result_structure(parsed_result, task)
                logger.debug(f"🔄 Normalized result structure keys: {list(normalized_result.keys()) if isinstance(normalized_result, dict) else 'N/A'}")
                # Attach parsed simple JSON so callers can run validation BEFORE normalization if needed
                if isinstance(normalized_result, dict):
                    normalized_result["_parsed"] = parsed_result
                    # Include usage information for token tracking
                    normalized_result["usage"] = result.get("usage", {})
                return normalized_result
                
            except json.JSONDecodeError as e:
                logger.warning(f"⚠️ JSON parse failed, attempting to extract JSON from markdown: {e}")
                logger.debug(f"🔍 JSON error details: {str(e)}")
                
                # Try to extract JSON from markdown code blocks
                extracted_json = self._extract_json_from_markdown(content)
                if extracted_json:
                    try:
                        # Fix: Sanitize extracted JSON as well
                        sanitized_extracted = self._sanitize_json_content(extracted_json)
                        parsed_result = json.loads(sanitized_extracted)
                        logger.info("✅ Successfully extracted and parsed JSON from markdown")
                        normalized_result = self._normalize_result_structure(parsed_result, task)
                        if isinstance(normalized_result, dict):
                            normalized_result["_parsed"] = parsed_result
                            # Include usage information for token tracking
                            normalized_result["usage"] = result.get("usage", {})
                        return normalized_result
                    except json.JSONDecodeError as e2:
                        logger.error(f"❌ Failed to parse extracted JSON: {e2}")
                        logger.debug(f"🔍 Extracted JSON (first 500 chars): {extracted_json[:500]}")
                        logger.debug(f"🔍 Extracted JSON (last 500 chars): {extracted_json[-500:]}")
                
                # Try one more time with more aggressive sanitization
                # This handles edge cases where the normal sanitization didn't catch all issues
                try:
                    logger.debug("🔄 Attempting aggressive JSON repair...")
                    # First try to repair truncated JSON
                    repaired_content = self._repair_truncated_json(content)
                    # Then apply sanitization
                    aggressive_sanitized = self._sanitize_json_content(repaired_content)
                    # Try parsing
                    parsed_result = json.loads(aggressive_sanitized)
                    logger.info("✅ Successfully parsed JSON after aggressive repair")
                    normalized_result = self._normalize_result_structure(parsed_result, task)
                    if isinstance(normalized_result, dict):
                        normalized_result["_parsed"] = parsed_result
                        normalized_result["usage"] = result.get("usage", {})
                        normalized_result["_repaired"] = True  # Flag that JSON was repaired
                    return normalized_result
                except json.JSONDecodeError as e3:
                    logger.error(f"❌ Aggressive repair also failed: {e3}")
                    # Log the position of the error for debugging
                    error_pos = e3.pos if hasattr(e3, 'pos') else 'unknown'
                    error_lineno = e3.lineno if hasattr(e3, 'lineno') else 'unknown'
                    error_colno = e3.colno if hasattr(e3, 'colno') else 'unknown'
                    logger.error(f"   Error position: char {error_pos}, line {error_lineno}, column {error_colno}")
                    
                    # Try to show context around the error
                    if isinstance(error_pos, int) and error_pos < len(content):
                        start = max(0, error_pos - 50)
                        end = min(len(content), error_pos + 50)
                        context = content[start:end]
                        logger.error(f"   Context around error: ...{context}...")
                
                # Last resort: Try the demjson3 library if available for lenient parsing
                try:
                    import demjson3
                    logger.debug("🔄 Attempting lenient parsing with demjson3...")
                    parsed_result = demjson3.decode(content, strict=False)
                    logger.info("✅ Successfully parsed JSON with demjson3 lenient mode")
                    normalized_result = self._normalize_result_structure(parsed_result, task)
                    if isinstance(normalized_result, dict):
                        normalized_result["_parsed"] = parsed_result
                        normalized_result["usage"] = result.get("usage", {})
                        normalized_result["_lenient_parsed"] = True
                    return normalized_result
                except ImportError:
                    logger.debug("demjson3 not installed, skipping lenient parsing")
                except Exception as demjson_error:
                    logger.error(f"❌ demjson3 lenient parsing also failed: {demjson_error}")
                
                # Try json5 library if available (allows trailing commas, comments, etc.)
                try:
                    import json5
                    logger.debug("🔄 Attempting lenient parsing with json5...")
                    repaired_for_json5 = self._repair_truncated_json(content)
                    parsed_result = json5.loads(repaired_for_json5)
                    logger.info("✅ Successfully parsed JSON with json5 lenient mode")
                    normalized_result = self._normalize_result_structure(parsed_result, task)
                    if isinstance(normalized_result, dict):
                        normalized_result["_parsed"] = parsed_result
                        normalized_result["usage"] = result.get("usage", {})
                        normalized_result["_json5_parsed"] = True
                    return normalized_result
                except ImportError:
                    logger.debug("json5 not installed, skipping json5 parsing")
                except Exception as json5_error:
                    logger.error(f"❌ json5 lenient parsing also failed: {json5_error}")
                
                # Final fallback: Return partial data if we can extract anything useful
                partial_result = self._extract_partial_json(content)
                if partial_result:
                    logger.warning(f"⚠️ Returning partial data extracted from malformed JSON")
                    normalized_result = self._normalize_result_structure(partial_result, task)
                    if isinstance(normalized_result, dict):
                        normalized_result["_parsed"] = partial_result
                        normalized_result["usage"] = result.get("usage", {})
                        normalized_result["_partial"] = True
                        normalized_result["_parse_warning"] = "JSON was malformed, partial data extracted"
                    return normalized_result
                
                logger.error(f"❌ Failed to parse JSON response: {e}")
                logger.error(f"Raw AI response (first 500 chars): {content[:500]}")
                logger.error(f"Raw AI response (last 500 chars): {content[-500:]}")
                
                # For RAG tasks, return the raw text response instead of failing
                if task in ["rag_question_answering", "document_summarization"]:
                    logger.info(f"✅ Returning raw text response for RAG task: {task}")
                    return {
                        "success": True,
                        "result": content,
                        "raw_response": content,
                        "model": result.get("model", "unknown"),
                        "usage": result.get("usage", {})
                    }
                
                raise ValueError(f"Failed to parse JSON response from AI: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error processing API result: {e}")
            raise

    def _sanitize_json_content(self, content: str) -> str:
        """
        Fix: Sanitize JSON content to handle invalid Unicode escape sequences and newlines in strings
        Replaces invalid escapes like \u2026 (ellipsis) with valid JSON escapes
        Also attempts to fix unescaped newlines in string values
        """
        import re
        try:
            # STEP 0: Quick fix for the most common issue - multi-line strings in JSON
            # LLM often generates JSON with literal newlines inside string values
            # We need to escape these before any parsing attempt
            # This simple regex finds strings with literal newlines and escapes them
            
            def escape_newlines_in_strings(text):
                """
                Simple but effective: find all JSON string values and escape newlines within them.
                Uses a state machine approach that's more robust than regex for nested structures.
                Also handles truncated strings by closing them properly.
                """
                result = []
                i = 0
                length = len(text)
                
                while i < length:
                    char = text[i]
                    
                    if char == '"':
                        # Start of a string - collect everything until unescaped closing quote
                        result.append(char)
                        i += 1
                        string_terminated = False
                        while i < length:
                            c = text[i]
                            if c == '\\' and i + 1 < length:
                                # Escape sequence - keep both characters as-is
                                result.append(c)
                                result.append(text[i + 1])
                                i += 2
                            elif c == '"':
                                # End of string
                                result.append(c)
                                i += 1
                                string_terminated = True
                                break
                            elif c == '\n':
                                # Literal newline inside string - escape it
                                result.append('\\n')
                                i += 1
                            elif c == '\r':
                                # Literal carriage return - escape it
                                result.append('\\r')
                                i += 1
                            elif c == '\t':
                                # Literal tab - escape it  
                                result.append('\\t')
                                i += 1
                            elif ord(c) < 32:
                                # Other control character - escape as unicode
                                result.append(f'\\u{ord(c):04x}')
                                i += 1
                            else:
                                result.append(c)
                                i += 1
                        
                        # If we reached end of content without closing quote, close the string
                        if not string_terminated:
                            result.append('"')
                            logger.debug("🔧 Auto-closed unterminated string at end of content")
                    else:
                        result.append(char)
                        i += 1
                
                return ''.join(result)
            
            # Apply the newline escaping first
            sanitized = escape_newlines_in_strings(content)
            
            # Fix: Handle invalid Unicode escape sequences in JSON
            # The issue: LLM returns \u2026 (ellipsis character) which is valid Unicode but breaks JSON parsing
            # Strategy: Convert valid Unicode escapes to their actual characters, which JSON can handle
            
            def decode_unicode_escape(match):
                """Decode Unicode escape sequence to actual character"""
                hex_code = match.group(1)
                try:
                    char_code = int(hex_code, 16)
                    char = chr(char_code)
                    # Return the actual character - JSON can handle Unicode characters
                    return char
                except (ValueError, OverflowError):
                    # If invalid hex, return space
                    return ' '
            
            # Replace all \uXXXX patterns with their actual Unicode characters
            # This converts \u2026 to … (ellipsis), which JSON can handle
            sanitized = re.sub(r'\\u([0-9a-fA-F]{4})', decode_unicode_escape, sanitized)
            
            return sanitized
        except Exception as e:
            logger.warning(f"⚠️ Error sanitizing JSON content: {e}, using original content")
            return content
    
    def _repair_truncated_json(self, content: str) -> str:
        """
        Attempt to repair truncated or malformed JSON responses from LLM.
        
        Common issues:
        1. Truncated responses (missing closing brackets/braces)
        2. Missing commas between array elements
        3. Trailing commas before closing brackets
        4. Incomplete string values
        
        Returns:
            Repaired JSON string that should be parseable
        """
        import re
        
        if not content or not content.strip():
            return "{}"
        
        content = content.strip()
        
        # Remove any trailing incomplete data after the last complete value
        # Look for patterns that suggest truncation
        
        # Strategy 1: Try to find the last complete JSON structure
        # Count brackets to detect truncation
        open_braces = content.count('{')
        close_braces = content.count('}')
        open_brackets = content.count('[')
        close_brackets = content.count(']')
        
        is_truncated = (open_braces != close_braces) or (open_brackets != close_brackets)
        
        if is_truncated:
            logger.info(f"🔧 Detected truncated JSON - braces: {open_braces}/{close_braces}, brackets: {open_brackets}/{close_brackets}")
            
            # Try to repair by adding missing closing characters
            repaired = content
            
            # First, clean up any trailing incomplete elements
            # Remove trailing commas, incomplete strings, etc.
            
            # Pattern: Remove incomplete array elements (e.g., trailing "null," without closing)
            # Look for the last complete value in an array
            repaired = re.sub(r',\s*$', '', repaired)  # Remove trailing comma
            repaired = re.sub(r',\s*\n\s*$', '', repaired)  # Remove trailing comma with newlines
            
            # If we're in the middle of a string (odd number of unescaped quotes), try to close it
            quote_count = 0
            last_quote_pos = -1
            i = 0
            while i < len(repaired):
                if repaired[i] == '"':
                    # Check if escaped
                    backslash_count = 0
                    j = i - 1
                    while j >= 0 and repaired[j] == '\\':
                        backslash_count += 1
                        j -= 1
                    if backslash_count % 2 == 0:
                        quote_count += 1
                        last_quote_pos = i
                i += 1
            
            if quote_count % 2 == 1:
                # Odd number of quotes - string is unclosed
                logger.debug(f"🔧 Closing unclosed string at position {last_quote_pos}")
                repaired = repaired + '"'
            
            # Now add missing closing brackets/braces
            # Work from inside out - close arrays first, then objects
            missing_brackets = open_brackets - close_brackets
            missing_braces = open_braces - close_braces
            
            # Remove any trailing incomplete content before adding closures
            # Look for patterns like: "key": [value, value,  (incomplete array)
            repaired = re.sub(r',\s*$', '', repaired.rstrip())
            
            # Add missing brackets
            for _ in range(max(0, missing_brackets)):
                # Find the best place to add the bracket
                # Usually at the end, but check for trailing commas first
                repaired = repaired.rstrip()
                if repaired.endswith(','):
                    repaired = repaired[:-1]
                repaired += '\n]'
            
            # Add missing braces
            for _ in range(max(0, missing_braces)):
                repaired = repaired.rstrip()
                if repaired.endswith(','):
                    repaired = repaired[:-1]
                repaired += '\n}'
            
            logger.info(f"🔧 Repaired JSON - added {missing_brackets} brackets, {missing_braces} braces")
            return repaired
        
        # Strategy 2: Fix missing commas between elements
        # Pattern: }\s*{ or ]\s*[ without comma
        content = re.sub(r'}\s*{', '},{', content)
        content = re.sub(r']\s*\[', '],[', content)
        content = re.sub(r'"\s*{', '",{', content)
        content = re.sub(r'}\s*"', '},"', content)
        content = re.sub(r'"\s*\[', '",[', content)
        content = re.sub(r']\s*"', '],"', content)
        
        # Strategy 3: Fix trailing commas (invalid in JSON)
        content = re.sub(r',\s*}', '}', content)
        content = re.sub(r',\s*]', ']', content)
        
        return content
    
    def _extract_partial_json(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Extract whatever valid JSON we can from a malformed response.
        
        This is a last resort when all other parsing methods fail.
        It tries to extract complete key-value pairs from the response.
        
        Returns:
            Partial dictionary with extracted data, or None if nothing could be extracted
        """
        import re
        
        if not content or not content.strip():
            return None
        
        result = {}
        
        try:
            # Strategy 1: Try to find complete JSON objects within the content
            # Look for patterns like "key": value where value is complete
            
            # Match simple string values: "key": "value"
            string_pattern = r'"([^"]+)":\s*"([^"]*)"'
            for match in re.finditer(string_pattern, content):
                key, value = match.groups()
                if not key.startswith('_'):  # Skip metadata keys
                    result[key] = value
            
            # Match number values: "key": 123 or "key": 123.45
            number_pattern = r'"([^"]+)":\s*(-?\d+\.?\d*)'
            for match in re.finditer(number_pattern, content):
                key, value = match.groups()
                if not key.startswith('_') and key not in result:
                    try:
                        result[key] = float(value) if '.' in value else int(value)
                    except ValueError:
                        pass
            
            # Match boolean values: "key": true/false
            bool_pattern = r'"([^"]+)":\s*(true|false)'
            for match in re.finditer(bool_pattern, content, re.IGNORECASE):
                key, value = match.groups()
                if not key.startswith('_') and key not in result:
                    result[key] = value.lower() == 'true'
            
            # Match null values: "key": null
            null_pattern = r'"([^"]+)":\s*null'
            for match in re.finditer(null_pattern, content):
                key = match.group(1)
                if not key.startswith('_') and key not in result:
                    result[key] = None
            
            # Strategy 2: Try to extract complete nested objects
            # Look for "key": { ... } patterns where the braces are balanced
            nested_object_pattern = r'"([^"]+)":\s*(\{[^{}]*\})'
            for match in re.finditer(nested_object_pattern, content):
                key, obj_str = match.groups()
                if not key.startswith('_') and key not in result:
                    try:
                        result[key] = json.loads(obj_str)
                    except json.JSONDecodeError:
                        pass
            
            # Strategy 3: Try to extract complete arrays of simple values
            # Look for "key": [value, value, ...] patterns
            simple_array_pattern = r'"([^"]+)":\s*\[([^\[\]]*)\]'
            for match in re.finditer(simple_array_pattern, content):
                key, array_content = match.groups()
                if not key.startswith('_') and key not in result:
                    try:
                        # Try to parse the array
                        array_str = f"[{array_content}]"
                        result[key] = json.loads(array_str)
                    except json.JSONDecodeError:
                        # If parsing fails, try to extract values manually
                        values = []
                        for item in array_content.split(','):
                            item = item.strip()
                            if item.startswith('"') and item.endswith('"'):
                                values.append(item[1:-1])
                            elif item.lower() == 'null':
                                values.append(None)
                            elif item.lower() in ('true', 'false'):
                                values.append(item.lower() == 'true')
                            else:
                                try:
                                    values.append(float(item) if '.' in item else int(item))
                                except ValueError:
                                    values.append(item)
                        if values:
                            result[key] = values
            
            if result:
                logger.info(f"🔧 Extracted {len(result)} key-value pairs from malformed JSON")
                return result
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Error extracting partial JSON: {e}")
            return None
    
    def _extract_json_from_markdown(self, text: str) -> Optional[str]:
        """Extract JSON from markdown code blocks like ```json ... ```"""
        try:
            # Look for ```json ... ``` pattern
            import re
            pattern = r'```json\s*\n?(.*?)\n?```'
            match = re.search(pattern, text, re.DOTALL)
            if match:
                return match.group(1).strip()
            
            # Fallback: look for any ``` ... ``` and try to parse as JSON
            pattern = r'```\s*\n?(.*?)\n?```'
            match = re.search(pattern, text, re.DOTALL)
            if match:
                content = match.group(1).strip()
                # Try to parse to validate it's JSON
                json.loads(content)
                return content
            
            return None
        except Exception as e:
            logger.error(f"Error extracting JSON from markdown: {e}")
            return None

    def _normalize_result_structure(self, parsed_result: Any, task: str) -> Dict[str, Any]:
        """Convert various model outputs into a consistent structure based on task type"""
        try:
            # For field_detection and form_creation, preserve hierarchical structure
            if task in ["field_detection", "form_creation"] and isinstance(parsed_result, dict):
                # If the model already returned a fields array, keep it; otherwise return empty fields
                fields = parsed_result.get("fields") if isinstance(parsed_result.get("fields"), list) else []
                return {"fields": fields, "hierarchical_data": parsed_result}
            
            # For without_template_extraction and template_guided_extraction, preserve the simple JSON structure (hierarchical_data only)
            elif task in ["without_template_extraction", "template_guided_extraction"] and isinstance(parsed_result, dict):
                logger.debug(f"🎯 Preserving simple JSON structure for {task}")
                # IMPORTANT: Preserve key order from LLM response (Python 3.7+ dicts preserve insertion order)
                # Add key order metadata to preserve section/field order if not present
                ordered_keys = [key for key in parsed_result.keys() if not key.startswith('_')]
                
                # Fix: Log warning if LLM only returned has_signature (no actual data extracted)
                if len(ordered_keys) <= 1 and 'has_signature' in ordered_keys:
                    logger.warning(f"⚠️ LLM response contains only 'has_signature' field - no data extracted! Parsed result keys: {list(parsed_result.keys())}")
                    logger.debug(f"   Full parsed result: {json.dumps(parsed_result, indent=2)[:500]}")
                
                if ordered_keys and '_keyOrder' not in parsed_result:
                    parsed_result['_keyOrder'] = ordered_keys
                
                logger.debug(f"🔄 Preserved hierarchical_data with {len(ordered_keys)} sections (order preserved)")
                
                # Log only top-level keys to reduce log size
                logger.debug(f"📋 [LLM Response] {task} response structure keys: {list(parsed_result.keys()) if isinstance(parsed_result, dict) else 'N/A'}")
                
                # Return only hierarchical_data - no fields array conversion
                return {"hierarchical_data": parsed_result}
            
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
                            "value": value,
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
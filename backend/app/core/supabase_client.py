"""
Supabase Client with Connection Pooling (Singleton Pattern)
============================================================
This module implements a singleton Supabase client to prevent connection exhaustion.
All services should use get_supabase_client() to get the shared client instance.

IMPORTANT: Never create your own create_client() calls in services!
Always use: from app.core.supabase_client import get_supabase_client
"""

import os
import logging
import atexit
from threading import Lock
from typing import Optional
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Check if supabase is available
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # type: ignore
    create_client = None  # type: ignore
    logger.warning("Supabase package not available")

# ============================================================
# SINGLETON CONNECTION POOL
# ============================================================
# These module-level variables ensure only ONE client exists
_supabase_client: Optional[Client] = None
_client_lock = Lock()
_initialized = False


def get_supabase_client() -> Optional[Client]:
    """
    Get the singleton Supabase client with connection pooling.
    
    This function implements a thread-safe singleton pattern to ensure
    only ONE Supabase client is created and shared across all services.
    
    Benefits:
    - Prevents connection exhaustion (Supabase has 60-200 connection limit)
    - Reuses existing connections instead of creating new ones
    - Thread-safe initialization
    - Automatic cleanup on shutdown
    
    Usage:
        from app.core.supabase_client import get_supabase_client
        
        class MyService:
            def __init__(self):
                self.supabase = get_supabase_client()  # Gets shared instance
    
    Returns:
        Supabase Client instance or None if not available
    """
    global _supabase_client, _initialized
    
    # Fast path - return existing client without acquiring lock
    if _initialized and _supabase_client is not None:
        return _supabase_client
    
    # Slow path - thread-safe initialization
    with _client_lock:
        # Double-check after acquiring lock (another thread might have initialized)
        if _initialized:
            return _supabase_client
        
        _supabase_client = _create_client_internal()
        _initialized = True
        
        # Register cleanup on application shutdown
        if _supabase_client is not None:
            atexit.register(_cleanup_client)
        
        return _supabase_client


def _create_client_internal() -> Optional[Client]:
    """
    Internal function to create the Supabase client.
    Should only be called once during initialization.
    """
    if not SUPABASE_AVAILABLE:
        logger.warning("Supabase package not available")
        return None
    
    # Load environment variables
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    env_file_path = os.path.join(backend_dir, ".env")
    load_dotenv(env_file_path)
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.warning("Supabase credentials not found in environment variables")
        return None
    
    try:
        # Create client - this maintains its own internal connection pool
        client = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase SINGLETON client initialized (connection pooling enabled)")
        logger.info(f"   URL: {supabase_url[:50]}...")
        return client
    except TypeError as e:
        if 'proxy' in str(e):
            logger.warning("Supabase client proxy parameter issue, trying alternative initialization")
            try:
                client = create_client(supabase_url, supabase_key)
                logger.info("✅ Supabase SINGLETON client initialized (fallback mode)")
                return client
            except Exception as fallback_error:
                logger.error(f"Failed to initialize Supabase client (fallback): {fallback_error}")
                return None
        else:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        return None


def _cleanup_client():
    """
    Cleanup function called on application shutdown.
    Ensures connections are properly closed.
    """
    global _supabase_client, _initialized
    
    with _client_lock:
        if _supabase_client is not None:
            logger.info("🧹 Cleaning up Supabase client connections on shutdown")
            # The Supabase Python client handles connection cleanup internally
            # Setting to None allows garbage collection
            _supabase_client = None
            _initialized = False


def reset_client():
    """
    Force reset the Supabase client.
    Useful for testing or recovering from connection issues.
    
    Usage:
        from app.core.supabase_client import reset_client
        reset_client()  # Forces reconnection on next get_supabase_client() call
    """
    global _supabase_client, _initialized
    
    with _client_lock:
        logger.info("🔄 Resetting Supabase client (will reconnect on next call)")
        _supabase_client = None
        _initialized = False


def get_connection_status() -> dict:
    """
    Get the current connection pool status.
    Useful for health checks and monitoring.
    
    Returns:
        dict with connection status information
    """
    return {
        "initialized": _initialized,
        "client_available": _supabase_client is not None,
        "supabase_package_available": SUPABASE_AVAILABLE,
        "connection_pooling": "singleton_pattern",
        "max_connections_note": "Supabase REST API handles pooling server-side"
    }


# ============================================================
# LEGACY COMPATIBILITY
# ============================================================
# For backwards compatibility with code that might import these directly
def create_supabase_client() -> Optional[Client]:
    """
    DEPRECATED: Use get_supabase_client() instead.
    This function exists for backwards compatibility only.
    """
    logger.warning("DEPRECATED: create_supabase_client() called. Use get_supabase_client() instead.")
    return get_supabase_client()
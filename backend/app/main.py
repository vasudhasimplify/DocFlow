from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import Dict, Any, Optional
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timedelta
import asyncio

# Load environment variables before importing settings
backend_dir = Path(__file__).parent.parent
env_file_path = backend_dir / ".env"
if env_file_path.exists():
    load_dotenv(env_file_path)

from .api.routes import analyze_router
from .api.quick_access import router as quick_access_router
from .api.checkinout import router as checkinout_router
from .api.checkout_requests import router as checkout_requests_router
from .api.ownership_transfers import router as ownership_transfers_router
from .api.shares import router as shares_router
from .api.rules import router as rules_router
from .api.guest import router as guest_router
from .api.share_link import router as share_link_router
from .api.signatures import router as signatures_router
from .api.watermarks import router as watermarks_router
from .api.migration import router as migration_router
from .api.retention import router as retention_router
from .api.legal_holds import router as legal_holds_router
from .api.document_editor import router as document_editor_router
from .api.ai_routes import router as ai_router
from .api.scanner_routes import router as scanner_router
from .api.workflows import router as workflows_router
from .api.document_fields import router as document_fields_router
from .core.config import settings

# Configure logging with both console and file handlers
log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

# Create logs directory if it doesn't exist
logs_dir = backend_dir / "logs"
logs_dir.mkdir(exist_ok=True)

def cleanup_old_logs(logs_directory: Path, retention_days: int):
    """
    Clean up old log files that are older than retention_days.
    
    Args:
        logs_directory: Path to the logs directory
        retention_days: Number of days to keep logs (0 = keep forever)
    """
    if retention_days <= 0:
        return  # Keep all logs if retention_days is 0 or negative
    
    cutoff_date = datetime.now() - timedelta(days=retention_days)
    deleted_count = 0
    total_size_freed = 0
    
    try:
        for log_file in logs_directory.glob("app_*.log*"):
            try:
                # Get file modification time
                file_mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
                
                # Delete if older than retention period
                if file_mtime < cutoff_date:
                    file_size = log_file.stat().st_size
                    log_file.unlink()
                    deleted_count += 1
                    total_size_freed += file_size
            except (OSError, ValueError) as e:
                # Skip files that can't be accessed or parsed
                continue
        
        if deleted_count > 0:
            size_mb = total_size_freed / (1024 * 1024)
            # Use print for cleanup messages since logger might not be configured yet
            print(f"🧹 Cleaned up {deleted_count} old log file(s) ({size_mb:.2f}MB freed)")
    except Exception as e:
        # Don't fail startup if cleanup fails
        # Use print for cleanup messages since logger might not be configured yet
        print(f"⚠️ Failed to cleanup old logs: {e}")

# Clean up old log files on startup
cleanup_old_logs(logs_dir, settings.LOG_RETENTION_DAYS)

# Generate log filename with date and time
timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_filename = logs_dir / f"app_{timestamp}.log"

# Configure root logger
root_logger = logging.getLogger()
root_logger.setLevel(log_level)

# Suppress verbose HTTP/2 HPACK debug logs from httpx/httpcore
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.hpack").setLevel(logging.WARNING)
logging.getLogger("hpack.table").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.INFO)  # Only show INFO and above
logging.getLogger("httpcore").setLevel(logging.INFO)  # Only show INFO and above
logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
logging.getLogger("httpcore.http11").setLevel(logging.WARNING)

# Clear any existing handlers
root_logger.handlers.clear()

# Create formatter
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Console handler (stdout)
console_handler = logging.StreamHandler()
console_handler.setLevel(log_level)
console_handler.setFormatter(formatter)
root_logger.addHandler(console_handler)

# File handler with rotation
max_bytes = settings.LOG_FILE_MAX_SIZE * 1024 * 1024  # Convert MB to bytes
file_handler = RotatingFileHandler(
    log_filename,
    maxBytes=max_bytes,
    backupCount=settings.LOG_FILE_BACKUP_COUNT,
    encoding='utf-8'
)
file_handler.setLevel(log_level)
file_handler.setFormatter(formatter)
root_logger.addHandler(file_handler)

logger = logging.getLogger(__name__)
logger.info(f"📝 Logging configured - Console: enabled, File: {log_filename}")
logger.info(f"📁 Log file will rotate at {settings.LOG_FILE_MAX_SIZE}MB, keeping {settings.LOG_FILE_BACKUP_COUNT} backups")
if settings.LOG_RETENTION_DAYS > 0:
    logger.info(f"🗑️ Old log files will be automatically deleted after {settings.LOG_RETENTION_DAYS} days")
else:
    logger.info(f"📦 Log retention disabled - all log files will be kept")

app = FastAPI(
    title="Document Analysis API",
    description="Smart Document Processing with AI-powered template matching",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4173",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:5173",
    ],
    # Allow local network IPs for cross-device testing
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analyze_router, prefix="/api/v1")
app.include_router(quick_access_router, prefix="/api/v1")
app.include_router(checkinout_router)
app.include_router(checkout_requests_router)
app.include_router(ownership_transfers_router)
app.include_router(shares_router)
app.include_router(rules_router)
app.include_router(guest_router)
app.include_router(share_link_router)
app.include_router(signatures_router)
app.include_router(watermarks_router)
app.include_router(migration_router)
app.include_router(retention_router)
app.include_router(legal_holds_router)
app.include_router(document_editor_router, prefix="/api")
app.include_router(ai_router)
app.include_router(scanner_router)
app.include_router(workflows_router)
app.include_router(document_fields_router, prefix="/api")

# ============================================================================
# WORKFLOW SCHEDULER BACKGROUND TASK
# ============================================================================

scheduler_task = None
scheduler_stop_event = asyncio.Event()

async def run_workflow_scheduler():
    """Background task to check and execute scheduled workflows every minute"""
    import sys
    print(">>> SCHEDULER FUNCTION STARTED <<<", file=sys.stderr, flush=True)
    
    from supabase import create_client
    from .services.workflow_scheduler import WorkflowScheduler
    from .core.config import settings
    import traceback
    
    print(">>> IMPORTS COMPLETED <<<", file=sys.stderr, flush=True)
    logger.info("🕐 Starting workflow scheduler background task")
    
    try:
        # Initialize Supabase client for scheduler
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        scheduler = WorkflowScheduler(supabase)
        logger.info("✅ Scheduler initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize scheduler: {str(e)}")
        logger.error(traceback.format_exc())
        return
    
    check_count = 0
    while True:  # Run forever in the daemon thread
        try:
            check_count += 1
            logger.info(f"🔄 Scheduler check #{check_count}")
            
            # Run scheduler check (includes both scheduled workflows and escalations)
            result = scheduler.check_and_execute_schedules()
            
            # Log schedule results
            schedule_result = result.get('schedules', {})
            if schedule_result.get('executed', 0) > 0:
                logger.info(f"⚡ Scheduler executed {schedule_result['executed']} workflows")
            
            if schedule_result.get('errors'):
                logger.warning(f"⚠️ Scheduler had {len(schedule_result['errors'])} errors")
            
            # Log escalation results
            escalation_result = result.get('escalations', {})
            if escalation_result.get('escalations_triggered', 0) > 0:
                logger.info(f"🚨 Triggered {escalation_result['escalations_triggered']} escalations, executed {escalation_result.get('actions_executed', 0)} actions")
            else:
                logger.info(f"✓ Scheduler check #{check_count} complete - no escalations triggered")
            
        except Exception as e:
            logger.error(f"❌ Scheduler error: {str(e)}")
            logger.error(traceback.format_exc())
        
        # Wait 60 seconds before next check
        logger.info("⏳ Waiting 2 hours seconds until next check...")
        await asyncio.sleep(7200.0)  # 7200 seconds (2 hours)
    
    logger.info("🛑 Scheduler stopped")

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup"""
    global scheduler_task
    import threading
    
    def run_scheduler_thread():
        """Run the scheduler in a separate thread with its own event loop"""
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(run_workflow_scheduler())
        except Exception as e:
            logger.error(f"❌ Scheduler thread error: {e}")
        finally:
            loop.close()
    
    try:
        logger.info("🚀 Starting background tasks...")
        # Start scheduler in a separate thread
        scheduler_thread = threading.Thread(target=run_scheduler_thread, daemon=True)
        scheduler_thread.start()
        logger.info("✅ Workflow scheduler started in background thread")
    except Exception as e:
        logger.error(f"❌ Failed to start background tasks: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """
    CRITICAL FIX #5: Cleanup on application shutdown
    Closes async HTTP clients and other resources to prevent memory leaks
    """
    global scheduler_task
    try:
        logger.info("🛑 Application shutting down - cleaning up resources...")
        
        # Stop scheduler task
        if scheduler_task:
            logger.info("🕐 Stopping workflow scheduler...")
            scheduler_stop_event.set()
            try:
                await asyncio.wait_for(scheduler_task, timeout=5.0)
                logger.info("✅ Workflow scheduler stopped")
            except asyncio.TimeoutError:
                logger.warning("⚠️ Scheduler stop timeout, cancelling task")
                scheduler_task.cancel()
        
        # Close async HTTP client from LLMClient
        from .api.routes import llm_client
        if llm_client and hasattr(llm_client, '_http_client') and llm_client._http_client:
            try:
                await llm_client.close()
                logger.info("✅ Async HTTP client closed")
            except Exception as e:
                logger.warning(f"⚠️ Error closing async HTTP client: {e}")
        
        # Cleanup cancellation tokens
        from .api.routes import _cancellation_tokens, _cancellation_lock
        with _cancellation_lock:
            _cancellation_tokens.clear()
            logger.info("✅ Cancellation tokens cleared")
        
        # Cleanup Supabase connection pool
        from .core.supabase_client import reset_client
        reset_client()
        logger.info("✅ Supabase connection pool cleaned up")
        
        logger.info("✅ Shutdown cleanup complete")
    except Exception as e:
        logger.error(f"❌ Error during shutdown cleanup: {e}")

@app.get("/")
async def root():
    return {"message": "Document Analysis API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "document-analysis-api"}

@app.get("/health/database")
async def database_health_check():
    """
    Health check endpoint for database connection.
    Shows connection pool status and tests database connectivity.
    """
    try:
        from .core.supabase_client import get_supabase_client, get_connection_status
        
        # Get connection pool status
        status = get_connection_status()
        
        # Test actual connectivity
        client = get_supabase_client()
        db_test_result = "unknown"
        
        if client:
            try:
                # Simple test query
                result = client.table('documents').select('id').limit(1).execute()
                db_test_result = "connected"
            except Exception as e:
                db_test_result = f"error: {str(e)[:100]}"
        else:
            db_test_result = "client_not_available"
        
        return {
            "status": "healthy" if db_test_result == "connected" else "degraded",
            "database": {
                "test_result": db_test_result,
                **status
            },
            "message": "Supabase singleton connection pool active" if status["initialized"] else "Supabase not initialized"
        }
    except Exception as e:
        return {
            "status": "error",
            "database": {"error": str(e)},
            "message": "Failed to check database health"
        }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
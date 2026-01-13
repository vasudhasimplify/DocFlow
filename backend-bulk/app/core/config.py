"""
Configuration settings for Bulk Processing API
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from pathlib import Path
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8001
    API_WORKERS: int = 4
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Database (Supabase PostgreSQL)
    # Format: postgresql+asyncpg://user:password@host:5432/dbname
    # Or: postgresql://user:password@host:5432/dbname (auto-converted)
    DATABASE_URL: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = Field(default="", validation_alias="SUPABASE_SERVICE_ROLE_KEY")  # Accept both names
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "backendbucket"  # Supabase Storage bucket name
    
    # Redis (optional - provide default for environments without Redis)
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PASSWORD: str = ""
    
    # Celery (uses REDIS_URL by default)
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    CELERY_WORKER_CONCURRENCY: int = 10
    CELERY_WORKER_MAX_TASKS_PER_CHILD: int = 1000
    
    # Processing Defaults
    DEFAULT_PARALLEL_WORKERS: int = 10
    DEFAULT_BATCH_SIZE: int = 50
    DEFAULT_MAX_RETRIES: int = 3
    DEFAULT_RETRY_DELAY: int = 60
    
    # PDF Processing
    PDF_PROCESSING_MAX_WORKERS: int = 10
    PDF_PROCESSING_MAX_THREADS: int = 4
    
    # Parallel Page Processing (Batch-based threading)
    PARALLEL_PAGE_WORKERS: int = 10  # Number of threads per document
    PAGES_PER_THREAD: int = 5  # Each thread processes N pages sequentially
    PROGRESS_CHECKPOINT_INTERVAL: int = 10  # Save progress every N pages
    MAX_TOKENS_PER_PAGE: int = 50000  # Maximum tokens per page extraction
    MAX_RETRIES_PER_PAGE: int = 3  # Maximum retries for failed pages
    RETRY_BACKOFF_BASE: int = 5  # Base seconds for exponential backoff (5s, 10s, 20s)
    PAGE_PROCESSING_TIMEOUT: int = 120  # Timeout per page in seconds
    
    # LLM Configuration
    LLM_PROVIDER: str = "gemini"  # "gemini" or "litellm"
    GEMINI_API_KEY: str = ""  # Direct Gemini API key
    EXTRACTION_MODEL: str = "gemini-2.0-flash"  # Model to use for extraction
    MAPPING_MODEL: str = "azure/gpt-4.1"  # Model to use for mapping
    
    # LiteLLM (legacy/fallback)
    LITELLM_API_URL: str = ""
    LITELLM_API_KEY: str = ""
    
    # Source Adapters
    FOLDER_WATCHER_ENABLED: bool = True
    DATABASE_SOURCE_ENABLED: bool = True
    CLOUD_STORAGE_ENABLED: bool = False
    
    # AWS S3 (if using cloud storage)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    S3_REGION: str = "us-east-1"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Allow extra fields in .env file


# Create settings instance
settings = Settings()

# Set Celery URLs to use REDIS_URL if not explicitly configured
if not settings.CELERY_BROKER_URL:
    settings.CELERY_BROKER_URL = settings.REDIS_URL
if not settings.CELERY_RESULT_BACKEND:
    settings.CELERY_RESULT_BACKEND = settings.REDIS_URL


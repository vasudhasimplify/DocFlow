from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional, Any
import os
from pathlib import Path
from dotenv import load_dotenv

class Settings(BaseSettings):
    # LLM Provider Configuration (read from backend/.env)
    LLM_PROVIDER: str = "litellm"  # Options: "litellm" or "gemini_direct"
    
    # LiteLLM Configuration (used when LLM_PROVIDER=litellm)
    LITELLM_API_URL: str = ""
    LITELLM_API_KEY: str = ""
    LITELLM_HEADER_NAME: str = "Authorization"
    LITELLM_AUTH_SCHEME: str = "Bearer"
    
    # Direct Gemini API Configuration (used when LLM_PROVIDER=gemini_direct)
    GEMINI_API_KEY: str = ""
    
    # LLM Output Configuration
    # Gemini 2.5 Flash supports up to 65536 output tokens
    # Increase this if you see JSON truncation errors
    LLM_MAX_OUTPUT_TOKENS: int = 16384  # Max output tokens for LLM responses (increase for complex pages)

    # Supabase Configuration (read from backend/.env)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Document Analysis Configuration
    MIN_CONFIDENCE_THRESHOLD: float = 0.6  # 60% minimum confidence

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
    
    # PDF Processing Configuration (Note: These are now hardcoded in pdf_processor.py for optimal performance)
    # - Scaling: 1.2x (hardcoded for balance between quality and token usage)
    # - Image Format: JPEG quality 85 (hardcoded for smaller file sizes)
    # - Max Pages: 2 (hardcoded - optimal limit before hallucination occurs)
    
    # Parallel Processing Configuration
    PDF_PROCESSING_MAX_WORKERS: int = 10  # Number of pages to process concurrently (default: 10)
    
    # Text Extraction Configuration
    PDF_PREFER_TEXT_EXTRACTION: bool = True  # Prefer text extraction over image conversion when possible
    PDF_TEXT_CONFIDENCE_THRESHOLD: float = 0.6  # Minimum confidence (0-1) to use text extraction
    
    # Logging Configuration
    LOG_FILE_MAX_SIZE: int = 50  # Maximum log file size in MB before rotation
    LOG_FILE_BACKUP_COUNT: int = 5  # Number of backup log files to keep
    LOG_RETENTION_DAYS: int = 1  # Number of days to keep old log files (0 = keep forever)
    
    # YOLO Signature Detection Configuration
    YOLO_SIGNATURE_ENABLED: bool = False  # Enable YOLO-based signature detection
    YOLO_SIGNATURE_MODEL_PATH: str = "models/signature_detector.pt"  # Path to YOLO signature model file
    YOLO_SIGNATURE_CONFIDENCE_THRESHOLD: float = 0.5  # Confidence threshold for signature detection
    YOLO_SIGNATURE_IOU_THRESHOLD: float = 0.45  # IoU threshold for NMS (signatures)
    
    # YOLO Face/Photo ID Detection Configuration
    YOLO_FACE_ENABLED: bool = False  # Enable YOLO-based face/photo ID detection
    YOLO_FACE_MODEL_PATH: str = "models/model.pt"  # Path to YOLO face detection model file
    YOLO_FACE_CONFIDENCE_THRESHOLD: float = 0.5  # Confidence threshold for face detection
    YOLO_FACE_IOU_THRESHOLD: float = 0.45  # IoU threshold for NMS (faces)
    
    # Shared YOLO Configuration
    YOLO_USE_GPU: bool = False  # Use GPU for YOLO inference (if available)
    
    # Legacy support - keep YOLO_MODEL_PATH for backward compatibility
    YOLO_MODEL_PATH: str = "models/signature_detector.pt"  # Deprecated: use YOLO_SIGNATURE_MODEL_PATH
    YOLO_CONFIDENCE_THRESHOLD: float = 0.5  # Deprecated: use YOLO_SIGNATURE_CONFIDENCE_THRESHOLD
    YOLO_IOU_THRESHOLD: float = 0.45  # Deprecated: use YOLO_SIGNATURE_IOU_THRESHOLD
    
    @field_validator('YOLO_SIGNATURE_ENABLED', 'YOLO_FACE_ENABLED', 'YOLO_USE_GPU', mode='before')
    @classmethod
    def parse_bool(cls, value: Any) -> bool:
        """Parse boolean from various string formats (handles 'disable', 'enable', etc.)"""
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ('true', '1', 'yes', 'on', 'enable', 'enabled'):
                return True
            elif value_lower in ('false', '0', 'no', 'off', 'disable', 'disabled'):
                return False
        # If it's already a bool or can't parse, return as-is (Pydantic will handle validation)
        return value
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables (e.g., from Coolify)

# Load environment variables strictly from backend/.env
backend_dir = Path(__file__).resolve().parent.parent.parent
env_file_path = backend_dir / ".env"
load_dotenv(env_file_path)

settings = Settings()

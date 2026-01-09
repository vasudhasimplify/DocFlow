/**
 * Application-wide constants
 * Centralized configuration values used throughout the app
 */

export const APP_CONFIG = {
  // Application metadata
  NAME: 'SimplifyAI DocFlow',
  DESCRIPTION: 'Smart Document Processing with AI-powered template creation, form generation, and intelligent data extraction',
  VERSION: '1.0.0',
  
  // File upload limits
  // MAX_FILE_SIZE removed - no file size limit
  MAX_FILES_BATCH: 5,
  
  // Supported file types
  SUPPORTED_FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml'],
    DOCUMENTS: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf'
    ],
    ARCHIVES: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    ALL: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/rtf',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed'
    ]
  },
  
  // Processing limits
  MAX_PROCESSING_TIME: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  
  // UI constants
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEBOUNCE_DELAY: 300,
  
  // Storage buckets
  STORAGE_BUCKETS: {
    DOCUMENTS: 'documents',
    TEMPLATES: 'templates',
    AVATARS: 'avatars',
    EXPORTS: 'exports'
  }
} as const;

/**
 * Document processing workflow steps
 */
export const WORKFLOW_STEPS = {
  CAPTURE: {
    key: 'capture',
    title: 'Document Capture',
    description: 'Upload or capture your document',
    order: 1
  },
  UNDERSTAND: {
    key: 'understand',
    title: 'Document Analysis', 
    description: 'AI analyzes document structure and content',
    order: 2
  },
  PROCESS: {
    key: 'process',
    title: 'Data Processing',
    description: 'Extract and validate document data',
    order: 3
  },
  FINALIZE: {
    key: 'finalize',
    title: 'Finalization',
    description: 'Review and save processed results',
    order: 4
  }
} as const;

/**
 * Document analysis tasks
 */
export const ANALYSIS_TASKS = {
  OCR: 'ocr',
  FIELD_DETECTION: 'field_detection', 
  TEMPLATE_MATCHING: 'template_matching'
} as const;

/**
 * Processing status types
 */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  CANCELLED: 'cancelled'
} as const;

/**
 * Template field types
 */
export const FIELD_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SELECT: 'select',
  TEXTAREA: 'textarea',
  FILE: 'file'
} as const;

/**
 * Form validation rules
 */
export const VALIDATION_RULES = {
  REQUIRED: 'required',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern',
  EMAIL: 'email',
  URL: 'url',
  NUMERIC: 'numeric'
} as const;

/**
 * Theme and styling constants
 */
export const THEME = {
  COLORS: {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'destructive',
    MUTED: 'muted'
  },
  SIZES: {
    XS: 'xs',
    SM: 'sm', 
    MD: 'md',
    LG: 'lg',
    XL: 'xl'
  },
  VARIANTS: {
    DEFAULT: 'default',
    OUTLINE: 'outline',
    GHOST: 'ghost',
    LINK: 'link'
  }
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  // File upload errors
  FILE_TOO_LARGE: `File size exceeds limit`, // File size limit removed
  INVALID_FILE_TYPE: 'File type not supported',
  UPLOAD_FAILED: 'Failed to upload file',
  
  // Processing errors
  PROCESSING_FAILED: 'Document processing failed',
  ANALYSIS_TIMEOUT: 'Document analysis timed out',
  TEMPLATE_NOT_FOUND: 'No matching template found',
  
  // Authentication errors
  AUTH_REQUIRED: 'Authentication required',
  ACCESS_DENIED: 'Access denied',
  SESSION_EXPIRED: 'Session expired, please login again',
  
  // Generic errors
  NETWORK_ERROR: 'Network error, please check your connection',
  UNKNOWN_ERROR: 'An unexpected error occurred',
  VALIDATION_ERROR: 'Please check your input and try again'
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  // Document operations
  DOCUMENT_UPLOADED: 'Document uploaded successfully',
  DOCUMENT_PROCESSED: 'Document processed successfully',
  DOCUMENT_SAVED: 'Document saved successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  
  // Template operations
  TEMPLATE_CREATED: 'Template created successfully',
  TEMPLATE_UPDATED: 'Template updated successfully',
  TEMPLATE_DELETED: 'Template deleted successfully',
  
  // Form operations
  FORM_CREATED: 'Form created successfully',
  FORM_UPDATED: 'Form updated successfully',
  FORM_SUBMITTED: 'Form submitted successfully',
  
  // Generic operations
  OPERATION_SUCCESS: 'Operation completed successfully',
  SETTINGS_SAVED: 'Settings saved successfully'
} as const;

/**
 * API endpoints (relative to Supabase base URL)
 */
export const API_ENDPOINTS = {
  // Edge functions
  ANALYZE_DOCUMENT: 'analyze-document',
  GENERATE_EMBEDDINGS: 'generate-embeddings', 
  SEMANTIC_SEARCH: 'semantic-search',
  ORGANIZE_DOCUMENTS: 'organize-existing-documents',
  ORGANIZE_SMART_FOLDERS: 'organize-smart-folders',
  GENERATE_FORM_APP: 'generate-form-app'
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'simplify_user_preferences',
  RECENT_DOCUMENTS: 'simplify_recent_documents',
  DRAFT_TEMPLATES: 'simplify_draft_templates',
  FORM_DRAFTS: 'simplify_form_drafts'
} as const;
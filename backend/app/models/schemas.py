from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class DocumentAnalysisRequest(BaseModel):
    documentData: str
    task: str
    documentName: Optional[str] = None
    userId: Optional[str] = None
    saveToDatabase: bool = False
    documentId: Optional[str] = None  # If provided, update existing document instead of creating new
    enhancedTemplates: Optional[List[Dict[str, Any]]] = None
    maxWorkers: Optional[int] = None  # Number of parallel async workers for LLM API calls (I/O-bound)
    maxThreads: Optional[int] = None  # Number of parallel threads for PDF conversion (CPU-bound)
    yoloSignatureEnabled: Optional[bool] = None  # Enable/disable YOLO signature detection (overrides env variable)
    yoloFaceEnabled: Optional[bool] = None  # Enable/disable YOLO face/photo ID detection (overrides env variable)
    documentType: Optional[str] = None  # Document type (e.g., "bank_statement") for special processing logic
    skipWorkflowTrigger: Optional[bool] = False  # Skip auto-triggering workflows on document upload

class FieldPosition(BaseModel):
    x: float
    y: float
    width: Optional[float] = None
    height: Optional[float] = None

class ExtractedField(BaseModel):
    id: str
    label: str
    type: str
    value: str
    confidence: float
    position: Optional[FieldPosition] = None
    suggested: bool = False

class TemplateMatch(BaseModel):
    id: str
    name: str
    confidence: float
    version: str
    documentType: str
    matchedFields: List[str]
    totalFields: int

class AnalysisResult(BaseModel):
    success: bool
    task: str
    result: Dict[str, Any]
    usage: Optional[Dict[str, Any]] = None
    savedDocument: Optional[Dict[str, Any]] = None
    convertedImages: Optional[List[str]] = None  # Store the exact images sent to LLM

class DocumentAnalysisResponse(BaseModel):
    success: bool
    task: str
    result: Dict[str, Any]
    usage: Optional[Dict[str, Any]] = None
    savedDocument: Optional[Dict[str, Any]] = None
    convertedImages: Optional[List[str]] = None  # Store the exact images sent to LLM
    error: Optional[str] = None
    timestamp: Optional[str] = None
    warnings: Optional[List[Dict[str, Any]]] = None  # Failed pages info: [{"page_num": 1, "error": "...", "retry_count": 1, "failed_stage": "..."}]
    requestId: Optional[str] = None  # Request ID for cancellation support

# Semantic Search Models
class SemanticSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10
    threshold: Optional[float] = 0.7
    userId: Optional[str] = None

class SemanticSearchResult(BaseModel):
    id: str
    title: Optional[str] = None
    description: Optional[str] = None
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    extracted_text: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    document_type: Optional[str] = None
    file_size: Optional[int] = None
    processing_status: Optional[str] = None
    similarity: float
    relevanceScore: int

class SemanticSearchResponse(BaseModel):
    results: List[SemanticSearchResult]
    query: str
    totalFound: int

# Organize Documents Models
class OrganizeDocumentsRequest(BaseModel):
    folderId: str

class OrganizeDocumentsResult(BaseModel):
    documentId: str
    documentName: str
    confidence: float
    reasons: List[str]

class OrganizeDocumentsResponse(BaseModel):
    success: bool
    folderId: str
    folderName: str
    documentsEvaluated: int
    documentsAdded: int
    organizationResults: List[OrganizeDocumentsResult]
    message: str

# Organize Smart Folders Models
class OrganizeSmartFoldersRequest(BaseModel):
    documentId: str

class OrganizeSmartFoldersResult(BaseModel):
    folderId: str
    folderName: str
    confidence: float
    reasons: List[str]

class OrganizeSmartFoldersResponse(BaseModel):
    success: bool
    documentId: str
    organizationResults: List[OrganizeSmartFoldersResult]
    message: str

# Auto-Organize Documents by Type Models
class AutoOrganizeRequest(BaseModel):
    userId: str

class FolderCreated(BaseModel):
    folderId: str
    folderName: str
    documentType: str
    documentCount: int
    color: str

class AutoOrganizeResponse(BaseModel):
    success: bool
    foldersCreated: List[FolderCreated]
    documentsOrganized: int
    message: str

# Process Pending Documents Models
class ProcessPendingRequest(BaseModel):
    userId: str
    documentIds: Optional[List[str]] = None

class ProcessedDocument(BaseModel):
    documentId: str
    fileName: str
    documentType: str
    status: str

class ProcessPendingResponse(BaseModel):
    success: bool
    processedCount: int
    documents: List[ProcessedDocument]
    message: str

# Generate Form App Models
class FormField(BaseModel):
    id: str
    label: str
    type: str
    required: bool
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None

class FormConfig(BaseModel):
    formTitle: str
    formDescription: Optional[str] = None
    fields: List[FormField]

class GenerateFormAppRequest(BaseModel):
    formConfig: Optional[FormConfig] = None
    application: Optional[Dict[str, Any]] = None
    forms: Optional[List[Dict[str, Any]]] = None
    type: Optional[str] = None

class GenerateFormAppResponse(BaseModel):
    appName: str
    files: Dict[str, str]

# Generate Embeddings Models
class GenerateEmbeddingsRequest(BaseModel):
    text: str
    documentId: Optional[str] = None

class GenerateEmbeddingsResponse(BaseModel):
    embedding: List[float]
    dimensions: int

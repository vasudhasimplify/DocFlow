"""
Semantic Search Service
Handles vector similarity search for document retrieval using embeddings.
"""

import logging
import os
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import json
from dotenv import load_dotenv

try:
    from supabase import create_client
except Exception:  # pragma: no cover
    create_client = None  # type: ignore

from .embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

class SemanticSearchService:
    """Service for semantic search using vector embeddings."""
    
    def __init__(self):
        """Initialize the semantic search service."""
        self.supabase = self._initialize_supabase()
        self.embedding_service = EmbeddingService()
        
        logger.info("✅ SemanticSearchService initialized")
    
    def _initialize_supabase(self):
        """Initialize Supabase client."""
        try:
            # Load environment variables from backend/.env file
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            env_file_path = os.path.join(backend_dir, ".env")
            load_dotenv(env_file_path)
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_key:
                logger.warning("Supabase credentials not found, semantic search will be disabled")
                return None
            
            if create_client is None:
                logger.warning("Supabase client not available, semantic search will be disabled")
                return None
            
            supabase = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabase client initialized for semantic search")
            return supabase
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            return None
    
    async def search_documents(
        self,
        query: str,
        user_id: str,
        limit: int = 10,
        similarity_threshold: float = 0.7,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search documents using semantic similarity.
        
        Args:
            query: The search query text
            user_id: User ID to filter results
            limit: Maximum number of results to return
            similarity_threshold: Minimum similarity score (0-1)
            filters: Additional filters (file_type, date_range, etc.)
            
        Returns:
            Dictionary containing search results and metadata
        """
        try:
            if not self.supabase:
                logger.warning("Supabase not available for semantic search")
                return {"results": [], "total": 0, "error": "Database not available"}
            
            if not query or not query.strip():
                logger.warning("Empty query provided for semantic search")
                return {"results": [], "total": 0, "error": "Empty query"}
            
            logger.info(f"🔍 Starting semantic search for query: '{query}'")
            
            # Generate embedding for the query
            query_embedding = await self.embedding_service.generate_embedding(query.strip())
            if not query_embedding:
                logger.error("Failed to generate query embedding")
                return {"results": [], "total": 0, "error": "Failed to generate query embedding"}
            
            logger.info(f"✅ Generated query embedding with {len(query_embedding)} dimensions")
            
            # Perform vector similarity search
            search_results = await self._perform_vector_search(
                query_embedding, user_id, limit, similarity_threshold, filters
            )
            
            # Process and rank results
            processed_results = self._process_search_results(search_results, query)
            
            logger.info(f"✅ Found {len(processed_results)} documents matching query")
            
            return {
                "results": processed_results,
                "total": len(processed_results),
                "query": query,
                "similarity_threshold": similarity_threshold,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return {"results": [], "total": 0, "error": str(e)}
    
    async def _perform_vector_search(
        self,
        query_embedding: List[float],
        user_id: str,
        limit: int,
        similarity_threshold: float,
        filters: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Perform vector similarity search using document_chunks table."""
        try:
            # Build the SQL query for vector similarity search on document_chunks
            # Using cosine similarity with IVFFlat index
            base_query = f"""
                SELECT 
                    d.id,
                    d.user_id,
                    d.file_name,
                    d.file_type,
                    d.file_size,
                    d.storage_path,
                    d.processing_status,
                    d.analysis_result,
                    d.created_at,
                    d.updated_at,
                    dc.chunk_text,
                    dc.chunk_index,
                    1 - (dc.chunk_embedding <=> %s) as similarity_score
                FROM document_chunks dc
                INNER JOIN documents d ON dc.document_id = d.id
                WHERE 
                    d.user_id = %s 
                    AND dc.chunk_embedding IS NOT NULL
                    AND 1 - (dc.chunk_embedding <=> %s) >= %s
                ORDER BY dc.chunk_embedding <=> %s
                LIMIT %s
            """
            
            # Prepare parameters
            params = [
                query_embedding,  # For similarity calculation
                user_id,          # User filter
                query_embedding,  # For threshold check
                similarity_threshold,  # Minimum similarity
                query_embedding,  # For ordering
                limit             # Limit results
            ]
            
            # Add additional filters if provided
            if filters:
                if filters.get("file_type"):
                    base_query = base_query.replace("LIMIT %s", "AND d.file_type = %s LIMIT %s")
                    params.insert(-1, filters["file_type"])
                
                if filters.get("date_from"):
                    base_query = base_query.replace("LIMIT %s", "AND d.created_at >= %s LIMIT %s")
                    params.insert(-1, filters["date_from"])
                
                if filters.get("date_to"):
                    base_query = base_query.replace("LIMIT %s", "AND d.created_at <= %s LIMIT %s")
                    params.insert(-1, filters["date_to"])
            
            logger.info(f"🔍 Executing vector similarity search on document_chunks with {len(params)} parameters")
            
            # Execute the query using the rewritten SQL function
            try:
                # Convert query_embedding to JSON string for PostgreSQL
                import json
                query_vector_str = json.dumps(query_embedding)
                
                logger.info("🚀 Using VECTOR SEARCH (SQL function) for fast similarity search")
                
                response = self.supabase.rpc(
                    'search_document_chunks_by_similarity',
                    {
                        'query_embedding': query_vector_str,
                        'user_id_param': user_id,
                        'similarity_threshold': similarity_threshold,
                        'limit_count': limit
                    }
                ).execute()
                
                logger.info(f"🚀 VECTOR SEARCH returned: {len(response.data) if response.data else 0} results")
                
                if response.data:
                    logger.info("✅ VECTOR SEARCH successful - using database-level vector operations")
                    return response.data
                else:
                    logger.warning("⚠️ VECTOR SEARCH returned no results")
                    return []
            except Exception as e:
                logger.error(f"❌ VECTOR SEARCH failed: {e}")
                return []
            
            if response.data:
                logger.info(f"✅ Vector search returned {len(response.data)} results")
                return response.data
            else:
                logger.warning("No results returned from vector search, trying manual calculation")
                # Try manual similarity search when SQL returns no results
                return await self._manual_similarity_search(query_embedding, user_id, similarity_threshold, limit)
                
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            # Fallback to simple text search if vector search fails
            return await self._fallback_text_search(user_id, limit, filters)
    
    async def _fallback_text_search(
        self,
        user_id: str,
        limit: int,
        filters: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Fallback to simple text search if vector search fails."""
        try:
            logger.info("🔄 Falling back to text search")
            
            query = self.supabase.table("documents").select("*").eq("user_id", user_id)
            
            if filters:
                if filters.get("file_type"):
                    query = query.eq("file_type", filters["file_type"])
                if filters.get("date_from"):
                    query = query.gte("created_at", filters["date_from"])
                if filters.get("date_to"):
                    query = query.lte("created_at", filters["date_to"])
            
            response = query.limit(limit).execute()
            
            if response.data:
                # Add dummy similarity scores for fallback results
                for doc in response.data:
                    doc["similarity_score"] = 0.5  # Neutral score for fallback
                
                logger.info(f"✅ Fallback search returned {len(response.data)} results")
                return response.data
            else:
                return []
                
        except Exception as e:
            logger.error(f"Error in fallback search: {e}")
            return []
    
    async def _manual_similarity_search(self, query_embedding: List[float], user_id: str, 
                                      similarity_threshold: float, limit: int) -> List[Dict[str, Any]]:
        """
        Manual similarity search fallback using document_chunks table.
        Python-based cosine similarity calculation when SQL vector operations fail.
        """
        try:
            import json
            import numpy as np
            
            logger.info("🔄 Performing MANUAL SEARCH on document_chunks (Python-based similarity)...")
            
            # Get all chunks for the user's documents
            response = self.supabase.table("document_chunks").select(
                "id, document_id, chunk_index, chunk_text, chunk_embedding, "
                "documents!inner(id, user_id, file_name, file_type, file_size, storage_path, "
                "processing_status, analysis_result, created_at, updated_at)"
            ).eq("documents.user_id", user_id).execute()
            
            logger.info(f"📋 Database response: {len(response.data) if response.data else 0} chunks")
            
            if not response.data:
                logger.info("No chunks found for manual search")
                return []
            
            results = []
            query_vector = np.array(query_embedding)
            query_norm = query_vector / np.linalg.norm(query_vector)
            
            for chunk in response.data:
                try:
                    chunk_embedding = chunk.get('chunk_embedding')
                    if not chunk_embedding:
                        continue
                    
                    # Parse vector from JSON string if needed
                    if isinstance(chunk_embedding, str):
                        chunk_vector = json.loads(chunk_embedding)
                    else:
                        chunk_vector = chunk_embedding
                    
                    if not isinstance(chunk_vector, list) or len(chunk_vector) != len(query_embedding):
                        continue
                    
                    # Calculate cosine similarity
                    chunk_vector_np = np.array(chunk_vector)
                    chunk_norm = chunk_vector_np / np.linalg.norm(chunk_vector_np)
                    similarity = float(np.dot(query_norm, chunk_norm))
                    
                    if similarity >= similarity_threshold:
                        # Get document data (nested in chunks query)
                        doc_data = chunk.get('documents', {})
                        
                        result = {
                            'id': doc_data.get('id'),
                            'user_id': doc_data.get('user_id'),
                            'file_name': doc_data.get('file_name'),
                            'file_type': doc_data.get('file_type'),
                            'file_size': doc_data.get('file_size'),
                            'storage_path': doc_data.get('storage_path'),
                            'processing_status': doc_data.get('processing_status'),
                            'analysis_result': doc_data.get('analysis_result'),
                            'created_at': doc_data.get('created_at'),
                            'updated_at': doc_data.get('updated_at'),
                            'chunk_text': chunk.get('chunk_text'),
                            'chunk_index': chunk.get('chunk_index'),
                            'similarity_score': similarity
                        }
                        
                        results.append(result)
                        
                except Exception as e:
                    logger.warning(f"Error processing chunk: {e}")
                    continue
            
            # Sort by similarity score (descending) and limit results
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            results = results[:limit]
            
            logger.info(f"✅ MANUAL SEARCH completed - returned {len(results)} results from chunks")
            return results
            
        except Exception as e:
            logger.error(f"Error in manual similarity search: {e}")
            return []
    
    def _process_search_results(
        self,
        results: List[Dict[str, Any]],
        query: str
    ) -> List[Dict[str, Any]]:
        """Process and enhance search results."""
        try:
            processed_results = []
            
            for result in results:
                # Extract key information
                processed_result = {
                    "id": result.get("id"),
                    "file_name": result.get("file_name", "Unknown"),
                    "file_type": result.get("file_type", "Unknown"),
                    "file_size": result.get("file_size", 0),
                    "storage_path": result.get("storage_path"),
                    "processing_status": result.get("processing_status", "Unknown"),
                    "created_at": result.get("created_at"),
                    "updated_at": result.get("updated_at"),
                    "similarity_score": result.get("similarity_score", 0.0),
                    "analysis_result": result.get("analysis_result", {}),  # Include full analysis_result
                    "analysis_summary": self._extract_analysis_summary(result.get("analysis_result", {})),
                    "relevant_fields": self._find_relevant_fields(result.get("analysis_result", {}), query)
                }
                
                processed_results.append(processed_result)
            
            # Sort by similarity score (highest first)
            processed_results.sort(key=lambda x: x["similarity_score"], reverse=True)
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Error processing search results: {e}")
            return []
    
    def _extract_analysis_summary(self, analysis_result: Dict[str, Any]) -> str:
        """Extract a summary from the analysis result."""
        try:
            if not analysis_result:
                return "No analysis data available"
            
            # Extract key fields for summary
            summary_parts = []
            
            if isinstance(analysis_result, dict):
                # Look for common fields
                if "fields" in analysis_result and isinstance(analysis_result["fields"], list):
                    field_count = len(analysis_result["fields"])
                    summary_parts.append(f"{field_count} fields extracted")
                
                # Look for specific document types
                if "_parsed" in analysis_result:
                    parsed_data = analysis_result["_parsed"]
                    if isinstance(parsed_data, dict):
                        # Check for common document types
                        if any(key.lower() in ["registration", "application", "form"] for key in parsed_data.keys()):
                            summary_parts.append("Registration/Application form")
                        elif any(key.lower() in ["certificate", "license", "permit"] for key in parsed_data.keys()):
                            summary_parts.append("Certificate/License document")
                        elif any(key.lower() in ["invoice", "bill", "receipt"] for key in parsed_data.keys()):
                            summary_parts.append("Financial document")
                        else:
                            summary_parts.append("Structured document")
            
            return " | ".join(summary_parts) if summary_parts else "Document analysis completed"
            
        except Exception as e:
            logger.error(f"Error extracting analysis summary: {e}")
            return "Analysis summary unavailable"
    
    def _find_relevant_fields(
        self,
        analysis_result: Dict[str, Any],
        query: str
    ) -> List[Dict[str, str]]:
        """Find fields that are relevant to the search query."""
        try:
            relevant_fields = []
            query_lower = query.lower()
            
            if not analysis_result or not isinstance(analysis_result, dict):
                return relevant_fields
            
            # Search in fields array
            if "fields" in analysis_result and isinstance(analysis_result["fields"], list):
                for field in analysis_result["fields"]:
                    if isinstance(field, dict):
                        field_name = field.get("name", field.get("label", ""))
                        field_value = field.get("value", "")
                        
                        # Check if field name or value contains query terms
                        if (query_lower in field_name.lower() or 
                            query_lower in str(field_value).lower()):
                            relevant_fields.append({
                                "name": field_name,
                                "value": str(field_value)[:100] + "..." if len(str(field_value)) > 100 else str(field_value)
                            })
            
            # Search in _parsed data
            if "_parsed" in analysis_result:
                parsed_data = analysis_result["_parsed"]
                if isinstance(parsed_data, dict):
                    for key, value in parsed_data.items():
                        if query_lower in key.lower() or query_lower in str(value).lower():
                            relevant_fields.append({
                                "name": key,
                                "value": str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                            })
            
            return relevant_fields[:5]  # Limit to 5 most relevant fields
            
        except Exception as e:
            logger.error(f"Error finding relevant fields: {e}")
            return []
    
    async def get_similar_documents(
        self,
        document_id: str,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Find documents similar to a given document."""
        try:
            if not self.supabase:
                return []
            
            # Get the document's embedding
            # Get first chunk embedding from the document (using chunk_index = 0)
            chunk_response = self.supabase.table("document_chunks").select("chunk_embedding").eq("document_id", document_id).eq("chunk_index", 0).execute()
            
            if not chunk_response.data or not chunk_response.data[0].get("chunk_embedding"):
                logger.warning(f"Document {document_id} not found or has no embedding chunks")
                return []
            
            document_embedding = chunk_response.data[0]["chunk_embedding"]
            
            # Search for similar documents using chunk embeddings
            similar_results = await self._perform_vector_search(
                document_embedding, user_id, limit + 1, 0.6, None
            )
            
            # Remove the original document from results
            similar_results = [doc for doc in similar_results if doc.get("id") != document_id]
            
            return similar_results[:limit]
            
        except Exception as e:
            logger.error(f"Error finding similar documents: {e}")
            return []

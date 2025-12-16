"""
AI-powered document importance scoring for Quick Access feature.

This service calculates relevance scores for documents based on:
- Access frequency (40%)
- Recency (30%)  
- Document type importance (20%)
- Collaboration activity (10%)
"""

from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class QuickAccessAIService:
    """AI-powered document importance scoring for Quick Access"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        
    async def calculate_document_score(
        self, 
        document_id: str, 
        user_id: str
    ) -> Tuple[float, str]:
        """
        Calculate AI score (0-1) and reason for a document.
        
        Args:
            document_id: UUID of the document
            user_id: UUID of the user
            
        Returns:
            Tuple of (score, reason) where score is 0-1 and reason is human-readable
        """
        try:
            # Get document metadata
            doc = await self._get_document_metadata(document_id)
            
            # Get access history
            access_data = await self._get_access_history(document_id, user_id)
            
            # Calculate component scores
            frequency_score = self._calculate_frequency_score(access_data)
            recency_score = self._calculate_recency_score(access_data)
            type_score = self._calculate_type_importance(doc)
            collab_score = await self._calculate_collaboration_score(document_id)
            
            # Weighted average
            final_score = (
                frequency_score * 0.4 +
                recency_score * 0.3 +
                type_score * 0.2 +
                collab_score * 0.1
            )
            
            # Generate human-readable reason with access data
            reason = self._generate_reason(
                frequency_score, recency_score, type_score, collab_score, doc, access_data
            )
            
            return round(final_score, 3), reason
            
        except Exception as e:
            logger.error(f"Error calculating score for document {document_id}: {e}")
            return 0.0, "Unable to calculate score"
    
    def _calculate_frequency_score(self, access_data: Dict) -> float:
        """Score based on access count (normalized to 0-1)"""
        count = access_data.get('access_count', 0)
        # Normalize: 10+ accesses = 1.0, logarithmic scaling
        if count == 0:
            return 0.0
        import math
        return min(math.log(count + 1) / math.log(11), 1.0)
    
    def _calculate_recency_score(self, access_data: Dict) -> float:
        """Score based on how recently accessed (exponential decay)"""
        last_accessed = access_data.get('last_accessed_at')
        if not last_accessed:
            return 0.0
        
        try:
            if isinstance(last_accessed, str):
                last_accessed = datetime.fromisoformat(last_accessed.replace('Z', '+00:00'))
            
            days_ago = (datetime.now(last_accessed.tzinfo) - last_accessed).days
            # Exponential decay: 1.0 if today, 0.5 if 7 days ago, ~0 if 30+ days
            return max(0, 1.0 - (days_ago / 30))
        except Exception as e:
            logger.warning(f"Error calculating recency: {e}")
            return 0.0
    
    def _calculate_type_importance(self, doc: Dict) -> float:
        """Score based on document type (business-critical types score higher)"""
        type_scores = {
            'contract': 0.95,
            'invoice': 0.90,
            'agreement': 0.90,
            'report': 0.80,
            'presentation': 0.75,
            'spreadsheet': 0.75,
            'application/pdf': 0.70,
            'pdf': 0.70,
            'excel': 0.70,
            'word': 0.65,
            'powerpoint': 0.65,
            'image': 0.40,
            'text': 0.50,
        }
        
        doc_type = (doc.get('document_type') or '').lower()
        mime_type = (doc.get('mime_type') or '').lower()
        file_name = (doc.get('file_name') or '').lower()
        
        # Check all fields for type indicators
        for key, score in type_scores.items():
            if key in doc_type or key in mime_type or key in file_name:
                return score
        
        return 0.50  # default moderate importance
    
    async def _calculate_collaboration_score(self, document_id: str) -> float:
        """Score based on sharing and collaboration activity"""
        try:
            # Check if document is shared
            shares_response = self.supabase.table('share_links')\
                .select('id')\
                .eq('resource_id', document_id)\
                .eq('is_active', True)\
                .execute()
            
            # Check external shares
            ext_shares_response = self.supabase.table('external_shares')\
                .select('id')\
                .eq('resource_id', document_id)\
                .in_('status', ['pending', 'accepted'])\
                .execute()
            
            share_count = len(shares_response.data or [])
            ext_count = len(ext_shares_response.data or [])
            collab_count = share_count + ext_count
            
            # Normalize: 5+ collaborations = 1.0
            return min(collab_count / 5, 1.0)
        except Exception as e:
            logger.warning(f"Error calculating collaboration score: {e}")
            return 0.0
    
    def _generate_reason(
        self, 
        freq: float, 
        recency: float, 
        type_s: float, 
        collab: float,
        doc: Dict,
        access_data: Dict
    ) -> str:
        """Generate human-readable explanation with specific details"""
        reasons = []
        access_count = access_data.get('access_count', 0)
        last_accessed = access_data.get('last_accessed_at')
        
        # Frequency with specific numbers
        if access_count > 0:
            if freq >= 0.7:
                reasons.append(f"opened {access_count} times")
            elif freq >= 0.4:
                reasons.append(f"accessed {access_count} times")
            elif access_count >= 2:
                reasons.append(f"viewed {access_count} times")
        
        # Recency with specific timeframe
        if last_accessed:
            try:
                if isinstance(last_accessed, str):
                    last_accessed_dt = datetime.fromisoformat(last_accessed.replace('Z', '+00:00'))
                else:
                    last_accessed_dt = last_accessed
                    
                days_ago = (datetime.now(last_accessed_dt.tzinfo) - last_accessed_dt).days
                
                if recency >= 0.8:
                    if days_ago == 0:
                        reasons.append("accessed today")
                    elif days_ago == 1:
                        reasons.append("accessed yesterday")
                    else:
                        reasons.append(f"accessed {days_ago} days ago")
                elif recency >= 0.5:
                    reasons.append(f"used {days_ago} days ago")
            except Exception as e:
                logger.debug(f"Error parsing last_accessed: {e}")
        
        # Document type with specificity
        doc_type = (doc.get('document_type') or '').lower()
        file_name = (doc.get('file_name') or '').lower()
        
        if type_s >= 0.85:
            # Detect specific important types
            if 'contract' in doc_type or 'contract' in file_name:
                reasons.append("critical contract")
            elif 'invoice' in doc_type or 'invoice' in file_name:
                reasons.append("important invoice")
            elif 'agreement' in doc_type or 'agreement' in file_name:
                reasons.append("key agreement")
            elif 'report' in doc_type or 'report' in file_name:
                reasons.append("important report")
            else:
                reasons.append("high-priority document")
        elif type_s >= 0.7:
            reasons.append("important file type")
        
        # Collaboration with numbers
        if collab >= 0.6:
            share_count = int(collab * 5)  # Reverse the normalization
            reasons.append(f"shared with {share_count}+ people")
        elif collab >= 0.3:
            reasons.append("shared with team")
        
        # Add file size context for large files
        file_size = doc.get('file_size', 0)
        if file_size > 10 * 1024 * 1024:  # >10MB
            size_mb = file_size / (1024 * 1024)
            reasons.append(f"large file ({size_mb:.0f}MB)")
        
        # Fallback with better default
        if not reasons:
            if access_count > 0:
                return f"Accessed {access_count} time{'s' if access_count > 1 else ''} - relevant to your work"
            return "Relevant based on document characteristics"
        
        return ' • '.join(reasons)
    
    async def batch_calculate_scores(self, user_id: str, limit: Optional[int] = None) -> int:
        """
        Calculate scores for all user documents.
        
        Args:
            user_id: UUID of the user
            limit: Optional limit on number of documents to process
            
        Returns:
            Number of documents updated
        """
        try:
            # Get all documents user has access to
            query = self.supabase.table('documents')\
                .select('id, file_name, document_type, mime_type, created_at')\
                .or_(f'uploaded_by.eq.{user_id},user_id.eq.{user_id}')
            
            if limit:
                query = query.limit(limit)
            
            docs_response = query.execute()
            
            updated_count = 0
            for doc in docs_response.data or []:
                try:
                    score, reason = await self.calculate_document_score(
                        doc['id'], user_id
                    )
                    
                    # Always upsert to track all documents (even with low scores)
                    # This ensures proper tracking and helps identify unused documents
                    await self._upsert_quick_access(
                        doc['id'], user_id, score, reason
                    )
                    updated_count += 1
                except Exception as e:
                    logger.error(f"Error calculating score for {doc['id']}: {e}")
                    continue
            
            logger.info(f"Updated {updated_count} documents for user {user_id}")
            return updated_count
            
        except Exception as e:
            logger.error(f"Error in batch calculation: {e}")
            return 0
    
    async def _get_document_metadata(self, document_id: str) -> Dict:
        """Fetch document metadata"""
        try:
            response = self.supabase.table('documents')\
                .select('id, file_name, document_type, mime_type, file_size, created_at')\
                .eq('id', document_id)\
                .single()\
                .execute()
            return response.data or {}
        except Exception as e:
            logger.error(f"Error fetching document metadata: {e}")
            return {}
    
    async def _get_access_history(self, document_id: str, user_id: str) -> Dict:
        """Fetch access history for document"""
        try:
            response = self.supabase.table('quick_access')\
                .select('access_count, last_accessed_at')\
                .eq('document_id', document_id)\
                .eq('user_id', user_id)\
                .single()\
                .execute()
            
            if response.data:
                return response.data
            return {'access_count': 0, 'last_accessed_at': None}
        except Exception as e:
            logger.debug(f"No access history found for document {document_id}: {e}")
            return {'access_count': 0, 'last_accessed_at': None}
        try:
            response = self.supabase.table('quick_access')\
                .select('access_count, last_accessed_at')\
                .eq('document_id', document_id)\
                .eq('user_id', user_id)\
                .single()\
                .execute()
            return response.data or {'access_count': 0, 'last_accessed_at': None}
        except Exception:
            # No existing record is fine
            return {'access_count': 0, 'last_accessed_at': None}
    
    async def _upsert_quick_access(
        self, 
        doc_id: str, 
        user_id: str, 
        score: float, 
        reason: str
    ):
        """Insert or update quick_access entry"""
        try:
            # Check if exists
            existing_response = self.supabase.table('quick_access')\
                .select('id, is_pinned, access_count')\
                .eq('document_id', doc_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if existing_response.data:
                # Update existing - preserve pinned status and access count
                self.supabase.table('quick_access')\
                    .update({
                        'ai_score': score, 
                        'ai_reason': reason,
                        'updated_at': datetime.utcnow().isoformat()
                    })\
                    .eq('id', existing_response.data[0]['id'])\
                    .execute()
            else:
                # Insert new
                self.supabase.table('quick_access')\
                    .insert({
                        'document_id': doc_id,
                        'user_id': user_id,
                        'ai_score': score,
                        'ai_reason': reason,
                        'access_count': 0,
                        'is_pinned': False
                    })\
                    .execute()
        except Exception as e:
            logger.error(f"Error upserting quick_access: {e}")
            raise

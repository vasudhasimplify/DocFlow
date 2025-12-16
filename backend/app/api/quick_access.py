"""
API endpoints for Quick Access AI scoring functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Header
from pydantic import BaseModel
from typing import Optional
import logging

from app.core.supabase_client import get_supabase_client
from app.services.quick_access_ai_service import QuickAccessAIService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quick-access", tags=["quick_access"])


class ScoreResponse(BaseModel):
    score: float
    reason: str
    document_id: str


class BatchScoreResponse(BaseModel):
    message: str
    count: int
    user_id: str


async def get_current_user_id(x_user_id: Optional[str] = Header(None)):
    """Dependency to get current user ID from header
    
    For development: Pass user ID via X-User-Id header
    In production: This should validate JWT token and extract user ID
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401,
            detail="User ID not provided. Pass X-User-Id header with authenticated user ID"
        )
    return x_user_id


@router.post("/calculate-scores", response_model=BatchScoreResponse)
async def calculate_ai_scores_batch(
    background_tasks: BackgroundTasks,
    limit: Optional[int] = None,
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate AI scores for all user documents in the background.
    
    - **limit**: Optional limit on number of documents to process
    - Returns immediately with task status
    - Processing happens in background
    """
    try:
        supabase = get_supabase_client()
        service = QuickAccessAIService(supabase)
        
        # Run in background
        background_tasks.add_task(
            service.batch_calculate_scores, 
            user_id, 
            limit
        )
        
        return BatchScoreResponse(
            message="AI scoring started in background",
            count=0,  # Will be updated async
            user_id=user_id
        )
    except Exception as e:
        logger.error(f"Error starting batch calculation: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to start AI scoring: {str(e)}"
        )


@router.post("/calculate-scores/sync", response_model=BatchScoreResponse)
async def calculate_ai_scores_sync(
    limit: Optional[int] = 50,
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate AI scores for user documents synchronously (with limit).
    
    - **limit**: Limit number of documents (default 50, max 100)
    - Blocks until complete
    - Use for smaller batches
    """
    try:
        if limit and limit > 100:
            limit = 100
            
        supabase = get_supabase_client()
        service = QuickAccessAIService(supabase)
        
        count = await service.batch_calculate_scores(user_id, limit)
        
        return BatchScoreResponse(
            message=f"Updated {count} documents",
            count=count,
            user_id=user_id
        )
    except Exception as e:
        logger.error(f"Error in sync calculation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate scores: {str(e)}"
        )


@router.post("/calculate-score/{document_id}", response_model=ScoreResponse)
async def calculate_single_score(
    document_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """
    Calculate AI score for a specific document.
    
    - **document_id**: UUID of the document
    - Returns score and reason immediately
    """
    try:
        supabase = get_supabase_client()
        service = QuickAccessAIService(supabase)
        
        score, reason = await service.calculate_document_score(document_id, user_id)
        
        return ScoreResponse(
            score=score,
            reason=reason,
            document_id=document_id
        )
    except Exception as e:
        logger.error(f"Error calculating score for {document_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate score: {str(e)}"
        )


@router.get("/scores", response_model=list[ScoreResponse])
async def get_ai_scores(
    user_id: str = Depends(get_current_user_id),
    min_score: float = 0.5,
    limit: int = 20
):
    """
    Get AI-scored documents for user.
    
    - **min_score**: Minimum AI score threshold (0-1)
    - **limit**: Maximum number of results
    - Returns documents sorted by AI score (highest first)
    """
    try:
        supabase = get_supabase_client()
        
        response = supabase.table('quick_access')\
            .select('document_id, ai_score, ai_reason')\
            .eq('user_id', user_id)\
            .gte('ai_score', min_score)\
            .order('ai_score', desc=True)\
            .limit(limit)\
            .execute()
        
        return [
            ScoreResponse(
                score=item['ai_score'],
                reason=item['ai_reason'] or '',
                document_id=item['document_id']
            )
            for item in (response.data or [])
        ]
    except Exception as e:
        logger.error(f"Error fetching AI scores: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch scores: {str(e)}"
        )


@router.delete("/scores")
async def reset_ai_scores(
    user_id: str = Depends(get_current_user_id)
):
    """
    Reset all AI scores for user (sets to 0).
    Useful for recalculating from scratch.
    """
    try:
        supabase = get_supabase_client()
        
        supabase.table('quick_access')\
            .update({'ai_score': 0, 'ai_reason': None})\
            .eq('user_id', user_id)\
            .execute()
        
        return {"message": "AI scores reset successfully"}
    except Exception as e:
        logger.error(f"Error resetting scores: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset scores: {str(e)}"
        )

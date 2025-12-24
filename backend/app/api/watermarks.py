"""
Watermark API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os
import tempfile
from pathlib import Path

from app.services.watermark_service import apply_watermark_to_pdf, apply_tiled_watermark
from app.core.supabase_client import get_supabase_client

router = APIRouter(prefix="/api/watermarks", tags=["watermarks"])


class ApplyWatermarkRequest(BaseModel):
    document_id: str
    watermark_text: str
    font_family: str = "Helvetica"
    font_size: int = 48
    rotation: int = -45
    opacity: float = 0.3
    color: str = "#000000"
    position: str = "center"  # center or tile


@router.post("/apply")
async def apply_watermark(request: ApplyWatermarkRequest):
    """
    Apply watermark to a PDF document
    
    Returns a downloadable watermarked PDF
    """
    try:
        supabase = get_supabase_client()
        
        # Get document from database
        result = supabase.table('documents').select('*').eq('id', request.document_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        document = result.data
        
        # Download PDF from storage
        file_path = document.get('file_path')
        if not file_path:
            raise HTTPException(status_code=400, detail="Document has no file path")
        
        # Get file from Supabase storage
        file_data = supabase.storage.from_('documents').download(file_path)
        
        # Save to temp file
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_input.write(file_data)
        temp_input.close()
        
        # Create temp output file
        temp_output = tempfile.NamedTemporaryFile(delete=False, suffix='_watermarked.pdf')
        temp_output.close()
        
        # Apply watermark
        if request.position == "tile":
            output_path = apply_tiled_watermark(
                pdf_path=temp_input.name,
                watermark_text=request.watermark_text,
                output_path=temp_output.name,
                font_family=request.font_family,
                font_size=request.font_size,
                rotation=request.rotation,
                opacity=request.opacity,
                color_hex=request.color
            )
        else:
            output_path = apply_watermark_to_pdf(
                pdf_path=temp_input.name,
                watermark_text=request.watermark_text,
                output_path=temp_output.name,
                font_family=request.font_family,
                font_size=request.font_size,
                rotation=request.rotation,
                opacity=request.opacity,
                color_hex=request.color
            )
        
        # Clean up input file
        os.unlink(temp_input.name)
        
        # Return watermarked PDF
        original_name = Path(document['file_name']).stem
        return FileResponse(
            output_path,
            media_type='application/pdf',
            filename=f"{original_name}_watermarked.pdf",
            background=lambda: os.unlink(output_path)  # Cleanup after sending
        )
        
    except Exception as e:
        print(f"Error applying watermark: {e}")
        raise HTTPException(status_code=500, detail=str(e))

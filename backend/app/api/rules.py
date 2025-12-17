from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from app.core.auth import get_current_user
from app.core.supabase import supabase
import traceback

router = APIRouter(prefix="/api/rules", tags=["rules"])

# Models
class CreateRuleRequest(BaseModel):
    name: str
    description: Optional[str] = None
    file_types: Optional[List[str]] = []
    name_patterns: Optional[List[str]] = []
    content_keywords: Optional[List[str]] = []
    folder_ids: Optional[List[str]] = []
    size_min_bytes: Optional[int] = None
    size_max_bytes: Optional[int] = None
    
    # Auto actions
    auto_apply_permission: Optional[str] = None
    auto_apply_tags: Optional[List[str]] = []
    auto_move_to_folder: Optional[str] = None
    
    # Restrictions
    restrict_download: bool = False
    restrict_print: bool = False
    restrict_share: bool = False
    restrict_external_share: bool = False
    watermark_required: bool = False
    notify_on_match: bool = False
    
    is_active: bool = True
    priority: int = 100
    document_ids: Optional[List[str]] = []

class RuleResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    file_types: List[str]
    name_patterns: List[str]
    content_keywords: List[str]
    folder_ids: List[str]
    
    restrict_download: bool
    restrict_print: bool
    restrict_share: bool
    restrict_external_share: bool
    watermark_required: bool
    notify_on_match: bool
    
    auto_apply_permission: Optional[str]
    auto_apply_tags: List[str]
    auto_move_to_folder: Optional[str]
    
    is_active: bool
    priority: int
    created_at: str
    updated_at: str

class RuleStats(BaseModel):
    total: int
    active: int
    with_restrictions: int
    with_auto_actions: int

# Endpoints

@router.get("/", response_model=List[RuleResponse])
async def get_rules(current_user = Depends(get_current_user)):
    """Get all rules for the current user"""
    try:
        response = supabase.table('content_access_rules')\
            .select('*')\
            .eq('user_id', current_user.id)\
            .order('priority', desc=False)\
            .execute()
            
        return response.data
    except Exception as e:
        print(f"ERROR: Exception in get_rules: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", response_model=RuleStats)
async def get_rule_stats(current_user = Depends(get_current_user)):
    """Get statistics about rules"""
    try:
        response = supabase.table('content_access_rules')\
            .select('*')\
            .eq('user_id', current_user.id)\
            .execute()
            
        rules = response.data
        
        total = len(rules)
        active = len([r for r in rules if r.get('is_active', False)])
        
        with_restrictions = len([
            r for r in rules 
            if r.get('restrict_download') or r.get('restrict_print') or r.get('restrict_share')
        ])
        
        with_auto_actions = len([
            r for r in rules
            if r.get('auto_move_to_folder') or (r.get('auto_apply_tags') and len(r.get('auto_apply_tags', [])) > 0)
        ])
        
        return {
            "total": total,
            "active": active,
            "with_restrictions": with_restrictions,
            "with_auto_actions": with_auto_actions
        }
    except Exception as e:
        print(f"ERROR: Exception in get_rule_stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=RuleResponse)
async def create_rule(
    rule: CreateRuleRequest,
    current_user = Depends(get_current_user)
):
    """Create a new access rule"""
    try:
        rule_data = rule.dict()
        rule_data['user_id'] = current_user.id
        
        print(f"DEBUG: Creating rule for user {current_user.id}")
        print(f"DEBUG: Rule data: {rule_data}")
        
        response = supabase.table('content_access_rules').insert(rule_data).execute()
        
        print(f"DEBUG: Supabase response: {response}")
        
        if not response.data:
            print("ERROR: Response data is empty")
            raise HTTPException(status_code=500, detail="Failed to create rule - No data returned from DB")
            
        return response.data[0]
    except Exception as e:
        print(f"ERROR: Exception in create_rule: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Backend Error: {str(e)}")

@router.put("/{rule_id}")
async def update_rule(
    rule_id: str,
    updates: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """Update a rule"""
    try:
        # Verify ownership
        check = supabase.table('content_access_rules').select('user_id').eq('id', rule_id).single().execute()
        if not check.data or check.data['user_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
            
        response = supabase.table('content_access_rules').update(updates).eq('id', rule_id).execute()
        return response.data[0]
    except Exception as e:
        print(f"ERROR: Exception in update_rule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user = Depends(get_current_user)
):
    """Delete a rule"""
    try:
        # Verify ownership
        check = supabase.table('content_access_rules').select('user_id').eq('id', rule_id).single().execute()
        if not check.data or check.data['user_id'] != current_user.id:
            raise HTTPException(status_code=430, detail="Not authorized")
            
        supabase.table('content_access_rules').delete().eq('id', rule_id).execute()
        return {"success": True}
    except Exception as e:
        print(f"ERROR: Exception in delete_rule: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

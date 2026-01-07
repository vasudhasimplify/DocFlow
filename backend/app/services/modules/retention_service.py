"""
Retention Service Module
Handles all retention policy, document retention status, and disposition operations
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from app.core.supabase import supabase
import logging
import uuid

logger = logging.getLogger(__name__)


class RetentionService:
    """Service for managing document retention policies and status"""
    
    # ===========================
    # RETENTION POLICIES
    # ===========================
    
    @staticmethod
    async def get_policies(user_id: str) -> List[Dict[str, Any]]:
        """Get all retention policies for a user"""
        try:
            result = supabase.table("retention_policies") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching retention policies: {e}")
            raise
    
    @staticmethod
    async def get_policy(policy_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific retention policy"""
        try:
            result = supabase.table("retention_policies") \
                .select("*") \
                .eq("id", policy_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching retention policy {policy_id}: {e}")
            return None
    
    @staticmethod
    async def create_policy(user_id: str, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new retention policy"""
        try:
            policy_data["user_id"] = user_id
            policy_data["created_at"] = datetime.utcnow().isoformat()
            policy_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = supabase.table("retention_policies") \
                .insert(policy_data) \
                .execute()
            
            logger.info(f"Created retention policy: {result.data[0]['id']}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error creating retention policy: {e}")
            raise
    
    @staticmethod
    async def update_policy(policy_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update a retention policy"""
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()
            
            result = supabase.table("retention_policies") \
                .update(updates) \
                .eq("id", policy_id) \
                .eq("user_id", user_id) \
                .execute()
            
            if not result.data:
                raise ValueError(f"Policy {policy_id} not found")
            
            logger.info(f"Updated retention policy: {policy_id}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error updating retention policy {policy_id}: {e}")
            raise
    
    @staticmethod
    async def delete_policy(policy_id: str, user_id: str) -> bool:
        """Delete a retention policy"""
        try:
            result = supabase.table("retention_policies") \
                .delete() \
                .eq("id", policy_id) \
                .eq("user_id", user_id) \
                .execute()
            
            logger.info(f"Deleted retention policy: {policy_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting retention policy {policy_id}: {e}")
            raise
    
    # ===========================
    # DOCUMENT RETENTION STATUS
    # ===========================
    
    @staticmethod
    async def get_document_retention_statuses(user_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all document retention statuses for a user"""
        try:
            query = supabase.table("document_retention_status") \
                .select("*, retention_policies(name, compliance_framework)") \
                .eq("user_id", user_id)
            
            if status_filter:
                query = query.eq("current_status", status_filter)
            
            result = query.order("retention_end_date", desc=False).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching document retention statuses: {e}")
            raise
    
    @staticmethod
    async def get_document_retention_status(document_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get retention status for a specific document"""
        try:
            result = supabase.table("document_retention_status") \
                .select("*, retention_policies(*)") \
                .eq("document_id", document_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching document retention status: {e}")
            return None
    
    @staticmethod
    async def apply_policy_to_document(
        user_id: str,
        document_id: str,
        policy_id: str,
        custom_start_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Apply a retention policy to a document"""
        try:
            # Get the policy
            policy = await RetentionService.get_policy(policy_id, user_id)
            if not policy:
                raise ValueError(f"Policy {policy_id} not found")
            
            # Calculate retention dates
            start_date = custom_start_date or datetime.utcnow()
            end_date = start_date + timedelta(days=policy["retention_period_days"])
            
            # Create or update document retention status
            status_data = {
                "document_id": document_id,
                "user_id": user_id,
                "policy_id": policy_id,
                "retention_start_date": start_date.isoformat(),
                "retention_end_date": end_date.isoformat(),
                "current_status": "active",
                "disposition_action": policy["disposition_action"],
                "notification_sent": False,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            result = supabase.table("document_retention_status") \
                .upsert(status_data, on_conflict="document_id,user_id") \
                .execute()
            
            logger.info(f"Applied policy {policy_id} to document {document_id}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error applying policy to document: {e}")
            raise
    
    @staticmethod
    async def get_expiring_documents(user_id: str, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """Get documents expiring within N days"""
        try:
            cutoff_date = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat()
            
            result = supabase.table("document_retention_status") \
                .select("*, retention_policies(name, compliance_framework)") \
                .eq("user_id", user_id) \
                .eq("current_status", "active") \
                .lte("retention_end_date", cutoff_date) \
                .order("retention_end_date", desc=False) \
                .execute()
            
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching expiring documents: {e}")
            raise
    
    @staticmethod
    async def dispose_document(
        user_id: str,
        document_id: str,
        action: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispose of a document (archive, delete, etc.)"""
        try:
            # Get current status
            current_status = await RetentionService.get_document_retention_status(document_id, user_id)
            if not current_status:
                raise ValueError(f"Document {document_id} not found in retention")
            
            # Check for legal holds
            if current_status.get("legal_hold_ids") and len(current_status["legal_hold_ids"]) > 0:
                raise ValueError(f"Document {document_id} is under legal hold and cannot be disposed")
            
            # Update status
            new_status = "disposed" if action == "delete" else "archived"
            
            result = supabase.table("document_retention_status") \
                .update({
                    "current_status": new_status,
                    "disposition_date": datetime.utcnow().isoformat(),
                    "disposition_notes": reason,
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("document_id", document_id) \
                .eq("user_id", user_id) \
                .execute()
            
            # Log to audit
            await RetentionService.log_audit(
                user_id=user_id,
                document_id=document_id,
                action=action,
                action_by=user_id,
                policy_id=current_status.get("policy_id"),
                previous_status=current_status.get("current_status"),
                new_status=new_status,
                reason=reason
            )
            
            logger.info(f"Disposed document {document_id} with action {action}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error disposing document: {e}")
            raise
    
    @staticmethod
    async def grant_exception(
        user_id: str,
        document_id: str,
        reason: str,
        extension_days: int
    ) -> Dict[str, Any]:
        """Grant an exception to extend retention period"""
        try:
            current_status = await RetentionService.get_document_retention_status(document_id, user_id)
            if not current_status:
                raise ValueError(f"Document {document_id} not found in retention")
            
            current_end = datetime.fromisoformat(current_status["retention_end_date"].replace("Z", "+00:00"))
            new_end = current_end + timedelta(days=extension_days)
            
            result = supabase.table("document_retention_status") \
                .update({
                    "retention_end_date": new_end.isoformat(),
                    "exception_reason": reason,
                    "exception_approved_by": user_id,
                    "exception_end_date": new_end.isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("document_id", document_id) \
                .eq("user_id", user_id) \
                .execute()
            
            # Log to audit
            await RetentionService.log_audit(
                user_id=user_id,
                document_id=document_id,
                action="exception_granted",
                action_by=user_id,
                policy_id=current_status.get("policy_id"),
                previous_status=current_status.get("current_status"),
                new_status=current_status.get("current_status"),
                reason=f"Extended by {extension_days} days: {reason}"
            )
            
            logger.info(f"Granted exception for document {document_id}: extended by {extension_days} days")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error granting exception: {e}")
            raise
    
    # ===========================
    # LEGAL HOLDS
    # ===========================
    
    @staticmethod
    async def get_legal_holds(user_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all legal holds for a user"""
        try:
            query = supabase.table("legal_holds") \
                .select("*") \
                .eq("user_id", user_id)
            
            if status_filter:
                query = query.eq("status", status_filter)
            
            result = query.order("created_at", desc=True).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching legal holds: {e}")
            raise
    
    @staticmethod
    async def create_legal_hold(user_id: str, hold_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new legal hold"""
        try:
            hold_data["user_id"] = user_id
            hold_data["created_by"] = user_id
            hold_data["status"] = "active"
            hold_data["start_date"] = datetime.utcnow().isoformat()
            hold_data["created_at"] = datetime.utcnow().isoformat()
            hold_data["updated_at"] = datetime.utcnow().isoformat()
            
            result = supabase.table("legal_holds") \
                .insert(hold_data) \
                .execute()
            
            hold_id = result.data[0]["id"]
            
            # If document_ids provided, apply hold to those documents
            if hold_data.get("document_ids"):
                for doc_id in hold_data["document_ids"]:
                    await RetentionService.apply_legal_hold_to_document(user_id, doc_id, hold_id)
            
            logger.info(f"Created legal hold: {hold_id}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error creating legal hold: {e}")
            raise
    
    @staticmethod
    async def release_legal_hold(user_id: str, hold_id: str, reason: str) -> Dict[str, Any]:
        """Release a legal hold"""
        try:
            # Get hold details
            hold_result = supabase.table("legal_holds") \
                .select("*") \
                .eq("id", hold_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            
            if not hold_result.data:
                raise ValueError(f"Legal hold {hold_id} not found")
            
            hold = hold_result.data
            
            # Update hold status
            result = supabase.table("legal_holds") \
                .update({
                    "status": "released",
                    "released_by": user_id,
                    "released_at": datetime.utcnow().isoformat(),
                    "release_reason": reason,
                    "end_date": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("id", hold_id) \
                .eq("user_id", user_id) \
                .execute()
            
            # Remove hold from documents
            if hold.get("document_ids"):
                for doc_id in hold["document_ids"]:
                    await RetentionService.remove_legal_hold_from_document(user_id, doc_id, hold_id)
            
            logger.info(f"Released legal hold: {hold_id}")
            return result.data[0]
        except Exception as e:
            logger.error(f"Error releasing legal hold: {e}")
            raise
    
    @staticmethod
    async def apply_legal_hold_to_document(user_id: str, document_id: str, hold_id: str):
        """Apply a legal hold to a document"""
        try:
            # Get current status
            current = await RetentionService.get_document_retention_status(document_id, user_id)
            
            if current:
                # Update existing status
                current_holds = current.get("legal_hold_ids") or []
                if hold_id not in current_holds:
                    current_holds.append(hold_id)
                
                supabase.table("document_retention_status") \
                    .update({
                        "legal_hold_ids": current_holds,
                        "current_status": "on_hold",
                        "updated_at": datetime.utcnow().isoformat()
                    }) \
                    .eq("document_id", document_id) \
                    .eq("user_id", user_id) \
                    .execute()
            else:
                # Create new status with hold
                supabase.table("document_retention_status") \
                    .insert({
                        "document_id": document_id,
                        "user_id": user_id,
                        "legal_hold_ids": [hold_id],
                        "current_status": "on_hold",
                        "retention_start_date": datetime.utcnow().isoformat(),
                        "retention_end_date": (datetime.utcnow() + timedelta(days=36500)).isoformat(),  # 100 years
                        "created_at": datetime.utcnow().isoformat(),
                        "updated_at": datetime.utcnow().isoformat()
                    }) \
                    .execute()
            
            # Log audit
            await RetentionService.log_audit(
                user_id=user_id,
                document_id=document_id,
                action="held",
                action_by=user_id,
                legal_hold_id=hold_id,
                previous_status=current.get("current_status") if current else None,
                new_status="on_hold",
                reason=f"Legal hold {hold_id} applied"
            )
            
            logger.info(f"Applied legal hold {hold_id} to document {document_id}")
        except Exception as e:
            logger.error(f"Error applying legal hold to document: {e}")
            raise
    
    @staticmethod
    async def remove_legal_hold_from_document(user_id: str, document_id: str, hold_id: str):
        """Remove a legal hold from a document"""
        try:
            current = await RetentionService.get_document_retention_status(document_id, user_id)
            if not current:
                return
            
            current_holds = current.get("legal_hold_ids") or []
            if hold_id in current_holds:
                current_holds.remove(hold_id)
            
            new_status = "active" if len(current_holds) == 0 else "on_hold"
            
            supabase.table("document_retention_status") \
                .update({
                    "legal_hold_ids": current_holds,
                    "current_status": new_status,
                    "updated_at": datetime.utcnow().isoformat()
                }) \
                .eq("document_id", document_id) \
                .eq("user_id", user_id) \
                .execute()
            
            # Log audit
            await RetentionService.log_audit(
                user_id=user_id,
                document_id=document_id,
                action="released",
                action_by=user_id,
                legal_hold_id=hold_id,
                previous_status="on_hold",
                new_status=new_status,
                reason=f"Legal hold {hold_id} released"
            )
            
            logger.info(f"Removed legal hold {hold_id} from document {document_id}")
        except Exception as e:
            logger.error(f"Error removing legal hold from document: {e}")
            raise
    
    # ===========================
    # TEMPLATES
    # ===========================
    
    @staticmethod
    async def get_templates() -> List[Dict[str, Any]]:
        """Get all retention policy templates"""
        try:
            result = supabase.table("retention_policy_templates") \
                .select("*") \
                .eq("is_system_template", True) \
                .order("compliance_framework") \
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching retention templates: {e}")
            raise
    
    @staticmethod
    async def create_policy_from_template(user_id: str, template_id: str, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Create a retention policy from a template"""
        try:
            # Get template
            template_result = supabase.table("retention_policy_templates") \
                .select("*") \
                .eq("id", template_id) \
                .single() \
                .execute()
            
            if not template_result.data:
                raise ValueError(f"Template {template_id} not found")
            
            template = template_result.data
            
            # Create policy from template
            policy_data = {
                "name": name,
                "description": description or template.get("description"),
                "retention_period_days": template["retention_period_days"],
                "disposition_action": template["disposition_action"],
                "trigger_type": template["trigger_type"],
                "compliance_framework": template["compliance_framework"],
                "requires_approval": template.get("requires_approval", False),
                "applies_to_categories": template.get("category_suggestions", []),
                "is_active": True
            }
            
            return await RetentionService.create_policy(user_id, policy_data)
        except Exception as e:
            logger.error(f"Error creating policy from template: {e}")
            raise
    
    # ===========================
    # AUDIT LOG
    # ===========================
    
    @staticmethod
    async def log_audit(
        user_id: str,
        document_id: str,
        action: str,
        action_by: str,
        policy_id: Optional[str] = None,
        legal_hold_id: Optional[str] = None,
        previous_status: Optional[str] = None,
        new_status: Optional[str] = None,
        reason: Optional[str] = None,
        document_metadata: Optional[Dict[str, Any]] = None
    ):
        """Log an action to the disposition audit log"""
        try:
            certificate_number = f"CERT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8].upper()}"
            
            supabase.table("disposition_audit_log") \
                .insert({
                    "document_id": document_id,
                    "user_id": user_id,
                    "action": action,
                    "action_by": action_by,
                    "policy_id": policy_id,
                    "legal_hold_id": legal_hold_id,
                    "previous_status": previous_status,
                    "new_status": new_status,
                    "reason": reason,
                    "document_metadata": document_metadata,
                    "certificate_number": certificate_number,
                    "created_at": datetime.utcnow().isoformat()
                }) \
                .execute()
            
            logger.debug(f"Logged audit: {action} on document {document_id}")
        except Exception as e:
            logger.error(f"Error logging audit: {e}")
            # Don't raise - audit logging should not break main operations
    
    @staticmethod
    async def get_audit_logs(user_id: str, document_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit logs for a user"""
        try:
            query = supabase.table("disposition_audit_log") \
                .select("*, retention_policies(name)") \
                .eq("user_id", user_id)
            
            if document_id:
                query = query.eq("document_id", document_id)
            
            result = query.order("created_at", desc=True).limit(limit).execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching audit logs: {e}")
            raise
    
    # ===========================
    # STATISTICS
    # ===========================
    
    @staticmethod
    async def get_retention_stats(user_id: str) -> Dict[str, Any]:
        """Get retention statistics for dashboard"""
        try:
            # Get policy count
            policies_result = supabase.table("retention_policies") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .eq("is_active", True) \
                .execute()
            
            # Get document counts by status
            statuses = ["active", "pending_review", "on_hold", "disposed", "archived"]
            status_counts = {}
            
            for status in statuses:
                status_result = supabase.table("document_retention_status") \
                    .select("id", count="exact") \
                    .eq("user_id", user_id) \
                    .eq("current_status", status) \
                    .execute()
                status_counts[status] = status_result.count or 0
            
            # Get legal hold count
            holds_result = supabase.table("legal_holds") \
                .select("id", count="exact") \
                .eq("user_id", user_id) \
                .eq("status", "active") \
                .execute()
            
            # Get expiring soon count (30 days)
            expiring = await RetentionService.get_expiring_documents(user_id, 30)
            
            return {
                "totalPolicies": policies_result.count or 0,
                "activePolicies": policies_result.count or 0,
                "documentsUnderRetention": status_counts.get("active", 0) + status_counts.get("on_hold", 0),
                "pendingDisposition": status_counts.get("pending_review", 0),
                "onHold": status_counts.get("on_hold", 0),
                "disposed": status_counts.get("disposed", 0),
                "archived": status_counts.get("archived", 0),
                "activeLegalHolds": holds_result.count or 0,
                "expiringSoon": len(expiring),
                "complianceScore": 95  # Placeholder - calculate based on policy coverage
            }
        except Exception as e:
            logger.error(f"Error fetching retention stats: {e}")
            raise

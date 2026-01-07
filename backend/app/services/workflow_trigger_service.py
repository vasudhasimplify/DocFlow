"""
Workflow Trigger Service
Automatically triggers workflows based on events (document upload, form submission, etc.)
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from supabase import Client
from .workflow_email_service import WorkflowEmailService

logger = logging.getLogger(__name__)


class WorkflowTriggerService:
    """Service for automatically triggering workflows based on events"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.email_service = WorkflowEmailService()
    
    async def check_and_trigger_on_document_upload(
        self,
        document_id: str,
        document_type: str,
        document_name: str,
        user_id: str,
        extracted_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Check for workflows with document_upload trigger and auto-start them
        
        Args:
            document_id: ID of uploaded document
            document_type: Type of document (invoice, contract, etc.)
            document_name: Name of uploaded file
            user_id: User who uploaded the document
            extracted_data: Pre-extracted data from document
        
        Returns:
            List of created workflow instances
        """
        try:
            logger.info(f"🔍 Checking for document_upload workflows matching type: {document_type}")
            
            # Find active workflows with document_upload trigger
            workflows_response = self.supabase.table("workflow_definitions").select("*").eq(
                "trigger_type", "document_upload"
            ).eq("status", "active").execute()
            
            logger.info(f"📊 Found {len(workflows_response.data) if workflows_response.data else 0} active document_upload workflows in database")
            
            if not workflows_response.data:
                logger.warning("⚠️ NO ACTIVE WORKFLOWS: No workflows with trigger_type='document_upload' and status='active' found")
                logger.info("💡 To create a workflow:")
                logger.info("   1. Go to Workflows tab")
                logger.info("   2. Create new workflow")
                logger.info("   3. Set trigger type to 'Document Upload'")
                logger.info("   4. Select matching document types")
                logger.info("   5. Assign emails to each step")
                logger.info("   6. Save and ensure status is 'Active'")
                return []
            
            triggered_instances = []
            
            for workflow in workflows_response.data:
                # Check if workflow's document types match
                trigger_config = workflow.get("trigger_config", {})
                allowed_types = trigger_config.get("document_types", [])
                
                # Smart matching: support partial matches (e.g., "invoice" matches "flight_invoice")
                matches = False
                if not allowed_types or "all" in allowed_types:
                    matches = True
                    logger.info(f"🔍 Workflow '{workflow['name']}' accepts all document types")
                else:
                    doc_type_lower = document_type.lower()
                    for allowed_type in allowed_types:
                        allowed_lower = allowed_type.lower()
                        # Match if either string contains the other (bidirectional partial match)
                        if allowed_lower in doc_type_lower or doc_type_lower in allowed_lower:
                            matches = True
                            logger.info(f"✅ Workflow '{workflow['name']}' matches: '{allowed_type}' ~ '{document_type}'")
                            break
                
                if matches:
                    logger.info(f"🚀 Starting workflow '{workflow['name']}' for document type '{document_type}'...")
                    
                    # Create workflow instance
                    instance = await self._create_workflow_instance(
                        workflow_id=workflow["id"],
                        workflow=workflow,
                        document_id=document_id,
                        document_name=document_name,
                        document_type=document_type,
                        user_id=user_id,
                        extracted_data=extracted_data,
                        trigger_source="document_upload"
                    )
                    
                    if instance:
                        triggered_instances.append(instance)
                        logger.info(f"✅ Auto-triggered workflow instance: {instance['id']}")
                    else:
                        logger.error(f"❌ Failed to create workflow instance for '{workflow['name']}'")
                else:
                    logger.debug(f"⏭️ Workflow '{workflow['name']}' doesn't match (requires: {allowed_types}, got: {document_type})")
            
            if not triggered_instances:
                logger.warning(f"⚠️ NO MATCHING WORKFLOWS: None of the {len(workflows_response.data)} active workflows match document type '{document_type}'")
                logger.info(f"💡 Available workflows and their triggers:")
                for wf in workflows_response.data:
                    trigger_types = wf.get('trigger_config', {}).get('document_types', [])
                    logger.info(f"   - '{wf['name']}' accepts: {trigger_types}")
            
            return triggered_instances
            
        except Exception as e:
            logger.error(f"Error checking document_upload triggers: {str(e)}")
            return []
    
    async def _create_workflow_instance(
        self,
        workflow_id: str,
        workflow: Dict[str, Any],
        document_id: str,
        document_name: str,
        document_type: str,
        user_id: str,
        extracted_data: Optional[Dict[str, Any]],
        trigger_source: str
    ) -> Optional[Dict[str, Any]]:
        """Create a workflow instance with pre-extracted data"""
        try:
            steps = workflow.get("steps", [])
            if not steps:
                logger.error(f"❌ Workflow {workflow_id} has no steps defined")
                return None
            
            logger.info(f"📋 Creating workflow instance with {len(steps)} steps")
            
            # Create instance
            instance_data = {
                "workflow_id": workflow_id,
                "document_id": document_id,
                "status": "active",
                "priority": "medium",
                "current_step_id": steps[0]["id"] if steps else None,
                "current_step_index": 0,
                "started_at": datetime.now().isoformat(),
                "started_by": user_id,
                "metadata": {
                    "trigger_source": trigger_source,
                    "document_name": document_name,
                    "auto_triggered": True
                },
                "progress_percent": 0
            }
            
            # Add extracted data if available
            if extracted_data:
                instance_data["extracted_data"] = extracted_data
                instance_data["extraction_status"] = "extracted"
                instance_data["data_status"] = f"Extracted {len(extracted_data)} fields"
            
            instance_response = self.supabase.table("workflow_instances").insert(instance_data).execute()
            
            if not instance_response.data:
                logger.error("Failed to create workflow instance")
                return None
            
            created_instance = instance_response.data[0]
            
            # Create step instances
            for step in steps:
                # Calculate SLA due date
                sla_hours = step.get("sla_hours", 24)  # Default 24 hours
                sla_due_at = None
                
                if step["order"] == 1:  # First step starts immediately
                    sla_due_at = (datetime.now() + timedelta(hours=sla_hours)).isoformat()
                
                step_instance = {
                    "instance_id": created_instance["id"],
                    "step_id": step["id"],
                    "step_name": step["name"],
                    "step_type": step["type"],
                    "step_config": step.get("config", {}),
                    "status": "in_progress" if step["order"] == 1 else "pending",
                    "sla_due_at": sla_due_at,
                    "is_overdue": False
                }
                
                # Use pre-assigned email from workflow step definition
                # Check both step.assigned_email and step.config.assigned_email
                assigned_email = step.get("assigned_email") or step.get("config", {}).get("assigned_email")
                if not assigned_email:
                    logger.warning(f"⚠️  Step '{step['name']}' has no assigned_email, skipping assignment")
                    # Still create the step instance but without assignment
                    self.supabase.table("workflow_step_instances").insert(step_instance).execute()
                    continue
                
                logger.info(f"📧 Found assigned email for step '{step['name']}': {assigned_email}")
                
                # Look up user by email (but allow external emails too)
                assignee_id = None
                assignee_name = assigned_email.split("@")[0].title()  # Default name from email
                
                # Skip user lookup - just use external email directly
                logger.info(f"📧 Using external email: {assigned_email} - will send email directly")
                step_instance["metadata"] = {
                    **step_instance.get("metadata", {}),
                    "external_assignee_email": assigned_email,
                    "external_assignee": True
                }
                
                # Assign step if we have a user ID
                if assignee_id:
                    step_instance["assigned_to"] = assignee_id
                
                # Always store the email (for both internal and external)
                step_instance["assigned_email"] = assigned_email
                
                # Mark first step as started
                if step["order"] == 1:
                    step_instance["started_at"] = datetime.now().isoformat()
                
                # Send assignment email for first step (works for both internal and external emails)
                if step["order"] == 1:  # Only email the first step initially
                    try:
                        logger.info(f"📧 Sending assignment email to {assigned_email} for step '{step['name']}'")
                        self.email_service.send_step_assignment_email(
                            to_email=assigned_email,
                            assignee_name=assignee_name,
                            workflow_name=workflow["name"],
                            step_name=step["name"],
                            document_name=document_name,
                            instance_id=created_instance["id"],
                            document_id=document_id,
                            additional_context=f"This workflow was automatically started when a {document_type} document was uploaded."
                        )
                        logger.info(f"✅ SUCCESS: Assignment email sent to {assigned_email}")
                        
                        # Send to CC recipients
                        notification_emails = step.get("config", {}).get("notification_emails", [])
                        if notification_emails:
                            logger.info(f"📧 Sending CC emails to {len(notification_emails)} recipients")
                            for email in notification_emails:
                                self.email_service.send_step_assignment_email(
                                    to_email=email,
                                    assignee_name="Team Member",
                                    workflow_name=workflow["name"],
                                    step_name=step["name"],
                                    document_name=document_name,
                                    instance_id=created_instance["id"],
                                    document_id=document_id,
                                    additional_context="You are CC'd on this auto-triggered workflow."
                                )
                                logger.info(f"✅ CC email sent to {email}")
                    except Exception as email_error:
                        logger.error(f"❌ FAILED to send assignment email: {str(email_error)}")
                        logger.exception("Email error traceback:")
                
                self.supabase.table("workflow_step_instances").insert(step_instance).execute()
            
            # Create audit log
            audit_entry = {
                "instance_id": created_instance["id"],
                "action": "started",
                "performed_by": user_id,
                "details": {
                    "workflow_name": workflow["name"],
                    "document_id": document_id,
                    "trigger_source": trigger_source,
                    "auto_triggered": True
                }
            }
            self.supabase.table("workflow_audit_log").insert(audit_entry).execute()
            
            # Update workflow stats
            current_runs = workflow.get("stats", {}).get("total_runs", 0)
            self.supabase.table("workflow_definitions").update({
                "stats": {**workflow.get("stats", {}), "total_runs": current_runs + 1}
            }).eq("id", workflow_id).execute()
            
            return created_instance
            
        except Exception as e:
            logger.error(f"Error creating workflow instance: {str(e)}")
            return None

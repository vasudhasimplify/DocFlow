"""
Escalation Processor Service
Monitors workflow steps for SLA breaches and executes escalation rules automatically.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from supabase import Client
import pytz

from .workflow_email_service import WorkflowEmailService

logger = logging.getLogger(__name__)


class EscalationProcessor:
    """Service to process escalation rules for overdue workflow steps"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.email_service = WorkflowEmailService()
        self.timezone = pytz.timezone('UTC')
    
    def check_and_process_escalations(self) -> Dict[str, Any]:
        """
        Main entry point: Check all active workflow steps and process escalations.
        Returns summary of escalation actions taken.
        """
        logger.info("🚨 Starting escalation check...")
        
        try:
            # Get all overdue steps
            overdue_steps = self._get_overdue_steps()
            
            if not overdue_steps:
                logger.info("✅ No overdue steps found")
                return {
                    "checked_steps": 0,
                    "escalations_triggered": 0,
                    "actions_executed": 0,
                    "timestamp": datetime.now(self.timezone).isoformat()
                }
            
            logger.info(f"⚠️ Found {len(overdue_steps)} overdue steps")
            
            escalations_triggered = 0
            actions_executed = 0
            
            # Process each overdue step
            for step in overdue_steps:
                try:
                    logger.info(f"📋 Processing step {step['id']}: status={step['status']}, hours_overdue={step.get('hours_overdue', 0):.2f}")
                    
                    # Get applicable escalation rules
                    rules = self._get_applicable_rules(step)
                    
                    if not rules:
                        logger.info(f"   ⚠️ No applicable rules found for step {step['id']}")
                        continue
                    
                    logger.info(f"   ✓ Found {len(rules)} applicable rule(s) for step {step['id']}")
                    
                    # Process each rule
                    for rule in rules:
                        logger.info(f"   🔍 Checking rule '{rule['name']}': trigger_after_minutes={rule.get('trigger_after_minutes')}, trigger_after_hours={rule.get('trigger_after_hours')}")
                        if self._should_trigger_rule(rule, step):
                            logger.info(f"🚨 Triggering escalation rule '{rule['name']}' for step {step['id']}")
                            
                            # Mark step as overdue since we're escalating it
                            if not step.get('is_overdue'):
                                self.supabase.table("workflow_step_instances")\
                                    .update({"is_overdue": True})\
                                    .eq("id", step['id'])\
                                    .execute()
                            
                            actions_count = self._execute_rule_actions(rule, step)
                            actions_executed += actions_count
                            escalations_triggered += 1
                            
                            # Record escalation history
                            self._record_escalation(rule, step)
                            
                except Exception as e:
                    logger.error(f"Error processing step {step.get('id')}: {str(e)}")
                    continue
            
            logger.info(f"✅ Escalation check complete: {escalations_triggered} rules triggered, {actions_executed} actions executed")
            
            return {
                "checked_steps": len(overdue_steps),
                "escalations_triggered": escalations_triggered,
                "actions_executed": actions_executed,
                "timestamp": datetime.now(self.timezone).isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Escalation processor error: {str(e)}")
            return {
                "checked_steps": 0,
                "escalations_triggered": 0,
                "actions_executed": 0,
                "error": str(e),
                "timestamp": datetime.now(self.timezone).isoformat()
            }
    
    def _get_overdue_steps(self) -> List[Dict[str, Any]]:
        """Get all workflow step instances that are pending/in-progress (for escalation consideration)"""
        try:
            # Get active step instances with document info
            response = self.supabase.table("workflow_step_instances")\
                .select("*, workflow_instances!inner(workflow_id, status, document_id, metadata, documents(file_name))")\
                .in_("status", ["pending", "in_progress"])\
                .execute()
            
            logger.info(f"🔍 Database query returned {len(response.data) if response.data else 0} step instances")
            if response.data:
                for step in response.data[:3]:  # Log first 3 for debugging
                    logger.info(f"   Step: id={step.get('id')}, status={step.get('status')}, created={step.get('created_at')}")
            
            if not response.data:
                logger.info("📭 No pending/in_progress steps found in database")
                return []
            
            current_time = datetime.now(self.timezone)
            candidate_steps = []
            
            for step in response.data:
                try:
                    # Calculate time since step created (for escalation trigger timing)
                    step_created = datetime.fromisoformat(step['created_at'].replace('Z', '+00:00'))
                    hours_since_created = (current_time - step_created).total_seconds() / 3600
                    step['hours_overdue'] = hours_since_created  # Reuse this field for "time pending"
                    step['days_overdue'] = int(hours_since_created / 24)
                    
                    # Also check SLA if present
                    if step.get('sla_due_at'):
                        sla_due = datetime.fromisoformat(step['sla_due_at'].replace('Z', '+00:00'))
                        if sla_due < current_time:
                            # Update is_overdue flag if not already set
                            if not step.get('is_overdue'):
                                self.supabase.table("workflow_step_instances")\
                                    .update({"is_overdue": True})\
                                    .eq("id", step['id'])\
                                    .execute()
                    
                    candidate_steps.append(step)
                            
                except Exception as e:
                    logger.error(f"Error processing step: {str(e)}")
                    continue
            
            return candidate_steps
            
        except Exception as e:
            logger.error(f"Error getting overdue steps: {str(e)}")
            return []
    
    def _get_applicable_rules(self, step: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get escalation rules applicable to this step, prioritizing workflow-specific over global"""
        try:
            workflow_id = step['workflow_instances']['workflow_id']
            
            # Get both global rules and workflow-specific rules
            response = self.supabase.table("escalation_rules")\
                .select("*")\
                .eq("is_active", True)\
                .or_(f"is_global.eq.true,workflow_id.eq.{workflow_id}")\
                .execute()
            
            logger.info(f"   📋 Fetched {len(response.data) if response.data else 0} active escalation rules from database")
            
            if not response.data:
                logger.info(f"   ⚠️ No rules found in database for workflow {workflow_id}")
                return []
            
            # Separate workflow-specific and global rules
            workflow_specific_rules = []
            global_rules = []
            
            for rule in response.data:
                logger.info(f"   🔍 Evaluating rule '{rule['name']}': is_global={rule.get('is_global')}, workflow_id={rule.get('workflow_id')}, conditions={rule.get('conditions', [])}")
                
                # Check if rule conditions match this step
                if self._evaluate_conditions(rule.get('conditions', []), step):
                    logger.info(f"      ✅ Rule '{rule['name']}' conditions matched!")
                    
                    # Prioritize: workflow-specific rules > global rules
                    if rule.get('workflow_id') == workflow_id:
                        workflow_specific_rules.append(rule)
                        logger.info(f"      🎯 Added as WORKFLOW-SPECIFIC rule")
                    elif rule.get('is_global'):
                        global_rules.append(rule)
                        logger.info(f"      🌐 Added as GLOBAL rule")
                else:
                    logger.info(f"      ❌ Rule '{rule['name']}' conditions did NOT match")
            
            # If workflow-specific rules exist, use ONLY those (they override global)
            if workflow_specific_rules:
                logger.info(f"   🎯 Using {len(workflow_specific_rules)} workflow-specific rules (ignoring {len(global_rules)} global rules)")
                return workflow_specific_rules
            else:
                logger.info(f"   🌐 No workflow-specific rules, using {len(global_rules)} global rules")
                return global_rules
            
        except Exception as e:
            logger.error(f"Error getting applicable rules: {str(e)}")
            return []
    
    def _evaluate_conditions(self, conditions: List[Dict[str, Any]], step: Dict[str, Any]) -> bool:
        """Evaluate if rule conditions match the step"""
        if not conditions:
            logger.info(f"         No conditions - always match")
            return True  # No conditions = always match
        
        try:
            for i, condition in enumerate(conditions):
                condition_type = condition.get('type')
                value = condition.get('value')
                
                logger.info(f"         Condition {i+1}: type={condition_type}, value={value}")
                
                # Check step type
                if condition_type == 'step_type':
                    step_type = step.get('step_type')
                    logger.info(f"            step_type: {step_type} vs {value}")
                    if step_type != value:
                        logger.info(f"            ❌ step_type mismatch")
                        return False
                
                # Check hours overdue
                elif condition_type == 'hours_overdue':
                    operator = condition.get('operator', '>=')
                    hours_overdue = step.get('hours_overdue', 0)
                    logger.info(f"            hours_overdue: {hours_overdue} {operator} {value}")
                    
                    if operator == '>=' and hours_overdue < value:
                        logger.info(f"            ❌ hours_overdue check failed")
                        return False
                    elif operator == '>' and hours_overdue <= value:
                        logger.info(f"            ❌ hours_overdue check failed")
                        return False
                    elif operator == '==' and hours_overdue != value:
                        logger.info(f"            ❌ hours_overdue check failed")
                        return False
                
                # Check priority
                elif condition_type == 'priority':
                    instance_priority = step['workflow_instances'].get('priority', 'medium')
                    logger.info(f"            priority: {instance_priority} vs {value}")
                    if instance_priority != value:
                        logger.info(f"            ❌ priority mismatch")
                        return False
                
                # Check step status
                elif condition_type == 'status':
                    step_status = step.get('status')
                    logger.info(f"            status: {step_status} vs {value}")
                    if step_status != value:
                        logger.info(f"            ❌ status mismatch")
                        return False
            
            logger.info(f"         ✅ All conditions passed")
            return True
            
        except Exception as e:
            logger.error(f"Error evaluating conditions: {str(e)}")
            return False
    
    def _should_trigger_rule(self, rule: Dict[str, Any], step: Dict[str, Any]) -> bool:
        """Check if rule should trigger based on trigger timing and escalation count"""
        try:
            # Check if we've exceeded max escalations FOR THIS SPECIFIC RULE
            # Each rule should be counted independently
            max_escalations = rule.get('max_escalations', 3)
            
            # Count how many times THIS RULE has been triggered for this step
            rule_history = self.supabase.table("escalation_history")\
                .select("id", count="exact")\
                .eq("step_instance_id", step['id'])\
                .eq("rule_id", rule['id'])\
                .execute()
            
            rule_escalation_count = rule_history.count if rule_history.count else 0
            logger.info(f"      📊 Escalation check for rule '{rule['name']}': count={rule_escalation_count}, max={max_escalations}")
            
            if rule_escalation_count >= max_escalations:
                logger.info(f"      ⏭️  Skipping rule - max escalations ({max_escalations}) reached for this rule")
                return False
            
            # Check minimum time before trigger (support both hours and minutes for testing)
            trigger_after_minutes = rule.get('trigger_after_minutes')
            trigger_after_hours = rule.get('trigger_after_hours', 24)
            
            # Convert to minutes for comparison
            if trigger_after_minutes is not None:
                threshold_minutes = trigger_after_minutes
                logger.debug(f"Using minutes threshold: {threshold_minutes} minutes")
            else:
                threshold_minutes = trigger_after_hours * 60
                logger.debug(f"Using hours threshold: {trigger_after_hours}h ({threshold_minutes} minutes)")
            
            minutes_overdue = step.get('hours_overdue', 0) * 60
            
            logger.info(f"      ⏱️  Time check: minutes_overdue={minutes_overdue:.2f}, threshold={threshold_minutes}")
            
            if minutes_overdue < threshold_minutes:
                logger.info(f"      ⏭️  Skipping rule - not yet due (need {threshold_minutes}m, only {minutes_overdue:.1f}m)")
                return False
            
            logger.info(f"      ✅ Time threshold met! Proceeding with escalation.")
            
            # Check if THIS STEP was escalated recently (prevent spam)
            # Query escalation_history for this specific step and rule
            history_response = self.supabase.table("escalation_history")\
                .select("created_at")\
                .eq("step_instance_id", step['id'])\
                .eq("rule_id", rule['id'])\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            if history_response.data:
                last_escalation = history_response.data[0]
                last_trigger_time = datetime.fromisoformat(last_escalation['created_at'].replace('Z', '+00:00'))
                minutes_since_trigger = (datetime.now(self.timezone) - last_trigger_time).total_seconds() / 60
                
                repeat_every_minutes = rule.get('repeat_every_minutes')
                repeat_every_hours = rule.get('repeat_every_hours')
                
                # Check if repeat interval has passed
                if repeat_every_minutes and minutes_since_trigger < repeat_every_minutes:
                    logger.info(f"      ⏭️  Skipping - too soon to repeat (need {repeat_every_minutes}m, only {minutes_since_trigger:.1f}m since last)")
                    return False
                elif repeat_every_hours and minutes_since_trigger < (repeat_every_hours * 60):
                    logger.info(f"      ⏭️  Skipping - too soon to repeat (need {repeat_every_hours}h, only {minutes_since_trigger/60:.1f}h since last)")
                    return False
                elif not repeat_every_minutes and not repeat_every_hours:
                    # No repeat interval specified - don't repeat at all (one-time escalation)
                    logger.info(f"      ⏭️  Skipping - rule already triggered once and no repeat interval specified")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking rule trigger: {str(e)}")
            return False
    
    def _execute_rule_actions(self, rule: Dict[str, Any], step: Dict[str, Any]) -> int:
        """Execute all actions defined in the escalation rule"""
        actions = rule.get('actions', [])
        if not actions:
            logger.warning(f"No actions defined for rule '{rule['name']}'")
            return 0
        
        actions_executed = 0
        
        for action in actions:
            try:
                # Handle both 'type' and 'action' field names for backwards compatibility
                action_type = action.get('type') or action.get('action')
                logger.info(f"📋 Executing action: {action_type}")
                
                if action_type == 'notify':
                    self._action_notify(action, rule, step)
                    actions_executed += 1
                
                elif action_type == 'reassign':
                    self._action_reassign(action, step)
                    actions_executed += 1
                
                elif action_type == 'escalate_manager':
                    self._action_escalate_manager(action, rule, step)
                    actions_executed += 1
                
                elif action_type == 'auto_approve':
                    self._action_auto_approve(step)
                    actions_executed += 1
                
                elif action_type == 'auto_reject':
                    self._action_auto_reject(action, step)
                    actions_executed += 1
                
                elif action_type == 'pause' or action_type == 'pause_workflow':
                    self._action_pause_workflow(step)
                    actions_executed += 1
                
                else:
                    logger.warning(f"Unknown action type: {action_type}")
            
            except Exception as e:
                logger.error(f"Error executing action {action_type}: {str(e)}")
                continue
        
        return actions_executed
    
    def _action_notify(self, action: Dict[str, Any], rule: Dict[str, Any], step: Dict[str, Any]):
        """Send notification emails to specified recipients"""
        logger.info(f"🔔 Starting _action_notify: action={action}, step_id={step.get('id')}")
        recipients = action.get('recipients', [])
        
        # If no recipients specified, notify the step assignee
        if not recipients:
            # Get assignee email from step
            assignee_email = step.get('assigned_email')
            if not assignee_email:
                logger.warning("No recipients and no step assignee for notify action")
                return
            
            recipients = [{
                'email': assignee_email,
                'name': assignee_email.split('@')[0].title()
            }]
            logger.info(f"No recipients specified, defaulting to step assignee: {assignee_email}")
        
        logger.info(f"📝 Recipients list: {recipients}")
        
        instance = step['workflow_instances']
        logger.info(f"📝 Got workflow instance: {instance.keys() if isinstance(instance, dict) else type(instance)}")
        
        # Get document name from the joined documents table or fallback to metadata
        document_name = 'Unknown Document'
        documents = instance.get('documents')
        if documents:
            # documents might be a dict (single record) or list
            if isinstance(documents, list) and len(documents) > 0:
                document_name = documents[0].get('file_name', 'Unknown Document')
            elif isinstance(documents, dict):
                document_name = documents.get('file_name', 'Unknown Document')
        if document_name == 'Unknown Document' and instance.get('metadata', {}).get('document_name'):
            document_name = instance['metadata']['document_name']
        
        logger.info(f"📝 Document name: {document_name}")
        logger.info(f"📝 About to loop through {len(recipients)} recipients")
        
        for recipient in recipients:
            try:
                email = recipient.get('email')
                if not email:
                    logger.warning(f"Recipient missing email: {recipient}")
                    continue
                    
                name = recipient.get('name', email.split('@')[0].title())
                
                logger.info(f"📧 Attempting to send email to {email} for workflow '{rule['name']}'")
                result = self.email_service.send_workflow_escalation_email(
                    to_email=email,
                    recipient_name=name,
                    workflow_name=rule['name'],
                    step_name=step['step_name'],
                    original_assignee=step.get('assigned_email', 'Unknown'),
                    document_name=document_name,
                    overdue_days=step.get('days_overdue', 0),
                    instance_id=step['instance_id'],
                    document_id=instance.get('document_id')
                )
                logger.info(f"📧 Email send result: {result}")
                if result:
                    logger.info(f"✅ Sent escalation notification to {email}")
                else:
                    logger.error(f"❌ Email service returned False for {email}")
            except Exception as e:
                logger.error(f"Failed to send notification to {recipient}: {str(e)}")
                import traceback
                logger.error(traceback.format_exc())
                logger.error(traceback.format_exc())
    
    def _action_reassign(self, action: Dict[str, Any], step: Dict[str, Any]):
        """Reassign step to a different user"""
        new_assignee = action.get('assignee')
        if not new_assignee:
            logger.warning("No assignee specified for reassign action")
            return
        
        # Look up user by email if provided
        assignee_email = new_assignee.get('email')
        assignee_id = new_assignee.get('id')
        
        # Update step assignment (escalation_level is updated by _record_escalation)
        update_data = {
            'assigned_email': assignee_email,
            'metadata': {
                **step.get('metadata', {}),
                'reassigned_by_escalation': True,
                'previous_assignee': step.get('assigned_email'),
                'reassigned_at': datetime.now(self.timezone).isoformat()
            }
        }
        
        if assignee_id:
            update_data['assigned_to'] = assignee_id
        
        self.supabase.table("workflow_step_instances")\
            .update(update_data)\
            .eq("id", step['id'])\
            .execute()
        
        logger.info(f"✅ Reassigned step to {assignee_email}")
        
        # Send notification to new assignee
        instance = step['workflow_instances']
        document_name = instance.get('metadata', {}).get('document_name', 'Unknown Document')
        
        try:
            self.email_service.send_step_assignment_email(
                to_email=assignee_email,
                assignee_name=assignee_email.split('@')[0].title(),
                workflow_name=step['step_name'],
                step_name=step['step_name'],
                document_name=document_name,
                instance_id=step['instance_id'],
                document_id=instance.get('document_id'),
                additional_context=f"This task has been escalated and reassigned to you due to being {step.get('days_overdue', 0)} days overdue."
            )
        except Exception as e:
            logger.error(f"Failed to send reassignment notification: {str(e)}")
    
    def _action_escalate_manager(self, action: Dict[str, Any], rule: Dict[str, Any], step: Dict[str, Any]):
        """Escalate to manager or higher authority"""
        manager_email = action.get('manager_email')
        if not manager_email:
            logger.warning("No manager email specified for escalate_manager action")
            return
        
        instance = step['workflow_instances']
        
        # Get document name from the joined documents table or fallback to metadata
        document_name = 'Unknown Document'
        documents = instance.get('documents')
        if documents:
            # documents might be a dict (single record) or list
            if isinstance(documents, list) and len(documents) > 0:
                document_name = documents[0].get('file_name', 'Unknown Document')
            elif isinstance(documents, dict):
                document_name = documents.get('file_name', 'Unknown Document')
        if document_name == 'Unknown Document' and instance.get('metadata', {}).get('document_name'):
            document_name = instance['metadata']['document_name']
        
        # Get original assignee info
        original_assignee = step.get('assigned_email', 'Unknown')
        if original_assignee != 'Unknown':
            original_assignee = original_assignee.split('@')[0].title()
        
        # Send escalation email to manager
        self.email_service.send_workflow_escalation_email(
            to_email=manager_email,
            recipient_name=manager_email.split('@')[0].title(),
            workflow_name=rule['name'],
            step_name=step['step_name'],
            original_assignee=original_assignee,
            document_name=document_name,
            overdue_days=step.get('days_overdue', 0),
            instance_id=step['instance_id'],
            document_id=instance.get('document_id')
        )
        
        # Update step metadata (escalation_level is updated by _record_escalation)
        self.supabase.table("workflow_step_instances")\
            .update({
                'metadata': {
                    **step.get('metadata', {}),
                    'escalated_to_manager': True,
                    'manager_email': manager_email,
                    'escalated_at': datetime.now(self.timezone).isoformat()
                }
            })\
            .eq("id", step['id'])\
            .execute()
        
        logger.info(f"✅ Escalated to manager: {manager_email}")
    
    def _action_auto_approve(self, step: Dict[str, Any]):
        """Automatically approve the step"""
        if step['step_type'] != 'approval':
            logger.warning(f"Cannot auto-approve non-approval step (type: {step['step_type']})")
            return
        
        # Update step to completed with auto-approval
        self.supabase.table("workflow_step_instances")\
            .update({
                'status': 'completed',
                'decision': 'approved',
                'completed_at': datetime.now(self.timezone).isoformat(),
                'comments': 'Auto-approved by escalation rule after SLA breach',
                'metadata': {
                    **step.get('metadata', {}),
                    'auto_approved': True,
                    'auto_approved_at': datetime.now(self.timezone).isoformat()
                }
            })\
            .eq("id", step['id'])\
            .execute()
        
        logger.info(f"✅ Auto-approved step {step['id']}")
        
        # Send notification email to assignee
        assignee_email = step.get('assigned_email')
        if assignee_email:
            try:
                instance = step['workflow_instances']
                document_name = 'Unknown Document'
                documents = instance.get('documents')
                if documents:
                    if isinstance(documents, list) and len(documents) > 0:
                        document_name = documents[0].get('file_name', 'Unknown Document')
                    elif isinstance(documents, dict):
                        document_name = documents.get('file_name', 'Unknown Document')
                if document_name == 'Unknown Document' and instance.get('metadata', {}).get('document_name'):
                    document_name = instance['metadata']['document_name']
                
                self.email_service.send_step_assignment_email(
                    to_email=assignee_email,
                    assignee_name=assignee_email.split('@')[0].title(),
                    workflow_name=instance.get('metadata', {}).get('workflow_name', 'Workflow'),
                    step_name=step['step_name'],
                    document_name=document_name,
                    instance_id=step['instance_id'],
                    document_id=instance.get('document_id'),
                    additional_context="✅ This workflow step has been automatically approved due to escalation rules."
                )
                logger.info(f"📧 Sent auto-approve notification to {assignee_email}")
            except Exception as e:
                logger.error(f"Failed to send auto-approve notification: {str(e)}")
        
        # Move workflow to next step
        self._advance_workflow(step)
    
    def _action_auto_reject(self, action: Dict[str, Any], step: Dict[str, Any]):
        """Automatically reject the step"""
        if step['step_type'] != 'approval':
            logger.warning(f"Cannot auto-reject non-approval step (type: {step['step_type']})")
            return
        
        reason = action.get('reason', 'Auto-rejected by escalation rule after SLA breach')
        
        # Update step to completed with rejection
        self.supabase.table("workflow_step_instances")\
            .update({
                'status': 'completed',
                'decision': 'rejected',
                'completed_at': datetime.now(self.timezone).isoformat(),
                'comments': reason,
                'metadata': {
                    **step.get('metadata', {}),
                    'auto_rejected': True,
                    'auto_rejected_at': datetime.now(self.timezone).isoformat()
                }
            })\
            .eq("id", step['id'])\
            .execute()
        
        logger.info(f"✅ Auto-rejected step {step['id']}")
        
        # Update workflow instance status to rejected
        self.supabase.table("workflow_instances")\
            .update({
                'status': 'rejected',
                'completed_at': datetime.now(self.timezone).isoformat()
            })\
            .eq("id", step['instance_id'])\
            .execute()
        
        # Send notification email to assignee
        assignee_email = step.get('assigned_email')
        if assignee_email:
            try:
                instance = step['workflow_instances']
                document_name = 'Unknown Document'
                documents = instance.get('documents')
                if documents:
                    if isinstance(documents, list) and len(documents) > 0:
                        document_name = documents[0].get('file_name', 'Unknown Document')
                    elif isinstance(documents, dict):
                        document_name = documents.get('file_name', 'Unknown Document')
                if document_name == 'Unknown Document' and instance.get('metadata', {}).get('document_name'):
                    document_name = instance['metadata']['document_name']
                
                self.email_service.send_step_assignment_email(
                    to_email=assignee_email,
                    assignee_name=assignee_email.split('@')[0].title(),
                    workflow_name=instance.get('metadata', {}).get('workflow_name', 'Workflow'),
                    step_name=step['step_name'],
                    document_name=document_name,
                    instance_id=step['instance_id'],
                    document_id=instance.get('document_id'),
                    additional_context=f"❌ This workflow step has been automatically rejected due to escalation rules. Reason: {reason}"
                )
                logger.info(f"📧 Sent auto-reject notification to {assignee_email}")
            except Exception as e:
                logger.error(f"Failed to send auto-reject notification: {str(e)}")
    
    def _action_pause_workflow(self, step: Dict[str, Any]):
        """Pause the workflow for manual intervention"""
        # Update workflow instance status
        self.supabase.table("workflow_instances")\
            .update({
                'status': 'paused',
                'metadata': {
                    **step['workflow_instances'].get('metadata', {}),
                    'paused_by_escalation': True,
                    'paused_at': datetime.now(self.timezone).isoformat(),
                    'paused_step_id': step['id']
                }
            })\
            .eq("id", step['instance_id'])\
            .execute()
        
        logger.info(f"✅ Paused workflow {step['instance_id']}")
        
        # Send notification email to assignee
        assignee_email = step.get('assigned_email')
        if assignee_email:
            try:
                instance = step['workflow_instances']
                document_name = 'Unknown Document'
                documents = instance.get('documents')
                if documents:
                    if isinstance(documents, list) and len(documents) > 0:
                        document_name = documents[0].get('file_name', 'Unknown Document')
                    elif isinstance(documents, dict):
                        document_name = documents.get('file_name', 'Unknown Document')
                if document_name == 'Unknown Document' and instance.get('metadata', {}).get('document_name'):
                    document_name = instance['metadata']['document_name']
                
                self.email_service.send_step_assignment_email(
                    to_email=assignee_email,
                    assignee_name=assignee_email.split('@')[0].title(),
                    workflow_name=instance.get('metadata', {}).get('workflow_name', 'Workflow'),
                    step_name=step['step_name'],
                    document_name=document_name,
                    instance_id=step['instance_id'],
                    document_id=instance.get('document_id'),
                    additional_context="⏸️ This workflow has been PAUSED due to escalation rules. Please review and take appropriate action."
                )
                logger.info(f"📧 Sent pause notification to {assignee_email}")
            except Exception as e:
                logger.error(f"Failed to send pause notification: {str(e)}")
    
    def _advance_workflow(self, completed_step: Dict[str, Any]):
        """Advance workflow to next step after auto-approval"""
        try:
            # Get workflow definition to find next step
            workflow_id = completed_step['workflow_instances']['workflow_id']
            workflow_response = self.supabase.table("workflow_definitions")\
                .select("steps")\
                .eq("id", workflow_id)\
                .execute()
            
            if not workflow_response.data:
                return
            
            steps = workflow_response.data[0]['steps']
            current_order = None
            
            # Find current step order
            for step in steps:
                if step['id'] == completed_step['step_id']:
                    current_order = step['order']
                    break
            
            if current_order is None:
                return
            
            # Find next step
            next_step = None
            for step in steps:
                if step['order'] == current_order + 1:
                    next_step = step
                    break
            
            if next_step:
                # Activate next step
                self.supabase.table("workflow_step_instances")\
                    .update({
                        'status': 'in_progress',
                        'started_at': datetime.now(self.timezone).isoformat()
                    })\
                    .eq("instance_id", completed_step['instance_id'])\
                    .eq("step_id", next_step['id'])\
                    .execute()
                
                logger.info(f"✅ Advanced workflow to next step")
            else:
                # No more steps - complete workflow
                self.supabase.table("workflow_instances")\
                    .update({
                        'status': 'completed',
                        'completed_at': datetime.now(self.timezone).isoformat()
                    })\
                    .eq("id", completed_step['instance_id'])\
                    .execute()
                
                logger.info(f"✅ Workflow completed")
        
        except Exception as e:
            logger.error(f"Error advancing workflow: {str(e)}")
    
    def _record_escalation(self, rule: Dict[str, Any], step: Dict[str, Any]):
        """Record escalation in history and update counters"""
        try:
            # Record in escalation_history table
            self.supabase.table("escalation_history").insert({
                'rule_id': rule['id'],
                'instance_id': step['instance_id'],
                'step_instance_id': step['id'],
                'triggered_at': datetime.now(self.timezone).isoformat(),
                'actions_taken': rule.get('actions', []),
                'escalation_level': step.get('escalation_level', 0) + 1
            }).execute()
            
            # Update step escalation_level in workflow_step_instances
            new_escalation_level = step.get('escalation_level', 0) + 1
            self.supabase.table("workflow_step_instances")\
                .update({
                    'escalation_level': new_escalation_level
                })\
                .eq("id", step['id'])\
                .execute()
            logger.info(f"      📈 Updated step escalation_level to {new_escalation_level}")
            
            # Update rule trigger count and last triggered time
            self.supabase.table("escalation_rules")\
                .update({
                    'trigger_count': rule.get('trigger_count', 0) + 1,
                    'last_triggered_at': datetime.now(self.timezone).isoformat()
                })\
                .eq("id", rule['id'])\
                .execute()
            
            # Update instance escalation count
            instance = step['workflow_instances']
            self.supabase.table("workflow_instances")\
                .update({
                    'escalation_count': instance.get('escalation_count', 0) + 1
                })\
                .eq("id", step['instance_id'])\
                .execute()
            
            logger.info(f"✅ Recorded escalation in history")
            
        except Exception as e:
            logger.error(f"Error recording escalation: {str(e)}")

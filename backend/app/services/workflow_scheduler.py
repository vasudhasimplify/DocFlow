"""
Workflow Scheduler Service
Checks and executes scheduled workflows based on their trigger configuration.
Also processes escalation rules for overdue workflow steps.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from croniter import croniter
from supabase import Client
import pytz

from .escalation_processor import EscalationProcessor

logger = logging.getLogger(__name__)

class WorkflowScheduler:
    """Service to handle scheduled workflow execution and escalation processing"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.timezone = pytz.timezone('UTC')
        self.escalation_processor = EscalationProcessor(supabase_client)
    
    def check_and_execute_schedules(self) -> Dict[str, Any]:
        """
        Check all scheduled workflows and execute those that are due.
        Also process escalation rules for overdue steps.
        Returns summary of executions and escalations.
        """
        logger.info("🕐 Checking scheduled workflows and escalations...")
        
        results = {
            "schedules": {},
            "escalations": {}
        }
        
        try:
            # 1. Process scheduled workflows
            schedule_result = self._check_scheduled_workflows()
            results["schedules"] = schedule_result
            
            # 2. Process escalations
            escalation_result = self.escalation_processor.check_and_process_escalations()
            results["escalations"] = escalation_result
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Scheduler error: {str(e)}")
            return {
                "schedules": {"error": str(e)},
                "escalations": {"error": str(e)},
                "timestamp": datetime.now(self.timezone).isoformat()
            }
    
    def _check_scheduled_workflows(self) -> Dict[str, Any]:
        """Check and execute scheduled workflows"""
        logger.info("📅 Checking scheduled workflows...")
        
        try:
            # Get all active workflows with schedule trigger
            workflows_response = self.supabase.table('workflow_definitions')\
                .select('*')\
                .eq('status', 'active')\
                .eq('trigger_type', 'schedule')\
                .execute()
            
            if not workflows_response.data:
                logger.info("No active scheduled workflows found")
                return {
                    "checked": 0,
                    "executed": 0,
                    "errors": []
                }
            
            workflows = workflows_response.data
            logger.info(f"Found {len(workflows)} scheduled workflows to check")
            
            executed_count = 0
            errors = []
            
            for workflow in workflows:
                try:
                    if self._should_execute_workflow(workflow):
                        logger.info(f"⚡ Executing scheduled workflow: {workflow['name']}")
                        self._execute_workflow(workflow)
                        executed_count += 1
                except Exception as e:
                    error_msg = f"Error processing workflow {workflow.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
            
            summary = {
                "checked": len(workflows),
                "executed": executed_count,
                "errors": errors,
                "timestamp": datetime.now(self.timezone).isoformat()
            }
            
            logger.info(f"✅ Scheduler run complete: {executed_count} workflows executed")
            return summary
            
        except Exception as e:
            logger.error(f"❌ Scheduler error: {str(e)}")
            return {
                "checked": 0,
                "executed": 0,
                "errors": [str(e)],
                "timestamp": datetime.now(self.timezone).isoformat()
            }
    
    def _should_execute_workflow(self, workflow: Dict[str, Any]) -> bool:
        """
        Determine if a scheduled workflow should execute now based on:
        1. Schedule configuration
        2. Last execution time
        """
        try:
            trigger_config = workflow.get('trigger_config', {})
            schedule_type = trigger_config.get('schedule_type', 'daily')
            
            # Get last execution time from workflow_instances
            last_execution = self._get_last_execution_time(workflow['id'])
            current_time = datetime.now(self.timezone)
            
            logger.debug(f"Checking workflow '{workflow['name']}' - Schedule: {schedule_type}, Last run: {last_execution}")
            
            if schedule_type == 'hourly':
                return self._check_hourly(current_time, last_execution)
            elif schedule_type == 'daily':
                return self._check_daily(current_time, last_execution, trigger_config)
            elif schedule_type == 'weekly':
                return self._check_weekly(current_time, last_execution, trigger_config)
            elif schedule_type == 'monthly':
                return self._check_monthly(current_time, last_execution, trigger_config)
            elif schedule_type == 'cron':
                return self._check_cron(current_time, last_execution, trigger_config)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking workflow schedule: {str(e)}")
            return False
    
    def _get_last_execution_time(self, workflow_id: str) -> Optional[datetime]:
        """Get the last execution time for a workflow"""
        try:
            response = self.supabase.table('workflow_instances')\
                .select('created_at')\
                .eq('workflow_id', workflow_id)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if response.data:
                last_created = response.data[0]['created_at']
                # Parse ISO format datetime
                return datetime.fromisoformat(last_created.replace('Z', '+00:00'))
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting last execution time: {str(e)}")
            return None
    
    def _check_hourly(self, current_time: datetime, last_execution: Optional[datetime]) -> bool:
        """Check if hourly workflow should run (once per hour)"""
        if not last_execution:
            return True
        
        # Execute if more than 1 hour has passed
        return (current_time - last_execution) >= timedelta(hours=1)
    
    def _check_daily(self, current_time: datetime, last_execution: Optional[datetime], config: Dict) -> bool:
        """Check if daily workflow should run at specified time"""
        schedule_time = config.get('schedule_time', '09:00')
        target_hour, target_minute = map(int, schedule_time.split(':'))
        
        # Check if we're at the target time (within 1 minute window)
        is_target_time = (
            current_time.hour == target_hour and 
            current_time.minute == target_minute
        )
        
        if not is_target_time:
            return False
        
        # If already ran today, don't run again
        if last_execution:
            return last_execution.date() < current_time.date()
        
        return True
    
    def _check_weekly(self, current_time: datetime, last_execution: Optional[datetime], config: Dict) -> bool:
        """Check if weekly workflow should run on specified day and time"""
        schedule_day = config.get('schedule_day', 'monday')
        schedule_time = config.get('schedule_time', '09:00')
        
        # Map day names to weekday numbers (0=Monday, 6=Sunday)
        day_mapping = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        target_weekday = day_mapping.get(schedule_day.lower(), 0)
        target_hour, target_minute = map(int, schedule_time.split(':'))
        
        # Check if we're on the right day and time
        is_target_day_time = (
            current_time.weekday() == target_weekday and
            current_time.hour == target_hour and
            current_time.minute == target_minute
        )
        
        if not is_target_day_time:
            return False
        
        # If already ran this week, don't run again
        if last_execution:
            days_since_last = (current_time.date() - last_execution.date()).days
            return days_since_last >= 7
        
        return True
    
    def _check_monthly(self, current_time: datetime, last_execution: Optional[datetime], config: Dict) -> bool:
        """Check if monthly workflow should run on specified day and time"""
        schedule_date = config.get('schedule_date', 1)
        schedule_time = config.get('schedule_time', '09:00')
        target_hour, target_minute = map(int, schedule_time.split(':'))
        
        # Check if we're on the right day and time
        is_target_day_time = (
            current_time.day == schedule_date and
            current_time.hour == target_hour and
            current_time.minute == target_minute
        )
        
        if not is_target_day_time:
            return False
        
        # If already ran this month, don't run again
        if last_execution:
            return (
                last_execution.year < current_time.year or
                last_execution.month < current_time.month
            )
        
        return True
    
    def _check_cron(self, current_time: datetime, last_execution: Optional[datetime], config: Dict) -> bool:
        """Check if cron-based workflow should run"""
        try:
            cron_expression = config.get('schedule_cron', '')
            if not cron_expression:
                logger.warning("No cron expression found for cron-scheduled workflow")
                return False
            
            # Create croniter instance
            cron = croniter(cron_expression, current_time)
            
            # Get the previous scheduled time
            prev_scheduled = cron.get_prev(datetime)
            
            # If no last execution, run now
            if not last_execution:
                return True
            
            # Run if the previous scheduled time is after last execution
            return prev_scheduled > last_execution
            
        except Exception as e:
            logger.error(f"Error parsing cron expression: {str(e)}")
            return False
    
    def _execute_workflow(self, workflow: Dict[str, Any]):
        """
        Execute a scheduled workflow by creating a new workflow instance
        """
        try:
            # Create workflow instance
            instance_data = {
                'workflow_id': workflow['id'],
                'status': 'in_progress',
                'started_by': workflow['created_by'],  # Use workflow creator as starter
                'started_at': datetime.now(self.timezone).isoformat(),
                'metadata': {
                    'trigger': 'schedule',
                    'schedule_type': workflow.get('trigger_config', {}).get('schedule_type', 'unknown')
                }
            }
            
            instance_response = self.supabase.table('workflow_instances')\
                .insert(instance_data)\
                .execute()
            
            if not instance_response.data:
                raise Exception("Failed to create workflow instance")
            
            instance_id = instance_response.data[0]['id']
            logger.info(f"✅ Created workflow instance: {instance_id}")
            
            # Create step instances for all workflow steps
            steps = workflow.get('steps', [])
            for step in steps:
                step_instance_data = {
                    'instance_id': instance_id,
                    'step_id': step['id'],
                    'step_name': step.get('name', f"Step {step['order']}"),
                    'step_type': step.get('type', 'task'),
                    'step_config': step.get('config', {}),
                    'status': 'pending' if step['order'] == 1 else 'blocked',
                    'assigned_to': step.get('assignees', [{}])[0].get('value') if step.get('assignees') else None,
                    'metadata': {
                        'created_by_scheduler': True,
                        'schedule_trigger': workflow.get('trigger_config', {}).get('schedule_type', 'unknown')
                    }
                }
                
                self.supabase.table('workflow_step_instances')\
                    .insert(step_instance_data)\
                    .execute()
            
            logger.info(f"✅ Created {len(steps)} step instances for workflow {workflow['id']}")
            
            # TODO: Send notifications to assignees
            
        except Exception as e:
            logger.error(f"Error executing workflow: {str(e)}")
            raise

"""
Workflow Email Notification Service
Sends workflow-related emails using existing EmailService
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from .email import EmailService

logger = logging.getLogger(__name__)


class WorkflowEmailService:
    """Service for sending workflow notification emails"""
    
    def __init__(self):
        self.email_service = EmailService()
    
    def _get_base_url(self) -> str:
        """Get the base URL for the application"""
        # TODO: Make this configurable via environment variable
        return "http://localhost:4173"
    
    def send_step_assignment_email(
        self,
        to_email: str,
        assignee_name: str,
        workflow_name: str,
        step_name: str,
        document_name: str,
        instance_id: str,
        document_id: str,
        additional_context: Optional[str] = None
    ) -> bool:
        """
        Send email when a workflow step is assigned to a user
        
        Args:
            to_email: Recipient email
            assignee_name: Name of the person assigned
            workflow_name: Name of the workflow
            step_name: Name of the step (e.g., "Finance Approval")
            document_name: Name of the document being processed
            instance_id: Workflow instance ID
            document_id: Document ID
            additional_context: Optional additional message
        """
        workflow_url = f"{self._get_base_url()}/workflows?instance={instance_id}"
        document_url = f"{self._get_base_url()}/documents?document={document_id}"
        
        subject = f"Action Required: {step_name} - {document_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .info-box {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4F46E5; }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: #4F46E5; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 10px 5px;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">📋 Workflow Action Required</h2>
                </div>
                <div class="content">
                    <p>Hi <strong>{assignee_name}</strong>,</p>
                    
                    <p>You have been assigned a new workflow step that requires your action.</p>
                    
                    <div class="info-box">
                        <p style="margin: 5px 0;"><strong>Workflow:</strong> {workflow_name}</p>
                        <p style="margin: 5px 0;"><strong>Step:</strong> {step_name}</p>
                        <p style="margin: 5px 0;"><strong>Document:</strong> {document_name}</p>
                        <p style="margin: 5px 0;"><strong>Assigned:</strong> {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</p>
                    </div>
                    
                    {f'<p><em>{additional_context}</em></p>' if additional_context else ''}
                    
                    <p style="margin-top: 20px;">
                        <a href="{workflow_url}" class="button">🔍 Review Workflow</a>
                        <a href="{document_url}" class="button">📄 View Document</a>
                    </p>
                    
                    <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                        Please review the document and take appropriate action at your earliest convenience.
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from DocFlow Workflow System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body
        )
    
    def send_step_completed_email(
        self,
        to_email: str,
        recipient_name: str,
        workflow_name: str,
        step_name: str,
        completed_by: str,
        document_name: str,
        action: str,  # "approved", "rejected", "completed"
        comments: Optional[str] = None,
        instance_id: str = "",
        document_id: str = ""
    ) -> bool:
        """
        Send email when a workflow step is completed
        
        Args:
            to_email: Recipient email
            recipient_name: Name of the recipient
            workflow_name: Name of the workflow
            step_name: Name of the completed step
            completed_by: Name of person who completed the step
            document_name: Name of the document
            action: Action taken (approved/rejected/completed)
            comments: Optional comments from approver
            instance_id: Workflow instance ID
            document_id: Document ID
        """
        workflow_url = f"{self._get_base_url()}/workflows?instance={instance_id}"
        
        action_emoji = {
            "approved": "✅",
            "rejected": "❌",
            "completed": "✔️"
        }.get(action.lower(), "✔️")
        
        action_color = {
            "approved": "#10b981",
            "rejected": "#ef4444",
            "completed": "#3b82f6"
        }.get(action.lower(), "#3b82f6")
        
        subject = f"Workflow Update: {step_name} {action.title()} - {document_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: {action_color}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .info-box {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid {action_color}; }}
                .comments-box {{ background-color: #fffbeb; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #fbbf24; }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: {action_color}; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 10px 0;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">{action_emoji} Workflow Step {action.title()}</h2>
                </div>
                <div class="content">
                    <p>Hi <strong>{recipient_name}</strong>,</p>
                    
                    <p>A workflow step has been <strong>{action}</strong>.</p>
                    
                    <div class="info-box">
                        <p style="margin: 5px 0;"><strong>Workflow:</strong> {workflow_name}</p>
                        <p style="margin: 5px 0;"><strong>Step:</strong> {step_name}</p>
                        <p style="margin: 5px 0;"><strong>Document:</strong> {document_name}</p>
                        <p style="margin: 5px 0;"><strong>Action:</strong> {action.title()}</p>
                        <p style="margin: 5px 0;"><strong>By:</strong> {completed_by}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</p>
                    </div>
                    
                    {f'<div class="comments-box"><strong>💬 Comments:</strong><p style="margin: 10px 0 0 0;">{comments}</p></div>' if comments else ''}
                    
                    <p style="margin-top: 20px;">
                        <a href="{workflow_url}" class="button">View Workflow Details</a>
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from DocFlow Workflow System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body
        )
    
    def send_workflow_escalation_email(
        self,
        to_email: str,
        recipient_name: str,
        workflow_name: str,
        step_name: str,
        original_assignee: str,
        document_name: str,
        overdue_days: int,
        instance_id: str,
        document_id: str
    ) -> bool:
        """
        Send email when a workflow step is escalated due to SLA breach
        
        Args:
            to_email: Recipient email (escalation recipient)
            recipient_name: Name of escalation recipient
            workflow_name: Name of the workflow
            step_name: Name of the overdue step
            original_assignee: Name of original assignee
            document_name: Name of the document
            overdue_days: Number of days overdue
            instance_id: Workflow instance ID
            document_id: Document ID
        """
        workflow_url = f"{self._get_base_url()}/workflows?instance={instance_id}"
        
        subject = f"🚨 ESCALATION: {step_name} Overdue ({overdue_days} days) - {document_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .warning-box {{ background-color: #fef2f2; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: #dc2626; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 10px 0;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">🚨 Workflow Escalation Alert</h2>
                </div>
                <div class="content">
                    <p>Hi <strong>{recipient_name}</strong>,</p>
                    
                    <p>A workflow step has been escalated to you due to SLA breach.</p>
                    
                    <div class="warning-box">
                        <p style="margin: 5px 0;"><strong>⚠️ Status:</strong> OVERDUE ({overdue_days} days)</p>
                        <p style="margin: 5px 0;"><strong>Workflow:</strong> {workflow_name}</p>
                        <p style="margin: 5px 0;"><strong>Step:</strong> {step_name}</p>
                        <p style="margin: 5px 0;"><strong>Document:</strong> {document_name}</p>
                        <p style="margin: 5px 0;"><strong>Original Assignee:</strong> {original_assignee}</p>
                        <p style="margin: 5px 0;"><strong>Escalated:</strong> {datetime.now().strftime("%B %d, %Y at %I:%M %p")}</p>
                    </div>
                    
                    <p style="color: #dc2626; font-weight: bold;">
                        This workflow step requires immediate attention to prevent further delays.
                    </p>
                    
                    <p style="margin-top: 20px;">
                        <a href="{workflow_url}" class="button">🚨 Take Action Now</a>
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated escalation notification from DocFlow Workflow System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body
        )
    
    def send_workflow_reminder_email(
        self,
        to_email: str,
        assignee_name: str,
        workflow_name: str,
        step_name: str,
        document_name: str,
        days_pending: int,
        instance_id: str
    ) -> bool:
        """
        Send reminder email for pending workflow step
        
        Args:
            to_email: Recipient email
            assignee_name: Name of the assignee
            workflow_name: Name of the workflow
            step_name: Name of the pending step
            document_name: Name of the document
            days_pending: Number of days the step has been pending
            instance_id: Workflow instance ID
        """
        workflow_url = f"{self._get_base_url()}/workflows?instance={instance_id}"
        
        subject = f"Reminder: {step_name} Pending ({days_pending} days) - {document_name}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                .reminder-box {{ background-color: #fffbeb; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
                .button {{ 
                    display: inline-block; 
                    padding: 12px 24px; 
                    background-color: #f59e0b; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px; 
                    margin: 10px 0;
                }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin: 0;">⏰ Workflow Reminder</h2>
                </div>
                <div class="content">
                    <p>Hi <strong>{assignee_name}</strong>,</p>
                    
                    <p>This is a friendly reminder that you have a pending workflow action.</p>
                    
                    <div class="reminder-box">
                        <p style="margin: 5px 0;"><strong>Workflow:</strong> {workflow_name}</p>
                        <p style="margin: 5px 0;"><strong>Step:</strong> {step_name}</p>
                        <p style="margin: 5px 0;"><strong>Document:</strong> {document_name}</p>
                        <p style="margin: 5px 0;"><strong>Pending for:</strong> {days_pending} days</p>
                    </div>
                    
                    <p>Please review and complete this step to keep the workflow moving forward.</p>
                    
                    <p style="margin-top: 20px;">
                        <a href="{workflow_url}" class="button">Complete Action</a>
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated reminder from DocFlow Workflow System.</p>
                    <p>Please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_body
        )
    
    def send_bulk_notification(
        self,
        emails: List[str],
        subject: str,
        html_content: str
    ) -> Dict[str, bool]:
        """
        Send the same email to multiple recipients
        
        Args:
            emails: List of recipient emails
            subject: Email subject
            html_content: HTML email body
        
        Returns:
            Dictionary mapping email -> success status
        """
        results = {}
        for email in emails:
            try:
                success = self.email_service.send_email(
                    to_email=email,
                    subject=subject,
                    html_content=html_content
                )
                results[email] = success
            except Exception as e:
                logger.error(f"Failed to send email to {email}: {str(e)}")
                results[email] = False
        
        return results

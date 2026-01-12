"""
Legal Hold Reminder Processor Service
Automatically processes legal hold reminders, acknowledgment deadlines, and escalations.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from supabase import Client
import pytz

from .email import EmailService

logger = logging.getLogger(__name__)


class LegalHoldReminderProcessor:
    """Service to process automatic reminders and escalations for legal holds"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.email_service = EmailService()
        self.timezone = pytz.timezone('UTC')
        self.base_url = "http://localhost:4173"  # TODO: Make configurable
    
    def process_all_holds(self) -> Dict[str, Any]:
        """
        Main entry point: Process all active legal holds for reminders and escalations.
        Returns summary of actions taken.
        """
        logger.info("⚖️ Starting legal hold reminder processing...")
        
        results = {
            "holds_checked": 0,
            "reminders_sent": 0,
            "escalations_triggered": 0,
            "acknowledgment_notices_sent": 0,
            "errors": [],
            "timestamp": datetime.now(self.timezone).isoformat()
        }
        
        try:
            # Get all active legal holds with notification settings enabled
            holds = self._get_active_holds()
            results["holds_checked"] = len(holds)
            
            if not holds:
                logger.info("✅ No active legal holds requiring processing")
                return results
            
            logger.info(f"📋 Processing {len(holds)} active legal holds")
            
            for hold in holds:
                try:
                    hold_results = self._process_single_hold(hold)
                    results["reminders_sent"] += hold_results.get("reminders_sent", 0)
                    results["escalations_triggered"] += hold_results.get("escalations_triggered", 0)
                    results["acknowledgment_notices_sent"] += hold_results.get("acknowledgment_notices_sent", 0)
                except Exception as e:
                    error_msg = f"Error processing hold {hold.get('id')}: {str(e)}"
                    logger.error(error_msg)
                    results["errors"].append(error_msg)
            
            logger.info(f"✅ Legal hold processing complete: {results['reminders_sent']} reminders sent, {results['escalations_triggered']} escalations")
            return results
            
        except Exception as e:
            logger.error(f"❌ Legal hold processor error: {str(e)}")
            results["errors"].append(str(e))
            return results
    
    def _get_active_holds(self) -> List[Dict[str, Any]]:
        """Get all active legal holds"""
        try:
            result = self.supabase.table("legal_holds")\
                .select("*")\
                .eq("status", "active")\
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching active holds: {e}")
            return []
    
    def _get_hold_custodians(self, hold_id: str) -> List[Dict[str, Any]]:
        """Get all custodians for a legal hold"""
        try:
            result = self.supabase.table("legal_hold_custodians")\
                .select("*")\
                .eq("hold_id", hold_id)\
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching custodians for hold {hold_id}: {e}")
            return []
    
    def _process_single_hold(self, hold: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single legal hold for reminders and escalations"""
        results = {
            "reminders_sent": 0,
            "escalations_triggered": 0,
            "acknowledgment_notices_sent": 0
        }
        
        hold_id = hold["id"]
        hold_name = hold.get("name", "Legal Hold")
        
        # Get notification settings
        requires_acknowledgment = hold.get("requires_acknowledgment", True)
        acknowledgment_deadline_days = hold.get("acknowledgment_deadline_days", 5)
        send_reminders = hold.get("send_reminders", True)
        reminder_frequency_days = hold.get("reminder_frequency_days", 7)
        escalation_enabled = hold.get("escalation_enabled", True)
        escalation_after_days = hold.get("escalation_after_days", 14)
        legal_team_emails = hold.get("legal_team_emails", [])
        escalation_contacts = hold.get("escalation_contacts", [])
        
        # Get custodians
        custodians = self._get_hold_custodians(hold_id)
        
        if not custodians:
            logger.info(f"No custodians for hold {hold_id}")
            return results
        
        now = datetime.now(self.timezone)
        
        for custodian in custodians:
            custodian_id = custodian["id"]
            custodian_status = custodian.get("status", "pending")
            custodian_email = custodian.get("email")
            custodian_name = custodian.get("name", "Custodian")
            added_at = custodian.get("added_at") or custodian.get("created_at")
            last_reminder_sent = custodian.get("last_reminder_sent")
            reminder_count = custodian.get("reminder_count", 0)
            
            if not custodian_email:
                continue
            
            # Skip already acknowledged custodians
            if custodian_status == "acknowledged":
                continue
            
            # Parse dates
            added_date = self._parse_date(added_at)
            last_reminder_date = self._parse_date(last_reminder_sent) if last_reminder_sent else None
            
            if not added_date:
                continue
            
            days_since_added = (now - added_date).days
            days_since_last_reminder = (now - last_reminder_date).days if last_reminder_date else None
            
            # 1. Check if we need to send initial acknowledgment notice (first day)
            if reminder_count == 0 and requires_acknowledgment:
                logger.info(f"📧 Sending initial acknowledgment notice to {custodian_email} for hold {hold_name}")
                if self._send_acknowledgment_notice(hold, custodian):
                    results["acknowledgment_notices_sent"] += 1
                    self._update_custodian_reminder_count(custodian_id, 1)
            
            # 2. Check if we need to send reminder
            elif send_reminders and custodian_status == "pending":
                should_send_reminder = False
                
                if last_reminder_date is None:
                    # No reminder sent yet, check if enough time has passed since added
                    should_send_reminder = days_since_added >= reminder_frequency_days
                else:
                    # Check if enough time has passed since last reminder
                    should_send_reminder = days_since_last_reminder >= reminder_frequency_days
                
                if should_send_reminder:
                    logger.info(f"📧 Sending reminder #{reminder_count + 1} to {custodian_email} for hold {hold_name}")
                    if self._send_reminder_email(hold, custodian):
                        results["reminders_sent"] += 1
                        self._update_custodian_reminder_count(custodian_id, reminder_count + 1)
            
            # 3. Check if we need to escalate
            if escalation_enabled and custodian_status == "pending":
                if days_since_added >= escalation_after_days:
                    # Check if not already escalated
                    if custodian_status != "escalated":
                        logger.info(f"🚨 Escalating custodian {custodian_email} for hold {hold_name}")
                        if self._send_escalation_email(hold, custodian, legal_team_emails + escalation_contacts):
                            results["escalations_triggered"] += 1
                            self._update_custodian_status(custodian_id, "escalated")
        
        return results
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a date string to datetime"""
        if not date_str:
            return None
        try:
            # Handle ISO format with or without timezone
            if "T" in date_str:
                dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            else:
                dt = datetime.fromisoformat(date_str)
            
            # Make timezone-aware if not already
            if dt.tzinfo is None:
                dt = self.timezone.localize(dt)
            return dt
        except Exception as e:
            logger.error(f"Error parsing date {date_str}: {e}")
            return None
    
    def _update_custodian_reminder_count(self, custodian_id: str, count: int):
        """Update custodian reminder count and last reminder sent timestamp"""
        try:
            self.supabase.table("legal_hold_custodians")\
                .update({
                    "reminder_count": count,
                    "last_reminder_sent": datetime.now(self.timezone).isoformat()
                })\
                .eq("id", custodian_id)\
                .execute()
        except Exception as e:
            logger.error(f"Error updating custodian reminder count: {e}")
    
    def _update_custodian_status(self, custodian_id: str, status: str):
        """Update custodian status"""
        try:
            self.supabase.table("legal_hold_custodians")\
                .update({"status": status})\
                .eq("id", custodian_id)\
                .execute()
        except Exception as e:
            logger.error(f"Error updating custodian status: {e}")
    
    def _send_acknowledgment_notice(self, hold: Dict[str, Any], custodian: Dict[str, Any]) -> bool:
        """Send initial acknowledgment notice to custodian"""
        try:
            subject = f"⚖️ Legal Hold Notice - {hold.get('name')} - ACTION REQUIRED"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                    .alert {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }}
                    .info-box {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #7c3aed; }}
                    .button {{ 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #7c3aed; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                        margin: 10px 5px;
                    }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                    .obligations {{ background-color: #fee2e2; border: 1px solid #fecaca; padding: 15px; margin: 15px 0; border-radius: 6px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin: 0;">⚖️ Legal Hold Notice</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>{custodian.get('name', 'Custodian')}</strong>,</p>
                        
                        <div class="alert">
                            <strong>⚠️ IMPORTANT:</strong> You are receiving this notice because you have been identified as a custodian 
                            of potentially relevant information for a legal matter.
                        </div>
                        
                        <div class="info-box">
                            <p style="margin: 5px 0;"><strong>Matter Name:</strong> {hold.get('matter_name', hold.get('name'))}</p>
                            <p style="margin: 5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                            <p style="margin: 5px 0;"><strong>Hold Name:</strong> {hold.get('name')}</p>
                            <p style="margin: 5px 0;"><strong>Effective Date:</strong> {hold.get('effective_date', 'Immediately')}</p>
                        </div>
                        
                        <p><strong>Reason for Hold:</strong></p>
                        <p>{hold.get('hold_reason', 'Legal preservation requirement')}</p>
                        
                        <div class="obligations">
                            <p style="margin: 0 0 10px 0;"><strong>🔒 Your Obligations:</strong></p>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li>Preserve ALL potentially relevant documents, emails, and communications</li>
                                <li>Do NOT delete, modify, or destroy any potentially relevant materials</li>
                                <li>Suspend all automatic deletion policies for relevant data</li>
                                <li>Immediately report any accidental deletion or modification</li>
                                <li>Retain both electronic and paper records</li>
                            </ul>
                        </div>
                        
                        <p><strong>⏰ Acknowledgment Deadline:</strong> {hold.get('acknowledgment_deadline_days', 5)} days from receipt</p>
                        
                        <p style="margin-top: 20px;">
                            <a href="{self.base_url}/documents?feature=legal-hold" class="button">
                                📋 View Legal Hold Details
                            </a>
                        </p>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                            Failure to comply with this legal hold may result in serious consequences including 
                            sanctions, adverse inference instructions, or other penalties.
                        </p>
                        
                        <p><strong>Questions?</strong> Contact: {', '.join(hold.get('legal_team_emails', [])) or 'Your Legal Department'}</p>
                    </div>
                    <div class="footer">
                        <p>© {datetime.now().year} SimplifyAI DocFlow. All rights reserved.</p>
                        <p>This is an automated legal hold notification.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            self.email_service.send_email(
                to_email=custodian.get('email'),
                subject=subject,
                html_content=html_content
            )
            
            # Log to audit
            self._log_audit(hold['id'], "acknowledgment_notice_sent", custodian['id'], custodian.get('name'))
            
            return True
        except Exception as e:
            logger.error(f"Error sending acknowledgment notice: {e}")
            return False
    
    def _send_reminder_email(self, hold: Dict[str, Any], custodian: Dict[str, Any]) -> bool:
        """Send reminder email to custodian"""
        try:
            reminder_count = custodian.get('reminder_count', 0) + 1
            subject = f"⚠️ REMINDER #{reminder_count}: Legal Hold Notice - {hold.get('name')} - PENDING ACKNOWLEDGMENT"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                    .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }}
                    .info-box {{ background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
                    .button {{ 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #f59e0b; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                    }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin: 0;">⚠️ REMINDER: Legal Hold Notice</h2>
                        <p style="margin: 5px 0 0 0;">Reminder #{reminder_count} - Acknowledgment Required</p>
                    </div>
                    <div class="content">
                        <p>Dear <strong>{custodian.get('name', 'Custodian')}</strong>,</p>
                        
                        <div class="warning">
                            <strong>This is reminder #{reminder_count} about your pending legal hold acknowledgment.</strong>
                        </div>
                        
                        <p>You have not yet acknowledged the legal hold notice for:</p>
                        
                        <div class="info-box">
                            <p style="margin: 5px 0;"><strong>Matter:</strong> {hold.get('matter_name', hold.get('name'))}</p>
                            <p style="margin: 5px 0;"><strong>Hold Name:</strong> {hold.get('name')}</p>
                            <p style="margin: 5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                        </div>
                        
                        <p><strong>URGENT: Please acknowledge receipt of this notice immediately.</strong></p>
                        
                        <p><strong>Your Obligations:</strong></p>
                        <ul>
                            <li>Preserve all relevant documents and communications</li>
                            <li>Do not delete, modify, or destroy any potentially relevant materials</li>
                            <li>Suspend all automatic deletion policies for relevant data</li>
                            <li>Immediately report any accidental deletion or modification</li>
                        </ul>
                        
                        <p style="margin-top: 20px;">
                            <a href="{self.base_url}/documents?feature=legal-hold" class="button">
                                📋 Acknowledge Legal Hold
                            </a>
                        </p>
                        
                        <p style="margin-top: 20px; font-size: 14px; color: #dc2626;">
                            <strong>Warning:</strong> Failure to comply may result in escalation to management 
                            and potential legal consequences.
                        </p>
                        
                        <p><strong>Questions?</strong> Contact: {', '.join(hold.get('legal_team_emails', [])) or 'Your Legal Department'}</p>
                    </div>
                    <div class="footer">
                        <p>This is reminder #{reminder_count} for legal hold: {hold.get('name')}</p>
                        <p>© {datetime.now().year} SimplifyAI DocFlow. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            self.email_service.send_email(
                to_email=custodian.get('email'),
                subject=subject,
                html_content=html_content
            )
            
            # Log to audit
            self._log_audit(hold['id'], "reminder_sent", custodian['id'], custodian.get('name'), 
                           {"reminder_count": reminder_count})
            
            return True
        except Exception as e:
            logger.error(f"Error sending reminder email: {e}")
            return False
    
    def _send_escalation_email(self, hold: Dict[str, Any], custodian: Dict[str, Any], 
                                escalation_emails: List[str]) -> bool:
        """Send escalation email to legal team"""
        if not escalation_emails:
            logger.warning(f"No escalation contacts for hold {hold.get('id')}")
            return False
        
        try:
            subject = f"🚨 ESCALATION: Non-Compliant Custodian - {hold.get('name')}"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }}
                    .alert {{ background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }}
                    .info-box {{ background-color: white; padding: 15px; margin: 15px 0; border: 1px solid #e5e7eb; border-radius: 6px; }}
                    .button {{ 
                        display: inline-block; 
                        padding: 12px 24px; 
                        background-color: #dc2626; 
                        color: white; 
                        text-decoration: none; 
                        border-radius: 6px; 
                    }}
                    .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin: 0;">🚨 ESCALATION REQUIRED</h2>
                        <p style="margin: 5px 0 0 0;">Non-Compliant Custodian Alert</p>
                    </div>
                    <div class="content">
                        <div class="alert">
                            <strong>A custodian has failed to acknowledge the legal hold notice within the required timeframe.</strong>
                        </div>
                        
                        <h3>Custodian Information</h3>
                        <div class="info-box">
                            <p style="margin: 5px 0;"><strong>Name:</strong> {custodian.get('name', 'Unknown')}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> {custodian.get('email')}</p>
                            <p style="margin: 5px 0;"><strong>Department:</strong> {custodian.get('department', 'N/A')}</p>
                            <p style="margin: 5px 0;"><strong>Reminders Sent:</strong> {custodian.get('reminder_count', 0)}</p>
                            <p style="margin: 5px 0;"><strong>Status:</strong> Non-Compliant (Pending Acknowledgment)</p>
                        </div>
                        
                        <h3>Legal Hold Information</h3>
                        <div class="info-box">
                            <p style="margin: 5px 0;"><strong>Hold Name:</strong> {hold.get('name')}</p>
                            <p style="margin: 5px 0;"><strong>Matter:</strong> {hold.get('matter_name', 'N/A')}</p>
                            <p style="margin: 5px 0;"><strong>Matter ID:</strong> {hold.get('matter_id', 'N/A')}</p>
                            <p style="margin: 5px 0;"><strong>Effective Date:</strong> {hold.get('effective_date', 'N/A')}</p>
                        </div>
                        
                        <h3>Recommended Actions</h3>
                        <ul>
                            <li>Contact the custodian directly via phone or in person</li>
                            <li>Involve the custodian's manager if necessary</li>
                            <li>Document all communication attempts</li>
                            <li>Consider alternative preservation methods if custodian remains non-compliant</li>
                        </ul>
                        
                        <p style="margin-top: 20px;">
                            <a href="{self.base_url}/documents?feature=legal-hold" class="button">
                                📋 View Legal Hold Dashboard
                            </a>
                        </p>
                    </div>
                    <div class="footer">
                        <p>This is an automated escalation notification from SimplifyAI DocFlow.</p>
                        <p>© {datetime.now().year} SimplifyAI. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send to all escalation contacts
            for email in escalation_emails:
                try:
                    self.email_service.send_email(
                        to_email=email,
                        subject=subject,
                        html_content=html_content
                    )
                except Exception as e:
                    logger.error(f"Error sending escalation to {email}: {e}")
            
            # Log to audit
            self._log_audit(hold['id'], "custodian_escalated", custodian['id'], custodian.get('name'),
                           {"escalation_contacts": escalation_emails})
            
            return True
        except Exception as e:
            logger.error(f"Error sending escalation email: {e}")
            return False
    
    def _log_audit(self, hold_id: str, action: str, target_id: str = None, 
                   target_name: str = None, details: Dict = None):
        """Log action to audit trail"""
        try:
            audit_data = {
                "hold_id": hold_id,
                "action": action,
                "actor_id": "system",
                "actor_name": "Automated Reminder System",
                "target_id": target_id,
                "target_name": target_name,
                "target_type": "custodian",
                "details": details or {}
            }
            self.supabase.table("legal_hold_audit_log").insert(audit_data).execute()
        except Exception as e:
            logger.error(f"Error logging audit: {e}")


# Singleton processor instance for use with scheduler
_processor_instance = None

def get_processor(supabase_client: Client) -> LegalHoldReminderProcessor:
    """Get or create processor instance"""
    global _processor_instance
    if _processor_instance is None:
        _processor_instance = LegalHoldReminderProcessor(supabase_client)
    return _processor_instance

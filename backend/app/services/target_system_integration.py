"""
Target System Integration Service
Sends workflow data to external systems (SAP, ERP, etc.) after final approval
"""

import logging
import requests
from typing import Dict, Any, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class TargetSystemIntegration:
    """Service for integrating with external target systems"""
    
    def __init__(self):
        self.timeout = 30  # seconds
    
    def send_to_target_system(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send workflow data to configured target system
        
        Args:
            config: Target system configuration from workflow definition
            workflow_data: Workflow instance data
            extracted_data: Extracted document fields
            
        Returns:
            dict: {
                'success': bool,
                'message': str,
                'response_data': Any,
                'error': str (if failed)
            }
        """
        try:
            system_type = config.get('system_type', 'generic')
            
            if system_type == 'sap':
                return self._send_to_sap(config, workflow_data, extracted_data)
            elif system_type == 'rest_api':
                return self._send_to_rest_api(config, workflow_data, extracted_data)
            elif system_type == 'webhook':
                return self._send_to_webhook(config, workflow_data, extracted_data)
            else:
                return {
                    'success': False,
                    'message': f'Unknown system type: {system_type}',
                    'error': 'Invalid configuration'
                }
        
        except Exception as e:
            logger.error(f"Error sending to target system: {str(e)}")
            return {
                'success': False,
                'message': f'Integration failed: {str(e)}',
                'error': str(e)
            }
    
    def _send_to_sap(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Send data to SAP system using OData or REST API
        
        Config should contain:
        - endpoint_url: SAP OData service URL
        - username: SAP username
        - password: SAP password (or use API key)
        - entity_set: SAP entity set name (e.g., 'PurchaseOrders', 'Invoices')
        - field_mapping: Map extracted fields to SAP fields
        """
        try:
            endpoint = config.get('endpoint_url')
            if not endpoint:
                return {'success': False, 'message': 'SAP endpoint URL not configured', 'error': 'Missing endpoint'}
            
            # Prepare SAP-specific payload
            payload = self._map_data_to_sap(config, workflow_data, extracted_data)
            
            # SAP authentication
            auth = None
            if config.get('username') and config.get('password'):
                auth = (config['username'], config['password'])
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            # Add API key if provided
            if config.get('api_key'):
                headers['Authorization'] = f"Bearer {config['api_key']}"
            
            # Make request to SAP
            logger.info(f"📤 Sending data to SAP endpoint: {endpoint}")
            response = requests.post(
                endpoint,
                json=payload,
                auth=auth,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            logger.info(f"✅ Successfully sent data to SAP. Status: {response.status_code}")
            
            return {
                'success': True,
                'message': f'Data successfully sent to SAP',
                'response_data': response.json() if response.content else None,
                'status_code': response.status_code
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ SAP integration failed: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send to SAP: {str(e)}',
                'error': str(e)
            }
    
    def _send_to_rest_api(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Send data to generic REST API
        
        Config should contain:
        - endpoint_url: API endpoint URL
        - method: HTTP method (POST, PUT, PATCH)
        - headers: Custom headers
        - field_mapping: Field mapping configuration
        """
        try:
            endpoint = config.get('endpoint_url')
            method = config.get('method', 'POST').upper()
            
            if not endpoint:
                return {'success': False, 'message': 'API endpoint URL not configured', 'error': 'Missing endpoint'}
            
            # Prepare payload
            payload = self._map_data_to_target(config, workflow_data, extracted_data)
            
            # Prepare headers
            headers = config.get('headers', {})
            if not headers.get('Content-Type'):
                headers['Content-Type'] = 'application/json'
            
            logger.info(f"📤 Sending data to REST API: {method} {endpoint}")
            
            # Make request
            response = requests.request(
                method=method,
                url=endpoint,
                json=payload,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            logger.info(f"✅ Successfully sent data to REST API. Status: {response.status_code}")
            
            return {
                'success': True,
                'message': f'Data successfully sent to {endpoint}',
                'response_data': response.json() if response.content else None,
                'status_code': response.status_code
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ REST API integration failed: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send to REST API: {str(e)}',
                'error': str(e)
            }
    
    def _send_to_webhook(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Send data to webhook URL (simple POST)"""
        try:
            webhook_url = config.get('webhook_url')
            if not webhook_url:
                return {'success': False, 'message': 'Webhook URL not configured', 'error': 'Missing webhook_url'}
            
            # Prepare simple payload
            payload = {
                'workflow_id': workflow_data.get('workflow_id'),
                'instance_id': workflow_data.get('id'),
                'document_id': workflow_data.get('document_id'),
                'document_name': workflow_data.get('document_name'),
                'completed_at': workflow_data.get('completed_at'),
                'extracted_data': extracted_data,
                'metadata': workflow_data.get('metadata', {})
            }
            
            logger.info(f"📤 Sending data to webhook: {webhook_url}")
            
            response = requests.post(
                webhook_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            logger.info(f"✅ Successfully sent data to webhook. Status: {response.status_code}")
            
            return {
                'success': True,
                'message': 'Data successfully sent to webhook',
                'response_data': response.text,
                'status_code': response.status_code
            }
        
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Webhook integration failed: {str(e)}")
            return {
                'success': False,
                'message': f'Failed to send to webhook: {str(e)}',
                'error': str(e)
            }
    
    def _map_data_to_sap(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Map workflow/document data to SAP format"""
        field_mapping = config.get('field_mapping', {})
        entity_set = config.get('entity_set', 'WorkflowData')
        
        # Start with base SAP structure
        sap_payload = {
            '__metadata': {
                'type': f'ZWORKFLOW.{entity_set}'
            }
        }
        
        # Map extracted data fields
        if extracted_data and field_mapping:
            for source_field, target_field in field_mapping.items():
                if source_field in extracted_data:
                    sap_payload[target_field] = extracted_data[source_field]
        
        # Add workflow metadata
        sap_payload.update({
            'WorkflowId': workflow_data.get('workflow_id'),
            'InstanceId': workflow_data.get('id'),
            'DocumentId': workflow_data.get('document_id'),
            'CompletedAt': workflow_data.get('completed_at'),
            'Status': 'COMPLETED'
        })
        
        return sap_payload
    
    def _map_data_to_target(
        self,
        config: Dict[str, Any],
        workflow_data: Dict[str, Any],
        extracted_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Map workflow/document data to target system format"""
        field_mapping = config.get('field_mapping', {})
        
        payload = {}
        
        # Map extracted data fields
        if extracted_data and field_mapping:
            for source_field, target_field in field_mapping.items():
                if source_field in extracted_data:
                    payload[target_field] = extracted_data[source_field]
        
        # Add workflow context if requested
        if config.get('include_workflow_metadata', True):
            payload['_workflow'] = {
                'workflow_id': workflow_data.get('workflow_id'),
                'instance_id': workflow_data.get('id'),
                'document_id': workflow_data.get('document_id'),
                'completed_at': workflow_data.get('completed_at')
            }
        
        return payload

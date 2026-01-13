/**
 * Workflow API Service
 * Handles all HTTP requests to the workflow backend endpoints
 */

import { Workflow, WorkflowInstance, EscalationRule, WorkflowStats } from '@/types/workflow';
import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

export class WorkflowApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'WorkflowApiError';
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    let errorMessage = `HTTP error ${response.status}`;
    
    if (error.detail) {
      // Handle array of error objects from FastAPI
      if (Array.isArray(error.detail)) {
        errorMessage = error.detail.map((e: any) => 
          typeof e === 'object' ? e.msg || JSON.stringify(e) : String(e)
        ).join(', ');
      } else if (typeof error.detail === 'object') {
        errorMessage = JSON.stringify(error.detail);
      } else {
        errorMessage = error.detail;
      }
    }
    
    throw new WorkflowApiError(errorMessage, response.status);
  }
  return response.json();
}

export const workflowApi = {
  // ============================================================================
  // WORKFLOW DEFINITIONS
  // ============================================================================

  async listWorkflows(filters?: {
    status?: string;
    category?: string;
    is_template?: boolean;
  }): Promise<Workflow[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.is_template !== undefined) params.append('is_template', String(filters.is_template));

    const url = `${API_BASE}/api/workflows${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: await getAuthHeaders(),
    });
    return handleResponse<Workflow[]>(response);
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await fetch(`${API_BASE}/api/workflows/${id}`, {
      headers: await getAuthHeaders(),
    });
    const result = await handleResponse<{ data: Workflow }>(response);
    // Backend returns {data: workflow}, extract the workflow object
    return result.data;
  },

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    const response = await fetch(`${API_BASE}/api/workflows`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(workflow),
    });
    return handleResponse<Workflow>(response);
  },

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const response = await fetch(`${API_BASE}/api/workflows/${id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<Workflow>(response);
  },

  async deleteWorkflow(id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/workflows/${id}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },

  // ============================================================================
  // WORKFLOW INSTANCES
  // ============================================================================

  async extractDocumentFields(documentId: string): Promise<{
    status: 'extracted' | 'failed' | 'no_schema' | 'not_ready' | 'error';
    message: string;
    extracted_data: Record<string, any> | null;
    document_type?: string;
  }> {
    const response = await fetch(`${API_BASE}/api/workflows/extract-fields/${documentId}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async listInstances(filters?: {
    status?: string;
    workflow_id?: string;
  }): Promise<WorkflowInstance[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.workflow_id) params.append('workflow_id', filters.workflow_id);

    const url = `${API_BASE}/api/workflows/instances${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: await getAuthHeaders(),
    });
    return handleResponse<WorkflowInstance[]>(response);
  },

  async getInstance(id: string): Promise<WorkflowInstance> {
    const response = await fetch(`${API_BASE}/api/workflows/instances/${id}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse<WorkflowInstance>(response);
  },

  async startWorkflow(
    workflowId: string,
    data: { document_id?: string; priority?: string; metadata?: any }
  ): Promise<WorkflowInstance> {
    const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/instances`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<WorkflowInstance>(response);
  },

  // Alias for clarity
  async startInstance(
    workflowId: string,
    data: { 
      document_id: string; 
      priority?: string; 
      metadata?: any;
      extracted_data?: Record<string, any>;
      extraction_status?: string;
      step_assignments?: Record<string, string>;
    }
  ): Promise<WorkflowInstance> {
    return this.startWorkflow(workflowId, data);
  },

  // ============================================================================
  // WORKFLOW STEP ACTIONS
  // ============================================================================

  async approveStep(
    instanceId: string,
    stepId: string,
    data: { comments?: string; attachments?: any[] }
  ): Promise<WorkflowInstance> {
    const response = await fetch(
      `${API_BASE}/api/workflows/instances/${instanceId}/steps/${stepId}/approve`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<WorkflowInstance>(response);
  },

  async rejectStep(
    instanceId: string,
    stepId: string,
    data: { comments?: string; attachments?: any[] }
  ): Promise<WorkflowInstance> {
    const response = await fetch(
      `${API_BASE}/api/workflows/instances/${instanceId}/steps/${stepId}/reject`,
      {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse<WorkflowInstance>(response);
  },

  async deleteInstance(instanceId: string): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE}/api/workflows/instances/${instanceId}`,
      {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      }
    );
    return handleResponse<{ message: string }>(response);
  },

  // ============================================================================
  // STATISTICS
  // ============================================================================

  async getStats(): Promise<WorkflowStats> {
    const response = await fetch(`${API_BASE}/api/workflows/stats`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse<WorkflowStats>(response);
  },

  // ============================================================================
  // ESCALATION RULES
  // ============================================================================

  async listEscalationRules(workflowId?: string): Promise<EscalationRule[]> {
    const params = workflowId ? `?workflow_id=${workflowId}` : '';
    const response = await fetch(`${API_BASE}/api/workflows/escalation-rules${params}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse<EscalationRule[]>(response);
  },

  async createEscalationRule(rule: Partial<EscalationRule>): Promise<EscalationRule> {
    const response = await fetch(`${API_BASE}/api/workflows/escalation-rules`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(rule),
    });
    return handleResponse<EscalationRule>(response);
  },

  async updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): Promise<EscalationRule> {
    const response = await fetch(`${API_BASE}/api/workflows/escalation-rules/${ruleId}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    return handleResponse<EscalationRule>(response);
  },

  async deleteEscalationRule(ruleId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/api/workflows/escalation-rules/${ruleId}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });
    return handleResponse<{ message: string }>(response);
  },

  async processEscalations(): Promise<{
    checked_steps: number;
    escalations_triggered: number;
    actions_executed: number;
    timestamp: string;
  }> {
    const response = await fetch(`${API_BASE}/api/workflows/escalations/process`, {
      method: 'POST',
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getAnalytics(dateRange: string = '30d', workflowId?: string): Promise<{
    overview: {
      totalInstances: number;
      completed: number;
      rejected: number;
      active: number;
      completionRate: number;
      avgCompletionTime: number;
      slaCompliance: number;
      escalationRate: number;
    };
    trendData: Array<{
      date: string;
      completed: number;
      started: number;
      rejected: number;
    }>;
    stepPerformance: Array<{
      step: string;
      avgTime: number;
      count: number;
      sla: number;
    }>;
    bottlenecks: Array<{
      step: string;
      workflow: string;
      avgDelay: number;
      instances: number;
      severity: string;
    }>;
    conditionStats: Array<{
      condition: string;
      triggered: number;
      truePath: number;
      falsePath: number;
    }>;
    userPerformance: Array<{
      user: string;
      completed: number;
      avgTime: number;
      onTime: number;
    }>;
    pathDistribution: Array<{
      path: string;
      count: number;
      percentage: number;
    }>;
  }> {
    const params = new URLSearchParams({ date_range: dateRange });
    if (workflowId) {
      params.append('workflow_id', workflowId);
    }
    const response = await fetch(`${API_BASE}/api/workflows/analytics?${params}`, {
      headers: await getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // ============================================================================
  // WORKFLOW SUGGESTIONS
  // ============================================================================

  async suggestWorkflow(data: {
    document_id: string;
    document_type: string;
    document_name?: string;
    confidence?: number;
  }): Promise<{
    document_id: string;
    document_type: string;
    suggested_workflow: Workflow | null;
    alternative_workflows: Workflow[];
    has_matching_workflow: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE}/api/workflows/suggest`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateTriggerConfig(
    workflowId: string, 
    triggerConfig: {
      document_types?: string[];
      auto_start?: boolean;
      priority?: string;
    }
  ): Promise<{ message: string; workflow: Workflow }> {
    const response = await fetch(`${API_BASE}/api/workflows/${workflowId}/trigger-config`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(triggerConfig),
    });
    return handleResponse(response);
  },

  // Get workflow suggestion for a document (convenience wrapper for auto-trigger)
  async getSuggestion(documentId: string): Promise<{
    workflow_id: string | null;
    workflow_name: string | null;
    confidence: number;
    document_type: string | null;
  } | null> {
    try {
      const response = await fetch(`${API_BASE}/api/workflows/suggestions/${documentId}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Error getting workflow suggestion:', error);
      return null;
    }
  },
};

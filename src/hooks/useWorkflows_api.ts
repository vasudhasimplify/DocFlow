import { useState, useCallback, useEffect } from 'react';
import {
  Workflow,
  WorkflowInstance,
  EscalationRule,
  WorkflowStats,
  Priority,
} from '@/types/workflow';
import { workflowApi, WorkflowApiError } from '@/services/workflowApi';
import { toast } from 'sonner';

export const useWorkflows = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [escalationRules, setEscalationRules] = useState<EscalationRule[]>([]);
  const [stats, setStats] = useState<WorkflowStats>({
    total_workflows: 0,
    active_workflows: 0,
    running_instances: 0,
    completed_today: 0,
    pending_approvals: 0,
    overdue_tasks: 0,
    avg_completion_time: 0,
    escalation_rate: 0,
    sla_compliance_rate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  // ============================================================================
  // FETCH DATA ON MOUNT
  // ============================================================================

  const fetchWorkflows = useCallback(async (filters?: { status?: string; category?: string; is_template?: boolean }) => {
    setIsLoading(true);
    try {
      const data = await workflowApi.listWorkflows(filters);
      setWorkflows(data);
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch workflows: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error fetching workflows:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInstances = useCallback(async (filters?: { status?: string; workflow_id?: string }) => {
    setIsLoading(true);
    try {
      const data = await workflowApi.listInstances(filters);
      setInstances(data);
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch instances: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error fetching instances:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEscalationRules = useCallback(async (workflowId?: string) => {
    setIsLoading(true);
    try {
      const data = await workflowApi.listEscalationRules(workflowId);
      setEscalationRules(data);
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch escalation rules: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error fetching escalation rules:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await workflowApi.getStats();
      setStats(data);
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch stats: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    fetchWorkflows();
    fetchInstances();
    fetchEscalationRules();
    fetchStats();
  }, [fetchWorkflows, fetchInstances, fetchEscalationRules, fetchStats]);

  // ============================================================================
  // WORKFLOW CRUD OPERATIONS
  // ============================================================================

  const createWorkflow = useCallback(async (workflow: Partial<Workflow>) => {
    setIsLoading(true);
    try {
      const newWorkflow = await workflowApi.createWorkflow(workflow);
      setWorkflows(prev => [...prev, newWorkflow]);
      toast.success('Workflow created successfully');
      return newWorkflow;
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to create workflow: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error creating workflow:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateWorkflow = useCallback(async (id: string, updates: Partial<Workflow>) => {
    setIsLoading(true);
    try {
      const updatedWorkflow = await workflowApi.updateWorkflow(id, updates);
      setWorkflows(prev => prev.map(w => (w.id === id ? updatedWorkflow : w)));
      toast.success('Workflow updated');
      return updatedWorkflow;
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to update workflow: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error updating workflow:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await workflowApi.deleteWorkflow(id);
      setWorkflows(prev => prev.filter(w => w.id !== id));
      toast.success('Workflow deleted');
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to delete workflow: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error deleting workflow:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activateWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'active' });
    toast.success('Workflow activated');
  }, [updateWorkflow]);

  const pauseWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'paused' });
    toast.success('Workflow paused');
  }, [updateWorkflow]);

  // ============================================================================
  // WORKFLOW INSTANCE OPERATIONS
  // ============================================================================

  const startWorkflowInstance = useCallback(
    async (workflowId: string, documentId: string, priority: Priority = 'medium') => {
      setIsLoading(true);
      try {
        const instance = await workflowApi.startWorkflow(workflowId, {
          document_id: documentId,
          priority,
        });
        setInstances(prev => [...prev, instance]);
        toast.success('Workflow started');
        // Refresh stats
        fetchStats();
        return instance;
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          toast.error(`Failed to start workflow: ${error.message}`);
        } else {
          toast.error('An unexpected error occurred');
        }
        console.error('Error starting workflow:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchStats]
  );

  const approveStep = useCallback(
    async (instanceId: string, stepId: string, comment?: string) => {
      setIsLoading(true);
      try {
        const updatedInstance = await workflowApi.approveStep(instanceId, stepId, {
          comments: comment,
        });
        setInstances(prev =>
          prev.map(inst => (inst.id === instanceId ? updatedInstance : inst))
        );
        toast.success('Step approved');
        // Refresh stats
        fetchStats();
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          toast.error(`Failed to approve step: ${error.message}`);
        } else {
          toast.error('An unexpected error occurred');
        }
        console.error('Error approving step:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchStats]
  );

  const rejectStep = useCallback(
    async (instanceId: string, stepId: string, reason: string) => {
      setIsLoading(true);
      try {
        const updatedInstance = await workflowApi.rejectStep(instanceId, stepId, {
          comments: reason,
        });
        setInstances(prev =>
          prev.map(inst => (inst.id === instanceId ? updatedInstance : inst))
        );
        toast.success('Step rejected');
        // Refresh stats
        fetchStats();
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          toast.error(`Failed to reject step: ${error.message}`);
        } else {
          toast.error('An unexpected error occurred');
        }
        console.error('Error rejecting step:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchStats]
  );

  // ============================================================================
  // ESCALATION RULES
  // ============================================================================

  const createEscalationRule = useCallback(async (rule: Partial<EscalationRule>) => {
    setIsLoading(true);
    try {
      const newRule = await workflowApi.createEscalationRule(rule);
      setEscalationRules(prev => [...prev, newRule]);
      toast.success('Escalation rule created');
      return newRule;
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to create escalation rule: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error creating escalation rule:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateEscalationRule = useCallback(async (id: string, updates: Partial<EscalationRule>) => {
    setIsLoading(true);
    try {
      // TODO: Implement backend endpoint for updating escalation rules
      // For now, update locally
      setEscalationRules(prev =>
        prev.map(r => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r))
      );
      toast.success('Escalation rule updated');
    } catch (error) {
      toast.error('Failed to update escalation rule');
      console.error('Error updating escalation rule:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteEscalationRule = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement backend endpoint for deleting escalation rules
      // For now, delete locally
      setEscalationRules(prev => prev.filter(r => r.id !== id));
      toast.success('Escalation rule deleted');
    } catch (error) {
      toast.error('Failed to delete escalation rule');
      console.error('Error deleting escalation rule:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    workflows,
    instances,
    escalationRules,
    stats,
    isLoading,
    fetchWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
    startWorkflowInstance,
    approveStep,
    rejectStep,
    createEscalationRule,
    updateEscalationRule,
    deleteEscalationRule,
  };
};

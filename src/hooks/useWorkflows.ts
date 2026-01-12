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
    active_workflows: 0,
    running_instances: 0,
    overdue_tasks: 0,
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
      // Defensive: Ensure we only set array data
      if (Array.isArray(data)) {
        setWorkflows(data);
      } else {
        console.error('Workflows API returned non-array:', data);
        setWorkflows([]);
        toast.error('Invalid workflow data received');
      }
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch workflows: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error fetching workflows:', error);
      setWorkflows([]); // Reset to empty array on error
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
      console.log('✅ Escalation rules fetched:', data);
      // Ensure data is an array
      if (Array.isArray(data)) {
        setEscalationRules(data);
      } else {
        console.error('Escalation rules API returned non-array:', data);
        setEscalationRules([]);
      }
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to fetch escalation rules: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('❌ Error fetching escalation rules:', error);
      setEscalationRules([]); // Reset to empty array on error
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
  }, [updateWorkflow]);

  const pauseWorkflow = useCallback(async (id: string) => {
    await updateWorkflow(id, { status: 'paused' });
  }, [updateWorkflow]);

  const duplicateWorkflow = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const workflow = workflows.find(w => w.id === id);
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      // Create a copy with new name and reset status
      const duplicatedWorkflow = await workflowApi.createWorkflow({
        ...workflow,
        name: `${workflow.name} (Copy)`,
        status: 'draft',
        is_template: false,
        stats: { total_runs: 0, completed_runs: 0, avg_completion_time: 0, success_rate: 0 }
      });

      setWorkflows(prev => [...prev, duplicatedWorkflow]);
      toast.success('Workflow duplicated successfully');
      return duplicatedWorkflow;
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to duplicate workflow: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error duplicating workflow:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [workflows]);

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

  const deleteInstance = useCallback(
    async (instanceId: string) => {
      setIsLoading(true);
      try {
        await workflowApi.deleteInstance(instanceId);
        setInstances(prev => prev.filter(inst => inst.id !== instanceId));
        toast.success('Workflow instance deleted');
        // Refresh stats
        fetchStats();
      } catch (error) {
        if (error instanceof WorkflowApiError) {
          toast.error(`Failed to delete instance: ${error.message}`);
        } else {
          toast.error('An unexpected error occurred');
        }
        console.error('Error deleting instance:', error);
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
      const updatedRule = await workflowApi.updateEscalationRule(id, updates);
      setEscalationRules(prev =>
        prev.map(r => (r.id === id ? updatedRule : r))
      );
      toast.success('Escalation rule updated');
      return updatedRule;
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to update escalation rule: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
      console.error('Error updating escalation rule:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteEscalationRule = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await workflowApi.deleteEscalationRule(id);
      setEscalationRules(prev => prev.filter(r => r.id !== id));
      toast.success('Escalation rule deleted');
    } catch (error) {
      if (error instanceof WorkflowApiError) {
        toast.error(`Failed to delete escalation rule: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred');
      }
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
    fetchInstances,
    fetchEscalationRules,
    fetchStats,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    activateWorkflow,
    pauseWorkflow,
    duplicateWorkflow,
    startWorkflowInstance,
    approveStep,
    rejectStep,
    deleteInstance,
    createEscalationRule,
    updateEscalationRule,
    deleteEscalationRule,
  };
};

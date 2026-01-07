import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  RetentionPolicy,
  LegalHold,
  DocumentRetentionStatus,
  DispositionAuditLog,
  RetentionPolicyTemplate,
  RetentionStats,
  RetentionFilter,
  DispositionAction,
  TriggerType,
  ComplianceFramework,
  RetentionStatus,
  LegalHoldStatus,
  AuditAction,
} from '@/types/retention';

export const useRetentionPolicies = () => {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [legalHolds, setLegalHolds] = useState<LegalHold[]>([]);
  const [documentStatuses, setDocumentStatuses] = useState<DocumentRetentionStatus[]>([]);
  const [templates, setTemplates] = useState<RetentionPolicyTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<DispositionAuditLog[]>([]);
  const [stats, setStats] = useState<RetentionStats>({
    total_policies: 0,
    active_policies: 0,
    total_documents_tracked: 0,
    documents_pending_review: 0,
    documents_pending_approval: 0,
    documents_on_hold: 0,
    documents_expiring_soon: 0,
    active_legal_holds: 0,
    documents_disposed_this_month: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<RetentionFilter>({});

  // Fetch all retention data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        policiesRes,
        holdsRes,
        statusesRes,
        templatesRes,
        logsRes,
      ] = await Promise.all([
        supabase.from('retention_policies').select('*').order('priority', { ascending: false }),
        supabase.from('legal_holds').select('*').order('created_at', { ascending: false }),
        supabase.from('document_retention_status').select('*').order('retention_end_date', { ascending: true }),
        supabase.from('retention_policy_templates').select('*').order('compliance_framework'),
        supabase.from('disposition_audit_log').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (policiesRes.data) {
        setPolicies(policiesRes.data.map(p => ({
          ...p,
          applies_to_categories: p.applies_to_categories || [],
          applies_to_folders: p.applies_to_folders || [],
          approval_roles: p.approval_roles || [],
          metadata: (p.metadata as Record<string, unknown>) || {},
        })) as RetentionPolicy[]);
      }

      if (holdsRes.data) {
        // Fetch custodians for all holds
        const holdsWithCustodians = await Promise.all(
          holdsRes.data.map(async (h) => {
            const { data: custodians } = await supabase
              .from('legal_hold_custodians')
              .select('*')
              .eq('hold_id', h.id);
            
            const primaryCustodian = custodians?.[0];
            
            return {
              ...h,
              document_ids: h.document_ids || [],
              folder_ids: h.folder_ids || [],
              search_criteria: (h.search_criteria as Record<string, unknown>) || undefined,
              metadata: (h.metadata as Record<string, unknown>) || {},
              // Map first custodian to the old fields for backward compatibility
              custodian_name: primaryCustodian?.name || h.custodian_name,
              custodian_email: primaryCustodian?.email || h.custodian_email,
            };
          })
        );
        
        setLegalHolds(holdsWithCustodians as LegalHold[]);
      }

      if (statusesRes.data) {
        setDocumentStatuses(statusesRes.data.map(s => ({
          ...s,
          legal_hold_ids: s.legal_hold_ids || [],
          metadata: (s.metadata as Record<string, unknown>) || {},
        })) as DocumentRetentionStatus[]);
      }

      if (templatesRes.data) {
        setTemplates(templatesRes.data.map(t => ({
          ...t,
          category_suggestions: t.category_suggestions || [],
        })) as RetentionPolicyTemplate[]);
      }

      if (logsRes.data) {
        setAuditLogs(logsRes.data.map(l => ({
          ...l,
          document_metadata: (l.document_metadata as Record<string, unknown>) || undefined,
        })) as DispositionAuditLog[]);
      }

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        total_policies: policiesRes.data?.length || 0,
        active_policies: policiesRes.data?.filter(p => p.is_active).length || 0,
        total_documents_tracked: statusesRes.data?.length || 0,
        documents_pending_review: statusesRes.data?.filter(s => s.current_status === 'pending_review').length || 0,
        documents_pending_approval: statusesRes.data?.filter(s => s.current_status === 'pending_approval').length || 0,
        documents_on_hold: statusesRes.data?.filter(s => s.current_status === 'on_hold').length || 0,
        documents_expiring_soon: statusesRes.data?.filter(s => 
          new Date(s.retention_end_date) <= thirtyDaysFromNow && s.current_status === 'active'
        ).length || 0,
        active_legal_holds: holdsRes.data?.filter(h => h.status === 'active').length || 0,
        documents_disposed_this_month: logsRes.data?.filter(l => 
          l.action === 'disposed' && new Date(l.created_at) >= startOfMonth
        ).length || 0,
      });
    } catch (error) {
      console.error('Error fetching retention data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load retention policies',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create a new retention policy
  const createPolicy = async (policy: Omit<RetentionPolicy, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('retention_policies')
        .insert([{
          name: policy.name,
          description: policy.description,
          retention_period_days: policy.retention_period_days,
          disposition_action: policy.disposition_action,
          trigger_type: policy.trigger_type,
          is_active: policy.is_active,
          priority: policy.priority,
          applies_to_categories: policy.applies_to_categories,
          applies_to_folders: policy.applies_to_folders,
          compliance_framework: policy.compliance_framework,
          notification_days_before: policy.notification_days_before,
          requires_approval: policy.requires_approval,
          approval_roles: policy.approval_roles,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Retention policy created' });
      fetchData();
      return data;
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({ title: 'Error', description: 'Failed to create policy', variant: 'destructive' });
      throw error;
    }
  };

  // Update a retention policy
  const updatePolicy = async (id: string, updates: Partial<RetentionPolicy>) => {
    try {
      const { metadata, ...safeUpdates } = updates;
      const { error } = await supabase
        .from('retention_policies')
        .update(safeUpdates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Policy updated' });
      fetchData();
    } catch (error) {
      console.error('Error updating policy:', error);
      toast({ title: 'Error', description: 'Failed to update policy', variant: 'destructive' });
      throw error;
    }
  };

  // Delete a retention policy
  const deletePolicy = async (id: string) => {
    try {
      const { error } = await supabase.from('retention_policies').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Policy deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting policy:', error);
      toast({ title: 'Error', description: 'Failed to delete policy', variant: 'destructive' });
      throw error;
    }
  };

  // Create policy from template
  const createFromTemplate = async (templateId: string, customizations?: Partial<RetentionPolicy>) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');

    return createPolicy({
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      retention_period_days: customizations?.retention_period_days || template.retention_period_days,
      disposition_action: (customizations?.disposition_action || template.disposition_action) as DispositionAction,
      trigger_type: (customizations?.trigger_type || template.trigger_type) as TriggerType,
      is_active: true,
      priority: customizations?.priority || 0,
      applies_to_categories: customizations?.applies_to_categories || template.category_suggestions,
      applies_to_folders: customizations?.applies_to_folders || [],
      compliance_framework: template.compliance_framework as ComplianceFramework,
      notification_days_before: customizations?.notification_days_before || 30,
      requires_approval: template.requires_approval,
      approval_roles: customizations?.approval_roles || [],
      metadata: customizations?.metadata || {},
    });
  };

  // Create a legal hold
  const createLegalHold = async (hold: Omit<LegalHold, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('legal_holds')
        .insert({
          name: hold.name,
          description: hold.description,
          hold_reason: hold.hold_reason,
          matter_id: hold.matter_id,
          custodian_name: hold.custodian_name,
          custodian_email: hold.custodian_email,
          start_date: hold.start_date,
          end_date: hold.end_date,
          status: hold.status,
          document_ids: hold.document_ids,
          folder_ids: hold.folder_ids,
          notes: hold.notes,
          user_id: user.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create custodian record if custodian info provided
      const hasName = hold.custodian_name && hold.custodian_name.trim().length > 0;
      const hasEmail = hold.custodian_email && hold.custodian_email.trim().length > 0;
      
      console.log('🔍 Retention hold custodian check:', {
        holdId: data.id,
        custodian_name: hold.custodian_name,
        custodian_email: hold.custodian_email,
        hasName,
        hasEmail,
        willCreateCustodian: data && (hasName || hasEmail)
      });
      
      if (data && (hasName || hasEmail)) {
        console.log('🔒 Creating custodian record for retention legal hold:', data.id);
        
        const custodianName = hold.custodian_name?.trim() || hold.custodian_email?.split('@')[0].replace(/[._]/g, ' ') || 'Custodian';
        const custodianEmail = hold.custodian_email?.trim() || `${hold.custodian_name?.toLowerCase().replace(/\s+/g, '.')}@example.com`;
        
        const { data: custodianData, error: custError } = await supabase
          .from('legal_hold_custodians')
          .insert({
            hold_id: data.id,
            name: custodianName,
            email: custodianEmail,
            status: 'pending',
            added_by: user.id
          })
          .select();
        
        if (custError) {
          console.error('❌ Failed to create custodian record:', custError);
        } else {
          console.log('✅ Custodian record created:', custodianData);
        }
      } else {
        console.log('⚠️ No custodian info provided or data is null, skipping custodian creation');
      }

      toast({ title: 'Success', description: 'Legal hold created' });
      fetchData();
      return data;
    } catch (error) {
      console.error('Error creating legal hold:', error);
      toast({ title: 'Error', description: 'Failed to create legal hold', variant: 'destructive' });
      throw error;
    }
  };

  // Update a legal hold
  const updateLegalHold = async (id: string, updates: Partial<Omit<LegalHold, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { error } = await supabase
        .from('legal_holds')
        .update({
          name: updates.name,
          description: updates.description,
          hold_reason: updates.hold_reason,
          matter_id: updates.matter_id,
          custodian_name: updates.custodian_name,
          custodian_email: updates.custodian_email,
          end_date: updates.end_date,
          notes: updates.notes,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Legal hold updated' });
      fetchData();
    } catch (error) {
      console.error('Error updating legal hold:', error);
      toast({ title: 'Error', description: 'Failed to update legal hold', variant: 'destructive' });
      throw error;
    }
  };

  // Release a legal hold
  const releaseLegalHold = async (id: string, reason: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('legal_holds')
        .update({
          status: 'released' as LegalHoldStatus,
          released_by: user.id,
          released_at: new Date().toISOString(),
          release_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Legal hold released' });
      fetchData();
    } catch (error) {
      console.error('Error releasing legal hold:', error);
      toast({ title: 'Error', description: 'Failed to release legal hold', variant: 'destructive' });
      throw error;
    }
  };

  // Apply policy to document
  const applyPolicyToDocument = async (documentId: string, policyId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const policy = policies.find(p => p.id === policyId);
      if (!policy) throw new Error('Policy not found');

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + policy.retention_period_days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('document_retention_status')
        .upsert({
          document_id: documentId,
          user_id: user.id,
          policy_id: policyId,
          retention_start_date: startDate.toISOString(),
          retention_end_date: endDate.toISOString(),
          current_status: 'active' as RetentionStatus,
          disposition_action: policy.disposition_action,
          notification_sent: false,
        }, {
          onConflict: 'document_id',
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Policy applied to document' });
      fetchData();
    } catch (error) {
      console.error('Error applying policy:', error);
      toast({ title: 'Error', description: 'Failed to apply policy', variant: 'destructive' });
      throw error;
    }
  };

  // Dispose document
  const disposeDocument = async (documentId: string, action: DispositionAction, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const status = documentStatuses.find(s => s.document_id === documentId);
      
      // Check for legal holds
      if (status?.legal_hold_ids?.length) {
        toast({ 
          title: 'Cannot dispose', 
          description: 'Document is under legal hold', 
          variant: 'destructive' 
        });
        return;
      }

      // Update status
      await supabase
        .from('document_retention_status')
        .update({
          current_status: action === 'archive' ? 'archived' : 'disposed',
          disposition_action: action,
          disposition_date: new Date().toISOString(),
          disposition_approved_by: user.id,
          disposition_notes: reason,
        })
        .eq('document_id', documentId);

      // Create audit log
      await supabase.from('disposition_audit_log').insert({
        document_id: documentId,
        user_id: user.id,
        action: action === 'archive' ? 'archived' : 'disposed',
        action_by: user.id,
        policy_id: status?.policy_id,
        previous_status: status?.current_status,
        new_status: action === 'archive' ? 'archived' : 'disposed',
        reason,
        certificate_number: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      });

      toast({ title: 'Success', description: `Document ${action === 'archive' ? 'archived' : 'disposed'}` });
      fetchData();
    } catch (error) {
      console.error('Error disposing document:', error);
      toast({ title: 'Error', description: 'Failed to dispose document', variant: 'destructive' });
      throw error;
    }
  };

  // Grant exception
  const grantException = async (documentId: string, reason: string, extendDays: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const status = documentStatuses.find(s => s.document_id === documentId);
      const newEndDate = new Date(new Date(status?.retention_end_date || Date.now()).getTime() + extendDays * 24 * 60 * 60 * 1000);

      await supabase
        .from('document_retention_status')
        .update({
          retention_end_date: newEndDate.toISOString(),
          exception_reason: reason,
          exception_approved_by: user.id,
          exception_end_date: newEndDate.toISOString(),
          current_status: 'active',
        })
        .eq('document_id', documentId);

      await supabase.from('disposition_audit_log').insert({
        document_id: documentId,
        user_id: user.id,
        action: 'exception_granted' as AuditAction,
        action_by: user.id,
        policy_id: status?.policy_id,
        previous_status: status?.current_status,
        new_status: 'active',
        reason: `Extended by ${extendDays} days: ${reason}`,
      });

      toast({ title: 'Success', description: 'Exception granted' });
      fetchData();
    } catch (error) {
      console.error('Error granting exception:', error);
      toast({ title: 'Error', description: 'Failed to grant exception', variant: 'destructive' });
      throw error;
    }
  };

  // Filter document statuses
  const filteredStatuses = documentStatuses.filter(status => {
    if (filter.status?.length && !filter.status.includes(status.current_status as RetentionStatus)) return false;
    if (filter.policy_id && status.policy_id !== filter.policy_id) return false;
    if (filter.on_legal_hold !== undefined) {
      const hasHold = status.legal_hold_ids?.length > 0;
      if (filter.on_legal_hold !== hasHold) return false;
    }
    if (filter.expiring_within_days) {
      const daysUntilExpiry = Math.ceil((new Date(status.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (daysUntilExpiry > filter.expiring_within_days) return false;
    }
    return true;
  });

  return {
    policies,
    legalHolds,
    documentStatuses: filteredStatuses,
    templates,
    auditLogs,
    stats,
    isLoading,
    filter,
    setFilter,
    refresh: fetchData,
    createPolicy,
    updatePolicy,
    deletePolicy,
    createFromTemplate,
    createLegalHold,
    updateLegalHold,
    releaseLegalHold,
    applyPolicyToDocument,
    disposeDocument,
    grantException,
  };
};

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAuditEvent } from '@/utils/auditLogger';

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'multi-select' | 'url' | 'email';

export interface MetadataDefinition {
  id: string;
  user_id: string;
  field_name: string;
  field_type: FieldType;
  field_label: string;
  description: string | null;
  is_required: boolean;
  default_value: string | null;
  options: string[] | null;
  validation_rules: Record<string, any> | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentMetadata {
  id: string;
  document_id: string;
  definition_id: string;
  user_id: string;
  field_value: string | null;
  created_at: string;
  updated_at: string;
}

export function useCustomMetadata() {
  const [definitions, setDefinitions] = useState<MetadataDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchDefinitions = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase
        .from('custom_metadata_definitions')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .order('sort_order') as any);

      if (error) throw error;
      setDefinitions((data || []) as MetadataDefinition[]);
    } catch (error) {
      console.error('Error fetching definitions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDefinitions();
  }, [fetchDefinitions]);

  const createDefinition = useCallback(async (
    definition: Omit<MetadataDefinition, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      let finalDefinition = { ...definition, user_id: user.user.id };

      // Client-side duplicate check to avoid DB errors
      const duplicate = definitions.find(d => d.field_name === finalDefinition.field_name);
      if (duplicate) {
        const timestamp = new Date().getTime().toString().slice(-4);
        finalDefinition.field_name = `${finalDefinition.field_name}_${timestamp}`;
        // Ensure the new name is also unique (though highly likely)
        if (definitions.some(d => d.field_name === finalDefinition.field_name)) {
          finalDefinition.field_name = `${finalDefinition.field_name}_${Math.floor(Math.random() * 1000)}`;
        }
      }

      // Try insert
      let { data, error } = await supabase
        .from('custom_metadata_definitions')
        .insert(finalDefinition)
        .select()
        .single();

      // Fallback: If still collision (race condition), retry one more time
      if (error && (error.code === '23505' || error.message?.includes('unique'))) {
        const timestamp = new Date().getTime().toString().slice(-4);
        finalDefinition.field_name = `${finalDefinition.field_name}_${timestamp}`;

        const retry = await supabase
          .from('custom_metadata_definitions')
          .insert(finalDefinition)
          .select()
          .single();

        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      toast({
        title: 'Field created',
        description: `Custom field "${definition.field_label}" has been created`,
      });

      fetchDefinitions();
      return data;
    } catch (error: any) {
      console.error('Error creating definition:', error);
      toast({
        title: 'Error',
        description: `Failed to create: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      return null;
    }
  }, [definitions, fetchDefinitions, toast]);

  const updateDefinition = useCallback(async (
    id: string,
    updates: Partial<MetadataDefinition>
  ) => {
    try {
      const { error } = await supabase
        .from('custom_metadata_definitions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Field updated',
        description: 'Custom field has been updated',
      });

      fetchDefinitions();
    } catch (error) {
      console.error('Error updating definition:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom field',
        variant: 'destructive',
      });
    }
  }, [fetchDefinitions, toast]);

  const deleteDefinition = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('custom_metadata_definitions')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Field deleted',
        description: 'Custom field has been removed',
      });

      fetchDefinitions();
    } catch (error) {
      console.error('Error deleting definition:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom field',
        variant: 'destructive',
      });
    }
  }, [fetchDefinitions, toast]);

  const reorderDefinitions = useCallback(async (reorderedDefinitions: MetadataDefinition[]) => {
    // Optimistic update
    setDefinitions(reorderedDefinitions);

    try {
      const updates = reorderedDefinitions.map((def, index) => ({
        id: def.id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      // Update in batches or use upsert if all fields are active
      const { error } = await supabase
        .from('custom_metadata_definitions')
        .upsert(
          updates.map(u => ({ ...u, is_active: true })) // Ensure we don't accidentally unset other fields, but upsert needs minimal fields if we only want to update.
          // Actually, safer to just update sort_order one by one or create a specific RPC?
          // For simplicity in Supabase client-side:
        );

      // Supabase upsert requires all non-null columns if it inserts, but we are updating existing IDs.
      // Better approach for bulk update without RPC:
      for (const update of updates) {
        await supabase.from('custom_metadata_definitions').update({ sort_order: update.sort_order }).eq('id', update.id);
      }

      // Ideally we would use an RPC for this, but looping is okay for small list (<50 items).

    } catch (error) {
      console.error('Error reordering definitions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save new order',
        variant: 'destructive',
      });
      fetchDefinitions(); // Revert on error
    }
  }, [fetchDefinitions, toast]);

  const getDocumentMetadata = useCallback(async (documentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from('document_custom_metadata')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      if (error) throw error;
      return (data || []) as DocumentMetadata[];
    } catch (error) {
      console.error('Error fetching document metadata:', error);
      return [];
    }
  }, []);

  const setDocumentMetadata = useCallback(async (
    documentId: string,
    definitionId: string,
    value: string | null
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('document_custom_metadata')
        .select('id')
        .eq('document_id', documentId)
        .eq('definition_id', definitionId)
        .single();

      if (existing) {
        await supabase
          .from('document_custom_metadata')
          .update({ field_value: value })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('document_custom_metadata')
          .insert({
            document_id: documentId,
            definition_id: definitionId,
            user_id: user.user.id,
            field_value: value,
          });
      }

      toast({
        title: 'Metadata saved',
        description: 'Document metadata has been updated',
      });

      // Log metadata update to audit trail
      logAuditEvent({
        action: 'document.updated',
        category: 'document_management',
        resourceType: 'document',
        resourceName: 'Document',
        documentId,
        details: {
          reason: 'Custom metadata updated',
        },
      });
    } catch (error) {
      console.error('Error setting metadata:', error);
      toast({
        title: 'Error',
        description: 'Failed to save metadata',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    definitions,
    isLoading,
    createDefinition,
    updateDefinition,
    deleteDefinition,
    getDocumentMetadata,
    setDocumentMetadata,
    reorderDefinitions,
    refetch: fetchDefinitions,
  };
}

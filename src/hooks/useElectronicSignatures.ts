import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type {
  SignatureRequest,
  SignatureSigner,
  SignatureField,
  UserSignature,
  SignatureAuditLog,
  SignatureTemplate,
  SignatureStats,
  SignerRole,
  SignatureType,
} from '@/types/signature';

export const useElectronicSignatures = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SignatureRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<SignatureRequest | null>(null);
  const [userSignatures, setUserSignatures] = useState<UserSignature[]>([]);
  const [templates] = useState<SignatureTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<SignatureStats>({
    total_requests: 0,
    pending: 0,
    completed: 0,
    declined: 0,
    expired: 0,
    awaiting_my_signature: 0, // Not fully implemented yet
    completion_rate: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch requests
      const { data: requestData, error: requestError } = await supabase
        .from('signature_requests')
        .select(`
          *,
          signers:signature_signers(*)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (requestError) throw requestError;

      const typedRequests = (requestData || []).map((r: any) => ({
        ...r,
        signers: r.signers.sort((a: any, b: any) => a.signing_order - b.signing_order)
      })) as SignatureRequest[];

      setRequests(typedRequests);

      // Calculate stats
      const total = typedRequests.length;
      const pending = typedRequests.filter(r => r.status === 'pending').length;
      const completed = typedRequests.filter(r => r.status === 'completed').length;
      const declined = typedRequests.filter(r => r.status === 'declined').length;
      const expired = typedRequests.filter(r => r.status === 'expired').length;

      setStats({
        total_requests: total,
        pending,
        completed,
        declined,
        expired,
        awaiting_my_signature: 0,
        completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      });

    } catch (error) {
      console.error('Error fetching signatures:', error);
      toast({
        title: 'Error',
        description: 'Failed to load signature requests',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createRequest = async (data: {
    title: string;
    message?: string;
    document_name?: string;
    document_url?: string;
    signing_order?: 'parallel' | 'sequential';
    expires_at?: string;
    signers: Array<{ name: string; email: string; role?: SignerRole; signing_order?: number }>;
  }) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // 1. Create Request
      const { data: newRequest, error: reqError } = await supabase
        .from('signature_requests')
        .insert({
          user_id: user.user.id,
          title: data.title,
          message: data.message,
          document_name: data.document_name,
          document_url: data.document_url,
          status: 'draft',
          signing_order: data.signing_order || 'parallel',
          expires_at: data.expires_at,
        })
        .select()
        .single();

      if (reqError) throw reqError;

      // 2. Create Signers
      if (data.signers.length > 0) {
        const signersToInsert = data.signers.map((s, i) => ({
          request_id: newRequest.id,
          name: s.name,
          email: s.email,
          role: s.role || 'signer',
          signing_order: s.signing_order ?? i,
          status: 'pending',
        }));

        const { error: signerError } = await supabase
          .from('signature_signers')
          .insert(signersToInsert);

        if (signerError) throw signerError;
      }

      toast({ title: 'Success', description: 'Signature request created' });
      fetchData(); // Refresh list
      return newRequest;

    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: 'Failed to create signature request',
        variant: 'destructive',
      });
      return null;
    }
  };

  const sendRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('signature_requests')
        .update({ status: 'pending' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Signature request sent' });
      fetchData();
    } catch (error) {
      console.error('Error sending request:', error);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('signature_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Request cancelled' });
      fetchData();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({ title: 'Error', description: 'Failed to cancel request', variant: 'destructive' });
    }
  };

  // Placeholders for other functions not yet connected to DB
  const addField = async (field: any) => console.log('addField', field);
  const updateField = async (id: string, updates: any) => console.log('updateField', id, updates);
  const deleteField = async (id: string) => console.log('deleteField', id);
  const signField = async (id: string, val: string, signerId: string) => console.log('signField');
  const declineToSign = async (id: string, reason: string) => console.log('declineToSign');
  const saveUserSignature = async (data: any) => console.log('saveUserSignature');
  const deleteUserSignature = async (id: string) => console.log('deleteUserSignature');
  const getAuditLog = async (id: string) => [];

  return {
    requests,
    userSignatures,
    templates,
    stats,
    isLoading,
    activeRequest,
    setActiveRequest,
    refresh: fetchData,
    createRequest,
    sendRequest,
    cancelRequest,
    addField,
    updateField,
    deleteField,
    signField,
    declineToSign,
    saveUserSignature,
    deleteUserSignature,
    getAuditLog,
  };
};

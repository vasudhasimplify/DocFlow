import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OwnershipTransfer {
  id: string;
  document_id: string;
  from_user_id: string;
  to_user_id: string;
  to_user_email: string;
  from_user_email?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message: string | null;
  transferred_at: string | null;
  created_at: string;
  updated_at: string;
  document_file_name?: string;
  document?: {
    id: string;
    file_name: string;
  };
}

export function useOwnershipTransfer() {
  const [transfers, setTransfers] = useState<OwnershipTransfer[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<OwnershipTransfer[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<OwnershipTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransfers = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.log('📧 No user logged in');
        return;
      }

      console.log('📧 Fetching transfers for user:', user.user.id, user.user.email);

      const { data, error } = await supabase
        .from('document_ownership_transfers')
        .select(`
          id,
          document_id,
          from_user_id,
          to_user_id,
          to_user_email,
          from_user_email,
          status,
          message,
          transferred_at,
          created_at,
          updated_at,
          document_file_name,
          documents(id, file_name)
        `)
        .or(`from_user_id.eq.${user.user.id},to_user_id.eq.${user.user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('📧 Error fetching transfers:', error);
        throw error;
      }

      console.log('📧 All transfers fetched:', data?.length || 0);
      console.log('📧 Raw transfer data:', JSON.stringify(data, null, 2));

      // Transform the data to match the expected structure
      const allTransfers = (data || []).map(transfer => {
        console.log('📧 Processing transfer:', transfer.id, 'documents field:', transfer.documents);
        return {
          ...transfer,
          document: transfer.documents || null
        };
      }) as OwnershipTransfer[];
      
      console.log('📧 Transformed transfers:', JSON.stringify(allTransfers.map(t => ({ id: t.id, document: t.document })), null, 2));
      setTransfers(allTransfers);
      
      const incoming = allTransfers.filter(t => t.to_user_id === user.user!.id && t.status === 'pending');
      console.log('📧 Pending incoming transfers:', incoming.length, incoming);
      
      const outgoing = allTransfers.filter(t => t.from_user_id === user.user!.id && t.status === 'pending');
      console.log('📧 Pending outgoing transfers:', outgoing.length, outgoing);
      
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } catch (error) {
      console.error('Error fetching transfers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const initiateTransfer = useCallback(async (
    documentId: string,
    toEmail: string,
    message?: string
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      console.log('📧 Initiating transfer from:', user.user.email, 'to:', toEmail);

      // Prevent self-transfer
      if (toEmail.toLowerCase() === user.user.email?.toLowerCase()) {
        toast({
          title: 'Invalid Transfer',
          description: 'You cannot transfer a document to yourself',
          variant: 'destructive',
        });
        return null;
      }

      // Use RPC function to look up user by email
      const { data: targetUserId, error: lookupError } = await supabase
        .rpc('get_user_id_by_email', { user_email: toEmail });

      if (lookupError || !targetUserId) {
        toast({
          title: 'User not found',
          description: `No user found with email: ${toEmail}. They may need to sign up first.`,
          variant: 'destructive',
        });
        console.error('📧 Target user not found:', toEmail, lookupError);
        return null;
      }

      console.log('📧 Target user found:', targetUserId);

      const transferData = {
        document_id: documentId,
        from_user_id: user.user.id,
        to_user_id: targetUserId,
        to_user_email: toEmail,
        message,
        status: 'pending' as const,
      };

      console.log('📧 Creating transfer:', transferData);

      const { data, error } = await supabase
        .from('document_ownership_transfers')
        .insert(transferData)
        .select()
        .single();

      if (error) {
        console.error('📧 Transfer creation error:', error);
        throw error;
      }

      console.log('📧 Transfer created successfully:', data);

      toast({
        title: 'Transfer initiated',
        description: `Ownership transfer request sent to ${toEmail}`,
      });

      fetchTransfers();
      return data;
    } catch (error) {
      console.error('Error initiating transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate ownership transfer',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchTransfers, toast]);

  const acceptTransfer = useCallback(async (transferId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Get the transfer to validate
      const { data: transfer } = await supabase
        .from('document_ownership_transfers')
        .select('*')
        .eq('id', transferId)
        .single();

      if (!transfer) {
        toast({
          title: 'Error',
          description: 'Transfer not found',
          variant: 'destructive',
        });
        return;
      }

      // Prevent accepting your own transfer
      if (transfer.from_user_id === user.user.id) {
        toast({
          title: 'Cannot accept',
          description: 'You cannot accept a transfer you initiated',
          variant: 'destructive',
        });
        return;
      }

      // Ensure current user is the recipient
      if (transfer.to_user_id !== user.user.id) {
        toast({
          title: 'Not authorized',
          description: 'You are not the recipient of this transfer',
          variant: 'destructive',
        });
        return;
      }

      // Call the database function to handle ownership transfer atomically
      const { error } = await supabase.rpc('accept_ownership_transfer', {
        transfer_id: transferId
      });

      if (error) throw error;

      toast({
        title: 'Transfer accepted',
        description: 'You are now the owner of this document. The previous owner no longer has access.',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error accepting transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  const rejectTransfer = useCallback(async (transferId: string) => {
    try {
      const { error } = await supabase.rpc('reject_ownership_transfer', {
        transfer_id: transferId
      });

      if (error) throw error;

      toast({
        title: 'Transfer rejected',
        description: 'The ownership transfer has been declined',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  const cancelTransfer = useCallback(async (transferId: string) => {
    try {
      const { error } = await supabase.rpc('cancel_ownership_transfer', {
        transfer_id: transferId
      });

      if (error) throw error;

      toast({
        title: 'Transfer cancelled',
        description: 'The ownership transfer has been cancelled',
      });

      fetchTransfers();
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel transfer',
        variant: 'destructive',
      });
    }
  }, [fetchTransfers, toast]);

  return {
    transfers,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
    initiateTransfer,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
    refetch: fetchTransfers,
  };
}

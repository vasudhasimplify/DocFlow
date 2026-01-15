import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logDocumentShared, logAuditEvent } from '@/utils/auditLogger';
import { env } from '@/config/env';

export interface ExternalShare {
  id: string;
  owner_id: string;
  resource_type: 'document' | 'folder' | 'workspace';
  resource_id: string;
  resource_name?: string;
  guest_email: string;
  guest_name?: string;
  permission: 'view' | 'comment' | 'download' | 'edit';
  allow_download: boolean;
  allow_print: boolean;
  allow_reshare: boolean;
  password_protected: boolean;
  require_login: boolean;
  expires_at?: string;
  max_views?: number;
  view_count: number;
  notify_on_view: boolean;
  notify_on_download: boolean;
  message?: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  accepted_at?: string;
  revoked_at?: string;
  invitation_token: string;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GuestAccessLog {
  id: string;
  share_id: string;
  guest_email: string;
  action: 'view' | 'download' | 'print' | 'comment' | 'edit';
  ip_address?: string;
  user_agent?: string;
  device_type?: string;
  country?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface CreateExternalShareParams {
  resource_type: ExternalShare['resource_type'];
  resource_id: string;
  resource_name?: string;
  guest_email: string;
  guest_name?: string;
  permission: ExternalShare['permission'];
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  password?: string;
  require_login?: boolean;
  expires_in_days?: number;
  max_views?: number;
  notify_on_view?: boolean;
  notify_on_download?: boolean;
  message?: string;
  // New: If email belongs to a registered user, store their user ID
  registered_user_id?: string;
}

// Result type for user email check
export interface UserCheckResult {
  isUser: boolean;
  userId?: string;
  displayName?: string;
  email?: string;
}

// Check if an email belongs to a registered SimplifyDrive user
// Uses the same API endpoint as Identity Mapping (/api/migration/users)
export async function checkUserByEmail(email: string): Promise<UserCheckResult> {
  try {
    // Fetch users from backend API (same as Identity Mapping uses)
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/api/migration/users`);
    if (!response.ok) {
      console.error('Failed to fetch users from API');
      return { isUser: false };
    }

    const users = await response.json();
    const normalizedEmail = email.toLowerCase();

    // Find user by email
    const foundUser = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (foundUser) {
      return {
        isUser: true,
        userId: foundUser.id,
        displayName: foundUser.full_name || foundUser.email,
        email: foundUser.email
      };
    }

    return { isUser: false };
  } catch (err) {
    console.error('Error in checkUserByEmail:', err);
    return { isUser: false };
  }
}

export function useExternalSharing() {
  const [shares, setShares] = useState<ExternalShare[]>([]);
  const [accessLogs, setAccessLogs] = useState<GuestAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShares = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('external_shares')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      setShares(data || []);
    } catch (error) {
      console.error('Error fetching external shares:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccessLogs = useCallback(async (shareId: string) => {
    try {
      const { data, error } = await (supabase
        .from('guest_access_logs')
        .select('*')
        .eq('share_id', shareId)
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) throw error;
      setAccessLogs(data || []);
    } catch (error) {
      console.error('Error fetching access logs:', error);
    }
  }, []);

  const createShare = useCallback(async (params: CreateExternalShareParams): Promise<ExternalShare | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Call backend API instead of direct Supabase
      // Backend will handle email sending and database operations
      const response = await fetch(`${env.apiBaseUrl}/api/shares/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({
          resource_type: params.resource_type,
          resource_id: params.resource_id,
          resource_name: params.resource_name,
          guest_email: params.guest_email,
          guest_name: params.guest_name,
          permission: params.permission,
          allow_download: params.allow_download ?? true,
          allow_print: params.allow_print ?? true,
          allow_reshare: params.allow_reshare ?? false,
          password: params.password,
          expires_in_days: params.expires_in_days,
          max_views: params.max_views,
          notify_on_view: params.notify_on_view ?? true,
          notify_on_download: params.notify_on_download ?? true,
          message: params.message,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create share');
      }

      const data = await response.json();

      // If this is a registered SimplifyDrive user, also add to document_shares
      // This makes the document appear in their "Shared with me" section
      console.log('🔍 Checking registered_user_id:', params.registered_user_id, 'resource_type:', params.resource_type);

      if (params.registered_user_id && params.resource_type === 'document') {
        console.log('📝 Inserting into document_shares:', {
          document_id: params.resource_id,
          shared_by: user.id,
          shared_with: params.registered_user_id,
          permission: params.permission
        });

        try {
          const { data: shareData, error: shareError } = await supabase
            .from('document_shares')
            .insert({
              document_id: params.resource_id,
              shared_by: user.id,
              shared_with: params.registered_user_id,
              permission: params.permission === 'edit' ? 'edit' : 'view',
              // Don't set a share_token since this is user-to-user, not a link
            })
            .select();

          if (shareError) {
            console.error('❌ Error adding to document_shares:', shareError);
          } else {
            console.log('✅ Document added to user\'s Shared with me section:', shareData);
          }
        } catch (err) {
          console.error('❌ Exception creating document_shares entry:', err);
        }
      } else {
        console.log('⏭️ Skipping document_shares insert - registered_user_id:', params.registered_user_id);
      }

      toast({
        title: "Share invitation sent",
        description: `Invitation sent to ${params.guest_email}. Email is on its way!`,
      });

      // Log guest share to audit trail
      logDocumentShared(
        params.resource_id,
        params.resource_name || 'Document',
        [params.guest_email],
        params.permission
      );

      await fetchShares();
      return data;
    } catch (error) {
      console.error('Error creating share:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create share',
        variant: 'destructive'
      });
      return null;
    }
  }, [fetchShares, toast]);

  const updateShare = useCallback(async (shareId: string, updates: Partial<ExternalShare>) => {
    try {
      const { error } = await (supabase
        .from('external_shares')
        .update(updates as any)
        .eq('id', shareId) as any);

      if (error) throw error;

      toast({
        title: "Share updated",
        description: "Share settings have been updated.",
      });

      await fetchShares();
    } catch (error: any) {
      toast({
        title: "Error updating share",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchShares]);

  const revokeShare = useCallback(async (shareId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('external_shares')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
        } as any)
        .eq('id', shareId) as any);

      if (error) throw error;

      toast({
        title: "Share revoked",
        description: "The external user can no longer access this resource.",
      });

      await fetchShares();
    } catch (error: any) {
      console.error('Error revoking share:', error);
      toast({
        title: "Error revoking share",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchShares]);

  const deleteShare = useCallback(async (shareId: string) => {
    try {
      const { error } = await (supabase
        .from('external_shares')
        .delete()
        .eq('id', shareId) as any);

      if (error) throw error;

      toast({
        title: "Share deleted",
        description: "External share has been removed.",
      });

      await fetchShares();
    } catch (error: any) {
      toast({
        title: "Error deleting share",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchShares]);

  const resendInvitation = useCallback(async (shareId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        toast({
          title: "Authentication required",
          description: "Please log in to resend invitations.",
          variant: "destructive",
        });
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/shares/${shareId}/resend-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to resend invitation');
      }

      toast({
        title: "✅ Invitation resent",
        description: "A new invitation email has been sent to the guest.",
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: "Error resending invitation",
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
        variant: "destructive",
      });
    }
  }, [toast]);

  const getShareUrl = useCallback((share: ExternalShare) => {
    return `${window.location.origin}/guest/${share.invitation_token}`;
  }, []);

  const getShareStats = useCallback(() => {
    const active = shares.filter(s => s.status === 'pending' || s.status === 'accepted').length;
    const expired = shares.filter(s => s.status === 'expired').length;
    const revoked = shares.filter(s => s.status === 'revoked').length;
    const totalViews = shares.reduce((sum, s) => sum + s.view_count, 0);

    return { active, expired, revoked, totalViews };
  }, [shares]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  return {
    shares,
    accessLogs,
    loading,
    createShare,
    updateShare,
    revokeShare,
    deleteShare,
    resendInvitation,
    fetchAccessLogs,
    getShareUrl,
    getShareStats,
    refetch: fetchShares,
  };
}

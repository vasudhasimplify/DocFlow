import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { DocumentLock, LockNotification, LockDocumentParams } from '@/types/versionControl';

interface UseDocumentLockOptions {
  documentId: string;
  autoRefresh?: boolean;
}

export function useDocumentLock({ documentId, autoRefresh = true }: UseDocumentLockOptions) {
  const { user } = useAuth();
  const [lock, setLock] = useState<DocumentLock | null>(null);
  const [notifications, setNotifications] = useState<LockNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLocked = !!lock?.is_active;
  const isLockedByCurrentUser = isLocked && lock?.locked_by === user?.id;
  const canEdit = !isLocked || isLockedByCurrentUser;

  // Fetch current lock status
  const fetchLock = useCallback(async () => {
    if (!documentId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('document_locks')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Check if lock has expired
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          await unlockDocument();
          setLock(null);
        } else {
          setLock(data as DocumentLock);
        }
      } else {
        setLock(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lock status';
      setError(message);
      console.error('Error fetching lock:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Fetch user's notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('lock_notifications')
        .select('*')
        .eq('notified_user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      setNotifications((data || []).map(n => ({
        ...n,
        notification_type: n.notification_type as LockNotification['notification_type'],
      })));
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [user?.id]);

  // Lock a document
  const lockDocument = useCallback(async (params: LockDocumentParams): Promise<DocumentLock> => {
    if (!user?.id) throw new Error('User not authenticated');

    // Check if document is already locked
    if (isLocked && !isLockedByCurrentUser) {
      // Create notification for lock owner
      await supabase.from('lock_notifications').insert({
        document_id: documentId,
        lock_id: lock!.id,
        notified_user_id: lock!.locked_by,
        notification_type: 'lock_attempt',
        message: `Someone is trying to edit this document`,
      });

      throw new Error('Document is currently locked by another user');
    }

    // Calculate expiration time
    let expiresAt: string | undefined;
    if (params.expires_in_minutes) {
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + params.expires_in_minutes);
      expiresAt = expirationDate.toISOString();
    }

    // If already locked by current user, update the lock
    if (isLockedByCurrentUser && lock) {
      const { data, error: updateError } = await supabase
        .from('document_locks')
        .update({
          lock_reason: params.lock_reason,
          expires_at: expiresAt,
          locked_at: new Date().toISOString(),
        })
        .eq('id', lock.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      const updatedLock = data as DocumentLock;
      setLock(updatedLock);
      toast.success('Lock extended');
      return updatedLock;
    }

    // Create new lock
    const { data, error: insertError } = await supabase
      .from('document_locks')
      .insert({
        document_id: params.document_id,
        locked_by: user.id,
        lock_reason: params.lock_reason,
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const newLock = data as DocumentLock;
    setLock(newLock);
    toast.success('Document locked for editing');
    return newLock;
  }, [user?.id, documentId, isLocked, isLockedByCurrentUser, lock]);

  // Unlock a document
  const unlockDocument = useCallback(async () => {
    if (!lock) return;

    // Check if this is a guest lock (has guest_email)
    const isGuestLock = lock.guest_email && lock.guest_email.trim() !== '';

    if (isGuestLock) {
      // Guest locks can be released by the document owner
      try {
        const response = await fetch(`http://localhost:8000/api/v1/checkout-requests/release-guest-lock/${documentId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user?.id || ''
          }
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to release guest lock');
        }

        setLock(null);
        toast.success('Guest edit access revoked');
        return;
      } catch (error: any) {
        toast.error(error.message || 'Failed to release guest lock');
        throw error;
      }
    }

    // Regular lock - only the lock owner can unlock
    if (lock.locked_by !== user?.id) {
      throw new Error('Only the lock owner can unlock the document');
    }

    const { error: updateError } = await supabase
      .from('document_locks')
      .update({ is_active: false })
      .eq('id', lock.id);

    if (updateError) throw updateError;

    // Notify anyone who tried to access
    await supabase.from('lock_notifications').insert({
      document_id: documentId,
      lock_id: lock.id,
      notified_user_id: lock.locked_by,
      notification_type: 'lock_released',
      message: 'Document is now available for editing',
    });

    setLock(null);
    toast.success('Document unlocked');
  }, [lock, user?.id, documentId]);

  // Request access to a locked document
  const requestLockAccess = useCallback(async () => {
    if (!lock || !user?.id) return;

    await supabase.from('lock_notifications').insert({
      document_id: documentId,
      lock_id: lock.id,
      notified_user_id: lock.locked_by,
      notification_type: 'lock_attempt',
      message: `User requested edit access`,
    });

    toast.info('Access request sent to the current editor');
  }, [lock, user?.id, documentId]);

  // Mark notification as read
  const markNotificationRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('lock_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Force unlock (admin function)
  const forceUnlock = useCallback(async () => {
    if (!lock) return;

    const { error: deleteError } = await supabase
      .from('document_locks')
      .delete()
      .eq('id', lock.id);

    if (deleteError) throw deleteError;

    setLock(null);
    toast.success('Document force unlocked');
  }, [lock]);

  // Initial fetch
  useEffect(() => {
    if (documentId) {
      fetchLock();
    }
  }, [documentId, fetchLock]);

  // Fetch notifications when user is available
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  // Real-time subscription for lock changes
  useEffect(() => {
    if (!documentId || !autoRefresh) return;

    const channel = supabase
      .channel(`locks-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_locks',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE' || (payload.new as DocumentLock)?.is_active === false) {
            setLock(null);
            toast.info('Document is now available');
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setLock(payload.new as DocumentLock);
            if ((payload.new as DocumentLock).locked_by !== user?.id) {
              toast.warning('Document has been locked by another user');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, autoRefresh, user?.id]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!user?.id || !autoRefresh) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lock_notifications',
          filter: `notified_user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as LockNotification;
          setNotifications(prev => [notification, ...prev]);
          
          // Show toast based on notification type
          if (notification.notification_type === 'lock_attempt') {
            toast.info('Someone is trying to edit your locked document');
          } else if (notification.notification_type === 'lock_released') {
            toast.success('Document is now available for editing');
          } else if (notification.notification_type === 'lock_expiring') {
            toast.warning('Your lock is about to expire');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, autoRefresh]);

  // Auto-extend lock before expiration
  useEffect(() => {
    if (!lock?.expires_at || !isLockedByCurrentUser) return;

    const expiresAt = new Date(lock.expires_at);
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const warningTime = 5 * 60 * 1000; // 5 minutes before expiry

    if (timeUntilExpiry > warningTime) {
      const timeout = setTimeout(() => {
        toast.warning('Your lock will expire in 5 minutes', {
          action: {
            label: 'Extend',
            onClick: () => lockDocument({ document_id: documentId, expires_in_minutes: 30 }),
          },
        });
      }, timeUntilExpiry - warningTime);

      return () => clearTimeout(timeout);
    }
  }, [lock, isLockedByCurrentUser, documentId, lockDocument]);

  return {
    lock,
    isLocked,
    isLockedByCurrentUser,
    canEdit,
    notifications,
    isLoading,
    error,
    lockDocument,
    unlockDocument,
    requestLockAccess,
    forceUnlock,
    markNotificationRead,
    refreshLock: fetchLock,
    refreshNotifications: fetchNotifications,
  };
}

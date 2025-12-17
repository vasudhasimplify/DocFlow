import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentLockStatus {
  isLocked: boolean;
  lockedBy?: string;
  lockedByEmail?: string;
  isLockedByCurrentUser: boolean;
}

export function useDocumentLockStatus(documentId: string, userId?: string) {
  const [lockStatus, setLockStatus] = useState<DocumentLockStatus>({
    isLocked: false,
    isLockedByCurrentUser: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!documentId) return;

    const checkLockStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('document_locks')
          .select('locked_by, is_active, expires_at')
          .eq('document_id', documentId)
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking lock status:', error);
          return;
        }

        if (data) {
          const isLockedByCurrentUser = userId ? data.locked_by === userId : false;
          setLockStatus({
            isLocked: true,
            lockedBy: data.locked_by,
            isLockedByCurrentUser,
          });
        } else {
          setLockStatus({
            isLocked: false,
            isLockedByCurrentUser: false,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkLockStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`lock-status-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_locks',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          checkLockStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, userId]);

  return { lockStatus, isLoading };
}

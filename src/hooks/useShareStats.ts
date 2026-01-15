import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShareStats {
  active_shares: number;
  total_views: number;
  pending_invitations: number;
  expired_shares: number;
  revoked_shares: number;
}

export function useShareStats() {
  const [stats, setStats] = useState<ShareStats>({
    active_shares: 0,
    total_views: 0,
    pending_invitations: 0,
    expired_shares: 0,
    revoked_shares: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Call backend API to get stats
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/shares/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching share stats:', error);
      toast({
        title: "Error",
        description: "Failed to load share statistics",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
}

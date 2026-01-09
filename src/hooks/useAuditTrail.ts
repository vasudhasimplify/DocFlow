import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  AuditEvent,
  AuditAction,
  AuditCategory,
  AuditDetails,
  AuditMetadata,
  AuditFilter,
  AuditStats,
} from '@/types/audit';

interface UseAuditTrailOptions {
  documentId?: string;
  folderId?: string;
  autoFetch?: boolean;
  limit?: number;
}

export const useAuditTrail = (options: UseAuditTrailOptions = {}) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const limit = options.limit || 50;

  // Get device/browser info
  const getMetadata = useCallback((): AuditMetadata => {
    const ua = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    let browser = 'Unknown';
    if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';

    let os = 'Unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios/i.test(ua)) os = 'iOS';

    return {
      device_type: deviceType,
      browser,
      os,
      trigger_source: 'user',
    };
  }, []);

  // Log an audit event
  const logEvent = useCallback(async (
    action: AuditAction,
    category: AuditCategory,
    resourceType: AuditEvent['resource_type'],
    details: AuditDetails = {},
    overrides: Partial<AuditEvent> = {}
  ): Promise<AuditEvent | null> => {
    if (!user) return null;

    const metadata = getMetadata();

    const event = {
      user_id: user.id,
      action,
      action_category: category,
      resource_type: resourceType,
      details,
      metadata: { ...metadata, ...overrides.metadata },
      document_id: options.documentId || overrides.document_id,
      folder_id: options.folderId || overrides.folder_id,
      resource_name: overrides.resource_name,
      user_agent: navigator.userAgent,
      session_id: sessionStorage.getItem('session_id') || undefined,
    };

    try {
      // @ts-ignore - audit_events table may not exist in types yet
      const { data, error } = await (supabase as any)
        .from('audit_events')
        .insert(event)
        .select()
        .single();

      if (error) {
        // If table doesn't exist, log to console and continue
        console.warn('Audit logging:', error.message);
        return null;
      }

      // Add to local state if watching this resource
      if (options.documentId === event.document_id || options.folderId === event.folder_id) {
        setEvents(prev => [data as AuditEvent, ...prev]);
      }

      return data as AuditEvent;
    } catch (error) {
      console.error('Error logging audit event:', error);
      return null;
    }
  }, [user, options.documentId, options.folderId, getMetadata]);

  // Fetch events with filters
  const fetchEvents = useCallback(async (
    filter: AuditFilter = {},
    offset: number = 0
  ): Promise<AuditEvent[]> => {
    setIsLoading(true);

    try {
      // @ts-ignore - audit_events table may not exist in types yet
      let query = (supabase as any)
        .from('audit_events')
        .select('*', { count: 'exact' });

      // Apply filters
      if (options.documentId) {
        query = query.eq('document_id', options.documentId);
      }
      if (options.folderId) {
        query = query.eq('folder_id', options.folderId);
      }
      if (filter.startDate) {
        query = query.gte('created_at', filter.startDate.toISOString());
      }
      if (filter.endDate) {
        query = query.lte('created_at', filter.endDate.toISOString());
      }
      if (filter.actions && filter.actions.length > 0) {
        query = query.in('action', filter.actions);
      }
      if (filter.categories && filter.categories.length > 0) {
        query = query.in('action_category', filter.categories);
      }
      if (filter.resourceTypes && filter.resourceTypes.length > 0) {
        query = query.in('resource_type', filter.resourceTypes);
      }
      if (filter.userIds && filter.userIds.length > 0) {
        query = query.in('user_id', filter.userIds);
      }
      if (filter.searchQuery) {
        query = query.or(`resource_name.ilike.%${filter.searchQuery}%,details->>'reason'.ilike.%${filter.searchQuery}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const fetchedEvents = (data || []) as AuditEvent[];

      if (offset === 0) {
        setEvents(fetchedEvents);
      } else {
        setEvents(prev => [...prev, ...fetchedEvents]);
      }

      setTotalCount(count || 0);
      setHasMore(fetchedEvents.length === limit);

      return fetchedEvents;
    } catch (error) {
      console.error('Error fetching audit events:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [options.documentId, options.folderId, limit]);

  // Fetch statistics
  const fetchStats = useCallback(async (): Promise<AuditStats | null> => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

      // @ts-ignore - audit_events table may not exist in types yet
      const { count: total } = await (supabase as any)
        .from('audit_events')
        .select('*', { count: 'exact', head: true });

      // @ts-ignore
      const { count: today } = await (supabase as any)
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      // @ts-ignore
      const { count: thisWeek } = await (supabase as any)
        .from('audit_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      // Fetch all events for breakdown calculation
      // @ts-ignore
      const { data: allEvents } = await (supabase as any)
        .from('audit_events')
        .select('action_category, document_id, resource_name, user_id')
        .limit(1000);

      // Calculate action breakdown by category
      const actionBreakdown: Record<string, number> = {
        document_management: 0,
        access_control: 0,
        collaboration: 0,
        security: 0,
        system: 0,
        ai_processing: 0,
        export: 0,
        user_activity: 0,
      };

      // Calculate most active documents
      const documentCounts: Record<string, { id: string; name: string; count: number }> = {};

      (allEvents || []).forEach((event: any) => {
        // Count by category
        if (event.action_category && actionBreakdown[event.action_category] !== undefined) {
          actionBreakdown[event.action_category]++;
        }

        // Count by document
        if (event.document_id) {
          if (!documentCounts[event.document_id]) {
            documentCounts[event.document_id] = {
              id: event.document_id,
              name: event.resource_name || 'Unknown Document',
              count: 0,
            };
          }
          documentCounts[event.document_id].count++;
        }
      });

      // Get top 5 most active documents
      const mostActiveDocuments = Object.values(documentCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(doc => ({
          document_id: doc.id,
          document_name: doc.name,
          event_count: doc.count,
        }));

      const stats: AuditStats = {
        total_events: total || 0,
        events_today: today || 0,
        events_this_week: thisWeek || 0,
        most_active_documents: mostActiveDocuments,
        most_active_users: [],
        action_breakdown: actionBreakdown as any,
        hourly_activity: [],
      };

      setStats(stats);
      return stats;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return null;
    }
  }, []);

  // Load more events
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchEvents({}, events.length);
    }
  }, [isLoading, hasMore, events.length, fetchEvents]);

  // Export events
  const exportEvents = useCallback(async (
    filter: AuditFilter = {},
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> => {
    // Fetch all matching events (up to 10000)
    // @ts-ignore - audit_events table may not exist in types yet
    let query = (supabase as any)
      .from('audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000);

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate.toISOString());
    }
    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate.toISOString());
    }

    const { data } = await query;
    const events = data || [];

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    }

    // CSV format
    const headers = [
      'Timestamp',
      'Action',
      'Category',
      'Resource Type',
      'Resource Name',
      'User ID',
      'Details',
    ];

    const rows = events.map((event: any) => [
      event.created_at,
      event.action,
      event.action_category,
      event.resource_type,
      event.resource_name || '',
      event.user_id,
      JSON.stringify(event.details),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetchEvents();
    }
  }, [options.autoFetch, fetchEvents]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!options.documentId && !options.folderId) return;

    const channel = supabase
      .channel('audit-events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_events',
          filter: options.documentId
            ? `document_id=eq.${options.documentId}`
            : `folder_id=eq.${options.folderId}`,
        },
        (payload) => {
          setEvents(prev => [payload.new as AuditEvent, ...prev]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [options.documentId, options.folderId]);

  // Convenience methods for common actions
  const logDocumentView = useCallback((documentId: string, documentName: string) => {
    return logEvent('document.viewed', 'document_management', 'document', {}, {
      document_id: documentId,
      resource_name: documentName,
    });
  }, [logEvent]);

  const logDocumentDownload = useCallback((documentId: string, documentName: string) => {
    return logEvent('document.downloaded', 'export', 'document', {}, {
      document_id: documentId,
      resource_name: documentName,
    });
  }, [logEvent]);

  const logDocumentUpdate = useCallback((
    documentId: string,
    documentName: string,
    changes: AuditDetails['changes']
  ) => {
    return logEvent('document.updated', 'document_management', 'document', { changes }, {
      document_id: documentId,
      resource_name: documentName,
    });
  }, [logEvent]);

  const logDocumentShare = useCallback((
    documentId: string,
    documentName: string,
    sharedWith: string[],
    permissionLevel: string
  ) => {
    return logEvent('document.shared', 'access_control', 'document', {
      shared_with: sharedWith,
      permission_level: permissionLevel,
    }, {
      document_id: documentId,
      resource_name: documentName,
    });
  }, [logEvent]);

  const logSearch = useCallback((query: string, resultsCount: number) => {
    return logEvent('system.search_performed', 'user_activity', 'system', {
      search_query: query,
      results_count: resultsCount,
    });
  }, [logEvent]);

  return {
    events,
    stats,
    isLoading,
    hasMore,
    totalCount,
    fetchEvents,
    fetchStats,
    loadMore,
    exportEvents,
    logEvent,
    logDocumentView,
    logDocumentDownload,
    logDocumentUpdate,
    logDocumentShare,
    logSearch,
  };
};

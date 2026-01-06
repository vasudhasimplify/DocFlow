import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcessingQueueItem {
  id: string;
  document_id: string;
  user_id: string;
  stage: 'uploaded' | 'virus_scan' | 'text_extraction' | 'classification' | 'embedding' | 'indexing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  max_attempts: number;
  last_error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  progress_percent: number;
  stage_metadata: Record<string, any>;
  documents?: {
    id?: string;
    name?: string;
    file_name?: string;
    file_type?: string;
    processing_status?: string;
    extracted_text?: string;
    analysis_result?: any;
  };
}

export interface SearchIndexItem {
  id: string;
  document_id: string;
  user_id: string;
  operation: 'index' | 'reindex' | 'delete';
  content_hash?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  attempts: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

export function useProcessingPipeline() {
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [searchQueue, setSearchQueue] = useState<SearchIndexItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    totalDocuments: number;
    processedDocuments: number;
    pendingDocuments: number;
    avgProcessingTime: number;
    successRate: number;
  }>({ totalDocuments: 0, processedDocuments: 0, pendingDocuments: 0, avgProcessingTime: 0, successRate: 100 });
  const { toast } = useToast();
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  // Fetch processing queue status
  const fetchProcessingQueue = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // OPTIMIZATION: Only fetch minimal document info needed for display
      // Excludes extracted_text and analysis_result which can be MBs
      const { data, error } = await (supabase
        .from('document_processing_queue')
        .select(`
          *,
          documents:document_id (id, file_name, file_type, processing_status)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50) as any);

      if (error) {
        // Table might not exist yet
        console.warn('Processing queue table may not exist:', error.message);
        setProcessingQueue([]);
        return;
      }
      setProcessingQueue(data || []);
    } catch (error) {
      console.error('Error fetching processing queue:', error);
      setProcessingQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch search index queue status
  const fetchSearchQueue = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase
        .from('search_index_queue')
        .select(`
          *,
          documents:document_id (id, file_name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) {
        // Table might not exist yet
        console.warn('Search index queue table may not exist:', error.message);
        setSearchQueue([]);
        return;
      }
      setSearchQueue(data || []);
    } catch (error) {
      console.error('Error fetching search queue:', error);
    }
  }, []);

  // SYNC queue with actual document status - FIX for stuck items
  const syncQueueWithDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let syncedCount = 0;
      let removedCount = 0;

      // Get all queue items that aren't completed
      const pendingItems = processingQueue.filter(
        item => item.stage !== 'completed' && item.stage !== 'failed'
      );

      // OPTIMIZATION: Batch fetch document statuses instead of relying on joined data
      const pendingDocIds = pendingItems.map(item => item.document_id).filter(Boolean);
      
      if (pendingDocIds.length === 0) {
        setLoading(false);
        return;
      }

      // Only fetch the fields needed to determine if processing is complete
      const { data: docStatuses } = await (supabase
        .from('documents')
        .select('id, processing_status')
        .in('id', pendingDocIds) as any);

      const statusMap = new Map(docStatuses?.map((d: any) => [d.id, d]) || []);

      for (const item of pendingItems) {
        const docStatus = statusMap.get(item.document_id);
        
        if (!docStatus) {
          // Document doesn't exist, remove from queue
          await (supabase
            .from('document_processing_queue')
            .delete()
            .eq('id', item.id) as any);
          removedCount++;
          continue;
        }

        // Determine if document is processed based on status
        const isProcessed = docStatus.processing_status === 'completed';

        if (isProcessed) {
          // Document is actually processed, update queue to completed
          await (supabase
            .from('document_processing_queue')
            .update({
              stage: 'completed',
              progress_percent: 100,
              started_at: item.started_at || item.created_at,
              completed_at: new Date().toISOString(),
            } as any)
            .eq('id', item.id) as any);
          
          // Also update search index queue
          await (supabase
            .from('search_index_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
            } as any)
            .eq('document_id', item.document_id) as any);
          
          syncedCount++;
        }
      }

      await fetchProcessingQueue();
      await fetchSearchQueue();

      if (syncedCount > 0 || removedCount > 0) {
        toast({
          title: "Queue synchronized",
          description: `${syncedCount} items marked complete, ${removedCount} orphaned items removed.`,
        });
      } else {
        toast({
          title: "Queue is in sync",
          description: "All queue items match document status.",
        });
      }
    } catch (error: any) {
      console.error('Error syncing queue:', error);
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [processingQueue, fetchProcessingQueue, fetchSearchQueue, toast]);

  // Clear all completed items from queue
  const clearCompleted = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase
        .from('document_processing_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('stage', 'completed') as any);

      await (supabase
        .from('search_index_queue')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'completed') as any);

      await fetchProcessingQueue();
      await fetchSearchQueue();

      toast({
        title: "Cleared completed",
        description: "All completed items removed from queue.",
      });
    } catch (error: any) {
      toast({
        title: "Error clearing",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [fetchProcessingQueue, fetchSearchQueue, toast]);

  // Clear all items from queue
  const clearAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase
        .from('document_processing_queue')
        .delete()
        .eq('user_id', user.id) as any);

      await (supabase
        .from('search_index_queue')
        .delete()
        .eq('user_id', user.id) as any);

      await fetchProcessingQueue();
      await fetchSearchQueue();

      toast({
        title: "Queue cleared",
        description: "All items removed from processing queue.",
      });
    } catch (error: any) {
      toast({
        title: "Error clearing queue",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [fetchProcessingQueue, fetchSearchQueue, toast]);

  // Add document to processing queue
  const queueDocumentForProcessing = useCallback(async (
    documentId: string,
    priority: number = 100
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase
        .from('document_processing_queue')
        .insert({
          document_id: documentId,
          user_id: user.id,
          stage: 'uploaded',
          priority,
        } as any)
        .select()
        .single() as any);

      if (error) throw error;

      // Also queue for search indexing
      await queueForSearchIndex(documentId, 'index', priority);

      return data.id;
    } catch (error: any) {
      toast({
        title: "Error queuing document",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Queue document for search indexing
  const queueForSearchIndex = useCallback(async (
    documentId: string,
    operation: 'index' | 'reindex' | 'delete' = 'index',
    priority: number = 100
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await (supabase
        .from('search_index_queue')
        .insert({
          document_id: documentId,
          user_id: user.id,
          operation,
          priority,
        } as any) as any);
    } catch (error) {
      console.error('Error queuing for search index:', error);
    }
  }, []);

  // Get processing status for a document
  const getDocumentStatus = useCallback((documentId: string): ProcessingQueueItem | undefined => {
    return processingQueue.find(item => item.document_id === documentId);
  }, [processingQueue]);

  // Get queue statistics
  const getQueueStats = useCallback(() => {
    const pending = processingQueue.filter(q => !q.completed_at && q.stage !== 'failed').length;
    const completed = processingQueue.filter(q => q.stage === 'completed').length;
    const failed = processingQueue.filter(q => q.stage === 'failed').length;
    const inProgress = processingQueue.filter(q => 
      q.started_at && !q.completed_at && q.stage !== 'failed'
    ).length;

    const searchPending = searchQueue.filter(q => q.status === 'pending').length;
    const searchCompleted = searchQueue.filter(q => q.status === 'completed').length;

    return {
      processing: { pending, completed, failed, inProgress },
      search: { pending: searchPending, completed: searchCompleted },
    };
  }, [processingQueue, searchQueue]);

  // Retry failed document
  const retryFailed = useCallback(async (queueId: string) => {
    try {
      await (supabase
        .from('document_processing_queue')
        .update({
          stage: 'uploaded',
          attempts: 0,
          last_error: null,
          started_at: null,
          completed_at: null,
        } as any)
        .eq('id', queueId) as any);

      await fetchProcessingQueue();

      toast({
        title: "Document requeued",
        description: "Document will be reprocessed.",
      });
    } catch (error: any) {
      toast({
        title: "Error retrying",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchProcessingQueue]);

  // Cancel pending processing
  const cancelProcessing = useCallback(async (queueId: string) => {
    try {
      await (supabase
        .from('document_processing_queue')
        .delete()
        .eq('id', queueId) as any);

      await fetchProcessingQueue();

      toast({
        title: "Processing cancelled",
        description: "Document removed from queue.",
      });
    } catch (error: any) {
      toast({
        title: "Error cancelling",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [toast, fetchProcessingQueue]);

  // Simulate advancing a document through processing stages
  const simulateProcessing = useCallback(async (queueId: string) => {
    try {
      const stages: ProcessingQueueItem['stage'][] = [
        'uploaded', 'virus_scan', 'text_extraction', 
        'classification', 'embedding', 'indexing', 'completed'
      ];
      
      const item = processingQueue.find(q => q.id === queueId);
      if (!item || item.stage === 'completed' || item.stage === 'failed') return;
      
      const currentIdx = stages.indexOf(item.stage);
      if (currentIdx === -1 || currentIdx >= stages.length - 1) return;
      
      const nextStage = stages[currentIdx + 1];
      const progress = Math.round(((currentIdx + 1) / (stages.length - 1)) * 100);
      
      await (supabase
        .from('document_processing_queue')
        .update({
          stage: nextStage,
          started_at: item.started_at || new Date().toISOString(),
          completed_at: nextStage === 'completed' ? new Date().toISOString() : null,
          progress_percent: nextStage === 'completed' ? 100 : progress,
        } as any)
        .eq('id', queueId) as any);
      
      // Also update search index when completed
      if (nextStage === 'completed') {
        await (supabase
          .from('search_index_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          } as any)
          .eq('document_id', item.document_id) as any);
      }
      
      await fetchProcessingQueue();
      await fetchSearchQueue();
    } catch (error: any) {
      console.error('Error simulating processing:', error);
    }
  }, [processingQueue, fetchProcessingQueue, fetchSearchQueue]);

  // Simulate full processing for a document (all stages at once)
  const simulateFullProcessing = useCallback(async (queueId: string) => {
    try {
      const item = processingQueue.find(q => q.id === queueId);
      if (!item) return;
      
      await (supabase
        .from('document_processing_queue')
        .update({
          stage: 'completed',
          started_at: item.started_at || new Date().toISOString(),
          completed_at: new Date().toISOString(),
          progress_percent: 100,
        } as any)
        .eq('id', queueId) as any);
      
      await (supabase
        .from('search_index_queue')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
        } as any)
        .eq('document_id', item.document_id) as any);
      
      await fetchProcessingQueue();
      await fetchSearchQueue();
      
      toast({
        title: "Processing completed",
        description: "Document successfully processed.",
      });
    } catch (error: any) {
      console.error('Error completing processing:', error);
    }
  }, [processingQueue, fetchProcessingQueue, fetchSearchQueue, toast]);

  // Setup real-time subscription and event listeners
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || subscriptionActive) return;

      // Subscribe to processing queue changes
      const channel = supabase
        .channel('processing_queue_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_processing_queue',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔄 Processing queue changed:', payload);
            fetchProcessingQueue();
            fetchSearchQueue();
          }
        )
        .subscribe();

      setSubscriptionActive(true);

      // Listen for upload events to refresh immediately
      const handleUploadStarted = () => {
        console.log('📤 Upload started - refreshing queue');
        fetchProcessingQueue();
        fetchSearchQueue();
      };

      const handleUploadCompleted = () => {
        console.log('✅ Upload completed - refreshing queue');
        setTimeout(() => {
          fetchProcessingQueue();
          fetchSearchQueue();
        }, 500);
      };

      window.addEventListener('upload-started', handleUploadStarted);
      window.addEventListener('upload-completed', handleUploadCompleted);

      return () => {
        channel.unsubscribe();
        window.removeEventListener('upload-started', handleUploadStarted);
        window.removeEventListener('upload-completed', handleUploadCompleted);
        setSubscriptionActive(false);
      };
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [fetchProcessingQueue, fetchSearchQueue, subscriptionActive]);

  return {
    processingQueue,
    searchQueue,
    loading,
    syncStats,
    queueDocumentForProcessing,
    queueForSearchIndex,
    getDocumentStatus,
    getQueueStats,
    retryFailed,
    cancelProcessing,
    simulateProcessing,
    simulateFullProcessing,
    syncQueueWithDocuments,
    clearCompleted,
    clearAll,
    refresh: () => {
      fetchProcessingQueue();
      fetchSearchQueue();
    },
  };
}

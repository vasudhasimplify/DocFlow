import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getAllOfflineDocuments } from '@/services/offlineStorage';
import type { Document, DocumentStats, SortOrder } from '../types';

const SUPABASE_URL = 'https://nvdkgfptnqardtxlqoym.supabase.co';

// Cache for storage paths that failed to generate signed URLs
// This prevents repeated 400 errors for non-existent files
const failedStoragePathsCache = new Set<string>();

// Pagination constants - OPTIMIZATION to reduce egress
const PAGE_SIZE = 20;
const DOCUMENT_SELECT_COLUMNS = `
  id,
  file_name,
  file_type,
  document_type,
  file_size,
  created_at,
  updated_at,
  processing_status,
  metadata,
  storage_path,
  original_url,
  user_id,
  uploaded_by,
  upload_source,
  is_deleted
`;

interface UseDocumentsOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
  selectedFolder?: string;
}

export function useDocuments(options: UseDocumentsOptions = {}) {
  const { sortBy = 'created_at', sortOrder = 'desc', selectedFolder = 'all' } = options;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const { toast } = useToast();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch offline documents from IndexedDB
  const fetchOfflineDocuments = useCallback(async () => {
    try {
      console.log('📴 Fetching offline documents from IndexedDB...');
      const offlineDocs = await getAllOfflineDocuments();

      const processedDocuments: Document[] = offlineDocs.map((doc) => ({
        id: doc.id,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        extracted_text: doc.extracted_text || '',
        processing_status: doc.processing_status || 'completed',
        metadata: {
          ...doc.metadata,
          is_offline: true,
          is_pending_upload: doc.metadata?.is_pending_upload || false,
        },
        storage_url: doc.storage_url,
        storage_path: undefined,
        insights: undefined,
        tags: [],
        folders: []
      }));

      console.log('📴 Loaded', processedDocuments.length, 'offline documents (including pending uploads)');
      setDocuments(processedDocuments);

      if (processedDocuments.length > 0) {
        const pendingCount = processedDocuments.filter(d => d.metadata?.is_pending_upload).length;
        if (pendingCount > 0) {
          toast({
            title: "Offline Mode",
            description: `${pendingCount} document(s) queued for upload. ${processedDocuments.length - pendingCount} cached documents available.`,
          });
        } else {
          toast({
            title: "Offline Mode",
            description: `Showing ${processedDocuments.length} cached documents`,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching offline documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDocuments = useCallback(async () => {
    // If offline, fetch from IndexedDB instead
    if (!navigator.onLine) {
      console.log('📴 Offline detected, loading from IndexedDB...');
      await fetchOfflineDocuments();
      return;
    }

    try {
      const { data: user, error: userError } = await supabase.auth.getUser();

      // If auth fails (network error), try offline mode
      if (userError || !user.user) {
        console.log('❌ Auth failed, falling back to offline mode:', userError?.message);
        await fetchOfflineDocuments();
        return;
      }

      console.log('📊 useDocuments: Fetching documents for folder:', selectedFolder);

      // If recycle bin is selected, fetch deleted documents via API
      if (selectedFolder === 'recycle-bin') {
        console.log('🗑️ Fetching deleted documents from API...');
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/v1/documents/${user.user.id}/deleted`);

        if (!response.ok) {
          throw new Error('Failed to fetch deleted documents');
        }

        const data = await response.json();
        console.log('🗑️ Deleted documents response:', data);

        const processedDocuments: Document[] = (data.documents || []).map((doc: any) => {
          const displayName = doc.file_name || doc.original_name || doc.name || doc.file_path?.split('/').pop() || 'Unknown';

          return {
            id: doc.id,
            file_name: displayName,
            file_type: doc.document_type || doc.mime_type || doc.file_type || 'unknown',
            file_size: doc.file_size || 0,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            extracted_text: doc.extracted_text || '',
            processing_status: doc.processing_status || 'completed',
            metadata: { ...doc.metadata, is_deleted: true },
            storage_url: doc.storage_url,
            storage_path: doc.storage_path,
            insights: undefined,
            tags: [],
            folders: []
          };
        });

        console.log('🗑️ Processed deleted documents:', processedDocuments.length);
        setDocuments(processedDocuments);
        return;
      }

      // Otherwise fetch regular (non-deleted) documents
      console.log('📊 useDocuments: Fetching documents. selectedFolder:', selectedFolder);

      // OPTIMIZATION: Only select needed columns (excludes extracted_text & analysis_result which can be MBs)

      // First, get document IDs that are shared with this user via external_shares
      const { data: sharedDocs } = await supabase
        .from('external_shares')
        .select('resource_id')
        .eq('guest_email', user.user.email)
        .eq('resource_type', 'document')
        .eq('status', 'accepted');

      const sharedDocIds = sharedDocs?.map(s => s.resource_id) || [];
      console.log('📤 Found', sharedDocIds.length, 'documents shared with user');

      // Build query for owned documents
      let query = supabase
        .from('documents')
        .select(DOCUMENT_SELECT_COLUMNS, { count: 'exact' })
        .or(`uploaded_by.eq.${user.user.id},user_id.eq.${user.user.id}`)
        .select('*')
        .eq('is_deleted', false);

      // Include both owned documents AND shared documents
      if (sharedDocIds.length > 0) {
        query = query.or(`uploaded_by.eq.${user.user.id},user_id.eq.${user.user.id},id.in.(${sharedDocIds.join(',')})`);
      } else {
        query = query.or(`uploaded_by.eq.${user.user.id},user_id.eq.${user.user.id}`);
      }

      // If a specific folder is selected (not 'all' or special folders), filter by folder
      if (selectedFolder && selectedFolder !== 'all' && selectedFolder !== 'media-browser' && selectedFolder !== 'recycle-bin') {
        console.log('📁 Fetching documents for specific folder:', selectedFolder);

        // OPTIMIZATION: Fetch both shortcuts and relationships in parallel
        const [shortcutsResult, relationshipsResult] = await Promise.all([
          supabase.from('document_shortcuts').select('document_id').eq('folder_id', selectedFolder),
          supabase.from('document_folder_relationships').select('document_id').eq('folder_id', selectedFolder)
        ]);

        if (shortcutsResult.error) {
          console.error('Error fetching folder shortcuts:', shortcutsResult.error);
        }
        if (relationshipsResult.error) {
          console.error('Error fetching folder relationships:', relationshipsResult.error);
        }

        // Combine document IDs using Set for deduplication
        const documentIdSet = new Set<string>();
        shortcutsResult.data?.forEach(s => documentIdSet.add(s.document_id));
        relationshipsResult.data?.forEach(r => documentIdSet.add(r.document_id));

        const documentIds = Array.from(documentIdSet);
        console.log('📁 Document IDs in folder:', documentIds.length);

        if (documentIds.length === 0) {
          setDocuments([]);
          setLoading(false);
          return;
        }

        // Filter to only show documents in this folder
        query = query.in('id', documentIds);
      }

      // OPTIMIZATION: Add pagination
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: documentsData, error, count } = await (query
        .order('created_at', { ascending: false })
        .range(from, to) as any);

      // Update pagination state
      setTotalCount(count || 0);
      setHasMore((documentsData?.length || 0) === PAGE_SIZE);

      console.log('📊 useDocuments: Query result - documents count:', documentsData?.length || 0);

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error loading documents",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // OPTIMIZATION: Only fetch folder relationships if not viewing specific folder
      // (we already know the folder when selectedFolder is set)
      let foldersByDocument: { [key: string]: any[] } = {};

      if (selectedFolder === 'all' || selectedFolder === 'media-browser') {
        const documentIds = documentsData?.map((doc: any) => doc.id) || [];

        if (documentIds.length > 0) {
          const { data: shortcuts } = await supabase
            .from('document_shortcuts')
            .select(`
              document_id,
              folder_id,
              smart_folders (
                id,
                name,
                color,
                icon,
                document_count
              )
            `)
            .in('document_id', documentIds);

          // Group folders by document ID
          shortcuts?.forEach((shortcut: any) => {
            if (!foldersByDocument[shortcut.document_id]) {
              foldersByDocument[shortcut.document_id] = [];
            }
            if (shortcut.smart_folders) {
              foldersByDocument[shortcut.document_id].push(shortcut.smart_folders);
            }
          });
        }
      }

      // Fetch restriction counts for all documents
      const allDocumentIds = documentsData?.map((doc: any) => doc.id) || [];
      let restrictionCounts: { [key: string]: number } = {};
      if (allDocumentIds.length > 0) {
        const { data: applications } = await supabase
          .from('content_rule_applications')
          .select('document_id')
          .in('document_id', allDocumentIds);

        applications?.forEach((app: any) => {
          restrictionCounts[app.document_id] = (restrictionCounts[app.document_id] || 0) + 1;
        });
      }

      // OPTIMIZATION: Only generate signed URLs for documents without original_url
      // Filter out documents with invalid or missing storage paths, and skip already-failed paths
      const docsNeedingUrls = (documentsData || []).filter((doc: any) => {
        if (!doc.storage_path || doc.original_url) return false;
        const path = doc.storage_path.trim();
        // Skip empty paths, paths that look like full URLs, and paths that already failed
        if (path.length === 0 || path.startsWith('http') || failedStoragePathsCache.has(path)) {
          return false;
        }
        return true;
      });
      const urlMap: { [key: string]: string } = {};

      if (docsNeedingUrls.length > 0) {
        // Batch URL generation (limit to 10 at a time to avoid rate limits)
        const batchSize = 10;
        for (let i = 0; i < docsNeedingUrls.length; i += batchSize) {
          const batch = docsNeedingUrls.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (doc: any) => {
              try {
                const { data, error } = await supabase.storage
                  .from('documents')
                  .createSignedUrl(doc.storage_path, 3600);

                if (!error && data?.signedUrl) {
                  urlMap[doc.id] = data.signedUrl;
                } else if (error) {
                  // Cache this path as failed to avoid repeated 400 errors
                  failedStoragePathsCache.add(doc.storage_path);
                  // Silently log instead of letting Supabase spam console
                  console.debug('⚠️ Storage path not found (cached):', doc.storage_path);
                }
              } catch (err) {
                // Cache failed paths and suppress errors to avoid console spam
                failedStoragePathsCache.add(doc.storage_path);
                console.debug('⚠️ Failed to create signed URL (cached):', doc.storage_path);
              }
            })
          );
        }
      }

      const documentsWithUrls = (documentsData || []).map((doc: any) => ({
        ...doc,
        storageUrl: doc.original_url || urlMap[doc.id] || undefined
      }));

      // Fetch document_insights to get AI analysis data for display
      const insightDocumentIds = documentsData?.map((doc: any) => doc.id) || [];
      let insightsMap: { [key: string]: any } = {};
      if (insightDocumentIds.length > 0) {
        const { data: insights } = await supabase
          .from('document_insights')
          .select('document_id, summary, key_topics, importance_score, estimated_reading_time, ai_generated_title, suggested_actions')
          .in('document_id', insightDocumentIds);

        insights?.forEach((insight: any) => {
          insightsMap[insight.document_id] = {
            summary: insight.summary || '',
            key_topics: insight.key_topics || [],
            importance_score: insight.importance_score || 0,
            ai_generated_title: insight.ai_generated_title || '',
            suggested_actions: insight.suggested_actions || []
          };
        });
      }

      const processedDocuments: Document[] = documentsWithUrls.map((doc: any) => {
        const displayName = doc.file_name || doc.original_name || doc.name || doc.file_path?.split('/').pop() || 'Unknown';

        // Get insights from document_insights table ONLY
        // We don't use analysis_result from documents table anymore
        const dbInsights = insightsMap[doc.id];
        
        // Only show insights if they exist in document_insights table (processed via "Process Now")
        const insights = dbInsights ? dbInsights : undefined;

        return {
          id: doc.id,
          file_name: displayName,
          file_type: doc.document_type || doc.mime_type || 'unknown',
          file_size: doc.file_size || 0,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
          extracted_text: '', // Loaded on-demand
          processing_status: doc.processing_status || 'pending',
          metadata: {
            ...(doc.metadata || {}),
            has_ai_insights: !!dbInsights // Track if document has insights in document_insights table
          },
          analysis_result: {}, // Loaded on-demand
          storage_url: doc.storageUrl,
          storage_path: doc.storage_path,
          insights: insights, // Now populated from document_insights table
          tags: [],
          folders: foldersByDocument[doc.id] || [],
          has_restrictions: (restrictionCounts[doc.id] || 0) > 0,
          restriction_count: restrictionCounts[doc.id] || 0
        };
      });

      console.log('📊 useDocuments: Processed documents count:', processedDocuments.length);
      console.log('📊 useDocuments: Sample document:', processedDocuments[0]);

      // Set documents immediately without waiting for IndexedDB
      setDocuments(processedDocuments);

      // OPTIMIZATION: Only check IndexedDB in background (async, non-blocking)
      getAllOfflineDocuments()
        .then(async offlineDocs => {
          let pendingUploads = offlineDocs.filter(d => d.metadata?.is_pending_upload);

          // Auto-clear stuck pending uploads older than 1 hour
          if (pendingUploads.length > 0) {
            const { clearOldPendingUploads } = await import('@/services/offlineStorage');
            const cleared = await clearOldPendingUploads(60 * 60 * 1000); // 1 hour
            if (cleared > 0) {
              // Re-fetch to get updated list
              const { getAllOfflineDocuments: refetch } = await import('@/services/offlineStorage');
              const updatedDocs = await refetch();
              pendingUploads = updatedDocs.filter(d => d.metadata?.is_pending_upload);
            }
          }

          if (pendingUploads.length > 0) {
            console.log('📤 Found', pendingUploads.length, 'pending uploads in IndexedDB');

            const pendingDocuments: Document[] = pendingUploads.map((doc) => ({
              id: doc.id,
              file_name: doc.file_name,
              file_type: doc.file_type,
              file_size: doc.file_size,
              created_at: doc.created_at,
              updated_at: doc.updated_at,
              extracted_text: doc.extracted_text || '',
              processing_status: 'pending',
              metadata: {
                ...doc.metadata,
                is_pending_upload: true,
              },
              storage_url: doc.storage_url,
              storage_path: undefined,
              insights: undefined,
              tags: [],
              folders: []
            }));

            // Prepend pending uploads to current state (do not overwrite concurrent updates)
            setDocuments(prev => [...pendingDocuments, ...prev]);
          }
        })
        .catch(err => {
          console.warn('Could not fetch pending uploads from IndexedDB:', err);
        });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching from server:', error);

      // If fetch fails (network error), try offline mode
      console.log('📴 Server fetch failed, trying offline fallback...');
      try {
        await fetchOfflineDocuments();
      } catch (offlineError) {
        console.error('Offline fallback also failed:', offlineError);
        toast({
          title: "Error",
          description: "Failed to load documents. Check your connection.",
          variant: "destructive",
        });
        setDocuments([]);
        setLoading(false);
      }
    }
  }, [toast, selectedFolder, fetchOfflineDocuments]);

  useEffect(() => {
    console.log('🔄 useDocuments: useEffect triggered, selectedFolder:', selectedFolder, 'isOffline:', !navigator.onLine);
    fetchDocuments();
  }, [fetchDocuments, selectedFolder, isOfflineMode]);

  const stats: DocumentStats = useMemo(() => {
    const totalDocs = documents.length;
    const processedDocs = documents.filter(doc => doc.processing_status === 'completed').length;
    const totalSize = documents.reduce((sum, doc) => sum + doc.file_size, 0);
    const avgImportance = totalDocs > 0
      ? documents.reduce((sum, doc) => sum + (doc.insights?.importance_score || 0), 0) / totalDocs
      : 0;

    return {
      totalDocs,
      processedDocs,
      totalSize: (totalSize / (1024 * 1024)).toFixed(1) + ' MB',
      avgImportance: (avgImportance * 100).toFixed(0) + '%'
    };
  }, [documents]);

  // Load more documents (pagination)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
  }, [loadingMore, hasMore]);

  // Reset pagination when folder changes
  useEffect(() => {
    setCurrentPage(0);
    setDocuments([]);
    setHasMore(true);
  }, [selectedFolder]);

  return {
    documents,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    stats,
    refetch: fetchDocuments,
    loadMore,
  };
}

import React, { useState, useCallback, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useSearchParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logDocumentViewed, logDocumentDownloaded } from '@/utils/auditLogger';

import { FeatureNavigation } from './components/FeatureNavigation';
import { SimplifyDriveHeader } from './components/SimplifyDriveHeader';
import { DocumentsView } from './components/DocumentsView';
import { FeatureContent } from './components/FeatureContent';
import { DocumentModals } from './components/DocumentModals';
import { DocumentChatbot } from '../document-manager/DocumentChatbot';
import { DocumentViewer } from '../document-manager/DocumentViewer';
import { PolicyDocumentDetector } from '../retention/PolicyDocumentDetector';
import {
  OfflineDocumentsPanel,
  SyncStatusDialog
} from '../offline';
import { SyncNotificationDialog } from '../offline/SyncNotificationDialog';
import { useDocuments } from './hooks/useDocuments';
import { useDocumentFiltering } from './hooks/useDocumentFiltering';
import { useQuickAccess } from '@/hooks/useQuickAccess';
import type { Document, ViewMode, SortOrder } from './types';

export function SimplifyDrive() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Documents & filtering
  const [selectedFolder, setSelectedFolder] = useState('all');
  const { documents, loading, stats, refetch } = useDocuments({ selectedFolder });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  console.log('🔍 SimplifyDrive: documents count:', documents.length, 'selectedFolder:', selectedFolder);

  const { filteredDocuments } = useDocumentFiltering({
    documents,
    searchQuery,
    selectedFolder,
    selectedTag,
    sortBy,
    sortOrder,
  });

  // UI State
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('simplify_drive_view_mode', 'grid');
  const [activeFeature, setActiveFeature] = useState('documents');
  const [aiInsightsEnabled, setAiInsightsEnabled] = useState(true);

  // Handle URL parameters for feature switching
  useEffect(() => {
    const feature = searchParams.get('feature');
    if (feature) {
      setActiveFeature(feature);
    }
  }, [searchParams]);

  // Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showShortcutDialog, setShowShortcutDialog] = useState(false);
  const [shortcutDocument, setShortcutDocument] = useState<Document | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryDocument, setSummaryDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  // Chatbot State
  const [showChatbot, setShowChatbot] = useState(true);
  const [chatbotMinimized, setChatbotMinimized] = useState(true);

  // Offline State
  const [showOfflinePanel, setShowOfflinePanel] = useState(false);
  const [showSyncDialog, setShowSyncDialog] = useState(false);

  // Policy Detection State (lifted from EnhancedDocumentUpload to persist after upload modal closes)
  const [policyDocumentId, setPolicyDocumentId] = useState<string | null>(null);
  const [policyDocumentName, setPolicyDocumentName] = useState<string | null>(null);

  const { toast } = useToast();
  const {
    status: offlineStatus,
    syncPendingChanges,
    getPendingUploadsData,
    syncSelectedUploads,
    closeSyncDialog,
  } = useOfflineMode();
  const { trackAccess } = useQuickAccess();

  // Handle legal hold filter from navigation state
  useEffect(() => {
    const state = (location as any).state as { legalHoldId?: string; legalHoldName?: string };
    if (state?.legalHoldId) {
      setActiveFeature('documents');
      // Fetch documents under this legal hold
      const fetchLegalHoldDocuments = async () => {
        try {
          console.log('Fetching documents for legal hold:', state.legalHoldId);
          
          // First, get the legal hold details to find document IDs
          const { data: holdData, error: holdError } = await supabase
            .from('legal_holds')
            .select('document_ids, scope, scope_details')
            .eq('id', state.legalHoldId)
            .single();

          console.log('Legal hold data:', holdData);

          if (holdError) {
            console.error('Error fetching legal hold:', holdError);
            toast({
              title: "Error",
              description: "Failed to fetch legal hold details",
              variant: "destructive",
            });
            return;
          }

          let documentIds: string[] = [];

          // Check document_ids array first
          if (holdData?.document_ids && holdData.document_ids.length > 0) {
            documentIds = holdData.document_ids;
          }
          // Then check scope_details
          else if (holdData?.scope_details) {
            const scopeDetails = typeof holdData.scope_details === 'string' 
              ? JSON.parse(holdData.scope_details) 
              : holdData.scope_details;
            
            if (scopeDetails?.document_ids?.length > 0) {
              documentIds = scopeDetails.document_ids;
            }
          }

          // Also check document_retention_status for documents linked to this hold
          const { data: retentionStatuses, error: retentionError } = await supabase
            .from('document_retention_status')
            .select('document_id, legal_hold_ids')
            .not('legal_hold_ids', 'is', null);

          if (!retentionError && retentionStatuses) {
            const additionalDocIds = retentionStatuses
              .filter(s => {
                const holdIds = s.legal_hold_ids || [];
                return Array.isArray(holdIds) && holdIds.includes(state.legalHoldId);
              })
              .map(s => s.document_id);
            
            // Merge without duplicates
            documentIds = [...new Set([...documentIds, ...additionalDocIds])];
          }

          console.log('All document IDs for legal hold:', documentIds);

          if (documentIds.length > 0) {
            setSearchQuery(`legal_hold:${state.legalHoldId}:${documentIds.join(',')}`);
            toast({
              title: "Filtered by Legal Hold",
              description: `Showing ${documentIds.length} document(s) under: ${state.legalHoldName || 'Legal Hold'}`,
            });
          } else {
            toast({
              title: "No Documents Found",
              description: `No documents are currently under: ${state.legalHoldName || 'Legal Hold'}`,
            });
          }
        } catch (error) {
          console.error('Error loading legal hold documents:', error);
          toast({
            title: "Error",
            description: "Failed to load legal hold documents",
            variant: "destructive",
          });
        }
      };

      fetchLegalHoldDocuments();
      // Clear the state after using it
      window.history.replaceState({}, document.title);
    }
  }, [location, toast]);

  // Handle document deep link from email notifications
  useEffect(() => {
    const documentId = searchParams.get('document');
    if (documentId && documents.length > 0) {
      const doc = documents.find(d => d.id === documentId);
      if (doc) {
        setActiveFeature('documents'); // Switch to documents tab
        setSelectedDocument(doc);
        setShowDocumentViewer(true);
      }
    }
  }, [searchParams, documents]);

  // Pending uploads state
  const [pendingUploads, setPendingUploads] = useState<any[]>([]);

  // Track active uploads for processing banner
  const [activeUploadsCount, setActiveUploadsCount] = useState(0);

  // Auto-refresh documents while actively processing or uploading
  // OPTIMIZED: Increased interval from 2s to 5s to reduce database load
  // A typical document takes 60-90 seconds to process, so 5s polling is sufficient
  React.useEffect(() => {
    const hasProcessingDocs = documents.some(doc =>
      doc.processing_status === 'processing'
    );

    if (hasProcessingDocs || activeUploadsCount > 0) {
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Refresh every 5 seconds (was 2 seconds - too frequent)

      return () => clearInterval(interval);
    }
  }, [documents, refetch, activeUploadsCount]);

  // Load pending uploads when sync dialog should show
  React.useEffect(() => {
    if (offlineStatus.showSyncDialog) {
      getPendingUploadsData().then(setPendingUploads);
    }
  }, [offlineStatus.showSyncDialog, getPendingUploadsData]);

  // Handle sync all pending documents
  const handleSyncAll = useCallback(async () => {
    try {
      const uploads = await getPendingUploadsData();
      if (uploads.length === 0) {
        toast({
          title: "No pending uploads",
          description: "All documents are already synced",
        });
        return;
      }

      // Get all upload IDs
      const allIds = uploads.map(u => u.id);

      // Sync all
      await syncSelectedUploads(allIds);

      // Refetch documents
      refetch();

      toast({
        title: "Sync complete",
        description: `${uploads.length} document(s) synced successfully`,
      });
    } catch (error) {
      console.error('Sync all failed:', error);
      toast({
        title: "Sync failed",
        description: "Failed to sync documents",
        variant: "destructive",
      });
    }
  }, [getPendingUploadsData, syncSelectedUploads, refetch, toast]);

  // Listen for document changes and refetch
  React.useEffect(() => {
    const handleDocumentsChanged = () => {
      console.log('📡 Documents changed event received, refetching...');
      refetch();
    };

    // Listen for upload started/completed events
    const handleUploadStarted = (event: CustomEvent) => {
      const count = event.detail?.count || 1;
      console.log('📤 Upload started:', count);
      setActiveUploadsCount(prev => prev + count);
    };

    const handleUploadCompleted = (event: CustomEvent) => {
      const count = event.detail?.count || 1;
      console.log('✅ Upload completed:', count);
      setActiveUploadsCount(prev => Math.max(0, prev - count));
      refetch();
    };

    // Listen for preview-document event from Access Rules panel
    const handlePreviewDocument = (event: CustomEvent) => {
      const documentId = event.detail?.documentId;
      if (documentId) {
        console.log('👁️ Preview document requested:', documentId);
        // Find the document in our documents array
        const doc = documents.find(d => d.id === documentId);
        if (doc) {
          setSelectedDocument(doc);
          setShowDocumentViewer(true);
        } else {
          console.warn('Document not found:', documentId);
        }
      }
    };

    // Listen for policy document detection event (from EnhancedDocumentUpload)
    const handlePolicyDocumentDetected = (event: CustomEvent) => {
      const { documentId, documentName } = event.detail || {};
      if (documentId) {
        console.log('📋 Policy document detected event received:', documentId, documentName);
        setPolicyDocumentId(documentId);
        setPolicyDocumentName(documentName);
      }
    };

    window.addEventListener('documents-changed', handleDocumentsChanged);
    window.addEventListener('upload-started', handleUploadStarted as EventListener);
    window.addEventListener('upload-completed', handleUploadCompleted as EventListener);
    window.addEventListener('preview-document', handlePreviewDocument as EventListener);
    window.addEventListener('policy-document-detected', handlePolicyDocumentDetected as EventListener);

    return () => {
      window.removeEventListener('documents-changed', handleDocumentsChanged);
      window.removeEventListener('upload-started', handleUploadStarted as EventListener);
      window.removeEventListener('upload-completed', handleUploadCompleted as EventListener);
      window.removeEventListener('preview-document', handlePreviewDocument as EventListener);
      window.removeEventListener('policy-document-detected', handlePolicyDocumentDetected as EventListener);
    };
  }, [refetch, documents]);

  // Handlers
  const handleDocumentProcessed = useCallback((_documentId: string) => {
    setShowUploadModal(false);
    refetch();
    toast({
      title: "Document uploaded successfully",
      description: "Your document has been processed and organized automatically. Matching workflows will start automatically.",
    });

    // The backend WorkflowTriggerService automatically handles workflow matching and starting
    // No need to show manual workflow suggestion dialog

  }, [refetch, toast]);

  const handleViewDocument = useCallback((doc: Document) => {
    setSelectedDocument(doc);
    setShowDocumentViewer(true);
    // Track document access for quick access feature
    trackAccess(doc.id);
    // Log audit event
    logDocumentViewed(doc.id, doc.file_name);
  }, [trackAccess]);

  const handleDownloadDocument = useCallback((doc: Document) => {
    const downloadUrl = doc.storage_url || doc.storage_path;
    if (downloadUrl) {
      // Create a temporary anchor element to trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Log audit event
      logDocumentDownloaded(doc.id, doc.file_name);

      toast({
        title: "Download started",
        description: `Downloading ${doc.file_name}`,
      });
    } else {
      toast({
        title: "Download failed",
        description: "No storage URL found for this document",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCreateShortcut = useCallback((doc: Document) => {
    setShortcutDocument(doc);
    setShowShortcutDialog(true);
  }, []);

  const handleGenerateSummary = useCallback((doc: Document) => {
    setSummaryDocument(doc);
    setShowSummaryDialog(true);
  }, []);

  const handleUploadScannedPages = useCallback(async (pages: any[]) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      // Get AI options from the first page (they're all the same)
      const enableRAG = pages[0]?.enableRAG || false;
      const enableClassification = pages[0]?.enableClassification || false;
      const customFileName = pages[0]?.customFileName;

      // Set active uploads count to show processing banner immediately
      setActiveUploadsCount(pages.length);

      toast({
        title: "Uploading documents...",
        description: `${pages.length} document(s) being processed${enableRAG ? ' with RAG indexing' : ''}`,
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Convert object URL or data URL to blob
        const response = await fetch(page.fullImage);
        const blob = await response.blob();

        // Use custom file name if provided
        const finalFileName = pages.length === 1
          ? `${customFileName || 'scanned'}.pdf`
          : `${customFileName || 'scanned'}_page${i + 1}.pdf`;

        // If RAG or classification is enabled, use backend processing
        if (enableRAG || enableClassification) {
          try {
            // Convert blob to base64
            const reader = new FileReader();
            const fileBase64 = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            // Use the same endpoint as regular upload
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

            const analysisResponse = await fetch(`${backendUrl}/api/v1/analyze-document`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentData: fileBase64,
                documentName: finalFileName,
                task: 'without_template_extraction',
                userId: user.data.user.id,
                saveToDatabase: true,
                yoloSignatureEnabled: false,
                yoloFaceEnabled: false,
                metadata: {
                  source: 'scanner',
                  page_number: page.pageNumber,
                  rotation: page.rotation,
                }
              }),
            });

            if (!analysisResponse.ok) {
              throw new Error('Backend processing failed');
            }

            console.log(`Scanned page ${i + 1} processed and saved via backend`);

            // Update active uploads count as each completes
            setActiveUploadsCount(prev => Math.max(0, prev - 1));

            // Refetch after each upload completes to show new document
            refetch();
          } catch (e) {
            console.error('Backend processing failed:', e);
            setActiveUploadsCount(prev => Math.max(0, prev - 1));
            throw e;
          }
        } else {
          // Simple upload without AI processing
          const file = new File([blob], finalFileName, { type: blob.type || 'application/pdf' });
          const storagePath = `${user.data.user.id}/${Date.now()}_${finalFileName}`;

          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, file);

          if (uploadError) {
            setActiveUploadsCount(prev => Math.max(0, prev - 1));
            throw uploadError;
          }

          const { error: insertError } = await supabase
            .from('documents')
            .insert({
              user_id: user.data.user.id,
              file_name: finalFileName,
              file_type: blob.type || 'application/pdf',
              file_size: file.size,
              storage_path: storagePath,
              processing_status: 'completed',
              metadata: {
                source: 'scanner',
                page_number: page.pageNumber,
                rotation: page.rotation,
              }
            } as any);

          if (insertError) {
            setActiveUploadsCount(prev => Math.max(0, prev - 1));
            throw insertError;
          }

          // Update count and refetch
          setActiveUploadsCount(prev => Math.max(0, prev - 1));
          refetch();
        }
      }

      // Ensure uploads count is reset
      setActiveUploadsCount(0);

      // Final refetch to ensure all documents are shown
      refetch();

      toast({
        title: "Upload complete!",
        description: `${pages.length} document(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Failed to upload scanned documents:', error);
      setActiveUploadsCount(0);
      throw error;
    }
  }, [refetch, toast]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    );
  }

  const isDocumentsView = activeFeature === 'documents';

  // Check for actively processing documents (only 'processing' status, not 'pending')
  // 'pending' is the default status for all documents, so we only show banner for actual active processing
  const processingDocs = documents.filter(doc =>
    doc.processing_status === 'processing'
  );

  // Total processing count: backend processing + active uploads
  const totalProcessingCount = processingDocs.length + activeUploadsCount;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Feature Navigation */}
      <FeatureNavigation
        activeFeature={activeFeature}
        onFeatureChange={setActiveFeature}
      />

      {/* Processing Indicator Banner */}
      {isDocumentsView && totalProcessingCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>
              Processing {totalProcessingCount} document{totalProcessingCount > 1 ? 's' : ''} in the background...
            </span>
          </div>
        </div>
      )}

      {/* Header - Only show on documents view */}
      {isDocumentsView && (
        <SimplifyDriveHeader
          stats={stats}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          aiInsightsEnabled={aiInsightsEnabled}
          onAiInsightsToggle={() => setAiInsightsEnabled(!aiInsightsEnabled)}
          onUpload={() => setShowUploadModal(true)}
          onScan={() => setShowScannerModal(true)}
          onChatbot={() => setShowChatbot(true)}
          onOfflinePanel={() => setShowOfflinePanel(true)}
          onSync={handleSyncAll}
          isOnline={offlineStatus.isOnline}
          offlineCount={offlineStatus.offlineDocumentCount}
          pendingSyncCount={offlineStatus.pendingUploadCount}
          isSyncing={offlineStatus.isSyncing}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {isDocumentsView ? (
          <DocumentsView
            documents={filteredDocuments}
            viewMode={viewMode}
            aiInsightsEnabled={aiInsightsEnabled}
            selectedFolder={selectedFolder}
            onFolderSelect={(folderId) => {
              console.log('📁 SimplifyDrive: Folder selected:', folderId);
              setSelectedFolder(folderId);
            }}
            onDocumentClick={handleViewDocument}
            onRefresh={refetch}
          />
        ) : (
          <FeatureContent
            activeFeature={activeFeature}
            documents={documents}
            onViewDocument={handleViewDocument}
            onDownloadDocument={handleDownloadDocument}
          />
        )}
      </div>

      {/* Modals */}
      <DocumentModals
        showUploadModal={showUploadModal}
        onCloseUploadModal={() => setShowUploadModal(false)}
        onDocumentProcessed={handleDocumentProcessed}
        showScannerModal={showScannerModal}
        onCloseScannerModal={() => setShowScannerModal(false)}
        onUploadScannedPages={handleUploadScannedPages}
        showShortcutDialog={showShortcutDialog}
        onCloseShortcutDialog={() => setShowShortcutDialog(false)}
        shortcutDocument={shortcutDocument}
        showSummaryDialog={showSummaryDialog}
        onCloseSummaryDialog={() => setShowSummaryDialog(false)}
        summaryDocument={summaryDocument}
      />

      {/* RAG AI Chatbot - Fixed position */}
      {showChatbot && (
        <DocumentChatbot
          onClose={() => setShowChatbot(false)}
          isMinimized={chatbotMinimized}
          onToggleMinimize={() => setChatbotMinimized(!chatbotMinimized)}
        />
      )}

      {/* Document Viewer Dialog */}
      <DocumentViewer
        document={selectedDocument}
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
      />

      {/* Offline Documents Panel */}
      <OfflineDocumentsPanel
        isOpen={showOfflinePanel}
        onClose={() => setShowOfflinePanel(false)}
      />

      {/* Sync Status Dialog */}
      <SyncStatusDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
      />

      {/* Sync Notification Dialog */}
      <SyncNotificationDialog
        open={offlineStatus.showSyncDialog}
        onOpenChange={closeSyncDialog}
        pendingUploads={pendingUploads}
        onSync={syncSelectedUploads}
        onDismiss={closeSyncDialog}
      />

      {/* Policy Document Detector - lifted from EnhancedDocumentUpload to persist after upload modal closes */}
      <PolicyDocumentDetector
        documentId={policyDocumentId}
        documentName={policyDocumentName}
        onClose={() => {
          setPolicyDocumentId(null);
          setPolicyDocumentName(null);
        }}
        onPoliciesCreated={(policyIds) => {
          toast({
            title: 'Retention Policies Created',
            description: `${policyIds.length} policy(s) created from the document.`,
          });
        }}
      />
    </div>
  );
}

import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import {
  FileText,
  Eye,
  Download,
  Share,
  MoreHorizontal,
  Star,
  Clock,
  Brain,
  Tag,
  Folder,
  Sparkles,
  Pin,
  Lock,
  UserMinus,
  Trash2,
  FolderPlus,
  CloudOff,
  CloudDownload,
  RotateCcw,
  Edit,
  File,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  Shield,
  CheckCircle2,
  Circle,
  CloudUpload,
  Presentation
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { StarButton } from '@/components/favorites/StarButton';
import { useQuickAccess } from '@/hooks/useQuickAccess';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckOutDialog } from '@/components/checkinout/CheckOutDialog';
import { TransferOwnershipDialog } from '@/components/ownership/TransferOwnershipDialog';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { MoveToFolderDialog } from './MoveToFolderDialog';
import { DocumentEditorModal } from './DocumentEditorModal';
import { ApplyComplianceLabelDialog } from '@/components/compliance/ApplyComplianceLabelDialog';
import { useDocumentRestrictions } from '@/hooks/useDocumentRestrictions';
import { logDocumentDownloaded, logDocumentDeleted } from '@/utils/auditLogger';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  extracted_text: string;
  processing_status: string;
  metadata: any;
  storage_url?: string;
  storage_path?: string;
  insights?: DocumentInsight;
  analysis_result?: any;
  tags?: DocumentTag[];
  folders?: SmartFolder[];
  has_restrictions?: boolean;
}

interface DocumentInsight {
  summary: string;
  key_topics: string[];
  importance_score: number;
  estimated_reading_time: number;
  ai_generated_title: string;
  suggested_actions: string[];
}

interface DocumentTag {
  id: string;
  name: string;
  is_ai_suggested: boolean;
  confidence_score: number;
}

interface SmartFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  document_count: number;
}

interface DocumentGridProps {
  documents: Document[];
  onDocumentClick: (document: Document) => void;
  onRefresh?: () => void;
  onNavigateToShare?: () => void;
}

export const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onDocumentClick,
  onRefresh,
  onNavigateToShare
}) => {
  const { toast } = useToast();
  const { pinDocument, unpinDocument, isPinned } = useQuickAccess();
  const { makeDocumentAvailableOffline, isDocumentOffline, removeDocumentFromOffline } = useOfflineMode();
  const { getDocumentRestrictions } = useDocumentRestrictions();

  // Helper function to check if document has been processed with AI
  // Returns true if the document has AI insights in document_insights table
  const hasAIAnalysis = (doc: Document): boolean => {
    // Check if document has AI insights (from document_insights table)
    return !!(doc.metadata as any)?.has_ai_insights;
  };

  // Check Out and Transfer Dialog states
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [offlineDocIds, setOfflineDocIds] = useState<Set<string>>(new Set());
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Delete confirmation dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [focusedDocumentId, setFocusedDocumentId] = useState<string | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [draggingDocument, setDraggingDocument] = useState<Document | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Handle drag start for document cards
  const handleDragStart = (e: DragEvent<HTMLDivElement>, document: Document) => {
    setDraggingDocument(document);
    e.dataTransfer.setData('application/json', JSON.stringify({
      documentId: document.id,
      documentName: document.file_name
    }));
    e.dataTransfer.effectAllowed = 'move';

    // Create custom drag image
    const dragPreview = globalThis.document.createElement('div');
    dragPreview.className = 'bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 text-sm font-medium';
    dragPreview.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
      <span>${document.file_name.length > 25 ? document.file_name.substring(0, 25) + '...' : document.file_name}</span>
    `;
    dragPreview.style.position = 'absolute';
    dragPreview.style.top = '-1000px';
    dragPreview.style.left = '-1000px';
    dragPreview.style.zIndex = '9999';
    globalThis.document.body.appendChild(dragPreview);

    e.dataTransfer.setDragImage(dragPreview, 20, 20);

    // Clean up the preview element after a short delay
    setTimeout(() => {
      globalThis.document.body.removeChild(dragPreview);
    }, 0);

    // Add visual feedback to the original element
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    setDraggingDocument(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
    }
  };

  // Handle edit document
  const handleEdit = (document: Document) => {
    setSelectedDocument(document);
    setShowEditorModal(true);
  };

  // Check which documents are available offline
  React.useEffect(() => {
    const checkOfflineStatus = async () => {
      const offlineIds = new Set<string>();
      for (const doc of documents) {
        const isOffline = await isDocumentOffline(doc.id);
        if (isOffline) offlineIds.add(doc.id);
      }
      setOfflineDocIds(offlineIds);
    };
    checkOfflineStatus();
  }, [documents, isDocumentOffline]);

  // Keyboard delete handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete key is pressed and documents are selected
      if (event.key === 'Delete' && selectedDocuments.size > 0) {
        const document = documents.find(d => selectedDocuments.has(d.id));
        if (document) {
          event.preventDefault();
          initiateDelete(document);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDocuments, documents]);

  const initiateDelete = (document: Document) => {
    setDocumentToDelete(document);
    if ((document.metadata as any)?.is_deleted) {
      // If already in recycle bin, show permanent delete confirmation
      setShowPermanentDeleteDialog(true);
    } else {
      // Show regular delete confirmation
      setShowDeleteDialog(true);
    }
  };

  const handleMakeOffline = async (document: Document) => {
    const success = await makeDocumentAvailableOffline(document);
    if (success) {
      setOfflineDocIds(prev => new Set([...prev, document.id]));
    }
  };

  const handleRemoveOffline = async (document: Document) => {
    const success = await removeDocumentFromOffline(document.id);
    if (success) {
      setOfflineDocIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };

  const handleMoveToFolder = (document: Document) => {
    setSelectedDocument(document);
    setMoveDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      toast({
        title: "Moved to recycle bin",
        description: `${documentToDelete.file_name} has been moved to recycle bin`,
      });

      setShowDeleteDialog(false);
      setDocumentToDelete(null);
      setSelectedDocuments(new Set());

      // Emit event to refresh folder counts
      window.dispatchEvent(new CustomEvent('document-deleted'));

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Could not delete the document",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async (document: Document) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/documents/${document.id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Restore failed');

      toast({
        title: "Document restored",
        description: `${document.file_name} has been restored`,
      });

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: "Restore failed",
        description: "Could not restore the document",
        variant: "destructive"
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/documents/${documentToDelete.id}/permanent`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Permanent delete failed');

      toast({
        title: "Document permanently deleted",
        description: `${documentToDelete.file_name} has been permanently deleted`,
      });

      setShowPermanentDeleteDialog(false);
      setDocumentToDelete(null);
      setSelectedDocuments(new Set());

      // Emit event to refresh folder counts
      window.dispatchEvent(new CustomEvent('document-deleted'));

      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Permanent delete error:', error);
      toast({
        title: "Delete failed",
        description: "Could not permanently delete the document",
        variant: "destructive"
      });
    }
  };

  const handleView = (document: Document) => {
    // Trigger the parent click handler which opens the modal viewer
    onDocumentClick(document);
  };

  const handleDownload = async (document: Document) => {
    try {
      // Check for download restrictions
      if (document.has_restrictions) {
        const restrictions = await getDocumentRestrictions(document.id);
        if (restrictions.restrictDownload) {
          toast({
            title: "Download Restricted",
            description: `This document has download restrictions applied. Rules: ${restrictions.matchedRules.join(', ')}`,
            variant: "destructive"
          });
          return;
        }
      }

      if (document.storage_url) {
        // Create download link directly from storage URL
        const response = await fetch(document.storage_url);
        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = globalThis.document.createElement('a');
        a.href = url;
        a.download = document.file_name;
        globalThis.document.body.appendChild(a);
        a.click();
        globalThis.document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Download started",
          description: `Downloading ${document.file_name}`,
        });

        // Log document download to audit trail
        logDocumentDownloaded(document.id, document.file_name);
      } else {
        throw new Error("Storage URL not found");
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Could not download the document",
        variant: "destructive"
      });
    }
  };

  const handleShare = async (document: Document) => {
    try {
      // Check for share restrictions
      if (document.has_restrictions) {
        const restrictions = await getDocumentRestrictions(document.id);
        if (restrictions.restrictShare || restrictions.restrictExternalShare) {
          toast({
            title: "Sharing Restricted",
            description: `This document has sharing restrictions applied. Rules: ${restrictions.matchedRules.join(', ')}`,
            variant: "destructive"
          });
          return;
        }
      }

      if (onNavigateToShare) {
        onNavigateToShare();
        return;
      }

      if (document.storage_url) {
        await navigator.clipboard.writeText(document.storage_url);
        toast({
          title: "Link copied",
          description: "Document link copied to clipboard",
        });
      } else {
        throw new Error("No shareable link available");
      }
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not copy document link",
        variant: "destructive"
      });
    }
  };
  const getFileIcon = (fileType: string, fileName?: string) => {
    // Combine file type and file name for better detection
    const type = fileType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';
    const combined = `${type} ${name}`;
    const iconClass = "w-5 h-5"; // Reduced from w-8 h-8

    // PDF
    if (combined.includes('pdf')) {
      return <FileText className={`${iconClass} text-red-500`} />;
    }

    // Word documents
    if (combined.includes('word') || combined.includes('docx') || combined.includes('.doc') || type.includes('msword') || type.includes('officedocument.wordprocessing')) {
      return <FileText className={`${iconClass} text-blue-600`} />;
    }

    // Excel/Spreadsheets
    if (combined.includes('excel') || combined.includes('spreadsheet') || combined.includes('xls') || combined.includes('csv') || type.includes('officedocument.spreadsheet')) {
      return <FileSpreadsheet className={`${iconClass} text-green-600`} />;
    }

    // PowerPoint
    if (combined.includes('powerpoint') || combined.includes('presentation') || combined.includes('ppt') || type.includes('officedocument.presentation')) {
      return <Presentation className={`${iconClass} text-orange-600`} />;
    }

    // Images
    if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.svg') || name.endsWith('.webp')) {
      return <FileImage className={`${iconClass} text-purple-500`} />;
    }

    // Videos
    if (type.includes('video') || name.endsWith('.mp4') || name.endsWith('.avi') || name.endsWith('.mov') || name.endsWith('.mkv')) {
      return <FileVideo className={`${iconClass} text-pink-500`} />;
    }

    // Audio
    if (type.includes('audio') || name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a')) {
      return <FileAudio className={`${iconClass} text-indigo-500`} />;
    }

    // Archives
    if (combined.includes('zip') || combined.includes('rar') || combined.includes('7z') || combined.includes('tar') || type.includes('compressed')) {
      return <FileArchive className={`${iconClass} text-yellow-600`} />;
    }

    // Code files
    if (name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.json') || name.endsWith('.html') || name.endsWith('.css') || name.endsWith('.py') || type.includes('javascript') || type.includes('json')) {
      return <FileCode className={`${iconClass} text-cyan-600`} />;
    }

    // Text files
    if (type.includes('text/plain') || name.endsWith('.txt')) {
      return <File className={`${iconClass} text-gray-500`} />;
    }

    // Default
    return <FileText className={`${iconClass} text-blue-500`} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getImportanceColor = (score: number) => {
    if (score >= 0.8) return 'text-red-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-4" ref={gridRef}>
      {/* Bulk Action Bar */}
      {selectedDocuments.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex-1">
            <span className="text-sm font-semibold text-blue-900">{selectedDocuments.size} selected</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const doc = documents.find(d => selectedDocuments.has(d.id));
              if (doc) {
                const starred = isPinned(doc.id);
                selectedDocuments.forEach(docId => {
                  const document = documents.find(d => d.id === docId);
                  if (document) {
                    if (starred) {
                      unpinDocument(document.id);
                    } else {
                      pinDocument(document.id);
                    }
                  }
                });
              }
            }}
            className="text-amber-600 hover:text-amber-700"
          >
            <Star className="w-4 h-4 mr-1" />
            Favorite
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const firstDoc = documents.find(d => selectedDocuments.has(d.id));
              if (firstDoc) handleDownload(firstDoc);
            }}
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const firstDoc = documents.find(d => selectedDocuments.has(d.id));
              if (firstDoc) handleMoveToFolder(firstDoc);
            }}
          >
            <FolderPlus className="w-4 h-4 mr-1" />
            Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const firstDoc = documents.find(d => selectedDocuments.has(d.id));
              if (firstDoc) initiateDelete(firstDoc);
            }}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDocuments(new Set())}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {documents.map(document => (
          <ContextMenu key={document.id}>
            <ContextMenuTrigger asChild>
              <Card
                className={`group hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-grab active:cursor-grabbing border-slate-200 ${selectedDocuments.has(document.id) ? 'border-primary ring-1 ring-primary bg-primary/5' : 'bg-white hover:border-slate-300'
                  } ${draggingDocument?.id === document.id ? 'opacity-50 scale-95' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, document)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDocuments(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(document.id)) {
                      newSet.delete(document.id);
                    } else {
                      newSet.add(document.id);
                    }
                    return newSet;
                  });
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onDocumentClick(document);
                }}
                tabIndex={0}
              >
                <CardContent className="p-3">
                  {/* Checkbox */}
                  <div className="absolute top-3 left-3 z-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocuments(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(document.id)) {
                            newSet.delete(document.id);
                          } else {
                            newSet.add(document.id);
                          }
                          return newSet;
                        });
                      }}
                      className="text-primary hover:text-primary/80 transition-colors"
                    >
                      {selectedDocuments.has(document.id) ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                      )}
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-2 pl-7">
                    <div className="flex items-center gap-2">
                      {getFileIcon(document.file_type, document.file_name)}
                      {document.insights && (
                        <div className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-blue-500" />
                          <Star
                            className={`w-3 h-3 ${getImportanceColor(document.insights.importance_score)}`}
                            fill="currentColor"
                          />
                        </div>
                      )}
                      {document.has_restrictions && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 px-1 font-bold">
                                <Shield className="w-2.5 h-2.5 mr-0.5" />
                                R
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Access restrictions applied by rules</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Star/Favorite Button */}
                      <StarButton
                        documentId={document.id}
                        size="sm"
                      />

                      {/* Pin to Quick Access Button */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isPinned(document.id)) {
                                  unpinDocument(document.id);
                                } else {
                                  pinDocument(document.id);
                                }
                              }}
                            >
                              <Pin
                                className={`w-3.5 h-3.5 transition-all ${isPinned(document.id)
                                  ? 'text-primary fill-primary rotate-45'
                                  : 'text-muted-foreground hover:text-primary'
                                  }`}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isPinned(document.id) ? 'Unpin from Quick Access' : 'Pin to Quick Access'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onDocumentClick(document);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {(document.metadata as any)?.is_deleted ? (
                            // Recycle bin options
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(document);
                              }}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiateDelete(document);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Permanently
                              </DropdownMenuItem>
                            </>
                          ) : (
                            // Normal options
                            <>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(document);
                              }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(document);
                              }}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleShare(document);
                              }}>
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleMoveToFolder(document);
                              }}>
                                <FolderPlus className="w-4 h-4 mr-2" />
                                Move to Folder
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(document);
                                setShowCheckOutDialog(true);
                              }}>
                                <Lock className="w-4 h-4 mr-2" />
                                Check Out
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(document);
                                setShowTransferDialog(true);
                              }}>
                                <UserMinus className="w-4 h-4 mr-2" />
                                Transfer Ownership
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDocument(document);
                                setShowComplianceDialog(true);
                              }}>
                                <Shield className="w-4 h-4 mr-2" />
                                Compliance Labels
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {/* Offline options */}
                              {offlineDocIds.has(document.id) ? (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveOffline(document);
                                }}>
                                  <CloudOff className="w-4 h-4 mr-2" />
                                  Remove from Offline
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleMakeOffline(document);
                                }}>
                                  <CloudDownload className="w-4 h-4 mr-2" />
                                  Make Available Offline
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  initiateDelete(document);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-sm truncate leading-tight" title={document.file_name}>
                      {document.insights?.ai_generated_title || document.file_name}
                    </h3>
                    {document.insights?.ai_generated_title && document.file_name !== document.insights?.ai_generated_title && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {document.file_name}
                      </p>
                    )}
                  </div>

                  {/* AI Summary */}
                  {document.insights?.summary && (
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {document.insights.summary}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {document.tags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[10px] h-4 px-1 flex items-center gap-0.5"
                        >
                          {tag.is_ai_suggested && <Sparkles className="w-2 h-2" />}
                          {tag.name}
                        </Badge>
                      ))}
                      {document.tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          +{document.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Folders */}
                  {document.folders && document.folders.length > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Folder className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground truncate">
                        {document.folders[0].name}
                        {document.folders.length > 1 && ` +${document.folders.length - 1}`}
                      </span>
                    </div>
                  )}

                  {/* Key Topics */}
                  {document.insights?.key_topics && document.insights.key_topics.length > 0 && (
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-1">
                        {document.insights.key_topics.slice(0, 2).map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground border-slate-200">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                      </div>
                      <span className="text-slate-300">•</span>
                      <span>{formatFileSize(document.file_size)}</span>
                    </div>
                  </div>

                  {/* Processing Status */}
                  {(document.metadata as any)?.is_pending_upload ? (
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] h-5 w-full justify-center text-orange-600 border-orange-200 bg-orange-50"
                      >
                        <CloudUpload className="w-3 h-3 mr-1" />
                        Queued
                      </Badge>
                    </div>
                  ) : document.processing_status && document.processing_status !== 'completed' ? (
                    <div className="mt-2">
                      <Badge
                        variant={
                          document.processing_status === 'processing' ? 'secondary' :
                            document.processing_status === 'pending' ? 'outline' :
                              'destructive'
                        }
                        className="text-[10px] h-5 w-full justify-center"
                      >
                        {document.processing_status === 'processing' ? 'Processing...' :
                          document.processing_status === 'pending' ? 'Pending' :
                            'Failed'}
                      </Badge>
                    </div>
                  ) : document.processing_status !== 'failed' && !hasAIAnalysis(document) && (
                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-slate-400">Analysis Pending</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ContextMenuTrigger>

            {/* Right-click context menu - Full menu matching dropdown */}
            <ContextMenuContent className="w-56">
              <ContextMenuItem onClick={() => onDocumentClick(document)}>
                <Eye className="w-4 h-4 mr-2" />
                View
              </ContextMenuItem>
              {(document.metadata as any)?.is_deleted ? (
                // Recycle bin context menu
                <>
                  <ContextMenuItem onClick={() => handleRestore(document)}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => initiateDelete(document)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Permanently
                  </ContextMenuItem>
                </>
              ) : (
                // Normal context menu - Complete menu
                <>
                  <ContextMenuItem onClick={() => handleEdit(document)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleDownload(document)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleShare(document)}>
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleMoveToFolder(document)}>
                    <FolderPlus className="w-4 h-4 mr-2" />
                    Move to Folder
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => {
                    setSelectedDocument(document);
                    setShowCheckOutDialog(true);
                  }}>
                    <Lock className="w-4 h-4 mr-2" />
                    Check Out
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setSelectedDocument(document);
                    setShowTransferDialog(true);
                  }}>
                    <UserMinus className="w-4 h-4 mr-2" />
                    Transfer Ownership
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => {
                    setSelectedDocument(document);
                    setShowComplianceDialog(true);
                  }}>
                    <Shield className="w-4 h-4 mr-2" />
                    Compliance Labels
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {offlineDocIds.has(document.id) ? (
                    <ContextMenuItem onClick={() => handleRemoveOffline(document)}>
                      <CloudOff className="w-4 h-4 mr-2" />
                      Remove from Offline
                    </ContextMenuItem>
                  ) : (
                    <ContextMenuItem onClick={() => handleMakeOffline(document)}>
                      <CloudDownload className="w-4 h-4 mr-2" />
                      Make Available Offline
                    </ContextMenuItem>
                  )}
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => initiateDelete(document)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>
        ))}

      </div>
      {/* End Grid */}

      {/* Confirmation Dialogs */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Recycle Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to move "{documentToDelete?.file_name}" to the recycle bin? You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPermanentDeleteDialog} onOpenChange={setShowPermanentDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePermanentDelete} className="bg-red-600 hover:bg-red-700">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Other Dialogs */}
      {selectedDocument && (
        <>
          <CheckOutDialog
            open={showCheckOutDialog}
            onOpenChange={setShowCheckOutDialog}
            documentId={selectedDocument.id}
            documentName={selectedDocument.file_name}
            onCheckOutComplete={() => {
              toast({
                title: "Document checked out",
                description: "You can now work on this document exclusively.",
              });
            }}
          />

          <TransferOwnershipDialog
            open={showTransferDialog}
            onOpenChange={setShowTransferDialog}
            documentId={selectedDocument.id}
            documentName={selectedDocument.file_name}
          />

          <MoveToFolderDialog
            isOpen={moveDialogOpen}
            onClose={() => {
              setMoveDialogOpen(false);
              setSelectedDocument(null);
            }}
            documentId={selectedDocument.id}
            documentName={selectedDocument.file_name}
            onMoved={() => {
              onRefresh?.();
            }}
          />

          <DocumentEditorModal
            isOpen={showEditorModal}
            onClose={() => {
              setShowEditorModal(false);
              setSelectedDocument(null);
            }}
            document={selectedDocument}
            onSave={() => {
              onRefresh?.();
            }}
          />

          <ApplyComplianceLabelDialog
            open={showComplianceDialog}
            onOpenChange={setShowComplianceDialog}
            documentId={selectedDocument.id}
            documentName={selectedDocument.file_name}
            onApply={() => {
              toast({
                title: "Label applied",
                description: "Compliance label has been applied to the document.",
              });
            }}
          />
        </>
      )}
    </div>
  );
};
import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DocumentClassificationBadge } from "@/components/document-manager/DocumentClassificationBadge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Camera,
  Eye,
  ArrowRight,
  Folder,
  X,
  File,
  Image,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Brain,
  Sparkles,
  Shield
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { CameraCapture } from "../CameraCapture";
import { API_BASE_URL } from "@/config/api";
import { autoClassifyDocument } from "@/services/autoClassificationService";
import { useContentAccessRules } from '@/hooks/useContentAccessRules';
import { logDocumentCreated, logAuditEvent } from '@/utils/auditLogger';

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'classifying' | 'complete' | 'error';
  progress: number;
  error?: string;
  documentId?: string;
  classification?: {
    category: string;
    categoryName: string;
    confidence: number;
  };
}

interface EnhancedDocumentUploadProps {
  onDocumentProcessed?: (documentId: string) => void;
  onComplete?: () => void;
  onAllComplete?: (documentIds: string[]) => void;
}

export const EnhancedDocumentUpload: React.FC<EnhancedDocumentUploadProps> = ({
  onDocumentProcessed,
  onComplete,
  onAllComplete
}) => {
  const { applyRulesToDocument } = useContentAccessRules();
  const { status: offlineStatus, queueOfflineUpload } = useOfflineMode();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const [enableRAG, setEnableRAG] = useState(true);
  const [enableClassification, setEnableClassification] = useState(false);
  const [enableWorkflowSuggestion, setEnableWorkflowSuggestion] = useState(true);
  const [enableAccessRules, setEnableAccessRules] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <Image className="h-4 w-4 text-green-500" />;
    if (type.includes('video')) return <FileVideo className="h-4 w-4 text-purple-500" />;
    if (type.includes('audio')) return <FileAudio className="h-4 w-4 text-pink-500" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (type.includes('zip') || type.includes('archive') || type.includes('compressed')) return <FileArchive className="h-4 w-4 text-yellow-500" />;
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="h-4 w-4 text-emerald-500" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <Presentation className="h-4 w-4 text-orange-500" />;
    if (type.includes('text') || type.includes('code') || type.includes('javascript') || type.includes('json')) return <FileCode className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      status: 'pending' as const,
      progress: 0
    }));
    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // For text-based files, extract content
    const textTypes = ['text/', 'application/json', 'application/xml', 'application/javascript'];
    const isTextFile = textTypes.some(t => file.type.startsWith(t)) ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json') ||
      file.name.endsWith('.xml');

    if (isTextFile) {
      try {
        return await file.text();
      } catch {
        return '';
      }
    }

    // For other files, return filename as minimal context
    return `File: ${file.name}`;
  };

  const getDocumentType = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('video')) return 'video';
    if (mimeType.includes('audio')) return 'audio';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return 'archive';
    return 'other';
  };

  const uploadSingleFile = async (uploadFile: UploadFile): Promise<string | null> => {
    try {
      // Check if offline or Supabase is unreachable first
      if (!offlineStatus.isOnline || !navigator.onLine) {
        // Queue for offline upload
        const queueId = await queueOfflineUpload(uploadFile.file, {
          enableRAG,
          enableClassification,
        });

        if (queueId) {
          updateFileStatus(uploadFile.id, {
            status: 'complete',
            progress: 100,
            documentId: queueId
          });
          return queueId;
        } else {
          throw new Error('Failed to queue offline upload');
        }
      }

      updateFileStatus(uploadFile.id, { status: 'uploading', progress: 10 });

      // Try to get user, but handle auth failures gracefully
      let user;
      try {
        const { data: userData, error: authError } = await supabase.auth.getUser();
        if (authError || !userData.user) {
          // If auth fails, queue for offline upload
          console.warn('Authentication failed, queuing for offline upload:', authError);
          const queueId = await queueOfflineUpload(uploadFile.file, {
            enableRAG,
            enableClassification,
          });

          if (queueId) {
            updateFileStatus(uploadFile.id, {
              status: 'complete',
              progress: 100,
              documentId: queueId
            });
            return queueId;
          } else {
            throw new Error('User not authenticated and offline queue failed');
          }
        }
        user = userData;
      } catch (authError) {
        // Network error or auth service unreachable - queue offline
        console.warn('Auth service unreachable, queuing for offline upload:', authError);
        const queueId = await queueOfflineUpload(uploadFile.file, {
          enableRAG,
          enableClassification,
        });

        if (queueId) {
          updateFileStatus(uploadFile.id, {
            status: 'complete',
            progress: 100,
            documentId: queueId
          });
          return queueId;
        } else {
          throw new Error('Auth service unreachable and offline queue failed');
        }
      }

      // Upload file to storage
      const fileExt = uploadFile.file.name.split('.').pop() || 'unknown';
      const fileName = `${user.user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

      updateFileStatus(uploadFile.id, { progress: 30 });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadFile.file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      updateFileStatus(uploadFile.id, { status: 'processing', progress: 50 });

      // CREATE DOCUMENT RECORD FIRST (so we have document_id for queue)
      // This allows us to add to processing queue immediately
      let documentData: any = null;
      let extractedText = '';

      // Determine document type
      const docType = getDocumentType(uploadFile.file.type);

      // Create initial document record
      const { data: initialDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          file_name: uploadFile.file.name,
          storage_path: uploadData.path,
          file_size: uploadFile.file.size,
          file_type: uploadFile.file.type || 'application/octet-stream',
          document_type: docType,
          user_id: user.user.id,
          extracted_text: '',
          upload_source: 'manual',
          processing_status: 'processing',
          metadata: {
            originalFileName: uploadFile.file.name,
            uploadedAt: new Date().toISOString(),
            fileSize: uploadFile.file.size,
            mimeType: uploadFile.file.type,
          }
        })
        .select()
        .single();

      if (docError || !initialDoc) {
        throw new Error(`Failed to create document record: ${docError?.message}`);
      }

      documentData = initialDoc;
      console.log('📄 Document record created:', documentData.id);

      // Log audit event for document creation
      try {
        await logDocumentCreated(
          documentData.id,
          uploadFile.file.name,
          documentData.file_size
        );
        console.log('📝 Audit event logged: document.created');
      } catch (auditError) {
        console.warn('Failed to log audit event:', auditError);
      }

      // ADD TO PROCESSING QUEUE IMMEDIATELY (before processing starts)
      // Check for existing entry first to prevent duplicates
      try {
        const { data: existingQueueEntry } = await supabase
          .from('document_processing_queue')
          .select('id')
          .eq('document_id', documentData.id)
          .maybeSingle();

        if (!existingQueueEntry) {
          const { error: queueError } = await supabase
            .from('document_processing_queue')
            .insert({
              document_id: documentData.id,
              user_id: user.user.id,
              stage: 'uploaded',
              priority: 100,
              progress_percent: 0,
              stage_metadata: {}
            });

          if (queueError) {
            console.warn('Could not add to processing queue:', queueError);
          } else {
            console.log('✅ Added to processing queue:', documentData.id);
          }
        } else {
          console.log('📋 Queue entry already exists for:', documentData.id);
        }

        // Also add to search index queue (check for existing first)
        const { data: existingSearchEntry } = await supabase
          .from('search_index_queue')
          .select('id')
          .eq('document_id', documentData.id)
          .maybeSingle();

        if (!existingSearchEntry) {
          await supabase
            .from('search_index_queue')
            .insert({
              document_id: documentData.id,
              user_id: user.user.id,
              operation: 'index',
              status: 'pending',
              priority: 100
            });
        }
      } catch (queueAddError) {
        console.warn('Error adding to queue:', queueAddError);
      }

      // Dispatch upload-completed event immediately so UI updates
      console.log('✅ Dispatching upload-completed event (optimistic) for document:', documentData.id);

      // Determine if we need backend processing (RAG or Classification)
      const needsBackendProcessing = enableRAG || enableClassification;

      // START BACKGROUND PROCESSING (Fire and Forget)
      // We do NOT await this promise, allowing the function to return immediately
      const runBackgroundProcessing = async () => {
        let extractedText = '';
        let classificationResult = null;

        try {
          if (needsBackendProcessing) {
            // Backend will process and update the document
            try {
              updateFileStatus(uploadFile.id, { status: 'processing', progress: 55 });

              // NOTE: Don't dispatch upload-started here - the document with processing_status='processing'
              // will already be counted in SimplifyDrive's processingDocs array
              console.log('📤 Backend processing started (will be counted via processing_status)');

              // Update queue stage to text_extraction
              await supabase
                .from('document_processing_queue')
                .update({ stage: 'text_extraction', progress_percent: 33 })
                .eq('document_id', documentData.id);

              // Convert file to base64
              const reader = new FileReader();
              const fileBase64 = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(uploadFile.file);
              });

              // Call backend with document_id for queue updates
              const analysisPromise = fetch(`${API_BASE_URL}/api/v1/analyze-document`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  documentData: fileBase64,
                  documentName: uploadFile.file.name,
                  task: 'without_template_extraction',
                  userId: user.user.id,
                  saveToDatabase: true,
                  documentId: documentData.id, // Pass document_id for backend to update
                  yoloSignatureEnabled: false,
                  yoloFaceEnabled: false,
                  skipWorkflowTrigger: !enableWorkflowSuggestion // Pass the user's workflow preference
                }),
              });

              // Trigger documents-changed event immediately
              setTimeout(() => {
                window.dispatchEvent(new Event('documents-changed'));
              }, 500);

              const analysisResponse = await analysisPromise;

              if (analysisResponse.ok) {
                const analysisResult = await analysisResponse.json();
                extractedText = analysisResult.extractedText || '';

                // If backend didn't return extracted text, fetch it from database
                if (!extractedText || extractedText.length === 0) {
                  try {
                    const { data: docData } = await supabase
                      .from('documents')
                      .select('extracted_text')
                      .eq('id', documentData.id)
                      .single();

                    if (docData?.extracted_text) {
                      extractedText = docData.extracted_text;
                    }
                  } catch (fetchErr) {
                    console.warn('Could not fetch extracted text from database:', fetchErr);
                  }
                }

                // Log AI processing audit event
                try {
                  await logAuditEvent({
                    action: 'document.processed',
                    category: 'ai_processing',
                    resourceType: 'document',
                    resourceName: uploadFile.file.name,
                    documentId: documentData.id,
                    details: {
                      ai_model: 'document-analyzer',
                      processing_time_ms: Date.now() - new Date(documentData.created_at).getTime(),
                      notes: 'AI text extraction and analysis completed',
                    },
                  });
                } catch (auditErr) {
                  console.warn('Failed to log AI processing audit:', auditErr);
                }

                // Apply access rules if enabled - ALWAYS runs after AI processing
                if (enableAccessRules) {
                  try {
                    const appliedRules = await applyRulesToDocument(documentData.id, {
                      name: uploadFile.file.name,
                      file_type: uploadFile.file.type,
                      file_size: uploadFile.file.size,
                      content: extractedText,
                    });

                    if (appliedRules && appliedRules.length > 0) {
                      const ruleNames = appliedRules.map(r => r.name).join(', ');
                      toast({
                        title: "✅ Access Rules Applied",
                        description: `Applied ${appliedRules.length} rule(s): ${ruleNames}`,
                      });

                      // Force refresh of document list
                      setTimeout(() => {
                        window.dispatchEvent(new Event('documents-changed'));
                      }, 500);

                      // Log access rules application
                      try {
                        await logAuditEvent({
                          action: 'document.processed',
                          category: 'security',
                          resourceType: 'document',
                          resourceName: uploadFile.file.name,
                          documentId: documentData.id,
                          details: {
                            action: 'auto_apply_rules',
                            rule_count: appliedRules.length,
                            rule_names: appliedRules.map(r => r.name)
                          }
                        });
                      } catch (e) {
                        console.warn('Failed to log rule application audit:', e);
                      }
                    } else {
                      // Silent fail or minimal log
                    }
                  } catch (ruleError) {
                    console.error('❌ Failed to auto-apply rules:', ruleError);
                  }
                }
              } else {
                console.error('Backend processing failed');
              }
            } catch (analysisError) {
              console.error('Error during backend processing:', analysisError);
            }
          } else {
            // Simple upload: No backend processing, just update document status
            // Try to extract text locally
            try {
              extractedText = await extractTextFromFile(uploadFile.file);
            } catch (e) {
              console.warn('Local text extraction failed:', e);
            }

            // Update document with extracted text
            await supabase
              .from('documents')
              .update({
                extracted_text: extractedText || '',
                processing_status: 'pending',
                metadata: {
                  ...(documentData.metadata || {}),
                  ragEnabled: false,
                  classificationEnabled: false
                }
              })
              .eq('id', documentData.id);

            // Create Version 1 record
            try {
              await supabase
                .from('document_versions')
                .insert({
                  document_id: documentData.id,
                  version_number: 1,
                  content: uploadData.path,
                  change_summary: 'Initial upload',
                  created_by: user.user.id,
                  major_version: 1,
                  minor_version: 0,
                });
            } catch (versionCreationError) {
              console.warn('Error creating version record:', versionCreationError);
            }
          }

          // AI Classification - only if explicitly enabled by user in UI
          if (enableClassification) {
            try {
              updateFileStatus(uploadFile.id, { status: 'classifying', progress: 90 });

              // Convert file to base64 for image classification if it's an image or PDF
              let imageBase64 = '';
              if (uploadFile.file.type.startsWith('image/')) {
                const reader = new FileReader();
                imageBase64 = await new Promise((resolve) => {
                  reader.onload = () => resolve(reader.result as string);
                  reader.readAsDataURL(uploadFile.file);
                });
              }

              const { data: classifyData, error: classifyError } = await supabase.functions.invoke('classify-document', {
                body: {
                  documentId: documentData.id,
                  text: extractedText,
                  fileName: uploadFile.file.name,
                  mimeType: uploadFile.file.type,
                  imageBase64: imageBase64 || undefined
                }
              });

              if (!classifyError && classifyData?.success && classifyData?.classification) {
                classificationResult = classifyData.classification;

                // Update document with classification
                await supabase
                  .from('documents')
                  .update({
                    metadata: {
                      ...((documentData?.metadata as object) || {}),
                      classification: classificationResult,
                      classifiedAt: new Date().toISOString()
                    }
                  })
                  .eq('id', documentData.id);

                // Auto-route to external system if configured
                if (classificationResult?.externalSystem) {
                  try {
                    await supabase.functions.invoke('process-external-system', {
                      body: {
                        documentId: documentData.id,
                        externalSystem: classificationResult.externalSystem,
                        extractedData: classificationResult.extracted_data,
                        classification: classificationResult
                      }
                    });
                  } catch (routeError) {
                    console.error('Error routing to external system:', routeError);
                  }
                }
              }
            } catch (classifyError) {
              console.error('Error classifying document:', classifyError);
            }
          }

          // Update metadata with RAG status
          if (enableRAG && extractedText) {
            await supabase
              .from('documents')
              .update({
                metadata: {
                  ...((documentData?.metadata as object) || {}),
                  ragProcessed: true,
                  ...(classificationResult ? { classification: classificationResult } : {})
                }
              })
              .eq('id', documentData.id);
          }

          // Auto-classify document based on filename matching to metadata fields
          try {
            await autoClassifyDocument(documentData.id, uploadFile.file.name, extractedText);
          } catch (classifyErr) {
            console.error('Auto-classification failed (non-blocking):', classifyErr);
          }

          // Apply Access Rules (final check - runs for all upload paths)
          if (enableAccessRules) {
            try {
              const appliedRules = await applyRulesToDocument(documentData.id, {
                name: uploadFile.file.name,
                file_type: uploadFile.file.type,
                file_size: uploadFile.file.size,
                content: extractedText
              });

              if (appliedRules && appliedRules.length > 0) {
                // Notification if needed
              }
            } catch (ruleErr) {
              console.error('Failed to apply access rules:', ruleErr);
            }
          }

          // Mark processing queue as completed
          try {
            await supabase
              .from('document_processing_queue')
              .update({
                stage: 'completed',
                progress_percent: 100,
                completed_at: new Date().toISOString()
              })
              .eq('document_id', documentData.id);

            // Also update search index queue
            await supabase
              .from('search_index_queue')
              .update({
                status: 'completed',
                processed_at: new Date().toISOString()
              })
              .eq('document_id', documentData.id);

          } catch (queueUpdateError) {
            console.warn('Could not update processing queue:', queueUpdateError);
          }

          // Final success update for file status (though user might not see it if modal closed)
          updateFileStatus(uploadFile.id, {
            status: 'complete',
            progress: 100,
            documentId: documentData.id
          });

        } catch (backgroundError) {
          console.error('Background processing error:', backgroundError);
          // We don't fail the upload from user perspective, but we log it
        }
      };

      // Trigger background processing without awaiting
      runBackgroundProcessing();

      // Return immediately to close UI
      window.dispatchEvent(new CustomEvent('upload-completed', { detail: { count: 1, documentId: documentData.id } }));
      return documentData.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFileStatus(uploadFile.id, {
        status: 'error',
        progress: 0,
        error: errorMessage
      });
      // Also dispatch completed on error so counter decrements
      console.log('❌ Dispatching upload-completed event (error)');
      window.dispatchEvent(new CustomEvent('upload-completed', { detail: { count: 1, error: true } }));
      return null;
    }
  };

  const startUpload = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const documentIds: string[] = [];

    // Process files in parallel with concurrency limit
    const concurrencyLimit = 3;
    for (let i = 0; i < pendingFiles.length; i += concurrencyLimit) {
      const batch = pendingFiles.slice(i, i + concurrencyLimit);
      const results = await Promise.all(batch.map(uploadSingleFile));
      documentIds.push(...results.filter((id): id is string => id !== null));
    }

    setIsUploading(false);

    const successCount = documentIds.length;
    const failCount = pendingFiles.length - successCount;

    if (successCount > 0) {
      const workflowMessage = enableWorkflowSuggestion
        ? 'Matching workflows will start automatically.'
        : 'Workflows will not be auto-started.';

      toast({
        title: "Upload Complete",
        description: `${successCount} file(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}. ${workflowMessage}`,
      });

      // Workflow auto-start is controlled by backend based on skip_workflow_trigger flag
      onAllComplete?.(documentIds);
      onComplete?.();

      if (failCount === 0) {
        setUploadComplete(true);
      }
    } else {
      toast({
        title: "Upload Failed",
        description: "All files failed to upload",
        variant: "destructive"
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const items = e.dataTransfer.items;
    const allFiles: File[] = [];

    // Handle folder drops
    const traverseDirectory = async (entry: FileSystemEntry, path: string = ''): Promise<File[]> => {
      const files: File[] = [];

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve) => {
          fileEntry.file((f) => {
            // Add relative path to file
            Object.defineProperty(f, 'webkitRelativePath', {
              value: path + f.name,
              writable: false
            });
            resolve(f);
          });
        });
        files.push(file);
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const entries = await new Promise<FileSystemEntry[]>((resolve) => {
          reader.readEntries((entries) => resolve(entries));
        });

        for (const childEntry of entries) {
          const childFiles = await traverseDirectory(childEntry, path + entry.name + '/');
          files.push(...childFiles);
        }
      }

      return files;
    };

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry?.();

        if (entry) {
          const files = await traverseDirectory(entry);
          allFiles.push(...files);
        } else if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) allFiles.push(file);
        }
      }
    } else {
      allFiles.push(...Array.from(e.dataTransfer.files));
    }

    if (allFiles.length > 0) {
      addFiles(allFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleCameraCapture = (file: File) => {
    setShowCamera(false);
    addFiles([file]);
  };

  const resetUpload = () => {
    setFiles([]);
    setUploadComplete(false);
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'complete').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  if (uploadComplete && errorCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            All Documents Uploaded Successfully
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {completedCount} file(s) have been saved to SimplifyDrive
            {enableRAG && ' with RAG indexing enabled'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={resetUpload} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload More
            </Button>
            <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
              <Eye className="mr-2 h-4 w-4" />
              View in SimplifyDrive
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${dragActive
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/20'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 md:p-12">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="relative p-4 rounded-full bg-muted/50">
                <Upload className="h-10 w-10 text-muted-foreground" />
                {dragActive && (
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse" />
                )}
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-2">
              Drop files or folders here
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              Upload any file type • Drag entire folders • No size limits
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <FileText className="h-4 w-4" />
                Choose Files
              </Button>

              <Button
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <Folder className="h-4 w-4" />
                Choose Folder
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="flex items-center gap-2"
                disabled={isUploading}
              >
                <Camera className="h-4 w-4" />
                Scan with Camera
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Supports ALL file formats (PDF, Office, Images, Videos, Code, Archives, etc.)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore - webkitdirectory is a non-standard attribute
              webkitdirectory=""
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>
        </div>
      </div>

      {/* AI Options - Below drop zone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enableRAG ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 bg-card'
            }`}
          onClick={() => setEnableRAG(!enableRAG)}
        >
          <Checkbox
            id="rag-toggle"
            checked={enableRAG}
            onCheckedChange={(checked) => setEnableRAG(checked as boolean)}
            className="h-4 w-4 flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Brain className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <Label htmlFor="rag-toggle" className="text-sm font-medium cursor-pointer block truncate">
                Enable RAG (AI Search & Chat)
              </Label>
              <p className="text-xs text-muted-foreground truncate">
                Index for semantic search
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enableClassification ? 'border-amber-500 bg-amber-500/5' : 'border-border hover:border-muted-foreground/50 bg-card'
            }`}
          onClick={() => setEnableClassification(!enableClassification)}
        >
          <Checkbox
            id="classify-toggle"
            checked={enableClassification}
            onCheckedChange={(checked) => setEnableClassification(checked as boolean)}
            className="h-4 w-4 flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <div className="min-w-0">
              <Label htmlFor="classify-toggle" className="text-sm font-medium cursor-pointer block truncate">
                AI Auto-Classification
              </Label>
              <p className="text-xs text-muted-foreground truncate">
                Identify type and route
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enableWorkflowSuggestion ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:border-muted-foreground/50 bg-card'
            }`}
          onClick={() => setEnableWorkflowSuggestion(!enableWorkflowSuggestion)}
        >
          <Checkbox
            id="workflow-toggle"
            checked={enableWorkflowSuggestion}
            onCheckedChange={(checked) => setEnableWorkflowSuggestion(checked as boolean)}
            className="h-4 w-4 flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <ArrowRight className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <Label htmlFor="workflow-toggle" className="text-sm font-medium cursor-pointer block truncate">
                Auto-Start Workflows
              </Label>
              <p className="text-xs text-muted-foreground truncate">
                {enableWorkflowSuggestion ? 'Workflows start automatically' : 'Manual workflow start only'}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${enableAccessRules ? 'border-indigo-500 bg-indigo-500/5' : 'border-border hover:border-muted-foreground/50 bg-card'
            }`}
          onClick={() => setEnableAccessRules(!enableAccessRules)}
        >
          <Checkbox
            id="rules-toggle"
            checked={enableAccessRules}
            onCheckedChange={(checked) => setEnableAccessRules(checked as boolean)}
            className="h-4 w-4 flex-shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Shield className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <Label htmlFor="rules-toggle" className="text-sm font-medium cursor-pointer block truncate">
                Auto-Apply Access Rules
              </Label>
              <p className="text-xs text-muted-foreground truncate">
                Apply security rules automatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Files to Upload ({files.length})
              </CardTitle>
              <div className="flex gap-2">
                {completedCount > 0 && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    {completedCount} Complete
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge variant="destructive">
                    {errorCount} Failed
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px] pr-4">
              <div className="space-y-2">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {getFileIcon(uploadFile.file.type)}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadFile.file.size)}
                        {(uploadFile.file as any).webkitRelativePath && (
                          <span className="ml-2 text-muted-foreground/70">
                            {(uploadFile.file as any).webkitRelativePath}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {uploadFile.status === 'pending' && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {(uploadFile.status === 'uploading' || uploadFile.status === 'processing') && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-xs text-muted-foreground">{uploadFile.progress}%</span>
                        </div>
                      )}
                      {uploadFile.status === 'complete' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <span className="text-xs text-destructive">{uploadFile.error}</span>
                        </div>
                      )}

                      {uploadFile.status === 'pending' && !isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {pendingCount > 0 && (
              <div className="mt-4 flex gap-3">
                <Button
                  onClick={startUpload}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload {pendingCount} File{pendingCount > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setFiles(prev => prev.filter(f => f.status !== 'pending'))}
                  disabled={isUploading}
                >
                  Clear Pending
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

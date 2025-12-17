import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  UserMinus
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
  insights?: DocumentInsight;
  tags?: DocumentTag[];
  folders?: SmartFolder[];
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
}

export const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  onDocumentClick
}) => {
  const { toast } = useToast();
  const { pinDocument, unpinDocument, isPinned } = useQuickAccess();
  
  // Check Out and Transfer Dialog states
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const handleView = (document: Document) => {
    // Trigger the parent click handler which opens the modal viewer
    onDocumentClick(document);
  };

  const handleDownload = async (document: Document) => {
    try {
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
  const getFileIcon = (_fileType: string) => {
    // You can expand this based on file types
    return <FileText className="w-8 h-8 text-blue-500" />;
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map(document => (
        <Card 
          key={document.id} 
          className="group hover:shadow-lg transition-all duration-200 cursor-pointer border hover:border-primary/50 bg-white"
          onClick={() => onDocumentClick(document)}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getFileIcon(document.file_type)}
                {document.insights && (
                  <div className="flex items-center gap-1">
                    <Brain className="w-3 h-3 text-blue-500" />
                    <Star 
                      className={`w-3 h-3 ${getImportanceColor(document.insights.importance_score)}`}
                      fill="currentColor"
                    />
                  </div>
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
                        className="h-7 w-7 p-0 hover:bg-primary/10"
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
                          className={`w-4 h-4 transition-all ${
                            isPinned(document.id) 
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
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <h3 className="font-medium text-sm truncate mb-1">
                {document.insights?.ai_generated_title || document.file_name}
              </h3>
              {document.file_name !== document.insights?.ai_generated_title && (
                <p className="text-xs text-muted-foreground truncate">
                  {document.file_name}
                </p>
              )}
            </div>

            {/* AI Summary */}
            {document.insights?.summary && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {document.insights.summary}
                </p>
              </div>
            )}

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {document.tags.slice(0, 3).map(tag => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1"
                  >
                    {tag.is_ai_suggested && <Sparkles className="w-2 h-2" />}
                    {tag.name}
                  </Badge>
                ))}
                {document.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{document.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Folders */}
            {document.folders && document.folders.length > 0 && (
              <div className="flex items-center gap-1 mb-3">
                <Folder className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">
                  {document.folders[0].name}
                  {document.folders.length > 1 && ` +${document.folders.length - 1}`}
                </span>
              </div>
            )}

            {/* Key Topics */}
            {document.insights?.key_topics && document.insights.key_topics.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Tag className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Topics:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {document.insights.key_topics.slice(0, 2).map((topic, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                </div>
                <span>{formatFileSize(document.file_size)}</span>
              </div>
              
              {document.insights?.estimated_reading_time && (
                <Badge variant="secondary" className="text-xs">
                  {document.insights.estimated_reading_time}m read
                </Badge>
              )}
            </div>

            {/* Primary Actions */}
            <div className="flex gap-1.5 mt-3">
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-8 text-xs px-2 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(document);
                }}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">View</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-8 text-xs px-2 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(document);
                }}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Download</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex-1 h-8 text-xs px-2 hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(document);
                }}
              >
                <Share className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
            
            {/* Document Management Actions */}
            <div className="flex gap-1.5 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-xs px-2 bg-blue-50/50 hover:bg-blue-50 border-blue-200/60 text-blue-600 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDocument(document);
                  setShowCheckOutDialog(true);
                }}
              >
                <Lock className="w-3.5 h-3.5 mr-1" />
                Check Out
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 h-8 text-xs px-2 bg-purple-50/50 hover:bg-purple-50 border-purple-200/60 text-purple-600 hover:text-purple-700"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDocument(document);
                  setShowTransferDialog(true);
                }}
              >
                <UserMinus className="w-3.5 h-3.5 mr-1" />
                Transfer
              </Button>
            </div>

            {/* Processing Status */}
            {document.processing_status && document.processing_status !== 'completed' && (
              <div className="mt-2">
                <Badge 
                  variant={
                    document.processing_status === 'processing' ? 'secondary' : 
                    document.processing_status === 'pending' ? 'outline' :
                    'destructive'
                  }
                  className="text-xs"
                >
                  {document.processing_status === 'processing' ? 'AI Processing...' : 
                   document.processing_status === 'pending' ? 'Pending Analysis' :
                   'Processing Failed'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Dialogs */}
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
            onSuccess={() => {
              toast({
                title: "Transfer initiated",
                description: "The recipient will be notified to accept or reject the transfer.",
              });
            }}
          />
        </>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  AlertTriangle, 
  Loader2, 
  Shield,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface DocumentRecommendation {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  file_size: number;
}

interface LegalHold {
  id: string;
  name: string;
  matter_type: string;
  status: string;
  created_at: string;
}

interface AILegalHoldRecommendationsProps {
  holdReason: string;
  keywords: string;
  matterType: string;
  onSelectDocuments: (documentIds: string[]) => void;
  selectedDocumentIds: string[];
}

export const AILegalHoldRecommendations: React.FC<AILegalHoldRecommendationsProps> = ({
  holdReason,
  keywords,
  matterType,
  onSelectDocuments,
  selectedDocumentIds
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<DocumentRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecommendation | null>(null);
  const [existingHolds, setExistingHolds] = useState<LegalHold[]>([]);
  const [showHoldsDialog, setShowHoldsDialog] = useState(false);
  const [loadingHolds, setLoadingHolds] = useState(false);

  useEffect(() => {
    analyzeDocuments();
  }, []);

  const analyzeDocuments = async () => {
    setIsAnalyzing(true);
    setError(null);
    setRecommendations([]);

    try {
      const { data: documents, error: fetchError } = await supabase
        .from('documents')
        .select('id, file_name, file_type, metadata, created_at, file_size')
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchError) {
        console.error('Error fetching documents:', fetchError);
        throw new Error('Failed to load documents.');
      }
      if (!documents || documents.length === 0) {
        setError('No documents found');
        setIsAnalyzing(false);
        return;
      }

      // Simple filtering - just return all documents for selection
      setRecommendations(documents.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_type: doc.file_type || 'unknown',
        created_at: doc.created_at,
        file_size: doc.file_size || 0
      })));

    } catch (err) {
      console.error('Error analyzing documents:', err);
      setError('Failed to analyze documents.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDocumentClick = async (doc: DocumentRecommendation) => {
    setSelectedDocument(doc);
    setShowHoldsDialog(true);
    setLoadingHolds(true);
    
    try {
      // Fetch all existing legal holds
      const { data: holds, error } = await (supabase as any)
        .from('legal_holds')
        .select('id, name, matter_type, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExistingHolds(holds || []);
    } catch (err) {
      console.error('Error fetching legal holds:', err);
      setExistingHolds([]);
    } finally {
      setLoadingHolds(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Document Recommendations
          </CardTitle>
          <CardDescription>
            AI-powered analysis to identify documents that may require legal hold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing documents...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" onClick={analyzeDocuments} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium">{recommendations.length} documents analyzed</p>
              
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-2 space-y-2">
                  {recommendations.map((doc) => (
                    <div 
                      key={doc.id}
                      onClick={() => handleDocumentClick(doc)}
                      className="p-3 rounded-lg border hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.file_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatFileSize(doc.file_size)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legal Holds Dialog */}
      <Dialog open={showHoldsDialog} onOpenChange={setShowHoldsDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Apply Legal Hold: {selectedDocument?.file_name}
            </DialogTitle>
          </DialogHeader>

          {loadingHolds ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Existing Legal Holds</h3>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create New Hold
                  </Button>
                </div>
                
                {existingHolds.length === 0 ? (
                  <div className="text-center py-6 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">No existing legal holds found</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-2 space-y-2">
                      {existingHolds.map((hold) => (
                        <div 
                          key={hold.id}
                          className="p-3 rounded-lg border hover:bg-purple-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{hold.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {hold.matter_type}
                                </Badge>
                                <Badge 
                                  variant={hold.status === 'active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {hold.status}
                                </Badge>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              Apply
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

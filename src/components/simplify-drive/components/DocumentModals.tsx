import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedDocumentUpload } from '@/components/UnifiedDocumentUpload';
import { BatchDocumentScanner } from '@/components/scanning/BatchDocumentScanner';
import { CreateShortcutDialog } from '@/components/shortcuts';
import { DocumentSummaryDialog } from '@/components/document-summary';
import { CameraCapture } from '@/components/CameraCapture';
import { Camera, Scan } from 'lucide-react';
import type { Document } from '../types';

interface DocumentModalsProps {
  showUploadModal: boolean;
  onCloseUploadModal: () => void;
  onDocumentProcessed: (documentId: string) => void;
  showScannerModal: boolean;
  onCloseScannerModal: () => void;
  onUploadScannedPages?: (pages: any[]) => Promise<void>;
  showShortcutDialog: boolean;
  onCloseShortcutDialog: () => void;
  shortcutDocument: Document | null;
  showSummaryDialog: boolean;
  onCloseSummaryDialog: () => void;
  summaryDocument: Document | null;
}

export function DocumentModals({
  showUploadModal,
  onCloseUploadModal,
  onDocumentProcessed,
  showScannerModal,
  onCloseScannerModal,
  onUploadScannedPages,
  showShortcutDialog,
  onCloseShortcutDialog,
  shortcutDocument,
  showSummaryDialog,
  onCloseSummaryDialog,
  summaryDocument,
}: DocumentModalsProps) {
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'scanner'>('camera');

  const handleCameraCapture = async (file: File) => {
    setShowCameraCapture(false);
    if (onUploadScannedPages) {
      // Convert file to scanned page format
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const page = {
          id: crypto.randomUUID(),
          pageNumber: 1,
          thumbnail: dataUrl,
          fullImage: dataUrl,
          status: 'complete' as const,
          fileName: file.name,
          fileSize: file.size,
          dimensions: { width: 0, height: 0 },
          rotation: 0,
          isBlank: false,
        };
        await onUploadScannedPages([page]);
        onCloseScannerModal();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <Dialog open={showUploadModal} onOpenChange={onCloseUploadModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <UnifiedDocumentUpload 
            onDocumentProcessed={onDocumentProcessed}
            onComplete={onCloseUploadModal}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showScannerModal} onOpenChange={onCloseScannerModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
          <Tabs value={scannerTab} onValueChange={(v) => setScannerTab(v as 'camera' | 'scanner')} className="w-full">
            <div className="p-4 pb-0 border-b">
              <DialogHeader className="mb-4">
                <DialogTitle>Scan Documents</DialogTitle>
              </DialogHeader>
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="camera" className="gap-2">
                  <Camera className="h-4 w-4" />
                  Camera Capture
                </TabsTrigger>
                <TabsTrigger value="scanner" className="gap-2">
                  <Scan className="h-4 w-4" />
                  Document Scanner
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="camera" className="mt-0 p-4">
              <div className="text-center py-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Quick Camera Scan</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Use your device camera to quickly capture a document. Perfect for mobile devices or quick single-page scans.
                </p>
                <button
                  onClick={() => setShowCameraCapture(true)}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Camera className="h-5 w-5" />
                  Open Camera
                </button>
              </div>
            </TabsContent>
            
            <TabsContent value="scanner" className="mt-0">
              <BatchDocumentScanner onUploadToStorage={onUploadScannedPages} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Camera Capture Modal */}
      {showCameraCapture && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCameraCapture(false)}
        />
      )}

      {shortcutDocument && (
        <CreateShortcutDialog
          open={showShortcutDialog}
          onOpenChange={onCloseShortcutDialog}
          documentId={shortcutDocument.id}
          documentName={shortcutDocument.file_name}
        />
      )}

      {summaryDocument && (
        <DocumentSummaryDialog
          open={showSummaryDialog}
          onOpenChange={onCloseSummaryDialog}
          documentName={summaryDocument.file_name}
          documentText={summaryDocument.extracted_text}
        />
      )}
    </>
  );
}

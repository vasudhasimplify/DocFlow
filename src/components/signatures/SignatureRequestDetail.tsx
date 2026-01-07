import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Users, Clock, CheckCircle, XCircle,
  Send, Download, RefreshCw, MoreVertical, Mail, Eye,
  Calendar, Shield, AlertTriangle, PenTool, HardDrive, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useElectronicSignatures } from '@/hooks/useElectronicSignatures';
import { STATUS_CONFIG, SIGNER_STATUS_CONFIG } from '@/types/signature';
import type { SignatureRequest, SignatureAuditLog } from '@/types/signature';
import { cn } from '@/lib/utils';
import { SignaturePadDialog } from './SignaturePadDialog';
import { SignatureCertificate } from './SignatureCertificate';
import { SignatureFieldPlacer } from './SignatureFieldPlacer';
import type { SignaturePosition } from '@/types/signature';
import { supabase } from '@/integrations/supabase/client';

interface SignatureRequestDetailProps {
  request: SignatureRequest;
  onBack: () => void;
}

export const SignatureRequestDetail: React.FC<SignatureRequestDetailProps> = ({
  request,
  onBack,
}) => {
  const { sendRequest, cancelRequest, getAuditLog, signDocument, refresh } = useElectronicSignatures();
  const [auditLog, setAuditLog] = useState<SignatureAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signingAs, setSigningAs] = useState<string>('signature');
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [localRequest, setLocalRequest] = useState<SignatureRequest>(request);
  const [isSavingToDrive, setIsSavingToDrive] = useState(false);
  const { toast } = useToast();

  // Save signed document to user's SimplifyDrive
  const handleSaveToDrive = async () => {
    try {
      setIsSavingToDrive(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in to save', variant: 'destructive' });
        return;
      }

      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/signatures/save-to-drive/${localRequest.id}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          // source_document_id could be passed if we track it in the future
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || 'Failed to save');
      }

      toast({
        title: 'Saved!',
        description: result.message || 'Signed document saved to your SimplifyDrive'
      });
    } catch (error: any) {
      console.error('Error saving to drive:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save to SimplifyDrive',
        variant: 'destructive'
      });
    } finally {
      setIsSavingToDrive(false);
    }
  };

  // Generate the correct document URL for viewing
  const getDocumentViewUrl = (docUrl: string | null | undefined) => {
    if (!docUrl) return null;
    if (docUrl.startsWith('storage://')) {
      // Use the backend preview endpoint for storage URLs
      return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/signatures/preview-document/${localRequest.id}`;
    }
    return docUrl;
  };

  useEffect(() => {
    // Generate audit trail dynamically from request and signers data
    const generateAuditTrail = () => {
      const logs: SignatureAuditLog[] = [];

      // 1. Request created event
      logs.push({
        id: `created-${localRequest.id}`,
        request_id: localRequest.id,
        action: 'created',
        actor_name: 'Document Owner',
        actor_email: '',
        created_at: localRequest.created_at,
        ip_address: null,
        user_agent: null,
        metadata: {}
      });

      // 2. Request sent event (if status is not draft)
      if (localRequest.status !== 'draft') {
        logs.push({
          id: `sent-${localRequest.id}`,
          request_id: localRequest.id,
          action: 'sent',
          actor_name: 'Document Owner',
          actor_email: '',
          created_at: localRequest.created_at, // Same as created for now
          ip_address: null,
          user_agent: null,
          metadata: { signers_count: localRequest.signers?.length || 0 }
        });
      }

      // 3. Add events for each signer based on their status
      localRequest.signers?.forEach(signer => {
        // Viewed event
        if (signer.status === 'viewed' || signer.status === 'signed') {
          logs.push({
            id: `viewed-${signer.id}`,
            request_id: localRequest.id,
            action: 'viewed',
            actor_name: signer.name,
            actor_email: signer.email,
            created_at: signer.signed_at || localRequest.created_at,
            ip_address: null,
            user_agent: null,
            metadata: {}
          });
        }

        // Signed event
        if (signer.status === 'signed' && signer.signed_at) {
          logs.push({
            id: `signed-${signer.id}`,
            request_id: localRequest.id,
            action: 'signed',
            actor_name: signer.name,
            actor_email: signer.email,
            created_at: signer.signed_at,
            ip_address: null,
            user_agent: null,
            metadata: {}
          });
        }

        // Declined event
        if (signer.status === 'declined') {
          logs.push({
            id: `declined-${signer.id}`,
            request_id: localRequest.id,
            action: 'declined',
            actor_name: signer.name,
            actor_email: signer.email,
            created_at: signer.signed_at || localRequest.updated_at || localRequest.created_at,
            ip_address: null,
            user_agent: null,
            metadata: {}
          });
        }
      });

      // 4. Request completed event
      if (localRequest.status === 'completed' && localRequest.completed_at) {
        logs.push({
          id: `completed-${localRequest.id}`,
          request_id: localRequest.id,
          action: 'completed',
          actor_name: 'System',
          actor_email: '',
          created_at: localRequest.completed_at,
          ip_address: null,
          user_agent: null,
          metadata: {}
        });
      }

      // 5. Request cancelled event
      if (localRequest.status === 'cancelled') {
        logs.push({
          id: `cancelled-${localRequest.id}`,
          request_id: localRequest.id,
          action: 'cancelled',
          actor_name: 'Document Owner',
          actor_email: '',
          created_at: localRequest.updated_at || localRequest.created_at,
          ip_address: null,
          user_agent: null,
          metadata: {}
        });
      }

      // Sort by date (newest first)
      logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setAuditLog(logs);
    };

    generateAuditTrail();

    // Get current user email
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserEmail(data.user.email || null);
    });
  }, [localRequest]);

  // Sync localRequest when prop changes (for parent updates)
  useEffect(() => {
    setLocalRequest(request);
  }, [request]);

  const statusConfig = STATUS_CONFIG[localRequest.status];
  const signers = localRequest.signers?.filter(s => s.role === 'signer' || s.role === 'approver') || [];
  const signedCount = signers.filter(s => s.status === 'signed').length;
  const progress = signers.length ? (signedCount / signers.length) * 100 : 0;

  // Check if current user needs to sign (pending, sent, or viewed but not yet signed)
  const currentUserSigner = localRequest.signers?.find(s => s.email === currentUserEmail);
  const needsMySignature = currentUserSigner && ['pending', 'sent', 'viewed'].includes(currentUserSigner.status);

  const getAuditIcon = (action: string) => {
    switch (action) {
      case 'created': return FileText;
      case 'sent': return Send;
      case 'viewed': return Eye;
      case 'signed': return CheckCircle;
      case 'declined': return XCircle;
      case 'completed': return CheckCircle;
      case 'cancelled': return XCircle;
      case 'reminded': return Mail;
      default: return Clock;
    }
  };

  const getAuditColor = (action: string) => {
    switch (action) {
      case 'created': return 'text-blue-500 bg-blue-500/10';
      case 'sent': return 'text-purple-500 bg-purple-500/10';
      case 'viewed': return 'text-yellow-500 bg-yellow-500/10';
      case 'signed': return 'text-green-500 bg-green-500/10';
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'declined': return 'text-red-500 bg-red-500/10';
      case 'cancelled': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{localRequest.title}</h1>
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {new Date(localRequest.created_at).toLocaleDateString()}
              {localRequest.document_name && ` • ${localRequest.document_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {localRequest.status === 'draft' && (
              <Button onClick={() => sendRequest(localRequest.id)}>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            )}
            {localRequest.status === 'pending' && (
              needsMySignature ? (
                <Button onClick={() => setShowSignDialog(true)} className="gap-2">
                  <PenTool className="h-4 w-4" />
                  Sign Document
                </Button>
              ) : (
                <Button variant="outline" onClick={() => cancelRequest(localRequest.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )
            )}
            {localRequest.status === 'completed' && (
              <Button variant="outline" onClick={() => setShowCertificate(true)}>
                <Download className="h-4 w-4 mr-2" />
                Download Certificate
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0">
        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b px-6 shrink-0">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="flex-1 p-6 m-0">
              {/* Sign Document Banner - shown when user needs to sign */}
              {needsMySignature && (
                <Card className="mb-6 border-2 border-purple-500 bg-purple-500/10">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-4 bg-purple-500 rounded-full">
                        <PenTool className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-purple-700 dark:text-purple-300">
                          Your Signature is Required
                        </h3>
                        <p className="text-muted-foreground mt-1">
                          {localRequest.document_url ? 'Click on the document below to select where your signature should appear, then click "Sign Now"'
                            : 'Click the button to sign this document'}
                        </p>
                      </div>
                    </div>

                    {/* PDF Preview for position selection - only show if document exists */}
                    {localRequest.document_url && (
                      <div className="mb-4">
                        <SignatureFieldPlacer
                          documentUrl={getDocumentViewUrl(localRequest.document_url) || ''}
                          selectedPosition={signaturePosition}
                          onPositionSelected={setSignaturePosition}
                        />
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        size="lg"
                        onClick={() => setShowSignDialog(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg"
                        disabled={localRequest.document_url ? !signaturePosition : false}
                      >
                        <PenTool className="h-6 w-6 mr-3" />
                        {signaturePosition ? 'Sign at Selected Position' : 'Sign Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Signing Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <Progress value={progress} className="flex-1" />
                      <span className="text-sm font-medium">
                        {signedCount}/{signers.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {localRequest.signers?.map((signer) => {
                        const signerStatus = SIGNER_STATUS_CONFIG[signer.status];
                        return (
                          <div
                            key={signer.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-medium",
                                signer.status === 'signed' ? 'bg-green-500/20 text-green-700' :
                                  signer.status === 'declined' ? 'bg-red-500/20 text-red-700' :
                                    'bg-muted text-muted-foreground'
                              )}>
                                {signer.status === 'signed' ? (
                                  <CheckCircle className="h-5 w-5" />
                                ) : signer.status === 'declined' ? (
                                  <XCircle className="h-5 w-5" />
                                ) : (
                                  signer.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{signer.name}</p>
                                <p className="text-xs text-muted-foreground">{signer.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className={signerStatus.color}>
                                {signerStatus.label}
                              </Badge>
                              {signer.signed_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(signer.signed_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {request.message && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Message</p>
                        <p className="text-sm mt-1">{request.message}</p>
                      </div>
                    )}
                    <Separator />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Signing Order
                        </p>
                        <p className="text-sm mt-1 capitalize">{request.signing_order}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created
                        </p>
                        <p className="text-sm mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {request.expires_at && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires
                          </p>
                          <p className="text-sm mt-1">
                            {new Date(request.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {request.completed_at && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Completed
                          </p>
                          <p className="text-sm mt-1">
                            {new Date(request.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="document" className="flex-1 p-6 m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {localRequest.document_name || 'Signature Request Document'}
                  </CardTitle>
                  <CardDescription>
                    {localRequest.status === 'completed'
                      ? 'This document has been fully signed by all parties'
                      : 'Document preview with signature status'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Document Info */}
                    <div className="bg-muted/30 rounded-lg p-4 border">
                      <h4 className="font-medium mb-3">Document Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Title:</span>
                          <p className="font-medium">{localRequest.title}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <p className="font-medium capitalize">{localRequest.status}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <p className="font-medium">{new Date(localRequest.created_at).toLocaleDateString()}</p>
                        </div>
                        {localRequest.completed_at && (
                          <div>
                            <span className="text-muted-foreground">Completed:</span>
                            <p className="font-medium">{new Date(localRequest.completed_at).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signatures Section */}
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <PenTool className="h-4 w-4" />
                        Collected Signatures
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {localRequest.signers?.map((signer) => (
                          <div key={signer.id} className="border rounded-lg p-4 bg-card">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{signer.name}</p>
                                <p className="text-xs text-muted-foreground">{signer.email}</p>
                                <p className="text-xs text-muted-foreground capitalize">Role: {signer.role}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className={signer.status === 'signed' ? 'text-green-500 border-green-500' : 'text-yellow-500 border-yellow-500'}
                              >
                                {signer.status === 'signed' ? 'Signed' : 'Pending'}
                              </Badge>
                            </div>

                            {/* Show signature image if available */}
                            {signer.signature_data_url ? (
                              <div className="mt-3 border-t pt-3">
                                <p className="text-xs text-muted-foreground mb-2">Electronic Signature:</p>
                                <div className="bg-white border rounded p-2 inline-block">
                                  <img
                                    src={signer.signature_data_url}
                                    alt={`${signer.name}'s signature`}
                                    className="h-16 object-contain"
                                  />
                                </div>
                                {signer.signed_at && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Signed on: {new Date(signer.signed_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="mt-3 border-t pt-3">
                                <div className="bg-muted/30 border-2 border-dashed rounded p-4 text-center">
                                  <PenTool className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                                  <p className="text-xs text-muted-foreground">Awaiting signature</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t flex-wrap">
                      {/* View Signed PDF - opens in browser */}
                      <Button
                        onClick={() => {
                          const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/signatures/download-signed/${localRequest.id}?view=true`;
                          window.open(apiUrl, '_blank');
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Signed PDF
                      </Button>

                      {/* Download Signed PDF - calls backend to generate PDF with embedded signatures */}
                      <Button
                        onClick={() => {
                          const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/signatures/download-signed/${localRequest.id}`;
                          window.open(apiUrl, '_blank');
                        }}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                      >
                        <Download className="h-4 w-4" />
                        Download Signed PDF
                      </Button>

                      {/* Save to SimplifyDrive */}
                      <Button
                        onClick={handleSaveToDrive}
                        disabled={isSavingToDrive}
                        variant="outline"
                        className="gap-2"
                      >
                        {isSavingToDrive ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <HardDrive className="h-4 w-4" />
                        )}
                        {isSavingToDrive ? 'Saving...' : 'Save to SimplifyDrive'}
                      </Button>

                      {localRequest.status === 'completed' && (
                        <Button onClick={() => setShowCertificate(true)} variant="outline" className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Certificate
                        </Button>
                      )}
                      {localRequest.document_url && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            const url = getDocumentViewUrl(localRequest.document_url);
                            if (url) window.open(url, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View Original
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 p-6 m-0">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Audit Trail
                  </CardTitle>
                  <CardDescription>
                    Complete history of all actions on this request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="relative">
                      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                      <div className="space-y-4">
                        {auditLog.map((log, index) => {
                          const Icon = getAuditIcon(log.action);
                          const colorClass = getAuditColor(log.action);
                          return (
                            <div key={log.id} className="flex gap-4 relative">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center z-10",
                                colorClass
                              )}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 pb-4">
                                <p className="font-medium capitalize">
                                  {log.action.replace('_', ' ')}
                                </p>
                                {log.actor_name && (
                                  <p className="text-sm text-muted-foreground">
                                    by {log.actor_name} ({log.actor_email})
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(log.created_at).toLocaleString()}
                                </p>
                                {log.ip_address && (
                                  <p className="text-xs text-muted-foreground">
                                    IP: {log.ip_address}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SignaturePadDialog
        open={showSignDialog}
        onOpenChange={setShowSignDialog}
        type={signingAs as 'signature' | 'initial'}
        onSignatureSelect={async (dataUrl) => {
          // Pass position data if available
          await signDocument(localRequest.id, dataUrl, signaturePosition || undefined);
          setShowSignDialog(false);
          setSignaturePosition(null); // Reset position after signing

          // Fetch updated request data to refresh UI (signature display and status)
          const { data: updatedRequest } = await supabase
            .from('signature_requests')
            .select(`
              *,
              signers:signature_signers(*)
            `)
            .eq('id', localRequest.id)
            .single();

          if (updatedRequest) {
            // Map database fields to expected component fields
            setLocalRequest({
              ...updatedRequest,
              signers: updatedRequest.signers || []
            } as SignatureRequest);
          }
        }}
      />

      <SignatureCertificate
        request={localRequest}
        open={showCertificate}
        onClose={() => setShowCertificate(false)}
      />
    </div>
  );
};

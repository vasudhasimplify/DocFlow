import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Users, Clock, CheckCircle, XCircle,
  Send, Download, RefreshCw, MoreVertical, Mail, Eye,
  Calendar, Shield, AlertTriangle, PenTool
} from 'lucide-react';
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

  useEffect(() => {
    // Temporarily disabled audit log to fix freeze - TODO: fix later
    // const loadAudit = async () => {
    //   const logs = await getAuditLog(request.id);
    //   setAuditLog(logs);
    // };
    // loadAudit();

    // Get current user email
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserEmail(data.user.email || null);
    });
  }, [request.id]);

  const statusConfig = STATUS_CONFIG[request.status];
  const signers = request.signers?.filter(s => s.role === 'signer' || s.role === 'approver') || [];
  const signedCount = signers.filter(s => s.status === 'signed').length;
  const progress = signers.length ? (signedCount / signers.length) * 100 : 0;

  // Check if current user needs to sign
  const currentUserSigner = request.signers?.find(s => s.email === currentUserEmail);
  const needsMySignature = currentUserSigner && currentUserSigner.status === 'sent';

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
              <h1 className="text-xl font-bold">{request.title}</h1>
              <Badge variant="outline" className={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {new Date(request.created_at).toLocaleDateString()}
              {request.document_name && ` • ${request.document_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {request.status === 'draft' && (
              <Button onClick={() => sendRequest(request.id)}>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </Button>
            )}
            {request.status === 'pending' && (
              needsMySignature ? (
                <Button onClick={() => setShowSignDialog(true)} className="gap-2">
                  <PenTool className="h-4 w-4" />
                  Sign Document
                </Button>
              ) : (
                <Button variant="outline" onClick={() => cancelRequest(request.id)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )
            )}
            {request.status === 'completed' && (
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
                      {request.signers?.map((signer) => {
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
                <CardContent className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Document Preview</h3>
                    <p className="text-sm">
                      {request.document_name || 'No document attached'}
                    </p>
                    {request.document_url && (
                      <Button variant="outline" className="mt-4">
                        <Eye className="h-4 w-4 mr-2" />
                        View Document
                      </Button>
                    )}
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

      {/* Signature Dialog */}
      <SignaturePadDialog
        open={showSignDialog}
        onOpenChange={setShowSignDialog}
        type={signingAs as 'signature' | 'initial'}
        onSignatureSelect={async (dataUrl) => {
          await signDocument(request.id, dataUrl);
          setShowSignDialog(false);
        }}
      />

      {/* Certificate Dialog */}
      <SignatureCertificate
        request={request}
        open={showCertificate}
        onClose={() => setShowCertificate(false)}
      />
    </div>
  );
};

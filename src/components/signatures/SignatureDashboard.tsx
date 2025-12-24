import React, { useState } from 'react';
import {
  PenTool, FileText, Clock, CheckCircle, XCircle, Send,
  Plus, RefreshCw, Users, Calendar, AlertTriangle, Download,
  Eye, MoreVertical, Trash2, Copy, Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useElectronicSignatures } from '@/hooks/useElectronicSignatures';
import { CreateSignatureRequestDialog } from './CreateSignatureRequestDialog';
import { SignatureRequestDetail } from './SignatureRequestDetail';
import { SignaturePadDialog } from './SignaturePadDialog';
import { STATUS_CONFIG, SIGNER_STATUS_CONFIG } from '@/types/signature';
import type { SignatureRequest, SignatureRequestStatus } from '@/types/signature';
import { cn } from '@/lib/utils';

export const SignatureDashboard: React.FC = () => {
  const {
    requests,
    stats,
    isLoading,
    activeRequest,
    setActiveRequest,
    refresh,
    sendRequest,
    cancelRequest,
  } = useElectronicSignatures();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'drafts' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.signers?.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    switch (activeTab) {
      case 'pending': return matchesSearch && request.status === 'pending';
      case 'completed': return matchesSearch && request.status === 'completed';
      case 'drafts': return matchesSearch && request.status === 'draft';
      case 'cancelled': return matchesSearch && request.status === 'cancelled';
      default: return matchesSearch;
    }
  });

  const statCards = [
    {
      title: 'Total Requests',
      value: stats.total_requests,
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      alert: stats.pending > 0,
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Awaiting My Signature',
      value: stats.awaiting_my_signature,
      icon: PenTool,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      alert: stats.awaiting_my_signature > 0,
    },
    {
      title: 'Completion Rate',
      value: `${stats.completion_rate}%`,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isPercentage: true,
    },
    {
      title: 'Declined/Expired',
      value: stats.declined + stats.expired,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const getSignerProgress = (request: SignatureRequest) => {
    const signers = request.signers?.filter(s => s.role === 'signer' || s.role === 'approver') || [];
    const signed = signers.filter(s => s.status === 'signed').length;
    return { signed, total: signers.length, percentage: signers.length ? (signed / signers.length) * 100 : 0 };
  };

  if (activeRequest) {
    return (
      <SignatureRequestDetail
        request={activeRequest}
        onBack={() => setActiveRequest(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b p-6 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PenTool className="h-7 w-7 text-primary" />
              Electronic Signatures
            </h1>
            <p className="text-muted-foreground mt-1">
              Send, track, and sign documents securely
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSignaturePad(true)}>
              <PenTool className="h-4 w-4 mr-2" />
              My Signatures
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={cn("relative overflow-hidden", stat.alert && "ring-2 ring-primary/50")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.alert && (
                    <AlertTriangle className="h-4 w-4 text-primary animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.isPercentage && (
                    <Progress value={stats.completion_rate} className="h-1 mt-2" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6 shrink-0 flex items-center justify-between">
          <TabsList className="h-12">
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All
              <Badge variant="secondary">{requests.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {stats.pending > 0 && <Badge>{stats.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
              <Badge variant="secondary">{stats.completed}</Badge>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="gap-2">
              <Edit className="h-4 w-4" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelled
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 py-2">
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <ScrollArea className="h-full">
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const statusConfig = STATUS_CONFIG[request.status as SignatureRequestStatus];
                const progress = getSignerProgress(request);

                return (
                  <Card
                    key={request.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setActiveRequest(request)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className={cn("p-3 rounded-lg", statusConfig.bgColor)}>
                          <FileText className={cn("h-6 w-6", statusConfig.color)} />
                        </div>

                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{request.title}</h3>
                            <Badge variant="outline" className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                            {request.signing_order === 'sequential' && (
                              <Badge variant="secondary" className="text-xs">Sequential</Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {request.document_name && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {request.document_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {request.signers?.length || 0} recipients
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                            {request.expires_at && (
                              <span className="flex items-center gap-1 text-orange-500">
                                <Clock className="h-3 w-3" />
                                Expires: {new Date(request.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Signers Progress */}
                          {request.status === 'pending' && progress.total > 0 && (
                            <div className="mt-2 flex items-center gap-3">
                              <Progress value={progress.percentage} className="h-2 flex-1 max-w-xs" />
                              <span className="text-xs text-muted-foreground">
                                {progress.signed}/{progress.total} signed
                              </span>
                            </div>
                          )}

                          {/* Signer Avatars */}
                          <div className="mt-2">
                            <div className="flex items-center gap-1">
                              {request.signers?.slice(0, 5).map((signer) => {
                                const signerStatus = SIGNER_STATUS_CONFIG[signer.status];
                                return (
                                  <div
                                    key={signer.id}
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2",
                                      signer.status === 'signed' ? 'bg-green-500/20 border-green-500 text-green-700' :
                                        signer.status === 'declined' ? 'bg-red-500/20 border-red-500 text-red-700' :
                                          signer.status === 'viewed' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-700' :
                                            'bg-muted border-border text-muted-foreground'
                                    )}
                                    title={`${signer.name} - ${signerStatus.label}`}
                                  >
                                    {signer.name.charAt(0).toUpperCase()}
                                  </div>
                                );
                              })}
                              {(request.signers?.length || 0) > 5 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  +{(request.signers?.length || 0) - 5}
                                </span>
                              )}
                            </div>
                            {/* Show recipient names */}
                            {request.signers && request.signers.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                Recipients: {request.signers.slice(0, 3).map(s => s.name).join(', ')}
                                {request.signers.length > 3 && '...'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {request.status === 'draft' && (
                            <Button size="sm" onClick={() => sendRequest(request.id)}>
                              <Send className="h-4 w-4 mr-2" />
                              Send
                            </Button>
                          )}
                          {request.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setActiveRequest(request)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              {request.status === 'pending' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => cancelRequest(request.id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel Request
                                  </DropdownMenuItem>
                                </>
                              )}
                              {request.status === 'draft' && (
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredRequests.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <PenTool className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No signature requests</h3>
                  <p className="text-sm mb-4">Create your first signature request to get started</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Request
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </Tabs>

      {/* Dialogs */}
      <CreateSignatureRequestDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <SignaturePadDialog
        open={showSignaturePad}
        onOpenChange={setShowSignaturePad}
      />
    </div>
  );
};

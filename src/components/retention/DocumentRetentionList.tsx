import React, { useState } from 'react';
import { 
  FileText, Search, Filter, Clock, Shield, Lock,
  AlertTriangle, CheckCircle, Archive, Trash2, Eye,
  MoreVertical, Calendar, RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { RETENTION_STATUS_CONFIG } from '@/types/retention';
import type { RetentionStatus } from '@/types/retention';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const DocumentRetentionList: React.FC = () => {
  const { 
    documentStatuses, 
    policies, 
    filter, 
    setFilter,
    disposeDocument,
    grantException,
  } = useRetentionPolicies();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'expiring' | 'created' | 'status'>('expiring');
  const [documentsMap, setDocumentsMap] = useState<Map<string, { file_name: string }>>(new Map());
  const [viewDocumentId, setViewDocumentId] = useState<string | null>(null);
  const [changePolicyDocId, setChangePolicyDocId] = useState<string | null>(null);
  const [selectedPolicyForChange, setSelectedPolicyForChange] = useState<string>('');
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ docId: string; newStatus: string } | null>(null);

  // Fetch document details
  React.useEffect(() => {
    const fetchDocuments = async () => {
      if (documentStatuses.length === 0) return;
      
      const uniqueDocIds = Array.from(new Set(documentStatuses.map(d => d.document_id)));
      
      // Import supabase dynamically
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name')
        .in('id', uniqueDocIds);
      
      if (data && !error) {
        const newMap = new Map();
        data.forEach(doc => newMap.set(doc.id, { file_name: doc.file_name }));
        setDocumentsMap(newMap);
      }
    };
    
    fetchDocuments();
  }, [documentStatuses]);

  const filteredDocs = documentStatuses.filter(doc => {
    const fileName = documentsMap.get(doc.document_id)?.file_name || doc.document_id;
    const matchesSearch = fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.document_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedDocs = [...filteredDocs].sort((a, b) => {
    switch (sortBy) {
      case 'expiring':
        return new Date(a.retention_end_date).getTime() - new Date(b.retention_end_date).getTime();
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'status':
        return a.current_status.localeCompare(b.current_status);
      default:
        return 0;
    }
  });

  const getRetentionProgress = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    return Math.ceil((end - now) / (24 * 60 * 60 * 1000));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'pending_review': return Eye;
      case 'pending_approval': return Clock;
      case 'on_hold': return Lock;
      case 'disposed': return Trash2;
      case 'archived': return Archive;
      default: return FileText;
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select 
          value={filter.status?.join(',') || 'all'} 
          onValueChange={(v) => setFilter({ ...filter, status: v === 'all' ? undefined : [v as RetentionStatus] })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(RETENTION_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiring">Expiring Soon</SelectItem>
            <SelectItem value="created">Recently Added</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant={filter.expiring_within_days === 30 ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter({ 
            ...filter, 
            expiring_within_days: filter.expiring_within_days === 30 ? undefined : 30 
          })}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Expiring Soon
        </Button>

        <Button 
          variant={filter.on_legal_hold ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setFilter({ 
            ...filter, 
            on_legal_hold: filter.on_legal_hold ? undefined : true 
          })}
        >
          <Lock className="h-4 w-4 mr-2" />
          On Hold
        </Button>
      </div>

      {/* Document List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {sortedDocs.map((doc) => {
            const policy = policies.find(p => p.id === doc.policy_id);
            const daysRemaining = getDaysRemaining(doc.retention_end_date);
            const progress = getRetentionProgress(doc.retention_start_date, doc.retention_end_date);
            const statusConfig = RETENTION_STATUS_CONFIG[doc.current_status as RetentionStatus];
            const StatusIcon = getStatusIcon(doc.current_status);
            const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
            const isExpired = daysRemaining <= 0;
            const isOnHold = doc.legal_hold_ids?.length > 0;

            return (
              <Card 
                key={doc.id} 
                className={cn(
                  "transition-colors",
                  isExpired && "border-red-500/50 bg-red-500/5",
                  isExpiringSoon && !isExpired && "border-orange-500/50 bg-orange-500/5",
                  isOnHold && "border-purple-500/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={cn("p-2 rounded-lg", statusConfig?.color.replace('bg-', 'bg-') + '/10')}>
                      <StatusIcon className={cn("h-5 w-5", statusConfig?.color.replace('bg-', 'text-'))} />
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <button
                          onClick={async () => {
                            try {
                              const { data: docData, error } = await supabase
                                .from('documents')
                                .select('storage_path')
                                .eq('id', doc.document_id)
                                .single();
                              
                              if (error) throw error;
                              if (docData?.storage_path) {
                                const { data: urlData } = await supabase.storage
                                  .from('documents')
                                  .createSignedUrl(docData.storage_path, 3600);
                                
                                if (urlData?.signedUrl) {
                                  window.open(urlData.signedUrl, '_blank');
                                }
                              }
                            } catch (error) {
                              console.error('Error opening document:', error);
                              toast({ title: 'Error', description: 'Failed to open document', variant: 'destructive' });
                            }
                          }}
                          className="font-medium truncate text-primary hover:underline cursor-pointer text-left"
                        >
                          {documentsMap.get(doc.document_id)?.file_name || `Document ${doc.document_id.slice(0, 12)}...`}
                        </button>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", statusConfig?.color.replace('bg-', 'border-'))}
                        >
                          {statusConfig?.label}
                        </Badge>
                        {isOnHold && (
                          <Badge className="bg-purple-500 text-xs">
                            <Lock className="h-3 w-3 mr-1" />
                            Legal Hold
                          </Badge>
                        )}
                        {policy && (
                          <Badge variant="secondary" className="text-xs">
                            {policy.name}
                          </Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-2",
                              isExpired && "[&>div]:bg-red-500",
                              isExpiringSoon && !isExpired && "[&>div]:bg-orange-500"
                            )}
                          />
                        </div>
                        <span className={cn(
                          "text-xs font-medium min-w-[80px] text-right",
                          isExpired && "text-red-500",
                          isExpiringSoon && !isExpired && "text-orange-500"
                        )}>
                          {isExpired ? 'Expired' : `${daysRemaining} days left`}
                        </span>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Start: {new Date(doc.retention_start_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          End: {new Date(doc.retention_end_date).toLocaleDateString()}
                        </span>
                        {doc.exception_reason && (
                          <Badge variant="outline" className="text-xs">
                            Exception granted
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewDocumentId(doc.document_id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChangePolicyDocId(doc.document_id)}>
                          <Shield className="h-4 w-4 mr-2" />
                          Change Policy
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusChangeDialog({ docId: doc.document_id, newStatus: 'pending_review' })}>
                          <Eye className="h-4 w-4 mr-2" />
                          Mark for Review
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusChangeDialog({ docId: doc.document_id, newStatus: 'pending_approval' })}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark for Approval
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => grantException(doc.document_id, 'Extended per request', 90)}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Extend 90 Days
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => disposeDocument(doc.document_id, 'archive')}
                          disabled={isOnHold || doc.current_status === 'archived' || doc.current_status === 'disposed'}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {doc.current_status === 'archived' ? 'Already Archived' : 'Archive Now'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={doc.current_status === 'archived' ? 'text-orange-500' : 'text-destructive'}
                          onClick={() => {
                            if (doc.current_status === 'archived') {
                              // For archived documents, mark for approval first
                              setStatusChangeDialog({ docId: doc.document_id, newStatus: 'pending_approval' });
                            } else {
                              disposeDocument(doc.document_id, 'delete');
                            }
                          }}
                          disabled={isOnHold || doc.current_status === 'disposed'}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {doc.current_status === 'disposed' ? 'Already Disposed' : 
                           doc.current_status === 'archived' ? 'Request Disposal' : 'Dispose Now'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {sortedDocs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No documents tracked</h3>
              <p className="text-sm">Documents with retention policies will appear here</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* View Document Dialog */}
      <Dialog open={!!viewDocumentId} onOpenChange={() => setViewDocumentId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Retention information for this document
            </DialogDescription>
          </DialogHeader>
          {viewDocumentId && (() => {
            const doc = documentStatuses.find(d => d.document_id === viewDocumentId);
            const policy = policies.find(p => p.id === doc?.policy_id);
            const fileName = documentsMap.get(viewDocumentId)?.file_name;
            
            if (!doc) return <p>Document not found</p>;
            
            const daysRemaining = Math.ceil((new Date(doc.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            const statusConfig = RETENTION_STATUS_CONFIG[doc.current_status as RetentionStatus];
            
            return (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">File Information</h4>
                  <p className="text-sm"><strong>Name:</strong> {fileName || 'Unknown'}</p>
                  <p className="text-sm"><strong>Document ID:</strong> {doc.document_id}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Retention Policy</h4>
                  <p className="text-sm"><strong>Policy:</strong> {policy?.name || 'No policy'}</p>
                  <p className="text-sm"><strong>Status:</strong> <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge></p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Timeline</h4>
                  <p className="text-sm"><strong>Start Date:</strong> {new Date(doc.retention_start_date).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>End Date:</strong> {new Date(doc.retention_end_date).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Days Remaining:</strong> {daysRemaining > 0 ? daysRemaining : 'Expired'}</p>
                </div>
                {doc.legal_hold_ids && doc.legal_hold_ids.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Legal Holds</h4>
                    <p className="text-sm text-purple-600">This document is under {doc.legal_hold_ids.length} legal hold(s)</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            <Button onClick={() => setViewDocumentId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Policy Dialog */}
      <Dialog open={!!changePolicyDocId} onOpenChange={() => setChangePolicyDocId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Retention Policy</DialogTitle>
            <DialogDescription>
              Select a new policy for this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={selectedPolicyForChange} onValueChange={setSelectedPolicyForChange}>
              {policies.filter(p => p.is_active).map(policy => (
                <div key={policy.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={policy.id} id={policy.id} />
                  <Label htmlFor={policy.id} className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">{policy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {policy.retention_period_days} days • {policy.disposition_action}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePolicyDocId(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!changePolicyDocId || !selectedPolicyForChange) return;
              
              try {
                const policy = policies.find(p => p.id === selectedPolicyForChange);
                if (!policy) return;
                
                const now = new Date();
                const retentionEndDate = new Date(now.getTime() + policy.retention_period_days * 24 * 60 * 60 * 1000);
                
                const { error } = await supabase
                  .from('document_retention_status')
                  .update({
                    policy_id: selectedPolicyForChange,
                    retention_end_date: retentionEndDate.toISOString(),
                    disposition_action: policy.disposition_action,
                    updated_at: now.toISOString()
                  })
                  .eq('document_id', changePolicyDocId);
                
                if (error) throw error;
                
                toast({ title: 'Success', description: 'Policy changed successfully' });
                setChangePolicyDocId(null);
                setSelectedPolicyForChange('');
                window.location.reload();
              } catch (error) {
                console.error('Error changing policy:', error);
                toast({ title: 'Error', description: 'Failed to change policy', variant: 'destructive' });
              }
            }} disabled={!selectedPolicyForChange}>
              Change Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={!!statusChangeDialog} onOpenChange={() => setStatusChangeDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Document Status</DialogTitle>
            <DialogDescription>
              Mark this document for {statusChangeDialog?.newStatus === 'pending_review' ? 'review' : 'approval'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">This will change the document status and notify relevant parties.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusChangeDialog(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!statusChangeDialog) return;
              
              try {
                const { error } = await supabase
                  .from('document_retention_status')
                  .update({
                    current_status: statusChangeDialog.newStatus,
                    updated_at: new Date().toISOString()
                  })
                  .eq('document_id', statusChangeDialog.docId);
                
                if (error) throw error;
                
                toast({ title: 'Success', description: 'Status updated successfully' });
                setStatusChangeDialog(null);
                window.location.reload();
              } catch (error) {
                console.error('Error updating status:', error);
                toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
              }
            }}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

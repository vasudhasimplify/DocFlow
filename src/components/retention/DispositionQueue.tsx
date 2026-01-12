import React, { useState, useEffect } from 'react';
import { 
  Trash2, Archive, Eye, CheckCircle, XCircle, Clock,
  AlertTriangle, FileText, Search, Filter, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { DISPOSITION_ACTIONS } from '@/types/retention';
import type { DispositionAction } from '@/types/retention';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const DispositionQueue: React.FC = () => {
  const { documentStatuses, policies, disposeDocument, grantException } = useRetentionPolicies();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<DispositionAction>('archive');
  const [bulkReason, setBulkReason] = useState('');
  const [documentsMap, setDocumentsMap] = useState<Map<string, { file_name: string }>>(new Map());
  const { toast } = useToast();

  // Fetch document names
  useEffect(() => {
    const fetchDocumentNames = async () => {
      const docIds = documentStatuses.map(d => d.document_id);
      if (docIds.length === 0) return;

      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name')
        .in('id', docIds);

      if (error) {
        console.error('Error fetching document names:', error);
        return;
      }

      if (data) {
        const map = new Map(data.map(doc => [doc.id, { file_name: doc.file_name }]));
        setDocumentsMap(map);
      }
    };

    fetchDocumentNames();
  }, [documentStatuses]);

  // Get all documents for disposition queue - show documents that are:
  // 1. pending_review or pending_approval status
  // 2. active documents that have passed their retention end date
  // 3. active documents approaching end date (within 30 days)
  const pendingDocs = documentStatuses.filter(doc => {
    // Exclude documents that are already disposed or archived
    if (doc.current_status === 'disposed' || doc.current_status === 'archived') {
      return false;
    }
    
    // Always show pending_review and pending_approval
    if (doc.current_status === 'pending_review' || doc.current_status === 'pending_approval') {
      return true;
    }
    
    // Show active documents that are past end date or within 30 days of end date
    if (doc.current_status === 'active') {
      const endDate = new Date(doc.retention_end_date);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return endDate <= thirtyDaysFromNow;
    }
    
    // Also show on_hold documents for visibility
    if (doc.current_status === 'on_hold') {
      return true;
    }
    
    return false;
  });

  console.log('DispositionQueue - Total document statuses:', documentStatuses.length);
  console.log('DispositionQueue - Pending docs:', pendingDocs.length);
  console.log('DispositionQueue - Document statuses sample:', documentStatuses.slice(0, 3));
  console.log('DispositionQueue - Status breakdown:', documentStatuses.reduce((acc, d) => { acc[d.current_status] = (acc[d.current_status] || 0) + 1; return acc; }, {} as Record<string, number>));

  const filteredDocs = pendingDocs.filter(doc => {
    const documentName = documentsMap.get(doc.document_id)?.file_name || '';
    const matchesSearch = searchQuery === '' ||
      doc.document_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.disposition_notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || doc.disposition_action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDocs(filteredDocs.map(d => d.document_id));
    } else {
      setSelectedDocs([]);
    }
  };

  const handleSelectDoc = (docId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocs(prev => [...prev, docId]);
    } else {
      setSelectedDocs(prev => prev.filter(id => id !== docId));
    }
  };

  const handleBulkAction = async () => {
    try {
      for (const docId of selectedDocs) {
        await disposeDocument(docId, bulkAction, bulkReason);
      }
      toast({
        title: "Success",
        description: `${selectedDocs.length} document(s) ${bulkAction === 'archive' ? 'archived' : 'disposed'} successfully`,
      });
      setSelectedDocs([]);
      setBulkActionDialog(false);
      setBulkReason('');
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error in bulk action:', error);
      toast({
        title: "Error",
        description: `Failed to ${bulkAction} documents`,
        variant: "destructive",
      });
    }
  };

  const handleSingleDispose = async (docId: string, action: DispositionAction) => {
    try {
      await disposeDocument(docId, action);
      toast({
        title: "Success",
        description: `Document ${action === 'archive' ? 'archived' : 'disposed'} successfully`,
      });
      window.location.reload();
    } catch (error) {
      console.error('Error disposing document:', error);
      toast({
        title: "Error",
        description: `Failed to ${action} document`,
        variant: "destructive",
      });
    }
  };

  const handleExtend = async (docId: string) => {
    try {
      await grantException(docId, 'Extended for review', 30);
      toast({
        title: "Success",
        description: "Retention period extended by 30 days",
      });
      window.location.reload();
    } catch (error) {
      console.error('Error extending retention:', error);
      toast({
        title: "Error",
        description: "Failed to extend retention period",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'delete': return Trash2;
      case 'archive': return Archive;
      case 'review': return Eye;
      case 'transfer': return Send;
      default: return FileText;
    }
  };

  return (
    <div className="p-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Eye className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingDocs.filter(d => d.current_status === 'pending_review').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingDocs.filter(d => d.current_status === 'pending_approval').length}
              </p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {pendingDocs.filter(d => new Date(d.retention_end_date) <= new Date()).length}
              </p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDocs.length}</p>
              <p className="text-xs text-muted-foreground">Total in Queue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <Checkbox
          checked={selectedDocs.length === filteredDocs.length && filteredDocs.length > 0}
          onCheckedChange={handleSelectAll}
        />
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {DISPOSITION_ACTIONS.map((action) => (
              <SelectItem key={action.value} value={action.value}>{action.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedDocs.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedDocs.length} selected</Badge>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setBulkAction('archive');
                setBulkActionDialog(true);
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Selected
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => {
                setBulkAction('delete');
                setBulkActionDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Dispose Selected
            </Button>
          </div>
        )}
      </div>

      {/* Queue List */}
      <div className="space-y-2">
        {filteredDocs.map((doc) => {
            const policy = policies.find(p => p.id === doc.policy_id);
            const isExpired = new Date(doc.retention_end_date) <= new Date();
            const ActionIcon = getActionIcon(doc.disposition_action || 'review');

            return (
              <Card 
                key={doc.id} 
                className={cn(
                  "transition-colors",
                  selectedDocs.includes(doc.document_id) && "ring-2 ring-primary",
                  isExpired && "border-red-500/50 bg-red-500/5"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedDocs.includes(doc.document_id)}
                      onCheckedChange={(checked) => handleSelectDoc(doc.document_id, checked as boolean)}
                    />

                    <div className={cn(
                      "p-2 rounded-lg",
                      doc.disposition_action === 'delete' ? "bg-red-500/10" :
                      doc.disposition_action === 'archive' ? "bg-purple-500/10" :
                      "bg-yellow-500/10"
                    )}>
                      <ActionIcon className={cn(
                        "h-5 w-5",
                        doc.disposition_action === 'delete' ? "text-red-500" :
                        doc.disposition_action === 'archive' ? "text-purple-500" :
                        "text-yellow-500"
                      )} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {documentsMap.get(doc.document_id)?.file_name || `Document ${doc.document_id.slice(0, 12)}...`}
                        </span>
                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                          {isExpired ? 'Expired' : doc.current_status.replace('_', ' ')}
                        </Badge>
                        {policy && (
                          <Badge variant="outline">{policy.name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Retention ended: {new Date(doc.retention_end_date).toLocaleDateString()}
                        </span>
                        <span>
                          Scheduled action: {doc.disposition_action || 'Review'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleExtend(doc.document_id)}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Extend 30d
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSingleDispose(doc.document_id, 'archive')}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleSingleDispose(doc.document_id, 'delete')}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Dispose
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <h3 className="text-lg font-medium mb-2">Queue is empty</h3>
              <p className="text-sm">No documents pending disposition</p>
            </div>
          )}
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'delete' ? 'Dispose Documents' : 'Archive Documents'}
            </DialogTitle>
            <DialogDescription>
              You are about to {bulkAction} {selectedDocs.length} document(s). This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Provide a reason for this bulk action..."
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAction}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            >
              {bulkAction === 'delete' ? (
                <><Trash2 className="h-4 w-4 mr-2" /> Dispose {selectedDocs.length} Documents</>
              ) : (
                <><Archive className="h-4 w-4 mr-2" /> Archive {selectedDocs.length} Documents</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

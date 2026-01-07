import React, { useState, useEffect } from 'react';
import { 
  Clock, Search, Filter, Download, FileText,
  Trash2, Archive, Lock, Unlock, RefreshCw, CheckCircle, AlertTriangle, Eye
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DispositionAuditLog } from '@/types/retention';
import { cn } from '@/lib/utils';
import { DocumentViewer } from '@/components/document-manager/DocumentViewer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  storage_url?: string;
  storage_path?: string;
}

interface RetentionAuditLogProps {
  logs: DispositionAuditLog[];
}

export const RetentionAuditLog: React.FC<RetentionAuditLogProps> = ({ logs }) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('30d');
  const [documentNames, setDocumentNames] = useState<Record<string, string>>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [loadingDocumentId, setLoadingDocumentId] = useState<string | null>(null);

  // Fetch document names for all logs
  useEffect(() => {
    const fetchDocumentNames = async () => {
      const documentIds = [...new Set(logs.map(log => log.document_id))];
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name')
        .in('id', documentIds);

      if (!error && data) {
        const namesMap: Record<string, string> = {};
        data.forEach(doc => {
          namesMap[doc.id] = doc.file_name;
        });
        setDocumentNames(namesMap);
      }
    };

    if (logs.length > 0) {
      fetchDocumentNames();
    }
  }, [logs]);

  const handleViewDocument = async (documentId: string) => {
    try {
      setLoadingDocumentId(documentId);
      
      const { data: document, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching document:', error);
        toast({
          title: "Error loading document",
          description: error.message || "Unable to load the document.",
          variant: "destructive",
        });
        return;
      }

      if (!document) {
        toast({
          title: "Document unavailable",
          description: "This document may have been deleted or you no longer have access to it.",
          variant: "destructive",
        });
        return;
      }

      setSelectedDocument(document);
      setShowDocumentViewer(true);
    } catch (error) {
      console.error('Error loading document:', error);
      toast({
        title: "Error loading document",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDocumentId(null);
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.document_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        documentNames[log.document_id]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Date filter
    if (dateRange !== 'all') {
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(log => new Date(log.created_at) >= cutoff);
    }

    return filtered;
  };

  const filteredLogs = getFilteredLogs();

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'disposed': return Trash2;
      case 'archived': return Archive;
      case 'held': return Lock;
      case 'released': return Unlock;
      case 'extended': return RefreshCw;
      case 'exception_granted': return CheckCircle;
      case 'policy_applied': return FileText;
      case 'legal_hold_applied': return Lock;
      case 'legal_hold_released': return Unlock;
      case 'status_changed': return RefreshCw;
      default: return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'disposed': return 'text-red-500 bg-red-500/10';
      case 'archived': return 'text-purple-500 bg-purple-500/10';
      case 'held': return 'text-blue-500 bg-blue-500/10';
      case 'released': return 'text-green-500 bg-green-500/10';
      case 'extended': return 'text-orange-500 bg-orange-500/10';
      case 'exception_granted': return 'text-yellow-500 bg-yellow-500/10';
      case 'policy_applied': return 'text-blue-500 bg-blue-500/10';
      case 'legal_hold_applied': return 'text-purple-500 bg-purple-500/10';
      case 'legal_hold_released': return 'text-green-500 bg-green-500/10';
      case 'status_changed': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getActionLabel = (action: string, reason?: string) => {
    switch (action) {
      case 'disposed': return 'Document Disposed';
      case 'archived': return 'Document Archived';
      case 'held': return 'Legal Hold Applied';
      case 'released': return 'Legal Hold Released';
      case 'extended': return 'Retention Period Extended';
      case 'exception_granted': return 'Exception Granted';
      case 'policy_applied': return 'Retention Policy Applied';
      case 'legal_hold_applied': return 'Legal Hold Applied';
      case 'legal_hold_released': return 'Legal Hold Released';
      case 'status_changed': return 'Status Changed';
      default: return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Action', 'Document ID', 'Previous Status', 'New Status', 'Reason', 'Certificate'],
      ...filteredLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.action,
        log.document_id,
        log.previous_status || '',
        log.new_status || '',
        log.reason || '',
        log.certificate_number || '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retention-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document"
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
            <SelectItem value="disposed">Disposed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="held">Held</SelectItem>
            <SelectItem value="released">Released</SelectItem>
            <SelectItem value="extended">Extended</SelectItem>
            <SelectItem value="exception_granted">Exception Granted</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-1">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range)}
            >
              {range === 'all' ? 'All Time' : range}
            </Button>
          ))}
        </div>

        <Button variant="outline" onClick={exportLogs}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <Badge variant="secondary">
          {filteredLogs.length} records
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-red-500" />
            {filteredLogs.filter(l => l.action === 'disposed').length} disposed
          </span>
          <span className="flex items-center gap-1">
            <Archive className="h-3 w-3 text-purple-500" />
            {filteredLogs.filter(l => l.action === 'archived').length} archived
          </span>
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-blue-500" />
            {filteredLogs.filter(l => l.action === 'held').length} held
          </span>
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-2">
          {filteredLogs.map((log) => {
            const ActionIcon = getActionIcon(log.action);
            const colorClasses = getActionColor(log.action);

            return (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("p-2 rounded-lg", colorClasses.split(' ')[1])}>
                      <ActionIcon className={cn("h-5 w-5", colorClasses.split(' ')[0])} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium cursor-help">
                                {getActionLabel(log.action, log.reason)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <p className="text-xs"><strong>Document ID:</strong> {log.document_id}</p>
                                {log.certificate_number && (
                                  <p className="text-xs"><strong>Certificate:</strong> {log.certificate_number}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>

                      {documentNames[log.document_id] && (
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">
                            {documentNames[log.document_id]}
                          </span>
                        </div>
                      )}

                      {log.reason && (
                        <p className="text-sm text-muted-foreground mb-2">{log.reason}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        {log.previous_status && log.new_status && (
                          <span>
                            {log.previous_status} → {log.new_status}
                          </span>
                        )}
                        {log.ip_address && (
                          <span>IP: {log.ip_address}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewDocument(log.document_id)}
                        disabled={loadingDocumentId === log.document_id}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No audit records</h3>
              <p className="text-sm">Disposition activities will be logged here</p>
            </div>
          )}
      </div>

      {/* Document Viewer Dialog */}
      <DocumentViewer
        document={selectedDocument}
        isOpen={showDocumentViewer}
        onClose={() => {
          setShowDocumentViewer(false);
          setSelectedDocument(null);
        }}
      />
    </div>
  );
};

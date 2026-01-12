import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Clock, Shield, Lock,
  AlertTriangle, CheckCircle, Archive, Trash2, Eye,
  MoreVertical, Calendar, RefreshCw, ArrowLeft, X, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { RETENTION_STATUS_CONFIG } from '@/types/retention';
import type { RetentionStatus } from '@/types/retention';
import { DocumentAuditLog } from './DocumentAuditLog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Document filter type
type DocumentFilterType = 
  | 'active' 
  | 'pending_review' 
  | 'pending_approval' 
  | 'on_hold' 
  | 'disposed' 
  | 'archived'
  | 'expiring_soon'
  | 'legal_hold'
  | 'all';

interface DocumentRetentionListProps {
  initialFilter?: DocumentFilterType;
}

export const DocumentRetentionList: React.FC<DocumentRetentionListProps> = ({ initialFilter }) => {
  const { 
    documentStatuses, 
    policies, 
    legalHolds,
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
  const [localStatusFilter, setLocalStatusFilter] = useState<string | undefined>(undefined);
  
  // Multi-select filters
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedPolicies, setSelectedPolicies] = useState<Set<string>>(new Set());
  const [showLegalHoldOnly, setShowLegalHoldOnly] = useState(false);
  const [showExpiringSoon, setShowExpiringSoon] = useState(false);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  
  // Apply initial filter when provided
  useEffect(() => {
    if (initialFilter) {
      switch (initialFilter) {
        case 'active':
        case 'pending_review':
        case 'pending_approval':
        case 'on_hold':
        case 'disposed':
        case 'archived':
          setSelectedStatuses(new Set([initialFilter]));
          break;
        case 'expiring_soon':
          setShowExpiringSoon(true);
          setSortBy('expiring');
          break;
        case 'legal_hold':
          setShowLegalHoldOnly(true);
          break;
        case 'all':
        default:
          setSelectedStatuses(new Set());
          break;
      }
    }
  }, [initialFilter]);

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

  // Helper to get document's retention reason/definition
  const getDocumentRetentionReason = (doc: typeof documentStatuses[0]) => {
    const reasons: string[] = [];
    
    // Policy info
    const policy = policies.find(p => p.id === doc.policy_id);
    if (policy) {
      reasons.push(`Policy: ${policy.name}`);
      if (policy.description) {
        reasons.push(`Description: ${policy.description}`);
      }
      reasons.push(`Retention: ${Math.floor(policy.retention_period_days / 365)} years (${policy.retention_period_days} days)`);
      reasons.push(`Disposition: ${policy.disposition_action}`);
      if (policy.compliance_framework) {
        reasons.push(`Compliance: ${policy.compliance_framework}`);
      }
    }
    
    // Legal hold info
    if (doc.legal_hold_ids?.length > 0) {
      const holds = legalHolds.filter(h => doc.legal_hold_ids.includes(h.id));
      holds.forEach(hold => {
        reasons.push(`Legal Hold: ${hold.name}`);
        if (hold.hold_reason) {
          reasons.push(`Reason: ${hold.hold_reason}`);
        }
        if (hold.matter_id) {
          reasons.push(`Matter ID: ${hold.matter_id}`);
        }
      });
    }
    
    // Exception info
    if (doc.exception_reason) {
      reasons.push(`Exception: ${doc.exception_reason}`);
    }
    
    return reasons;
  };

  const filteredDocs = documentStatuses.filter(doc => {
    const fileName = documentsMap.get(doc.document_id)?.file_name || doc.document_id;
    const matchesSearch = fileName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         doc.document_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply multi-select status filter
    let matchesStatus = true;
    if (selectedStatuses.size > 0) {
      matchesStatus = selectedStatuses.has(doc.current_status);
    }
    
    // Apply policy filter
    let matchesPolicy = true;
    if (selectedPolicies.size > 0) {
      matchesPolicy = selectedPolicies.has(doc.policy_id);
    }
    
    // Apply legal hold filter
    let matchesLegalHold = true;
    if (showLegalHoldOnly) {
      matchesLegalHold = doc.legal_hold_ids?.length > 0;
    }
    
    // Apply expiring soon filter
    let matchesExpiring = true;
    if (showExpiringSoon) {
      const daysLeft = Math.ceil((new Date(doc.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      matchesExpiring = daysLeft <= 30 && daysLeft > 0;
    }
    
    return matchesSearch && matchesStatus && matchesPolicy && matchesLegalHold && matchesExpiring;
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

  // Helper to toggle status filter
  const toggleStatusFilter = (status: string) => {
    const newSet = new Set(selectedStatuses);
    if (newSet.has(status)) {
      newSet.delete(status);
    } else {
      newSet.add(status);
    }
    setSelectedStatuses(newSet);
  };

  // Helper to toggle policy filter
  const togglePolicyFilter = (policyId: string) => {
    const newSet = new Set(selectedPolicies);
    if (newSet.has(policyId)) {
      newSet.delete(policyId);
    } else {
      newSet.add(policyId);
    }
    setSelectedPolicies(newSet);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedStatuses(new Set());
    setSelectedPolicies(new Set());
    setShowLegalHoldOnly(false);
    setShowExpiringSoon(false);
    setSearchQuery('');
  };

  // Count active filters
  const activeFilterCount = selectedStatuses.size + selectedPolicies.size + 
    (showLegalHoldOnly ? 1 : 0) + (showExpiringSoon ? 1 : 0);

  return (
    <TooltipProvider>
    <div className="p-6 max-w-full overflow-x-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Multi-Select Filters Popover */}
        <Popover open={showFiltersPopover} onOpenChange={setShowFiltersPopover}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter Documents</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              
              {/* Status Filters */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(RETENTION_STATUS_CONFIG).map(([key, config]) => (
                    <div 
                      key={key}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors",
                        selectedStatuses.has(key) ? "border-primary bg-primary/10" : "hover:bg-muted"
                      )}
                      onClick={() => toggleStatusFilter(key)}
                    >
                      <Checkbox checked={selectedStatuses.has(key)} />
                      <span className="text-sm">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy Filters */}
              {policies.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Policy</Label>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1">
                      {policies.map((policy) => (
                        <div 
                          key={policy.id}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                            selectedPolicies.has(policy.id) ? "bg-primary/10" : "hover:bg-muted"
                          )}
                          onClick={() => togglePolicyFilter(policy.id)}
                        >
                          <Checkbox checked={selectedPolicies.has(policy.id)} />
                          <span className="text-sm truncate">{policy.name}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Quick Filters */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Quick Filters</Label>
                <div className="space-y-1">
                  <div 
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      showExpiringSoon ? "bg-orange-500/10 border border-orange-500" : "hover:bg-muted"
                    )}
                    onClick={() => setShowExpiringSoon(!showExpiringSoon)}
                  >
                    <Checkbox checked={showExpiringSoon} />
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Expiring within 30 days</span>
                  </div>
                  <div 
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      showLegalHoldOnly ? "bg-purple-500/10 border border-purple-500" : "hover:bg-muted"
                    )}
                    onClick={() => setShowLegalHoldOnly(!showLegalHoldOnly)}
                  >
                    <Checkbox checked={showLegalHoldOnly} />
                    <Lock className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">On Legal Hold</span>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from(selectedStatuses).map(status => (
              <Badge key={status} variant="secondary" className="gap-1">
                {RETENTION_STATUS_CONFIG[status as RetentionStatus]?.label}
                <X className="h-3 w-3 cursor-pointer" onClick={() => toggleStatusFilter(status)} />
              </Badge>
            ))}
            {Array.from(selectedPolicies).map(policyId => {
              const policy = policies.find(p => p.id === policyId);
              return (
                <Badge key={policyId} variant="secondary" className="gap-1">
                  {policy?.name || 'Policy'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => togglePolicyFilter(policyId)} />
                </Badge>
              );
            })}
            {showExpiringSoon && (
              <Badge variant="secondary" className="gap-1 bg-orange-500/20">
                Expiring Soon
                <X className="h-3 w-3 cursor-pointer" onClick={() => setShowExpiringSoon(false)} />
              </Badge>
            )}
            {showLegalHoldOnly && (
              <Badge variant="secondary" className="gap-1 bg-purple-500/20">
                Legal Hold
                <X className="h-3 w-3 cursor-pointer" onClick={() => setShowLegalHoldOnly(false)} />
              </Badge>
            )}
          </div>
        )}

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
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {sortedDocs.length} of {documentStatuses.length} documents
        {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied)`}
      </div>

      {/* Document List */}
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
            const retentionReasons = getDocumentRetentionReason(doc);
            const documentLegalHolds = legalHolds.filter(h => doc.legal_hold_ids?.includes(h.id));

            return (
              <Tooltip key={doc.id}>
                <TooltipTrigger asChild>
                  <Card 
                    className={cn(
                      "transition-colors cursor-pointer",
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
                              onClick={async (e) => {
                                e.stopPropagation();
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
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  align="center" 
                  className="max-w-[350px] p-3 space-y-2 z-[9999] bg-popover border shadow-lg" 
                  sideOffset={8}
                >
                  <div className="font-semibold text-sm border-b pb-1 mb-2">
                    📋 Retention Information
                  </div>
                  {retentionReasons.map((reason, idx) => (
                    <div key={idx} className="text-xs flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                  {policy && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <div className="text-xs">
                        <span className="font-medium">Policy:</span> {policy.name}
                      </div>
                      {policy.description && (
                        <div className="text-xs text-muted-foreground">
                          {policy.description}
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="font-medium">Retention:</span> {policy.retention_period} days
                      </div>
                      <div className="text-xs">
                        <span className="font-medium">Action:</span> {policy.disposition_action.replace('_', ' ')}
                      </div>
                    </div>
                  )}
                  {documentLegalHolds.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="font-medium text-xs text-purple-500 mb-1">⚖️ Legal Holds:</div>
                      {documentLegalHolds.map(hold => (
                        <div key={hold.id} className="text-xs pl-2">
                          <div className="font-medium">{hold.name}</div>
                          {hold.reason && <div className="text-muted-foreground">{hold.reason}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
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
    </div>

      {/* View Document Dialog */}
      <Dialog open={!!viewDocumentId} onOpenChange={() => setViewDocumentId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Details</DialogTitle>
            <DialogDescription>
              Retention information and audit history for this document
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
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Document Details</TabsTrigger>
                  <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-4">
                  <div>
                    <h4 className="font-semibold mb-2">File Information</h4>
                    <p className="text-sm"><strong>Name:</strong> {fileName || 'Unknown'}</p>
                    <p className="text-sm"><strong>Document ID:</strong> {doc.document_id}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Retention Policy</h4>
                    <p className="text-sm"><strong>Policy:</strong> {policy?.name || 'No policy'}</p>
                    <div className="text-sm"><strong>Status:</strong> <Badge className={statusConfig?.color}>{statusConfig?.label}</Badge></div>
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
                </TabsContent>
                
                <TabsContent value="audit" className="mt-4">
                  <DocumentAuditLog documentId={viewDocumentId} />
                </TabsContent>
              </Tabs>
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
    </TooltipProvider>
  );
};

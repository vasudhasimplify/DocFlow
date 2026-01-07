import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Scale,
  Gavel,
  Search,
  Shield,
  FileText,
  Folder,
  User,
  Calendar,
  Plus,
  X,
  AlertTriangle,
  Bell,
  Mail
} from 'lucide-react';
import type { CreateLegalHoldParams, HoldScope } from '@/types/legalHold';
import { MATTER_TYPES, HOLD_SCOPE_OPTIONS } from '@/types/legalHold';
import { supabase } from '@/integrations/supabase/client';

interface CreateLegalHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHold: (params: CreateLegalHoldParams) => Promise<any>;
  onUpdateHold?: (holdId: string, params: Partial<CreateLegalHoldParams>) => Promise<any>;
  initialData?: any; // EnhancedLegalHold for editing
}

export const CreateLegalHoldDialog: React.FC<CreateLegalHoldDialogProps> = ({
  open,
  onOpenChange,
  onCreateHold,
  onUpdateHold,
  initialData
}) => {
  const isEditing = !!initialData;
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Step 1: Matter Info
  const [name, setName] = useState('');
  const [matterId, setMatterId] = useState('');
  const [matterName, setMatterName] = useState('');
  const [matterType, setMatterType] = useState<CreateLegalHoldParams['matter_type']>('litigation');
  const [caseNumber, setCaseNumber] = useState('');
  const [issuingAttorney, setIssuingAttorney] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [anticipatedEndDate, setAnticipatedEndDate] = useState('');

  // Step 2: Scope
  const [scope, setScope] = useState<HoldScope>('search_criteria');
  const [keywords, setKeywords] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedFolderNames, setSelectedFolderNames] = useState<string[]>([]);
  
  // For fetching and displaying options
  const [availableDocuments, setAvailableDocuments] = useState<any[]>([]);
  const [availableFolders, setAvailableFolders] = useState<string[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [folderSearchQuery, setFolderSearchQuery] = useState('');
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [documentsError, setDocumentsError] = useState<string>('');
  const [foldersError, setFoldersError] = useState<string>('');

  // Step 3: Custodians
  const [custodians, setCustodians] = useState<Array<{ name: string; email: string }>>([]);
  const [newCustodianName, setNewCustodianName] = useState('');
  const [newCustodianEmail, setNewCustodianEmail] = useState('');

  // Step 4: Settings
  const [requiresAcknowledgment, setRequiresAcknowledgment] = useState(true);
  const [acknowledgmentDeadline, setAcknowledgmentDeadline] = useState(5);
  const [sendReminders, setSendReminders] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState(7);
  const [escalationEnabled, setEscalationEnabled] = useState(true);
  const [escalationAfterDays, setEscalationAfterDays] = useState(14);
  const [legalTeamEmail, setLegalTeamEmail] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Populate form with initialData when editing
  useEffect(() => {
    if (initialData && open) {
      console.log('Populating form with initialData:', initialData);
      
      setName(initialData.name || '');
      setMatterId(initialData.matter_id || '');
      setMatterName(initialData.matter_name || '');
      setMatterType(initialData.matter_type || 'litigation');
      setCaseNumber(initialData.case_number || '');
      setIssuingAttorney(initialData.issuing_attorney || '');
      setHoldReason(initialData.hold_reason || '');
      setIssueDate(initialData.issue_date ? initialData.issue_date.split('T')[0] : '');
      setEffectiveDate(initialData.effective_date ? initialData.effective_date.split('T')[0] : '');
      setAnticipatedEndDate(initialData.anticipated_end_date ? initialData.anticipated_end_date.split('T')[0] : '');
      setScope(initialData.scope || 'search_criteria');
      
      // Handle scope_details - might be string or object
      const scopeDetails = typeof initialData.scope_details === 'string' 
        ? JSON.parse(initialData.scope_details) 
        : initialData.scope_details;
      
      if (scopeDetails) {
        setKeywords((scopeDetails.keywords || []).join(', '));
        if (scopeDetails.date_range) {
          setDateRangeStart(scopeDetails.date_range.start || '');
          setDateRangeEnd(scopeDetails.date_range.end || '');
        }
        if (scopeDetails.document_ids) {
          setSelectedDocumentIds(scopeDetails.document_ids);
        }
        if (scopeDetails.folder_names) {
          setSelectedFolderNames(scopeDetails.folder_names);
        }
      }
      
      setCustodians((initialData.custodians || []).map((c: any) => ({
        name: c.name || c.email.split('@')[0], 
        email: c.email
      })));
      setRequiresAcknowledgment(initialData.requires_acknowledgment ?? true);
      setAcknowledgmentDeadline(initialData.acknowledgment_deadline_days || 5);
      setSendReminders(initialData.send_reminders ?? true);
      setReminderFrequency(initialData.reminder_frequency_days || 7);
      setEscalationEnabled(initialData.escalation_enabled ?? true);
      setEscalationAfterDays(initialData.escalation_after_days || 14);
      
      // Handle legal_team_emails - might be string or array
      const legalEmails = typeof initialData.legal_team_emails === 'string'
        ? JSON.parse(initialData.legal_team_emails)
        : initialData.legal_team_emails;
      setLegalTeamEmail((legalEmails || [])[0] || '');
      
      setInternalNotes(initialData.internal_notes || '');
      
      console.log('Form populated - matterName:', initialData.matter_name, 'caseNumber:', initialData.case_number);
    } else if (!open) {
      resetForm();
    }
  }, [initialData, open]);

  // Fetch available documents when specific_documents scope is selected
  useEffect(() => {
    // Only fetch if we don't already have data and dialog is open
    if (scope === 'specific_documents' && open && availableDocuments.length === 0 && !loadingDocuments) {
      setLoadingDocuments(true);
      setDocumentsError('');
      supabase
        .from('documents')
        .select('id, file_name, file_type, file_size, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(100)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching documents:', error);
            setDocumentsError('Failed to load documents. Please check permissions or try again later.');
            setAvailableDocuments([]);
          } else if (data) {
            setAvailableDocuments(data);
          }
          setLoadingDocuments(false);
        });
    }
  }, [scope, open, availableDocuments.length, loadingDocuments]);

  // Fetch available folders when folder scope is selected
  useEffect(() => {
    // Only fetch if we don't already have data and dialog is open
    if (scope === 'folder' && open && availableFolders.length === 0 && !loadingFolders) {
      setLoadingFolders(true);
      setFoldersError('');
      supabase
        .from('smart_folders')
        .select('id, name')
        .order('name', { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching folders:', error);
            setFoldersError('Failed to load folders. Please check permissions or try again later.');
            setAvailableFolders([]);
          } else if (data) {
            // Extract folder names
            const folderNames = data.map(f => f.name);
            setAvailableFolders(folderNames);
          }
          setLoadingFolders(false);
        });
    }
  }, [scope, open, availableFolders.length, loadingFolders]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const params: CreateLegalHoldParams = {
        name,
        matter_id: matterId,
        matter_name: matterName,
        matter_type: matterType,
        case_number: caseNumber || undefined,
        issuing_attorney: issuingAttorney,
        hold_reason: holdReason,
        issue_date: issueDate || undefined,
        effective_date: effectiveDate || undefined,
        anticipated_end_date: anticipatedEndDate || undefined,
        scope,
        scope_details: {
          keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
          date_range: dateRangeStart && dateRangeEnd 
            ? { start: dateRangeStart, end: dateRangeEnd }
            : undefined,
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          folder_names: selectedFolderNames.length > 0 ? selectedFolderNames : undefined
        },
        custodian_emails: custodians.map(c => c.email),
        requires_acknowledgment: requiresAcknowledgment,
        acknowledgment_deadline_days: acknowledgmentDeadline,
        send_reminders: sendReminders,
        reminder_frequency_days: reminderFrequency,
        escalation_enabled: escalationEnabled,
        escalation_after_days: escalationAfterDays,
        legal_team_emails: legalTeamEmail ? [legalTeamEmail] : [],
        internal_notes: internalNotes
      };

      if (isEditing && onUpdateHold && initialData) {
        await onUpdateHold(initialData.id, params);
      } else {
        await onCreateHold(params);
      }
      
      onOpenChange(false);
      resetForm();
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName('');
    setMatterId('');
    setMatterName('');
    setMatterType('litigation');
    setCaseNumber('');
    setIssuingAttorney('');
    setHoldReason('');
    setIssueDate('');
    setEffectiveDate('');
    setAnticipatedEndDate('');
    setScope('search_criteria');
    setKeywords('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSelectedDocumentIds([]);
    setSelectedFolderIds([]);
    setSelectedFolderNames([]);
    setCustodians([]);
    setNewCustodianName('');
    setNewCustodianEmail('');
    setRequiresAcknowledgment(true);
    setAcknowledgmentDeadline(5);
    setSendReminders(true);
    setReminderFrequency(7);
    setEscalationEnabled(true);
    setEscalationAfterDays(14);
    setLegalTeamEmail('');
    setInternalNotes('');
    // Clear cached data to force fresh fetch next time
    setAvailableDocuments([]);
    setAvailableFolders([]);
    setDocumentSearchQuery('');
    setFolderSearchQuery('');
  };

  const addCustodian = () => {
    if (newCustodianEmail && newCustodianName && !custodians.some(c => c.email === newCustodianEmail)) {
      setCustodians([...custodians, { name: newCustodianName, email: newCustodianEmail }]);
      setNewCustodianName('');
      setNewCustodianEmail('');
    }
  };

  const getMatterIcon = (type: string) => {
    switch (type) {
      case 'litigation': return <Gavel className="w-4 h-4" />;
      case 'investigation': return <Search className="w-4 h-4" />;
      case 'regulatory': return <Shield className="w-4 h-4" />;
      case 'audit': return <FileText className="w-4 h-4" />;
      default: return <Scale className="w-4 h-4" />;
    }
  };

  const getScopeIcon = (s: HoldScope) => {
    switch (s) {
      case 'specific_documents': return <FileText className="w-4 h-4" />;
      case 'folder': return <Folder className="w-4 h-4" />;
      case 'search_criteria': return <Search className="w-4 h-4" />;
      case 'custodian_content': return <User className="w-4 h-4" />;
      case 'date_range': return <Calendar className="w-4 h-4" />;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return name && matterId && matterName && holdReason;
      case 2: return scope;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-600" />
            {isEditing ? 'Edit Legal Hold' : 'Create Legal Hold'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Enter matter information and hold details'}
            {step === 2 && 'Define the scope of documents to preserve'}
            {step === 3 && 'Add custodians who will receive hold notices'}
            {step === 4 && 'Configure notifications and settings'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-purple-600' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Hold Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Smith v. Acme Corp Litigation Hold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matterId">Matter ID *</Label>
                  <Input
                    id="matterId"
                    placeholder="e.g., MAT-2024-001"
                    value={matterId}
                    onChange={(e) => setMatterId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caseNumber">Case Number</Label>
                  <Input
                    id="caseNumber"
                    placeholder="e.g., CV-2024-12345"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issuingAttorney">Issuing Attorney</Label>
                <Input
                  id="issuingAttorney"
                  placeholder="e.g., John Smith, Esq."
                  value={issuingAttorney}
                  onChange={(e) => setIssuingAttorney(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="matterName">Matter Name *</Label>
                <Input
                  id="matterName"
                  placeholder="e.g., Smith v. Acme Corporation"
                  value={matterName}
                  onChange={(e) => setMatterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Matter Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MATTER_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMatterType(type.value)}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                        matterType === type.value
                          ? 'border-purple-500 bg-purple-500/5'
                          : 'border-border hover:border-purple-500/50'
                      }`}
                    >
                      {getMatterIcon(type.value)}
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">When the hold was issued</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveDate">Effective Date</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">When the hold takes effect</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anticipatedEndDate">Anticipated End Date</Label>
                  <Input
                    id="anticipatedEndDate"
                    type="date"
                    value={anticipatedEndDate}
                    onChange={(e) => setAnticipatedEndDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Expected release date</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdReason">Hold Reason / Preservation Notice *</Label>
                <Textarea
                  id="holdReason"
                  placeholder="Describe the legal matter and what documents need to be preserved..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Scope Type</Label>
                {HOLD_SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setScope(option.value)}
                    className={`w-full flex items-start gap-3 p-4 rounded-lg border transition-all text-left ${
                      scope === option.value
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-border hover:border-purple-500/50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      scope === option.value ? 'bg-purple-500/20' : 'bg-muted'
                    }`}>
                      {getScopeIcon(option.value)}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <Separator />

              {scope === 'search_criteria' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      placeholder="e.g., contract, agreement, safety"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date Range Start</Label>
                      <Input
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Range End</Label>
                      <Input
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {scope === 'date_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {scope === 'specific_documents' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Document Selection</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select individual documents to place on legal hold
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Search Documents</Label>
                    <Input
                      placeholder="Search by name or type..."
                      value={documentSearchQuery}
                      onChange={(e) => setDocumentSearchQuery(e.target.value)}
                    />
                  </div>

                  {loadingDocuments ? (
                    <div className="text-center py-8 text-muted-foreground">Loading documents...</div>
                  ) : documentsError ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">Error Loading Documents</p>
                      <p className="text-xs text-muted-foreground mt-1">{documentsError}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Run the SQL file: <code>add_documents_rls_policy.sql</code> in Supabase Dashboard
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      <div className="space-y-2">
                        {availableDocuments
                          .filter(doc => 
                            documentSearchQuery === '' || 
                            doc.file_name.toLowerCase().includes(documentSearchQuery.toLowerCase()) ||
                            doc.file_type?.toLowerCase().includes(documentSearchQuery.toLowerCase())
                          )
                          .map((doc) => (
                            <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                              <Checkbox
                                checked={selectedDocumentIds.includes(doc.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDocumentIds([...selectedDocumentIds, doc.id]);
                                  } else {
                                    setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id));
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {doc.folder && `${doc.folder} • `}
                                  {doc.file_type || 'Unknown type'} • 
                                  {(doc.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                          ))}
                        {availableDocuments.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-4">No documents found</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {selectedDocumentIds.length} document(s) selected
                  </p>
                </div>
              )}

              {scope === 'folder' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Folder Selection</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All documents within the selected folders will be protected
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Search Folders</Label>
                    <Input
                      placeholder="Search folder names..."
                      value={folderSearchQuery}
                      onChange={(e) => setFolderSearchQuery(e.target.value)}
                    />
                  </div>

                  {loadingFolders ? (
                    <div className="text-center py-8 text-muted-foreground">Loading folders...</div>
                  ) : foldersError ? (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive font-medium">Error Loading Folders</p>
                      <p className="text-xs text-muted-foreground mt-1">{foldersError}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Run the SQL file: <code>add_documents_rls_policy.sql</code> in Supabase Dashboard
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px] border rounded-lg p-4">
                      <div className="space-y-2">
                        {availableFolders
                          .filter(folder => 
                            folderSearchQuery === '' || 
                            folder.toLowerCase().includes(folderSearchQuery.toLowerCase())
                          )
                          .map((folder) => (
                            <div key={folder} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                              <Checkbox
                                checked={selectedFolderNames.includes(folder)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFolderNames([...selectedFolderNames, folder]);
                                  } else {
                                    setSelectedFolderNames(selectedFolderNames.filter(f => f !== folder));
                                  }
                                }}
                              />
                              <Folder className="w-4 h-4 text-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{folder}</p>
                              </div>
                            </div>
                          ))}
                        {availableFolders.length === 0 && (
                          <p className="text-center text-sm text-muted-foreground py-4">No folders found</p>
                        )}
                      </div>
                    </ScrollArea>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {selectedFolderNames.length} folder(s) selected
                  </p>
                </div>
              )}

              {scope === 'custodian_content' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Custodian Content Protection</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All documents created, uploaded, or owned by the custodians you specify in the next step will be automatically protected.
                      This includes all past and future documents.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <p className="text-sm">Documents will be linked after adding custodians in Step 3</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Custodian Notification</p>
                    <p className="text-muted-foreground">
                      Custodians will receive a legal hold notice and must acknowledge their preservation obligations.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Add Custodians</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Custodian Name"
                    value={newCustodianName}
                    onChange={(e) => setNewCustodianName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustodian()}
                    className="flex-1"
                  />
                  <Input
                    type="email"
                    placeholder="custodian@company.com"
                    value={newCustodianEmail}
                    onChange={(e) => setNewCustodianEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustodian()}
                    className="flex-1"
                  />
                  <Button onClick={addCustodian} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {custodians.length > 0 && (
                <div className="space-y-2">
                  <Label>Added Custodians ({custodians.length})</Label>
                  <div className="space-y-2">
                    {custodians.map((custodian, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{custodian.name}</p>
                          <p className="text-xs text-muted-foreground">{custodian.email}</p>
                        </div>
                        <button 
                          onClick={() => setCustodians(custodians.filter((_, i) => i !== index))}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {custodians.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No custodians added yet</p>
                  <p className="text-sm">You can add custodians now or later</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Acknowledgment Settings
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Acknowledgment</Label>
                    <p className="text-xs text-muted-foreground">
                      Custodians must acknowledge the hold notice
                    </p>
                  </div>
                  <Switch checked={requiresAcknowledgment} onCheckedChange={setRequiresAcknowledgment} />
                </div>

                {requiresAcknowledgment && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>Deadline:</Label>
                    <Input
                      type="number"
                      value={acknowledgmentDeadline}
                      onChange={(e) => setAcknowledgmentDeadline(parseInt(e.target.value) || 5)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Reminder Settings
                </h4>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Send Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically remind unacknowledged custodians
                    </p>
                  </div>
                  <Switch checked={sendReminders} onCheckedChange={setSendReminders} />
                </div>

                {sendReminders && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>Every:</Label>
                    <Input
                      type="number"
                      value={reminderFrequency}
                      onChange={(e) => setReminderFrequency(parseInt(e.target.value) || 7)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Escalation</Label>
                    <p className="text-xs text-muted-foreground">
                      Escalate to legal team if no response
                    </p>
                  </div>
                  <Switch checked={escalationEnabled} onCheckedChange={setEscalationEnabled} />
                </div>

                {escalationEnabled && (
                  <div className="flex items-center gap-2 pl-4">
                    <Label>After:</Label>
                    <Input
                      type="number"
                      value={escalationAfterDays}
                      onChange={(e) => setEscalationAfterDays(parseInt(e.target.value) || 14)}
                      className="w-20"
                      min={1}
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Legal Team Email</Label>
                <Input
                  type="email"
                  placeholder="legal@company.com"
                  value={legalTeamEmail}
                  onChange={(e) => setLegalTeamEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Internal Notes</Label>
                <Textarea
                  placeholder="Add any internal notes..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button 
              onClick={() => setStep(step + 1)} 
              disabled={!canProceed()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleCreate} 
              disabled={creating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {creating 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update Legal Hold' : 'Create Legal Hold')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

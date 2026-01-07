import React, { useState, useEffect } from 'react';
import { Shield, FileText, Search, Check, ChevronRight, Lock, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  file_name: string;
  created_at: string;
  file_type?: string;
}

interface ApplyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreatePolicy?: () => void;
}

export const ApplyPolicyDialog: React.FC<ApplyPolicyDialogProps> = ({
  open,
  onOpenChange,
  onCreatePolicy,
}) => {
  const { policies, applyPolicyToDocument, documentStatuses } = useRetentionPolicies();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [createNewPolicy, setCreateNewPolicy] = useState(false);
  const [policyName, setPolicyName] = useState('');
  const [policyDescription, setPolicyDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [dispositionAction, setDispositionAction] = useState<'delete' | 'archive' | 'review' | 'transfer'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'documents' | 'choice' | 'policy' | 'legalhold'>('documents');
  const [actionType, setActionType] = useState<'policy' | 'legalhold' | null>(null);
  const [legalHolds, setLegalHolds] = useState<any[]>([]);
  const [selectedLegalHold, setSelectedLegalHold] = useState<string>('');
  const [createNewHold, setCreateNewHold] = useState(false);
  const [legalHoldName, setLegalHoldName] = useState('');
  const [legalHoldReason, setLegalHoldReason] = useState('');
  const [legalHoldMatterId, setLegalHoldMatterId] = useState('');
  const [legalHoldCustodian, setLegalHoldCustodian] = useState('');
  const [legalHoldNotes, setLegalHoldNotes] = useState('');

  // Debug: Log policies only when dialog opens
  useEffect(() => {
    if (open && policies.length > 0) {
      console.log('🔄 Policies loaded:', policies.length, 'policies');
      console.log('📜 All policies:', policies.map(p => ({ id: p.id, name: p.name, is_active: p.is_active })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only log when dialog opens

  // Fetch documents that don't have retention policies yet
  useEffect(() => {
    if (!open) return;

    const fetchDocuments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('📁 Fetching documents for retention policy application...');

      // Get documents owned by user
      const { data: docs, error } = await supabase
        .from('documents')
        .select('id, file_name, created_at, file_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error fetching documents:', error);
        return;
      }

      console.log(`📊 Total documents found: ${docs?.length || 0}`);
      console.log('📄 Sample documents:', docs?.slice(0, 3).map(d => ({ id: d.id, name: d.file_name })));
      console.log(`📋 Documents with retention policies: ${documentStatuses.length}`);
      console.log('🔗 Tracked document IDs:', documentStatuses.map(s => s.document_id).slice(0, 5));

      // Fetch existing legal holds
      const { data: holds, error: holdsError } = await supabase
        .from('legal_holds')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (holdsError) {
        console.error('❌ Error fetching legal holds:', holdsError);
      } else {
        console.log(`🔒 Active legal holds found: ${holds?.length || 0}`);
        setLegalHolds(holds || []);
      }

      if (docs) {
        // Filter out documents that already have retention policies
        const trackedDocIds = new Set(documentStatuses.map(s => s.document_id));
        const untracked = docs.filter(d => !trackedDocIds.has(d.id));
        console.log(`✅ Documents available for policy application: ${untracked.length}`);
        console.log('📝 Untracked documents:', untracked.slice(0, 3).map(d => ({ id: d.id, name: d.file_name })));
        setDocuments(untracked);
      }
    };

    // Reset state only when dialog opens
    setSelectedDocuments([]);
    setSelectedPolicy('');
    setCreateNewPolicy(false);
    setPolicyName('');
    setPolicyDescription('');
    setRetentionDays(365);
    setDispositionAction('review');
    setActionType(null);
    setSelectedLegalHold('');
    setCreateNewHold(false);
    setLegalHoldName('');
    setLegalHoldReason('');
    setLegalHoldMatterId('');
    setLegalHoldCustodian('');
    setLegalHoldNotes('');
    setStep('documents');
    
    // Fetch documents
    fetchDocuments();
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only re-run when dialog opens/closes

  const filteredDocuments = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activePolicies = policies.filter(p => p.is_active);
  
  // Debug policies when moving to step 2
  useEffect(() => {
    if (step === 'policy') {
      console.log('🎯 Step 2: Policy Selection');
      console.log('📋 All policies:', policies.length);
      console.log('✅ Active policies:', activePolicies.length);
      console.log('📝 Active policy details:', activePolicies.map(p => ({ 
        id: p.id, 
        name: p.name, 
        is_active: p.is_active 
      })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]); // Only run when step changes

  const toggleDocument = (docId: string) => {
    console.log('🔘 Toggling document:', docId);
    setSelectedDocuments(prev => {
      const newSelection = prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId];
      console.log('✅ New selection:', newSelection);
      return newSelection;
    });
  };

  const handleSubmit = async () => {
    if (selectedDocuments.length === 0) return;
    if (actionType === 'policy' && !selectedPolicy && !createNewPolicy) return;
    if (actionType === 'policy' && createNewPolicy && !policyName) return;
    if (actionType === 'legalhold' && !selectedLegalHold && !createNewHold) return;
    if (actionType === 'legalhold' && createNewHold && (!legalHoldName || !legalHoldReason)) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'policy') {
        let policyId: string;

        // Either use selected policy or create new one
        if (createNewPolicy) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data: newPolicy, error: policyError } = await supabase
            .from('retention_policies')
            .insert({
              user_id: user.id,
              name: policyName,
              description: policyDescription || null,
              retention_period_days: retentionDays,
              disposition_action: dispositionAction,
              trigger_type: 'creation_date',
              is_active: true,
              priority: 0,
              notification_days_before: 30,
              requires_approval: false
            })
            .select()
            .single();

          if (policyError) throw policyError;
          policyId = newPolicy.id;
        } else {
          policyId = selectedPolicy;
        }

        // Apply policy to all selected documents
        for (const docId of selectedDocuments) {
          await applyPolicyToDocument(docId, policyId);
        }
      } else if (actionType === 'legalhold') {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        let holdId: string;

        // Either use selected hold or create new one
        if (createNewHold) {
          const { data: hold, error: holdError } = await supabase
            .from('legal_holds')
            .insert({
              user_id: user.id,
              name: legalHoldName,
              hold_reason: legalHoldReason,
              matter_id: legalHoldMatterId || null,
              custodian_name: legalHoldCustodian || null,
              notes: legalHoldNotes || null,
              status: 'active',
              created_by: user.id
            })
            .select()
            .single();

          if (holdError) throw holdError;
          holdId = hold.id;

          // Create custodian record if custodian name provided
          if (legalHoldCustodian && legalHoldCustodian.trim()) {
            console.log('🔒 Creating custodian records for hold:', holdId);
            console.log('📝 Custodian input:', legalHoldCustodian);
            
            // Split by comma if multiple custodians provided
            const custodianNames = legalHoldCustodian.split(',').map(c => c.trim());
            
            for (const custodianName of custodianNames) {
              // Try to extract email if provided in format "Name <email>" or just use name
              const emailMatch = custodianName.match(/<(.+?)>/);
              const email = emailMatch ? emailMatch[1] : `${custodianName.toLowerCase().replace(/\s+/g, '.')}@example.com`;
              const name = emailMatch ? custodianName.replace(/<.+?>/, '').trim() : custodianName;
              
              console.log('👤 Inserting custodian:', { name, email });
              
              const { data: custodianData, error: custodianError } = await supabase
                .from('legal_hold_custodians')
                .insert({
                  hold_id: holdId,
                  name: name,
                  email: email,
                  status: 'pending',
                  added_by: user.id
                })
                .select();
              
              if (custodianError) {
                console.error('❌ Failed to insert custodian:', custodianError);
              } else {
                console.log('✅ Custodian inserted:', custodianData);
              }
            }
          } else {
            console.log('⚠️ No custodian name provided, skipping custodian creation');
          }
        } else {
          holdId = selectedLegalHold;
        }

        // Apply hold to all selected documents
        for (const docId of selectedDocuments) {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) continue;

          // Check if document has retention status entry - use maybeSingle() to avoid errors
          const { data: docStatus, error: statusError } = await supabase
            .from('document_retention_status')
            .select('*')
            .eq('document_id', docId)
            .maybeSingle();

          // Log for debugging
          console.log('📋 Checking document retention status:', {
            docId: docId.slice(0, 8),
            hasStatus: !!docStatus,
            error: statusError
          });

          if (!docStatus) {
            // Create new retention status entry for legal hold
            console.log('✨ Creating new retention status with legal hold');
            const { error: insertError } = await supabase
              .from('document_retention_status')
              .insert({
                document_id: docId,
                user_id: user.id,
                retention_start_date: new Date().toISOString(),
                retention_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year default
                current_status: 'on_hold',
                legal_hold_ids: [holdId],
                disposition_action: 'review'
              });
            
            if (insertError) {
              console.error('❌ Error creating retention status:', insertError);
              throw insertError;
            }
          } else {
            // Update existing entry
            console.log('🔄 Updating existing retention status');
            const existingHolds = docStatus.legal_hold_ids || [];
            const { error: updateError } = await supabase
              .from('document_retention_status')
              .update({
                legal_hold_ids: [...existingHolds, holdId],
                current_status: 'on_hold',
                updated_at: new Date().toISOString()
              })
              .eq('document_id', docId);
            
            if (updateError) {
              console.error('❌ Error updating retention status:', updateError);
              throw updateError;
            }
          }

          // Log the action
          const holdDetails = createNewHold 
            ? legalHoldName 
            : legalHolds.find(h => h.id === holdId)?.name || 'Unknown';
          
          await supabase
            .from('disposition_audit_log')
            .insert({
              document_id: docId,
              user_id: user.id,
              action: 'legal_hold_applied',
              action_by: user.id,
              legal_hold_id: holdId,
              reason: `Legal hold "${holdDetails}" applied`
            });
        }
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to apply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPolicyDetails = policies.find(p => p.id === selectedPolicy);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'legalhold' ? (
              <>
                <Lock className="h-5 w-5 text-purple-500" />
                Apply Legal Hold to Documents
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-primary" />
                Apply {step === 'policy' ? 'Retention Policy' : 'Policy or Legal Hold'} to Documents
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'documents' && 'Step 1: Select the documents you want to manage'}
            {step === 'choice' && 'Step 2: Choose whether to apply a retention policy or legal hold'}
            {step === 'policy' && 'Step 3: Select a retention policy to apply'}
            {step === 'legalhold' && 'Step 3: Configure legal hold details'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2 border-b">
          <Badge 
            variant={step === 'documents' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setStep('documents')}
          >
            1. Select Documents
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant={step === 'choice' ? 'default' : 'secondary'}
            className={cn(selectedDocuments.length === 0 && 'opacity-50')}
          >
            2. Choose Action
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge 
            variant={step === 'policy' || step === 'legalhold' ? 'default' : 'secondary'}
            className={cn(!actionType && 'opacity-50')}
          >
            3. Configure
          </Badge>
        </div>

        {step === 'choice' ? (
          <div className="space-y-4">
            {/* Selected Documents Summary */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground uppercase">
                Selected Documents ({selectedDocuments.length})
              </Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDocuments.slice(0, 5).map(docId => {
                  const doc = documents.find(d => d.id === docId);
                  return doc ? (
                    <Badge key={docId} variant="secondary" className="text-xs">
                      {doc.file_name.length > 20 ? doc.file_name.slice(0, 20) + '...' : doc.file_name}
                    </Badge>
                  ) : null;
                })}
                {selectedDocuments.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedDocuments.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Type Selection */}
            <div className="space-y-3">
              <Label>What would you like to do with these documents?</Label>
              
              <div 
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  actionType === 'policy' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-muted hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => setActionType('policy')}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                  actionType === 'policy'
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}>
                  {actionType === 'policy' && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Apply Retention Policy</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set retention period, schedule disposition actions, and ensure compliance with retention policies
                  </p>
                </div>
              </div>

              <div 
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  actionType === 'legalhold' 
                    ? "border-purple-500 bg-purple-500/5 shadow-sm" 
                    : "border-muted hover:border-purple-500/50 hover:bg-muted/50"
                )}
                onClick={() => setActionType('legalhold')}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                  actionType === 'legalhold'
                    ? "bg-purple-500 border-purple-500"
                    : "border-muted-foreground/30"
                )}>
                  {actionType === 'legalhold' && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold">Apply Legal Hold</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Preserve documents for litigation or investigation. Prevents deletion until hold is released
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'documents' ? (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Selection Summary */}
            {selectedDocuments.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
                <span className="text-sm font-medium">
                  {selectedDocuments.length} document(s) selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedDocuments([])}
                >
                  Clear
                </Button>
              </div>
            )}

            {/* Document List */}
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    {documents.length === 0 ? (
                      <div>
                        <p className="text-sm font-medium mb-2">No documents available</p>
                        <p className="text-xs mb-4">
                          {documentStatuses.length > 0 
                            ? 'All your documents already have retention policies assigned.'
                            : 'Upload documents first through the SimplifyDrive tab to apply retention policies.'}
                        </p>
                        {documentStatuses.length === 0 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              onOpenChange(false);
                              window.location.hash = '#/simplifydrive';
                            }}
                          >
                            Go to SimplifyDrive
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">No documents match your search</p>
                    )}
                  </div>
                ) : (
                  filteredDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors select-none",
                        selectedDocuments.includes(doc.id)
                          ? "bg-primary/10 border-2 border-primary shadow-sm"
                          : "hover:bg-muted/50 border-2 border-transparent hover:border-muted"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocument(doc.id);
                      }}
                      role="checkbox"
                      aria-checked={selectedDocuments.includes(doc.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleDocument(doc.id);
                        }
                      }}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                        selectedDocuments.includes(doc.id)
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {selectedDocuments.includes(doc.id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {doc.file_type && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {doc.file_type}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        ) : step === 'policy' ? (
          <div className="space-y-4">
            {/* Selected Documents Summary */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground uppercase">
                Selected Documents ({selectedDocuments.length})
              </Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDocuments.slice(0, 5).map(docId => {
                  const doc = documents.find(d => d.id === docId);
                  return doc ? (
                    <Badge key={docId} variant="secondary" className="text-xs">
                      {doc.file_name.length > 20 ? doc.file_name.slice(0, 20) + '...' : doc.file_name}
                    </Badge>
                  ) : null;
                })}
                {selectedDocuments.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedDocuments.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Policy Selection */}
            {!createNewPolicy ? (
              <div className="space-y-2">
                <Label>Choose Retention Policy or Create New</Label>
                <ScrollArea className="h-[250px] border rounded-lg">
                  {activePolicies.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Shield className="h-12 w-12 mb-3 opacity-50" />
                      <p className="text-sm font-medium mb-2">No active retention policies</p>
                      <p className="text-xs mb-4 max-w-[250px]">
                        Create a retention policy to apply to these documents.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCreateNewPolicy(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Policy
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      <RadioGroup 
                        value={selectedPolicy} 
                        onValueChange={setSelectedPolicy}
                        className="space-y-2"
                      >
                        {activePolicies.map(policy => (
                        <div
                          key={policy.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedPolicy === policy.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => setSelectedPolicy(policy.id)}
                        >
                          <RadioGroupItem value={policy.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{policy.name}</span>
                              {policy.compliance_framework && (
                                <Badge variant="secondary" className="text-xs">
                                  {policy.compliance_framework}
                                </Badge>
                              )}
                            </div>
                            {policy.description && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {policy.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Retain for {Math.floor(policy.retention_period_days / 365)} years
                              {policy.retention_period_days % 365 > 0 && 
                                ` ${Math.floor((policy.retention_period_days % 365) / 30)} months`
                              } 
                              {' • '}Action: {policy.disposition_action}
                            </p>
                          </div>
                        </div>
                      ))}
                      </RadioGroup>

                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedPolicy('');
                            setCreateNewPolicy(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Policy
                        </Button>
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Policy Preview */}
                {selectedPolicyDetails && (
                  <div className="p-3 border rounded-lg bg-green-500/10 border-green-500/30">
                    <p className="text-sm">
                      <strong>Preview:</strong> {selectedDocuments.length} document(s) will be retained 
                      for <strong>{Math.floor(selectedPolicyDetails.retention_period_days / 365)} years</strong>, 
                      then <strong>{selectedPolicyDetails.disposition_action}</strong>
                      {selectedPolicyDetails.requires_approval && ' (requires approval)'}.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Create New Retention Policy</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setCreateNewPolicy(false);
                      setPolicyName('');
                      setPolicyDescription('');
                      setRetentionDays(365);
                      setDispositionAction('review');
                    }}
                  >
                    ← Back to List
                  </Button>
                </div>

                <ScrollArea className="h-[220px] pr-3">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="policyName">Policy Name <span className="text-destructive">*</span></Label>
                      <Input
                        id="policyName"
                        placeholder="e.g., Financial Records Policy"
                        value={policyName}
                        onChange={(e) => setPolicyName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="policyDescription">Description (Optional)</Label>
                      <Textarea
                        id="policyDescription"
                        placeholder="Describe the purpose of this policy..."
                        value={policyDescription}
                        onChange={(e) => setPolicyDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retentionDays">Retention Period (Days) <span className="text-destructive">*</span></Label>
                      <Input
                        id="retentionDays"
                        type="number"
                        min="1"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(retentionDays / 365)} years {Math.floor((retentionDays % 365) / 30)} months
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dispositionAction">Disposition Action <span className="text-destructive">*</span></Label>
                      <Select value={dispositionAction} onValueChange={(value: any) => setDispositionAction(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="review">Review Required</SelectItem>
                          <SelectItem value="archive">Archive</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                          <SelectItem value="transfer">Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </ScrollArea>

                {/* Preview for new policy */}
                {policyName && (
                  <div className="p-3 border rounded-lg bg-green-500/10 border-green-500/30">
                    <p className="text-sm">
                      <strong>Preview:</strong> Policy "{policyName}" will be created and applied to{' '}
                      {selectedDocuments.length} document(s). Documents will be retained for{' '}
                      <strong>{Math.floor(retentionDays / 365)} years</strong>, then <strong>{dispositionAction}</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : step === 'legalhold' ? (
          <div className="space-y-4">
            {/* Selected Documents Summary */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground uppercase">
                Selected Documents ({selectedDocuments.length})
              </Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedDocuments.slice(0, 5).map(docId => {
                  const doc = documents.find(d => d.id === docId);
                  return doc ? (
                    <Badge key={docId} variant="secondary" className="text-xs">
                      {doc.file_name.length > 20 ? doc.file_name.slice(0, 20) + '...' : doc.file_name}
                    </Badge>
                  ) : null;
                })}
                {selectedDocuments.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedDocuments.length - 5} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Legal Hold Selection or Create New */}
            {!createNewHold ? (
              <div className="space-y-2">
                <Label>Choose Existing Legal Hold or Create New</Label>
                <ScrollArea className="h-[280px] border rounded-lg">
                  {legalHolds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <Lock className="h-12 w-12 mb-3 opacity-50 text-purple-500" />
                      <p className="text-sm font-medium mb-2">No active legal holds</p>
                      <p className="text-xs mb-4 max-w-[250px]">
                        Create a new legal hold to preserve these documents.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCreateNewHold(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Legal Hold
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      <RadioGroup 
                        value={selectedLegalHold} 
                        onValueChange={setSelectedLegalHold}
                        className="space-y-2"
                      >
                        {legalHolds.map(hold => (
                          <div
                            key={hold.id}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedLegalHold === hold.id
                                ? "border-purple-500 bg-purple-500/5"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => setSelectedLegalHold(hold.id)}
                          >
                            <RadioGroupItem value={hold.id} className="mt-1" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Lock className="h-4 w-4 text-purple-500" />
                                <span className="font-medium">{hold.name}</span>
                                <Badge variant="outline" className="text-xs">Active</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {hold.hold_reason}
                              </p>
                              {hold.matter_id && (
                                <p className="text-xs text-muted-foreground">
                                  Matter ID: {hold.matter_id}
                                </p>
                              )}
                              {hold.custodian_name && (
                                <p className="text-xs text-muted-foreground">
                                  Custodian: {hold.custodian_name}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Created: {new Date(hold.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                      
                      <div className="pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedLegalHold('');
                            setCreateNewHold(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Legal Hold
                        </Button>
                      </div>
                    </div>
                  )}
                </ScrollArea>

                {/* Preview for selected hold */}
                {selectedLegalHold && (
                  <div className="p-3 border rounded-lg bg-purple-500/10 border-purple-500/30">
                    <p className="text-sm">
                      <strong>Preview:</strong> Legal hold "
                      {legalHolds.find(h => h.id === selectedLegalHold)?.name}" will be applied to{' '}
                      {selectedDocuments.length} document(s). These documents cannot be deleted until the hold is released.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Create New Legal Hold</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setCreateNewHold(false);
                      setLegalHoldName('');
                      setLegalHoldReason('');
                      setLegalHoldMatterId('');
                      setLegalHoldCustodian('');
                      setLegalHoldNotes('');
                    }}
                  >
                    ← Back to List
                  </Button>
                </div>

                {/* Legal Hold Form */}
                <ScrollArea className="h-[240px] pr-3">
                  <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="holdName">Hold Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="holdName"
                    placeholder="e.g., Smith v. Company Litigation"
                    value={legalHoldName}
                    onChange={(e) => setLegalHoldName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="holdReason">Hold Reason <span className="text-destructive">*</span></Label>
                  <Input
                    id="holdReason"
                    placeholder="e.g., Pending litigation discovery"
                    value={legalHoldReason}
                    onChange={(e) => setLegalHoldReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matterId">Matter ID (Optional)</Label>
                  <Input
                    id="matterId"
                    placeholder="e.g., LIT-2024-042"
                    value={legalHoldMatterId}
                    onChange={(e) => setLegalHoldMatterId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custodian">Custodian Name (Optional)</Label>
                  <Input
                    id="custodian"
                    placeholder="e.g., Jane Smith, Legal Counsel"
                    value={legalHoldCustodian}
                    onChange={(e) => setLegalHoldCustodian(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information about this legal hold..."
                    value={legalHoldNotes}
                    onChange={(e) => setLegalHoldNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Preview for new hold */}
            {legalHoldName && legalHoldReason && (
              <div className="p-3 border rounded-lg bg-purple-500/10 border-purple-500/30">
                <p className="text-sm">
                  <strong>Preview:</strong> Legal hold "{legalHoldName}" will be created and applied to{' '}
                  {selectedDocuments.length} document(s). These documents cannot be deleted until the hold is released.
                </p>
              </div>
            )}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {step === 'documents' ? (
            <Button 
              onClick={() => setStep('choice')}
              disabled={selectedDocuments.length === 0}
            >
              Next: Choose Action
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : step === 'choice' ? (
            <>
              <Button variant="outline" onClick={() => setStep('documents')}>
                Back
              </Button>
              <Button 
                onClick={() => {
                  if (actionType === 'policy') {
                    setStep('policy');
                  } else if (actionType === 'legalhold') {
                    setStep('legalhold');
                  }
                }}
                disabled={!actionType}
              >
                Next: Configure
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('choice')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={
                  isSubmitting || 
                  (actionType === 'policy' && !createNewPolicy && !selectedPolicy) ||
                  (actionType === 'policy' && createNewPolicy && !policyName) ||
                  (actionType === 'legalhold' && !createNewHold && !selectedLegalHold) ||
                  (actionType === 'legalhold' && createNewHold && (!legalHoldName || !legalHoldReason))
                }
              >
                {actionType === 'policy' ? (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    {createNewPolicy ? 'Create & Apply Policy' : 'Apply Policy'}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {createNewHold ? 'Create & Apply Hold' : 'Apply Legal Hold'}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

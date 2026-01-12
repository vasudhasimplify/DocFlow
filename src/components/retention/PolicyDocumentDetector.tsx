import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield, FileText, Clock, AlertTriangle, CheckCircle, 
  Loader2, Sparkles, Scale, Archive, Trash2, Eye, Edit, X, Save
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';
import type { ComplianceFramework, DispositionAction } from '@/types/retention';

// Keywords that indicate a document is a policy document (more flexible)
const POLICY_KEYWORDS = [
  // Compound terms
  'retention policy', 'retention schedule', 'records retention',
  'data retention', 'document retention', 'information retention',
  'archival policy', 'disposition schedule', 'records management',
  'compliance policy', 'regulatory requirement', 'legal hold',
  'data lifecycle', 'document lifecycle', 'record keeping',
  'preservation policy', 'destruction schedule', 'audit trail',
  'policy framework', 'corporate policy', 'hr policy',
  // Single keywords (for filename matching)
  'policy', 'retention', 'compliance', 'hipaa', 'gdpr', 'sox', 
  'sarbanes-oxley', 'ferpa', 'pci-dss', 'governance', 'regulatory'
];

// Compliance framework detection patterns
const FRAMEWORK_PATTERNS: { framework: ComplianceFramework; keywords: string[] }[] = [
  { framework: 'GDPR', keywords: ['gdpr', 'general data protection', 'data protection regulation', 'eu privacy', 'personal data', 'data subject'] },
  { framework: 'HIPAA', keywords: ['hipaa', 'health insurance portability', 'phi', 'protected health information', 'healthcare', 'medical records'] },
  { framework: 'SOX', keywords: ['sarbanes-oxley', 'sox', 'financial records', 'audit', 'sec', 'securities', 'public company'] },
  { framework: 'PCI-DSS', keywords: ['pci-dss', 'pci dss', 'payment card', 'cardholder data', 'credit card'] },
  { framework: 'TAX', keywords: ['tax', 'irs', 'revenue', 'income tax', 'corporate tax', 'tax records'] },
  { framework: 'HR', keywords: ['human resources', 'hr', 'employee records', 'personnel', 'employment'] },
  { framework: 'LEGAL', keywords: ['legal', 'litigation', 'contract', 'agreement', 'court', 'regulatory'] },
  { framework: 'BUSINESS', keywords: ['business', 'operational', 'commercial', 'administrative'] },
];

// Parse retention period from text
const RETENTION_PATTERNS = [
  { pattern: /(\d+)\s*(?:year|yr)s?/gi, multiplier: 365 },
  { pattern: /(\d+)\s*(?:month|mo)s?/gi, multiplier: 30 },
  { pattern: /(\d+)\s*(?:day|d)s?/gi, multiplier: 1 },
  { pattern: /(\d+)\s*(?:week|wk)s?/gi, multiplier: 7 },
];

interface ExtractedPolicy {
  name: string;
  description: string;
  retentionDays: number;
  framework: ComplianceFramework | null;
  dispositionAction: DispositionAction;
  categories: string[];
  confidence: number;
  sourceText: string;
}

interface PolicyDocumentDetectorProps {
  documentId: string | null;
  documentName: string | null;
  onClose: () => void;
  onPoliciesCreated: (policyIds: string[]) => void;
}

export const PolicyDocumentDetector: React.FC<PolicyDocumentDetectorProps> = ({
  documentId,
  documentName,
  onClose,
  onPoliciesCreated,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedPolicies, setExtractedPolicies] = useState<ExtractedPolicy[]>([]);
  const [selectedPolicies, setSelectedPolicies] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isPolicyDocument, setIsPolicyDocument] = useState(false);
  
  // Edit mode state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    retentionDays: number;
    dispositionAction: DispositionAction;
    categories: string[];
  } | null>(null);

  const startEditing = (index: number) => {
    const policy = extractedPolicies[index];
    setEditForm({
      name: policy.name,
      description: policy.description,
      retentionDays: policy.retentionDays,
      dispositionAction: policy.dispositionAction,
      categories: [...policy.categories],
    });
    setEditingIndex(index);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const saveEditing = () => {
    if (editingIndex === null || !editForm) return;
    
    const updatedPolicies = [...extractedPolicies];
    updatedPolicies[editingIndex] = {
      ...updatedPolicies[editingIndex],
      name: editForm.name,
      description: editForm.description,
      retentionDays: editForm.retentionDays,
      dispositionAction: editForm.dispositionAction,
      categories: editForm.categories,
    };
    setExtractedPolicies(updatedPolicies);
    setEditingIndex(null);
    setEditForm(null);
  };

  // Fetch and analyze document when ID changes
  useEffect(() => {
    console.log('🔍 PolicyDocumentDetector: documentId changed to:', documentId, 'documentName:', documentName);
    if (documentId) {
      console.log('🔍 PolicyDocumentDetector: Starting document analysis...');
      analyzeDocument();
    }
  }, [documentId]);

  const analyzeDocument = async () => {
    if (!documentId) return;
    
    setIsAnalyzing(true);
    setExtractedPolicies([]);
    setAnalysisComplete(false);

    try {
      // Fetch document content from database
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('extracted_text, file_name, metadata')
        .eq('id', documentId)
        .single();

      if (docError || !doc) {
        throw new Error('Could not fetch document');
      }

      const content = doc.extracted_text || '';
      setDocumentContent(content);

      // Check if this is a policy document
      const isPolicyDoc = checkIfPolicyDocument(content, doc.file_name);
      setIsPolicyDocument(isPolicyDoc);

      if (!isPolicyDoc) {
        setAnalysisComplete(true);
        return;
      }

      // Extract policies using AI
      const policies = await extractPoliciesFromContent(content, doc.file_name);
      setExtractedPolicies(policies);
      
      // Auto-select all policies by default
      setSelectedPolicies(new Set(policies.map((_, i) => i)));
      setAnalysisComplete(true);

    } catch (error) {
      console.error('Failed to analyze document:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze the document for policies.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const checkIfPolicyDocument = (content: string, fileName: string): boolean => {
    const lowerContent = content.toLowerCase();
    const lowerFileName = fileName.toLowerCase();

    // Check filename
    if (POLICY_KEYWORDS.some(keyword => lowerFileName.includes(keyword))) {
      return true;
    }

    // Check content - need multiple keyword matches
    let keywordMatches = 0;
    for (const keyword of POLICY_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        keywordMatches++;
        if (keywordMatches >= 2) return true;
      }
    }

    return false;
  };

  const detectFramework = (text: string): ComplianceFramework | null => {
    const lowerText = text.toLowerCase();
    
    for (const { framework, keywords } of FRAMEWORK_PATTERNS) {
      const matches = keywords.filter(p => lowerText.includes(p));
      if (matches.length >= 1) {
        return framework;
      }
    }
    
    return null;
  };

  const extractRetentionPeriod = (text: string): number | null => {
    for (const { pattern, multiplier } of RETENTION_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const value = parseInt(match[1], 10);
        if (value > 0 && value < 100) { // Reasonable range
          return value * multiplier;
        }
      }
    }
    return null;
  };

  const extractPoliciesFromContent = async (content: string, fileName: string): Promise<ExtractedPolicy[]> => {
    const policies: ExtractedPolicy[] = [];
    
    // Split content into sections (by headers or numbered items)
    const sections = content.split(/(?=\n(?:\d+\.|#{1,3}|[A-Z][a-z]+:))/);
    
    for (const section of sections) {
      if (section.trim().length < 50) continue;
      
      // Check if section mentions retention
      const lowerSection = section.toLowerCase();
      const hasRetentionContext = POLICY_KEYWORDS.some(k => lowerSection.includes(k));
      
      if (!hasRetentionContext) continue;
      
      const retentionDays = extractRetentionPeriod(section);
      if (!retentionDays) continue;
      
      const framework = detectFramework(section);
      
      // Extract a title from the first line or generate one
      const firstLine = section.split('\n')[0].trim();
      const title = firstLine.length > 10 && firstLine.length < 100 
        ? firstLine.replace(/^[\d.#]+\s*/, '').trim()
        : `Policy from ${fileName}`;
      
      // Determine disposition action based on content
      let disposition: DispositionAction = 'review';
      if (lowerSection.includes('delete') || lowerSection.includes('destroy') || lowerSection.includes('purge')) {
        disposition = 'delete';
      } else if (lowerSection.includes('archive') || lowerSection.includes('long-term storage')) {
        disposition = 'archive';
      } else if (lowerSection.includes('transfer')) {
        disposition = 'transfer';
      }
      
      // Extract categories from content
      const categories: string[] = [];
      const categoryKeywords = ['financial', 'hr', 'legal', 'medical', 'tax', 'contracts', 'employee', 'customer', 'vendor'];
      for (const cat of categoryKeywords) {
        if (lowerSection.includes(cat)) {
          categories.push(cat.charAt(0).toUpperCase() + cat.slice(1));
        }
      }
      
      // Calculate confidence based on matches
      let confidence = 0.5;
      if (retentionDays) confidence += 0.2;
      if (framework) confidence += 0.15;
      if (categories.length > 0) confidence += 0.1;
      if (title !== `Policy from ${fileName}`) confidence += 0.05;
      
      policies.push({
        name: title.substring(0, 100),
        description: section.substring(0, 500).trim(),
        retentionDays,
        framework,
        dispositionAction: disposition,
        categories: categories.slice(0, 5),
        confidence: Math.min(1, confidence),
        sourceText: section.substring(0, 200),
      });
    }
    
    // If no policies found from sections, try to extract from the whole document
    if (policies.length === 0 && content.length > 0) {
      const retentionDays = extractRetentionPeriod(content);
      const framework = detectFramework(content);
      
      if (retentionDays) {
        policies.push({
          name: `Retention Policy - ${fileName.replace(/\.[^/.]+$/, '')}`,
          description: `Retention policy extracted from ${fileName}`,
          retentionDays,
          framework,
          dispositionAction: 'review',
          categories: [],
          confidence: 0.4,
          sourceText: content.substring(0, 200),
        });
      }
    }
    
    return policies;
  };

  const handleCreatePolicies = async () => {
    if (selectedPolicies.size === 0) {
      toast({
        title: 'No Policies Selected',
        description: 'Please select at least one policy to create.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    const createdPolicyIds: string[] = [];

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      for (const index of selectedPolicies) {
        const policy = extractedPolicies[index];
        
        const { data: newPolicy, error } = await supabase
          .from('retention_policies')
          .insert({
            user_id: userData.user.id,
            name: policy.name,
            description: policy.description,
            retention_period_days: policy.retentionDays,
            disposition_action: policy.dispositionAction,
            trigger_type: 'creation_date',
            is_active: true,
            priority: 0,
            applies_to_categories: policy.categories,
            applies_to_folders: [],
            compliance_framework: policy.framework,
            notification_days_before: 30,
            requires_approval: policy.dispositionAction === 'delete',
            approval_roles: [],
            metadata: {
              source_document_id: documentId,
              source_document_name: documentName,
              extraction_confidence: policy.confidence,
              extracted_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (error) {
          console.error('Failed to create policy:', error);
          continue;
        }

        if (newPolicy) {
          createdPolicyIds.push(newPolicy.id);
        }
      }

      if (createdPolicyIds.length > 0) {
        toast({
          title: 'Policies Created',
          description: `Successfully created ${createdPolicyIds.length} retention ${createdPolicyIds.length === 1 ? 'policy' : 'policies'}.`,
        });
        onPoliciesCreated(createdPolicyIds);
        onClose();
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Could not create any policies. Please try again.',
          variant: 'destructive',
        });
      }

    } catch (error) {
      console.error('Failed to create policies:', error);
      toast({
        title: 'Error',
        description: 'Failed to create policies. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const togglePolicy = (index: number) => {
    const newSelected = new Set(selectedPolicies);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPolicies(newSelected);
  };

  const getDispositionIcon = (action: DispositionAction) => {
    switch (action) {
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'archive': return <Archive className="h-4 w-4 text-blue-500" />;
      case 'review': return <Eye className="h-4 w-4 text-yellow-500" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  console.log('🔍 PolicyDocumentDetector rendering - documentId:', documentId, 'open:', !!documentId);

  return (
    <Dialog open={!!documentId} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-3xl max-h-[85vh] z-[99999]" aria-describedby="policy-detector-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Policy Document Analysis
          </DialogTitle>
          <DialogDescription id="policy-detector-description">
            Analyzing "{documentName}" for retention policy information
          </DialogDescription>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing document for retention policies...</p>
          </div>
        ) : analysisComplete && !isPolicyDocument ? (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Not a Policy Document</AlertTitle>
            <AlertDescription>
              This document does not appear to contain retention policy information.
              You can still create policies manually in the Retention tab.
            </AlertDescription>
          </Alert>
        ) : analysisComplete && extractedPolicies.length === 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Policies Detected</AlertTitle>
            <AlertDescription>
              This appears to be a policy document but no specific retention policies could be extracted.
              The document may need manual review to create retention policies.
            </AlertDescription>
          </Alert>
        ) : analysisComplete && extractedPolicies.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-200">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <AlertTitle>Policies Detected!</AlertTitle>
                <AlertDescription>
                  Found {extractedPolicies.length} potential retention {extractedPolicies.length === 1 ? 'policy' : 'policies'} in this document.
                  Select the ones you want to create. Click the edit button to modify before creating.
                </AlertDescription>
              </Alert>

              {extractedPolicies.map((policy, index) => (
                <Card 
                  key={index} 
                  className={`transition-all ${
                    editingIndex === index 
                      ? 'ring-2 ring-blue-500' 
                      : selectedPolicies.has(index) 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:border-muted-foreground/50'
                  }`}
                >
                  {editingIndex === index && editForm ? (
                    // Edit mode
                    <div className="p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Policy
                        </h4>
                        <Button variant="ghost" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="edit-name">Policy Name</Label>
                          <Input
                            id="edit-name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            rows={2}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="edit-retention">Retention Period (days)</Label>
                            <Input
                              id="edit-retention"
                              type="number"
                              value={editForm.retentionDays}
                              onChange={(e) => setEditForm({ ...editForm, retentionDays: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground">
                              ≈ {Math.floor(editForm.retentionDays / 365)} years {editForm.retentionDays % 365} days
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="edit-disposition">Disposition Action</Label>
                            <Select
                              value={editForm.dispositionAction}
                              onValueChange={(v) => setEditForm({ ...editForm, dispositionAction: v as DispositionAction })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="archive">Archive</SelectItem>
                                <SelectItem value="delete">Delete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <Label htmlFor="edit-categories">Categories (comma-separated)</Label>
                          <Input
                            id="edit-categories"
                            value={editForm.categories.join(', ')}
                            onChange={(e) => setEditForm({ 
                              ...editForm, 
                              categories: e.target.value.split(',').map(c => c.trim()).filter(Boolean) 
                            })}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEditing}>
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div 
                            className="flex items-start gap-3 flex-1 cursor-pointer"
                            onClick={() => togglePolicy(index)}
                          >
                            <Checkbox 
                              checked={selectedPolicies.has(index)}
                              onCheckedChange={() => togglePolicy(index)}
                            />
                            <div>
                              <CardTitle className="text-base flex items-center gap-2">
                                {policy.name}
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(policy.confidence * 100)}% confidence
                                </Badge>
                              </CardTitle>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {Math.floor(policy.retentionDays / 365)} years
                                </span>
                                <span className="flex items-center gap-1">
                                  {getDispositionIcon(policy.dispositionAction)}
                                  {policy.dispositionAction}
                                </span>
                                {policy.framework && (
                                  <Badge variant="secondary" className="text-xs">
                                    {policy.framework}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(index);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {selectedPolicies.has(index) && (
                              <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0" onClick={() => togglePolicy(index)}>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {policy.description.substring(0, 150)}...
                        </p>
                        {policy.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {policy.categories.map((cat, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {analysisComplete && extractedPolicies.length > 0 && (
            <Button 
              onClick={handleCreatePolicies}
              disabled={selectedPolicies.size === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Create {selectedPolicies.size} {selectedPolicies.size === 1 ? 'Policy' : 'Policies'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

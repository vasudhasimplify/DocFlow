import React, { useState } from 'react';
import { DocumentSelector } from '@/components/common/DocumentSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Plus,
  Shield,
  FileType,
  Tag,
  Folder,
  Lock,
  Download,
  Printer,
  Share2,
  Globe,
  Trash2,
  Edit,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  GripVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Zap,
  Eye,
  FileText,
} from 'lucide-react';
import { useContentAccessRules, ContentAccessRule, CreateRuleParams } from '@/hooks/useContentAccessRules';
import { formatDistanceToNow } from 'date-fns';
import { DocumentViewer } from '@/components/document-manager/DocumentViewer';
import { supabase } from '@/integrations/supabase/client';

export function ContentAccessRulesPanel() {
  const {
    rules,
    loading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    getRuleStats,
    fetchApplications,
    applications,
    refetch,
  } = useContentAccessRules();



  const [viewingMatches, setViewingMatches] = useState<ContentAccessRule | null>(null);
  const [viewingRuleDetails, setViewingRuleDetails] = useState<ContentAccessRule | null>(null);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<ContentAccessRule | null>(null);
  const [formData, setFormData] = useState<CreateRuleParams>({
    name: '',
    description: '',
    file_types: [],
    name_patterns: [],
    content_keywords: [],
    restrict_download: false,
    restrict_print: false,
    restrict_share: false,
    restrict_external_share: false,
    is_active: true,
    priority: 100,
  });
  const [fileTypeInput, setFileTypeInput] = useState('');
  const [patternInput, setPatternInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [viewingRestrictions, setViewingRestrictions] = useState<'download' | 'print' | 'share' | 'external' | null>(null);
  const [restrictedDocuments, setRestrictedDocuments] = useState<any[]>([]);
  const [viewingRulesList, setViewingRulesList] = useState<'all' | 'active' | 'auto' | null>(null);
  const [viewingAutoApplied, setViewingAutoApplied] = useState(false);
  const [autoAppliedApplications, setAutoAppliedApplications] = useState<any[]>([]);

  // Listen for document changes to auto-refresh stats
  React.useEffect(() => {
    const handleUpdate = () => {
      console.log('🔄 Access Rules: Refreshing data due to document updates');
      refetch();
      // If viewing a specific list, refresh it
      if (viewingMatches) {
        fetchApplications({ ruleId: viewingMatches?.id });
      } else if (viewingRestrictions) {
        fetchApplications({}); // Refresh all applications
      }
    };

    window.addEventListener('documents-changed', handleUpdate);
    window.addEventListener('upload-completed', handleUpdate);

    return () => {
      window.removeEventListener('documents-changed', handleUpdate);
      window.removeEventListener('upload-completed', handleUpdate);
    };
  }, [refetch, viewingMatches, viewingRestrictions, fetchApplications]);

  const stats = getRuleStats();

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    // No longer require document selection - criteria-based matching only

    await createRule(formData);
    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingRule) return;

    await updateRule(editingRule.id, formData);
    setEditingRule(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      file_types: [],
      name_patterns: [],
      content_keywords: [],
      restrict_download: false,
      restrict_print: false,
      restrict_share: false,
      restrict_external_share: false,
      is_active: true,
      priority: 100,
    });
    setFileTypeInput('');
    setPatternInput('');
    setKeywordInput('');
    setSelectedDocIds([]);
  };

  const handleViewMatches = (rule: ContentAccessRule) => {
    setViewingMatches(rule);
    fetchApplications({ ruleId: rule.id });
  };

  const openEditDialog = (rule: ContentAccessRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      file_types: rule.file_types || [],
      name_patterns: rule.name_patterns || [],
      content_keywords: rule.content_keywords || [],
      restrict_download: rule.restrict_download || false,
      restrict_print: rule.restrict_print || false,
      restrict_share: rule.restrict_share || false,
      restrict_external_share: rule.restrict_external_share || false,
      is_active: rule.is_active,
      priority: rule.priority,
    });
  };

  const addToArray = (field: 'file_types' | 'name_patterns' | 'content_keywords', value: string) => {
    if (!value.trim()) return;
    const trimmedValue = value.trim().toLowerCase();
    // Prevent duplicate entries
    const existingValues = (formData[field] || []).map(v => v.toLowerCase());
    if (existingValues.includes(trimmedValue)) {
      return; // Don't add duplicate
    }
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }));
  };

  const removeFromArray = (field: 'file_types' | 'name_patterns' | 'content_keywords', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Content Access Rules</h2>
          <p className="text-muted-foreground">Automatically apply restrictions based on document properties</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
          onClick={() => setViewingRulesList('all')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.total === 1 ? 'Rule Applied' : 'Rules Applied'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md hover:border-green-500/50 transition-all"
          onClick={() => setViewingRulesList('active')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.active === 1 ? 'Active Rule Applied' : 'Active Rules Applied'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md hover:border-orange-500/50 transition-all"
          onClick={() => {
            // Show restrictions breakdown dialog
            setViewingRestrictions('download');
            // Use applications data from hook
            fetchApplications({});
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Lock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withRestrictions}</p>
                <p className="text-sm text-muted-foreground">With Restrictions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-md hover:border-blue-500/50 transition-all"
          onClick={async () => {
            // Fetch all rule applications (no joins - they don't exist)
            try {
              console.log('📋 Fetching auto-applied applications...');
              const { data: applications, error } = await supabase
                .from('content_rule_applications')
                .select('id, document_id, rule_id, matched_criteria, actions_applied, created_at')
                .order('created_at', { ascending: false })
                .limit(100);

              if (error) {
                console.error('Query error:', error);
                setAutoAppliedApplications([]);
                setViewingAutoApplied(true);
                return;
              }

              console.log('📋 Total applications fetched:', applications?.length || 0);

              // Filter for auto-applied (match_source = 'auto-evaluation')
              const autoApplied = (applications || []).filter(app =>
                app.matched_criteria?.match_source === 'auto-evaluation'
              );

              console.log('📋 Auto-applied applications found:', autoApplied.length);

              // If no auto-applied, just show empty dialog
              if (autoApplied.length === 0) {
                setAutoAppliedApplications([]);
                setViewingAutoApplied(true);
                return;
              }

              // Fetch document and rule details for each application (with error handling)
              const enrichedApps = await Promise.all(autoApplied.map(async (app) => {
                try {
                  const [docResult, ruleResult] = await Promise.all([
                    supabase.from('documents').select('id, file_name').eq('id', app.document_id).maybeSingle(),
                    supabase.from('content_access_rules').select('id, name, restrict_download, restrict_print, restrict_share, restrict_external_share').eq('id', app.rule_id).maybeSingle()
                  ]);
                  return {
                    ...app,
                    documents: docResult.data || { file_name: 'Unknown Document' },
                    content_access_rules: ruleResult.data || { name: 'Unknown Rule' }
                  };
                } catch (e) {
                  return { ...app, documents: { file_name: 'Error loading' }, content_access_rules: { name: 'Error loading' } };
                }
              }));

              console.log('📋 Enriched applications:', enrichedApps.length);
              setAutoAppliedApplications(enrichedApps);
              setViewingAutoApplied(true);
            } catch (err) {
              console.error('Failed to fetch auto-applied applications:', err);
              setAutoAppliedApplications([]);
              setViewingAutoApplied(true);
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withAutoActions}</p>
                <p className="text-sm text-muted-foreground">
                  {stats.withAutoActions === 1 ? 'Auto Action' : 'Auto Actions'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Grid - Icon-based compact display */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Rules</h3>
        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Content Rules</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create rules to automatically apply restrictions based on document properties.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {rules.map((rule) => (
              <Card
                key={rule.id}
                className={`cursor-pointer hover:shadow-md hover:border-primary/50 transition-all ${!rule.is_active ? 'opacity-50' : ''}`}
                onClick={() => setViewingRuleDetails(rule)}
              >
                <CardContent className="p-4 text-center">
                  {/* Icon based on restrictions */}
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 ${rule.restrict_download || rule.restrict_print || rule.restrict_share || rule.restrict_external_share
                    ? 'bg-red-100 dark:bg-red-950'
                    : 'bg-primary/10'
                    }`}>
                    <Shield className={`h-6 w-6 ${rule.restrict_download || rule.restrict_print || rule.restrict_share || rule.restrict_external_share
                      ? 'text-red-500'
                      : 'text-primary'
                      }`} />
                  </div>

                  {/* Rule name */}
                  <p className="font-medium text-sm truncate mb-1" title={rule.name}>{rule.name}</p>

                  {/* Restriction icons */}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {rule.restrict_download && (
                      <span title="No Download"><Download className="h-3 w-3 text-red-500" /></span>
                    )}
                    {rule.restrict_print && (
                      <span title="No Print"><Printer className="h-3 w-3 text-red-500" /></span>
                    )}
                    {rule.restrict_share && (
                      <span title="No Share"><Share2 className="h-3 w-3 text-red-500" /></span>
                    )}
                    {rule.restrict_external_share && (
                      <span title="No External"><Globe className="h-3 w-3 text-red-500" /></span>
                    )}
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); handleViewMatches(rule); }}
                      title="View Matched Documents"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); openEditDialog(rule); }}
                      title="Edit Rule"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="scale-75"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteRule(rule.id); }}
                      title="Delete Rule"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            setEditingRule(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Rule' : 'Create Content Access Rule'}</DialogTitle>
            <DialogDescription>
              Define criteria to match documents and apply restrictions automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Info Alert */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                ℹ️ <strong>Automatic Matching:</strong> This rule will automatically scan and match documents based on the criteria you define below.
              </p>
            </div>

            {/* Step 1: Basic Info */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Step 1: Rule Details</Label>
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Confidential Documents"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description || ''}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this rule does..."
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Matching Criteria */}
            <Accordion type="single" collapsible defaultValue="criteria">
              <AccordionItem value="criteria">
                <AccordionTrigger>Matching Criteria</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  {/* File Types */}
                  <div className="space-y-2">
                    <Label>File Types</Label>
                    <p className="text-xs text-muted-foreground">Select document types to match</p>
                    <div className="grid grid-cols-3 gap-2">
                      {['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'txt', 'csv', 'jpg', 'png', 'zip'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            if (formData.file_types?.includes(type)) {
                              setFormData(prev => ({
                                ...prev,
                                file_types: prev.file_types?.filter(t => t !== type)
                              }));
                            } else {
                              addToArray('file_types', type);
                            }
                          }}
                          className={`px-3 py-2 text-sm border rounded-md transition-colors ${formData.file_types?.includes(type)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted border-input'
                            }`}
                        >
                          .{type}
                        </button>
                      ))}
                    </div>
                    {formData.file_types && formData.file_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.file_types.map((type, i) => (
                          <Badge key={i} variant="secondary" className="gap-1">
                            .{type}
                            <button onClick={() => removeFromArray('file_types', i)}>
                              <XCircle className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Name Patterns */}
                  <div className="space-y-2">
                    <Label>Name Patterns (Regex)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={patternInput}
                        onChange={e => setPatternInput(e.target.value)}
                        placeholder="e.g., confidential, secret, private"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToArray('name_patterns', patternInput);
                            setPatternInput('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          addToArray('name_patterns', patternInput);
                          setPatternInput('');
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.name_patterns?.map((pattern, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {pattern}
                          <button onClick={() => removeFromArray('name_patterns', i)}>
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Content Keywords */}
                  <div className="space-y-2">
                    <Label>Content Keywords</Label>
                    <div className="flex gap-2">
                      <Input
                        value={keywordInput}
                        onChange={e => setKeywordInput(e.target.value)}
                        placeholder="e.g., SSN, credit card, password"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addToArray('content_keywords', keywordInput);
                            setKeywordInput('');
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          addToArray('content_keywords', keywordInput);
                          setKeywordInput('');
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.content_keywords?.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {keyword}
                          <button onClick={() => removeFromArray('content_keywords', i)}>
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="restrictions">
                <AccordionTrigger>Access Restrictions</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setFormData(prev => ({ ...prev, restrict_download: !prev.restrict_download }))}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <Label className="cursor-pointer">Restrict Download</Label>
                      </div>
                      <Switch
                        checked={formData.restrict_download}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, restrict_download: checked }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setFormData(prev => ({ ...prev, restrict_print: !prev.restrict_print }))}
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4 text-muted-foreground" />
                        <Label className="cursor-pointer">Restrict Print</Label>
                      </div>
                      <Switch
                        checked={formData.restrict_print}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, restrict_print: checked }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setFormData(prev => ({ ...prev, restrict_share: !prev.restrict_share }))}
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                        <Label className="cursor-pointer">Restrict Sharing</Label>
                      </div>
                      <Switch
                        checked={formData.restrict_share}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, restrict_share: checked }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setFormData(prev => ({ ...prev, restrict_external_share: !prev.restrict_external_share }))}
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Label className="cursor-pointer">No External Share</Label>
                      </div>
                      <Switch
                        checked={formData.restrict_external_share}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, restrict_external_share: checked }))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setEditingRule(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingRule ? handleUpdate : handleCreate}
              disabled={!formData.name.trim()}
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Matches Dialog */}
      <Dialog open={!!viewingMatches} onOpenChange={(open) => !open && setViewingMatches(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Rule Applications: {viewingMatches?.name}</DialogTitle>
            <DialogDescription>
              Documents that matched this rule and had restrictions applied.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ScrollArea className="h-[400px]">
              {applications.length === 0 ? (
                <div className="text-center text-muted-foreground p-8">No matching documents found.</div>
              ) : (
                <div className="space-y-2">
                  {applications.map((app: any) => (
                    <Card key={app.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Fetch document data and show preview
                              if (app.document_id) {
                                const { data: doc } = await supabase
                                  .from('documents')
                                  .select('*')
                                  .eq('id', app.document_id)
                                  .single();
                                if (doc) {
                                  setPreviewDocument(doc);
                                }
                              }
                            }}
                            title="Preview Document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <div>
                            <p className="font-medium">{app.document?.file_name || 'Unknown Document'}</p>
                            <p className="text-xs text-muted-foreground">Applied: {new Date(app.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {app.actions_applied?.restrict_download && <Badge variant="destructive" className="text-xs">No Download</Badge>}
                          {app.actions_applied?.restrict_print && <Badge variant="destructive" className="text-xs">No Print</Badge>}
                          {app.actions_applied?.restrict_share && <Badge variant="destructive" className="text-xs">No Share</Badge>}
                          {app.actions_applied?.restrict_external_share && <Badge variant="destructive" className="text-xs">No Ext. Share</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rule Details Dialog */}
      <Dialog open={!!viewingRuleDetails} onOpenChange={(open) => !open && setViewingRuleDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {viewingRuleDetails?.name}
            </DialogTitle>
            <DialogDescription>
              {viewingRuleDetails?.description || 'Rule details and constraints'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={viewingRuleDetails?.is_active ? 'default' : 'secondary'}>
                {viewingRuleDetails?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <Separator />

            {/* Matching Criteria */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Matching Criteria
              </h4>

              {/* File Types */}
              {viewingRuleDetails?.file_types && viewingRuleDetails.file_types.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">File Types:</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingRuleDetails.file_types.map((type, i) => (
                      <Badge key={i} variant="outline" className="text-xs">.{type}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Name Patterns */}
              {viewingRuleDetails?.name_patterns && viewingRuleDetails.name_patterns.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Name Patterns:</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingRuleDetails.name_patterns.map((pattern, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{pattern}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Keywords */}
              {viewingRuleDetails?.content_keywords && viewingRuleDetails.content_keywords.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Content Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {viewingRuleDetails.content_keywords.map((keyword, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {!viewingRuleDetails?.file_types?.length &&
                !viewingRuleDetails?.name_patterns?.length &&
                !viewingRuleDetails?.content_keywords?.length && (
                  <p className="text-sm text-muted-foreground italic">No matching criteria defined</p>
                )}
            </div>

            <Separator />

            {/* Restrictions */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Restrictions
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${viewingRuleDetails?.restrict_download ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'}`}>
                  <Download className={`h-4 w-4 ${viewingRuleDetails?.restrict_download ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="text-sm">{viewingRuleDetails?.restrict_download ? 'No Download' : 'Download OK'}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${viewingRuleDetails?.restrict_print ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'}`}>
                  <Printer className={`h-4 w-4 ${viewingRuleDetails?.restrict_print ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="text-sm">{viewingRuleDetails?.restrict_print ? 'No Print' : 'Print OK'}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${viewingRuleDetails?.restrict_share ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'}`}>
                  <Share2 className={`h-4 w-4 ${viewingRuleDetails?.restrict_share ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="text-sm">{viewingRuleDetails?.restrict_share ? 'No Share' : 'Share OK'}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-lg border ${viewingRuleDetails?.restrict_external_share ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'}`}>
                  <Globe className={`h-4 w-4 ${viewingRuleDetails?.restrict_external_share ? 'text-red-500' : 'text-green-500'}`} />
                  <span className="text-sm">{viewingRuleDetails?.restrict_external_share ? 'No External' : 'External OK'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setViewingRuleDetails(null)}>
              Close
            </Button>
            <Button className="flex-1" onClick={() => {
              if (viewingRuleDetails) {
                openEditDialog(viewingRuleDetails);
                setViewingRuleDetails(null);
              }
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Preview Viewer */}
      {previewDocument && (
        <DocumentViewer
          document={previewDocument}
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
        />
      )}

      {/* Restrictions Breakdown Dialog */}
      <Dialog open={!!viewingRestrictions} onOpenChange={(open) => !open && setViewingRestrictions(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-orange-500" />
              Documents with Restrictions
            </DialogTitle>
            <DialogDescription>
              Click on a restriction type to see documents with that restriction. You can remove restrictions from individual documents.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Restriction type tabs */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={viewingRestrictions === 'download' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewingRestrictions('download')}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                No Download
              </Button>
              <Button
                variant={viewingRestrictions === 'print' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewingRestrictions('print')}
                className="gap-1"
              >
                <Printer className="h-4 w-4" />
                No Print
              </Button>
              <Button
                variant={viewingRestrictions === 'share' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewingRestrictions('share')}
                className="gap-1"
              >
                <Share2 className="h-4 w-4" />
                No Share
              </Button>
              <Button
                variant={viewingRestrictions === 'external' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewingRestrictions('external')}
                className="gap-1"
              >
                <Globe className="h-4 w-4" />
                No External
              </Button>
            </div>

            {/* Documents list */}
            <ScrollArea className="h-[350px]">
              {applications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Lock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No documents with this restriction</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {applications
                    .filter((app: any) => {
                      if (viewingRestrictions === 'download') return app.actions_applied?.restrict_download;
                      if (viewingRestrictions === 'print') return app.actions_applied?.restrict_print;
                      if (viewingRestrictions === 'share') return app.actions_applied?.restrict_share;
                      if (viewingRestrictions === 'external') return app.actions_applied?.restrict_external_share;
                      return true;
                    })
                    .map((app: any) => (
                      <Card key={app.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={async () => {
                                if (app.document_id) {
                                  const { data: doc } = await supabase
                                    .from('documents')
                                    .select('*')
                                    .eq('id', app.document_id)
                                    .single();
                                  if (doc) setPreviewDocument(doc);
                                }
                              }}
                              title="Preview Document"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <div>
                              <p className="font-medium text-sm">{app.document?.file_name || 'Unknown Document'}</p>
                              <p className="text-xs text-muted-foreground">
                                Rule: {rules.find(r => r.id === app.rule_id)?.name || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                              // Remove this specific restriction from the document
                              const updatedActions = { ...app.actions_applied };
                              if (viewingRestrictions === 'download') updatedActions.restrict_download = false;
                              if (viewingRestrictions === 'print') updatedActions.restrict_print = false;
                              if (viewingRestrictions === 'share') updatedActions.restrict_share = false;
                              if (viewingRestrictions === 'external') updatedActions.restrict_external_share = false;

                              await supabase
                                .from('content_access_rule_applications')
                                .update({ actions_applied: updatedActions })
                                .eq('id', app.id);

                              // Refresh the list
                              const { data } = await supabase
                                .from('content_access_rule_applications')
                                .select('*, document:documents(*)')
                                .limit(50);
                              setRestrictedDocuments(data || []);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  }
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rules List Dialog */}
      <Dialog open={!!viewingRulesList} onOpenChange={(open) => !open && setViewingRulesList(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {viewingRulesList === 'all' && 'All Rules Applied'}
              {viewingRulesList === 'active' && 'Active Rules Applied'}
              {viewingRulesList === 'auto' && 'Rules with Auto Actions'}
            </DialogTitle>
            <DialogDescription>
              {viewingRulesList === 'all' && 'List of all content access rules'}
              {viewingRulesList === 'active' && 'Currently active rules that are being applied'}
              {viewingRulesList === 'auto' && 'Rules that have automatic restrictions enabled'}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] py-4">
            <div className="space-y-2">
              {(() => {
                let filteredRules = rules;
                if (viewingRulesList === 'active') {
                  filteredRules = rules.filter(r => r.is_active);
                } else if (viewingRulesList === 'auto') {
                  filteredRules = rules.filter(r => r.restrict_download || r.restrict_print || r.restrict_share || r.restrict_external_share);
                }

                if (filteredRules.length === 0) {
                  return (
                    <div className="text-center text-muted-foreground py-8">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No rules found</p>
                    </div>
                  );
                }

                return filteredRules.map((rule) => (
                  <Card
                    key={rule.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => {
                      setViewingRulesList(null);
                      setViewingRuleDetails(rule);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-500/10' : 'bg-muted'}`}>
                            <Shield className={`h-4 w-4 ${rule.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[300px]">{rule.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rule.restrict_download && <span title="No Download"><Download className="h-3 w-3 text-red-500" /></span>}
                          {rule.restrict_print && <span title="No Print"><Printer className="h-3 w-3 text-red-500" /></span>}
                          {rule.restrict_share && <span title="No Share"><Share2 className="h-3 w-3 text-red-500" /></span>}
                          {rule.restrict_external_share && <span title="No External"><Globe className="h-3 w-3 text-red-500" /></span>}
                          <Badge variant={rule.is_active ? 'default' : 'secondary'} className="ml-2">
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Auto Actions Applied Dialog */}
      <Dialog open={viewingAutoApplied} onOpenChange={setViewingAutoApplied}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Auto-Applied Access Rules
            </DialogTitle>
            <DialogDescription>
              Documents that had access rules automatically applied during upload
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[450px] py-4">
            <div className="space-y-3">
              {autoAppliedApplications.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No Auto-Applied Rules Yet</p>
                  <p className="text-sm mt-1">Rules will appear here when documents are uploaded with "Auto-Apply Access Rules" enabled</p>
                </div>
              ) : (
                autoAppliedApplications.map((app) => {
                  const doc = app.documents;
                  const rule = app.content_access_rules;
                  const actions = app.actions_applied || {};

                  return (
                    <Card key={app.id} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            {/* Document Name */}
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium truncate" title={doc?.file_name}>
                                {doc?.file_name || 'Unknown Document'}
                              </span>
                            </div>

                            {/* Rule Name */}
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">Rule:</span>
                              <Badge variant="outline" className="text-xs">
                                {rule?.name || 'Unknown Rule'}
                              </Badge>
                            </div>

                            {/* Applied Time */}
                            <div className="text-xs text-muted-foreground">
                              Applied: {app.created_at ? new Date(app.created_at).toLocaleString() : 'Unknown'}
                            </div>
                          </div>

                          {/* Restrictions Applied */}
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-muted-foreground mb-1">Restrictions:</div>
                            <div className="flex flex-wrap gap-1 justify-end">
                              {actions.restrict_download && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                  <Download className="h-3 w-3" /> No Download
                                </Badge>
                              )}
                              {actions.restrict_print && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                  <Printer className="h-3 w-3" /> No Print
                                </Badge>
                              )}
                              {actions.restrict_share && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                  <Share2 className="h-3 w-3" /> No Share
                                </Badge>
                              )}
                              {actions.restrict_external_share && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                  <Globe className="h-3 w-3" /> No External
                                </Badge>
                              )}
                              {!actions.restrict_download && !actions.restrict_print && !actions.restrict_share && !actions.restrict_external_share && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

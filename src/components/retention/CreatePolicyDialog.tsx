import React, { useState } from 'react';
import { 
  Shield, Clock, Archive, Trash2, Eye, Send, 
  AlertTriangle, CheckCircle, Plus, CalendarIcon, Pencil, Sparkles
} from 'lucide-react';
import { EditTemplateDialog } from './EditTemplateDialog';
import { AIPolicyRecommendations } from './AIPolicyRecommendations';
import { format } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { 
  COMPLIANCE_FRAMEWORKS, 
  DISPOSITION_ACTIONS, 
  TRIGGER_TYPES,
  type RetentionPolicyTemplate,
  type DispositionAction,
  type TriggerType,
  type ComplianceFramework,
  type RetentionPolicy,
} from '@/types/retention';
import { cn } from '@/lib/utils';

interface CreatePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: RetentionPolicyTemplate[];
  initialData?: RetentionPolicy | null;
  existingPolicies?: RetentionPolicy[];
}

export const CreatePolicyDialog: React.FC<CreatePolicyDialogProps> = ({
  open,
  onOpenChange,
  templates,
  initialData,
  existingPolicies = [],
}) => {
  const { createPolicy, createFromTemplate, updatePolicy } = useRetentionPolicies();
  const [activeTab, setActiveTab] = useState<'template' | 'custom'>('template');
  const [editingTemplate, setEditingTemplate] = useState<RetentionPolicyTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [retentionUnit, setRetentionUnit] = useState<'days' | 'months' | 'years'>('years');
  const [dispositionAction, setDispositionAction] = useState<DispositionAction>('review');
  const [triggerType, setTriggerType] = useState<TriggerType>('creation_date');
  const [complianceFramework, setComplianceFramework] = useState<ComplianceFramework | ''>('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [notificationDays, setNotificationDays] = useState(30);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);

  const isEditing = !!initialData?.id;

  // Populate form when editing
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setDispositionAction(initialData.disposition_action);
      setTriggerType(initialData.trigger_type);
      setComplianceFramework(initialData.compliance_framework || '');
      setRequiresApproval(initialData.requires_approval || false);
      setNotificationDays(initialData.notification_days_before || 30);
      setCategories(initialData.applies_to_categories || []);
      
      // Convert retention days to appropriate unit
      const days = initialData.retention_period_days;
      if (days >= 365 && days % 365 === 0) {
        setRetentionUnit('years');
        setRetentionDays(days / 365);
      } else if (days >= 30 && days % 30 === 0) {
        setRetentionUnit('months');
        setRetentionDays(days / 30);
      } else {
        setRetentionUnit('days');
        setRetentionDays(days);
      }
      
      setActiveTab('custom');
    }
  }, [initialData]);

  const getRetentionInDays = () => {
    switch (retentionUnit) {
      case 'years': return retentionDays * 365;
      case 'months': return retentionDays * 30;
      default: return retentionDays;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        // Update existing policy
        console.log('Updating policy:', initialData.id);
        await updatePolicy(initialData.id, {
          name,
          description,
          retention_period_days: getRetentionInDays(),
          disposition_action: dispositionAction,
          trigger_type: triggerType,
          applies_to_categories: categories,
          compliance_framework: complianceFramework || undefined,
          notification_days_before: notificationDays,
          requires_approval: requiresApproval,
        });
        console.log('Policy updated successfully');
      } else if (activeTab === 'template' && selectedTemplate) {
        console.log('Creating policy from template:', selectedTemplate);
        const result = await createFromTemplate(selectedTemplate, {
          name: name || undefined,
          description: description || undefined,
        });
        console.log('Policy created from template:', result);
      } else {
        console.log('Creating new policy');
        const result = await createPolicy({
          name,
          description,
          retention_period_days: getRetentionInDays(),
          disposition_action: dispositionAction,
          trigger_type: triggerType,
          is_active: true,
          priority: 0,
          applies_to_categories: categories,
          applies_to_folders: [],
          compliance_framework: complianceFramework || undefined,
          notification_days_before: notificationDays,
          requires_approval: requiresApproval,
          approval_roles: [],
          metadata: {},
        });
        console.log('Policy created:', result);
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save policy:', error);
      // Error toast already shown by the hook functions
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setRetentionDays(365);
    setRetentionUnit('years');
    setDispositionAction('review');
    setTriggerType('creation_date');
    setComplianceFramework('');
    setRequiresApproval(false);
    setNotificationDays(30);
    setCategories([]);
    setSelectedTemplate(null);
    setCustomStartDate(undefined);
  };

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const getDispositionIcon = (action: string) => {
    switch (action) {
      case 'delete': return Trash2;
      case 'archive': return Archive;
      case 'review': return Eye;
      case 'transfer': return Send;
      default: return Eye;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {isEditing ? 'Edit Retention Policy' : 'Create Retention Policy'}
          </DialogTitle>
          <DialogDescription>
            Define how long documents should be retained and what happens after
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">From Template</TabsTrigger>
            <TabsTrigger value="custom">Custom Policy</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="template" className="mt-0">
              <div className="space-y-3">
                {templates.map((template) => {
                  const Icon = getDispositionIcon(template.disposition_action);
                  return (
                    <div
                      key={template.id}
                      className={cn(
                        "p-4 border rounded-lg cursor-pointer transition-colors",
                        selectedTemplate === template.id 
                          ? "border-primary bg-primary/5" 
                          : "hover:border-muted-foreground/50"
                      )}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg shrink-0",
                          selectedTemplate === template.id ? "bg-primary/10" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="secondary">{template.compliance_framework}</Badge>
                            {template.requires_approval && (
                              <Badge variant="outline" className="text-xs">Approval Required</Badge>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(template.retention_period_days / 365)} years
                            </span>
                            <span className="capitalize">{template.disposition_action}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {selectedTemplate === template.id && (
                            <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedTemplate && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium">Customize (Optional)</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label className="text-xs">Custom Name</Label>
                      <Input
                        placeholder="Leave blank to use template name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Custom Description</Label>
                      <Input
                        placeholder="Leave blank to use template description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="mt-0 space-y-6 px-1">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
                
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="policyName">Policy Name *</Label>
                    <Input
                      id="policyName"
                      placeholder="e.g., Financial Records - 7 Years"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="policyDesc">Description</Label>
                    <Textarea
                      id="policyDesc"
                      placeholder="Describe when this policy should be applied..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Compliance Framework</Label>
                    <Select value={complianceFramework} onValueChange={(v) => setComplianceFramework(v as ComplianceFramework)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select framework (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLIANCE_FRAMEWORKS.map((fw) => (
                          <SelectItem key={fw.value} value={fw.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{fw.label}</span>
                              <span className="text-xs text-muted-foreground">{fw.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Retention Period Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Retention Period
                </h3>
                
                <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm">Retain for</span>
                      <Input
                        type="number"
                        min={1}
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
                        className="w-20 h-8"
                      />
                      <Select value={retentionUnit} onValueChange={(v) => setRetentionUnit(v as typeof retentionUnit)}>
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="days">Days</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="years">Years</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">
                        = {getRetentionInDays().toLocaleString()} days
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trigger & Disposition Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Trigger & Action
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Retention Starts From</Label>
                    <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map((trigger) => (
                          <SelectItem key={trigger.value} value={trigger.value}>
                            <div className="flex flex-col">
                              <span>{trigger.label}</span>
                              <span className="text-xs text-muted-foreground">{trigger.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Custom Date Picker - shown when custom_date is selected */}
                    {triggerType === 'custom_date' && (
                      <div className="mt-3 p-3 border rounded-lg bg-muted/30">
                        <Label className="text-xs text-muted-foreground mb-2 block">
                          Select Custom Start Date
                        </Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !customStartDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customStartDate ? format(customStartDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customStartDate}
                              onSelect={setCustomStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>When Expired</Label>
                    <Select value={dispositionAction} onValueChange={(v) => setDispositionAction(v as DispositionAction)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPOSITION_ACTIONS.map((action) => (
                          <SelectItem key={action.value} value={action.value}>
                            <div className="flex flex-col">
                              <span>{action.label}</span>
                              <span className="text-xs text-muted-foreground">{action.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Categories Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Apply To Categories
                  <span className="ml-2 text-xs font-normal normal-case">(optional)</span>
                </h3>
                
                <div className="p-4 border rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-3">
                    This policy will automatically apply to documents tagged with these categories.
                    Leave empty to apply manually to individual documents.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a category and press Enter..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addCategory}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {categories.map((cat) => (
                        <Badge 
                          key={cat} 
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/20 transition-colors"
                          onClick={() => setCategories(categories.filter(c => c !== cat))}
                        >
                          {cat} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Advanced Settings
                </h3>
                
                <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-lg border-2 transition-colors",
                    requiresApproval 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-muted/30 border-muted"
                  )}>
                    <div className="space-y-1 flex-1">
                      <Label className="font-medium flex items-center gap-2">
                        Require Approval
                        <Badge 
                          variant={requiresApproval ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {requiresApproval ? "ON" : "OFF"}
                        </Badge>
                      </Label>
                      <p className={cn(
                        "text-xs",
                        requiresApproval ? "text-primary font-medium" : "text-muted-foreground"
                      )}>
                        {requiresApproval 
                          ? "✓ Disposition will require manual approval before execution"
                          : "⚠ Disposition will execute automatically when retention expires"
                        }
                      </p>
                    </div>
                    <Switch 
                      checked={requiresApproval} 
                      onCheckedChange={setRequiresApproval}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <Label className="font-medium">Notification Before Expiry</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Send alert</span>
                      <Input
                        type="number"
                        min={0}
                        value={notificationDays}
                        onChange={(e) => setNotificationDays(parseInt(e.target.value) || 0)}
                        className="w-20 h-8"
                      />
                      <span className="text-sm text-muted-foreground">days before expiry</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Button 
              variant="outline" 
              onClick={() => setShowAIRecommendations(true)}
              className="w-full sm:w-auto text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Recommendations
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || (activeTab === 'template' ? !selectedTemplate : !name)}
            >
              <Shield className="h-4 w-4 mr-2" />
              {isEditing ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Edit Template Dialog */}
      <EditTemplateDialog
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        template={editingTemplate}
        onSuccess={() => {
          // Template updated - parent will refresh
        }}
      />

      {/* AI Policy Recommendations Dialog */}
      <AIPolicyRecommendations
        open={showAIRecommendations}
        onOpenChange={setShowAIRecommendations}
        existingPolicies={existingPolicies}
        onCreatePolicy={(policyData) => {
          // Pre-fill the form with AI recommendation
          setName(policyData.name || '');
          setDescription(policyData.description || '');
          if (policyData.retention_period_days) {
            const days = policyData.retention_period_days;
            if (days >= 365 && days % 365 === 0) {
              setRetentionUnit('years');
              setRetentionDays(days / 365);
            } else {
              setRetentionUnit('days');
              setRetentionDays(days);
            }
          }
          setDispositionAction(policyData.disposition_action || 'review');
          setTriggerType(policyData.trigger_type || 'creation_date');
          setComplianceFramework(policyData.compliance_framework || '');
          setRequiresApproval(policyData.requires_approval || false);
          setNotificationDays(policyData.notification_days_before || 30);
          setCategories(policyData.applies_to_categories || []);
          setActiveTab('custom');
          setShowAIRecommendations(false);
        }}
      />
    </Dialog>
  );
};

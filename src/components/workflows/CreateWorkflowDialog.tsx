import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Hand,
  Upload,
  Calendar,
  FileText,
  Webhook,
  CheckCircle2,
  Eye,
  ClipboardList,
  Bell,
  Mail,
  User
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TargetSystemConfig } from './TargetSystemConfig';
import {
  TriggerType,
  StepType,
  TRIGGER_TYPE_CONFIG,
  STEP_TYPE_CONFIG,
  WORKFLOW_TEMPLATES
} from '@/types/workflow';

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow?: any; // For editing existing workflow
  onWorkflowCreated?: (workflowId: string) => void; // Callback when workflow is created
}

const WORKFLOW_COLORS = [
  '#22C55E', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
];

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  manual: <Hand className="h-4 w-4" />,
  document_upload: <Upload className="h-4 w-4" />,
  form_submission: <FileText className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  api_webhook: <Webhook className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />
};

const stepIcons: Record<StepType, React.ReactNode> = {
  approval: <CheckCircle2 className="h-4 w-4" />,
  review: <Eye className="h-4 w-4" />,
  task: <ClipboardList className="h-4 w-4" />,
  notification: <Bell className="h-4 w-4" />,
  condition: <GitBranch className="h-4 w-4" />,
  parallel: <GitBranch className="h-4 w-4" />,
  integration: <Webhook className="h-4 w-4" />
};

// Helper function to generate schedule preview text
const getSchedulePreview = (formData: any): string => {
  const { schedule_type, schedule_time, schedule_day, schedule_date, schedule_cron } = formData;
  
  switch (schedule_type) {
    case 'hourly':
      return 'Runs every hour at minute 0';
    case 'daily':
      return `Runs daily at ${schedule_time}`;
    case 'weekly':
      return `Runs every ${schedule_day} at ${schedule_time}`;
    case 'monthly':
      return `Runs on day ${schedule_date} of every month at ${schedule_time}`;
    case 'cron':
      return schedule_cron || 'Enter cron expression';
    default:
      return '';
  }
};

export const CreateWorkflowDialog: React.FC<CreateWorkflowDialogProps> = ({
  open,
  onOpenChange,
  workflow,
  onWorkflowCreated
}) => {
  const { createWorkflow, updateWorkflow, isLoading } = useWorkflows();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'approval',
    color: WORKFLOW_COLORS[0],
    trigger_type: 'manual' as TriggerType,
    trigger_document_types: [] as string[], // For document_upload trigger
    schedule_type: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron', // For schedule trigger
    schedule_time: '09:00', // Time for daily/weekly/monthly
    schedule_day: 'monday' as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', // For weekly
    schedule_date: 1, // For monthly (1-31)
    schedule_cron: '', // For custom cron expression
    steps: [] as Array<{
      name: string;
      type: StepType;
      sla_hours: number;
      assigned_email: string;
      // Condition-specific fields
      condition_label?: string;
      condition_field?: string;
      condition_operator?: string;
      condition_value?: string;
    }>,
    target_system_config: {
      enabled: false,
      system_type: 'sap' as 'sap',
      endpoint_url: '',
      username: '',
      password: '',
      entity_set: '',
      field_mapping: {} as Record<string, string>
    }
  });

  const [employees, setEmployees] = useState<Array<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    department: string;
    designation: string;
  }>>([]);

  const [availableFields, setAvailableFields] = useState<Array<{
    name: string;
    label: string;
    type: string;
    description: string;
    operators: string[];
  }>>([]);

  const totalSteps = 5;

  // Fetch employees for suggestions
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, email, full_name, role, department, designation')
          .eq('is_active', true)
          .order('department')
          .order('full_name');
        
        if (error) throw error;
        if (data) setEmployees(data);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    if (open) {
      fetchEmployees();
    }

    // Fetch available fields for condition configuration
    const fetchAvailableFields = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${API_BASE_URL}/api/document-fields`);
        const data = await response.json();
        if (data.fields) {
          setAvailableFields(data.fields);
        }
      } catch (error) {
        console.error('Error fetching document fields:', error);
      }
    };
    fetchAvailableFields();
  }, [open]);

  // Populate form when editing existing workflow
  useEffect(() => {
    if (workflow && open) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        category: workflow.category || 'approval',
        color: workflow.color || WORKFLOW_COLORS[0],
        trigger_type: (workflow.trigger_type || workflow.trigger?.type || 'manual') as TriggerType,
        trigger_document_types: workflow.trigger?.document_types || [],
        schedule_type: workflow.trigger?.schedule_type || 'daily',
        schedule_time: workflow.trigger?.schedule_time || '09:00',
        schedule_day: workflow.trigger?.schedule_day || 'monday',
        schedule_date: workflow.trigger?.schedule_date || 1,
        schedule_cron: workflow.trigger?.schedule_cron || '',
        steps: workflow.steps || [],
        target_system_config: workflow.target_system_config || {
          enabled: false,
          system_type: 'sap',
          endpoint_url: '',
          username: '',
          password: '',
          entity_set: '',
          field_mapping: {}
        }
      });
    }
  }, [workflow, open]);

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }
    
    // If there's a callback, the workflow will be used immediately, so set it as active
    const shouldBeActive = !!onWorkflowCreated;
    
    const workflowData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      color: formData.color,
      version: workflow?.version || 1,
      status: workflow?.status || (shouldBeActive ? 'active' : 'draft'),
      trigger_type: formData.trigger_type,
      trigger_config: {
        document_types: formData.trigger_document_types.length > 0 
          ? formData.trigger_document_types 
          : ['all'],
        schedule_type: formData.schedule_type,
        schedule_time: formData.schedule_time,
        schedule_day: formData.schedule_day,
        schedule_date: formData.schedule_date,
        schedule_cron: formData.trigger_type === 'schedule' && formData.schedule_type === 'cron'
          ? formData.schedule_cron
          : undefined
      },
      steps: formData.steps.map((s, i) => ({
        id: `step-${i + 1}`,
        name: s.name,
        type: s.type,
        order: i + 1,
        config: {
          assigned_email: s.assigned_email // Store email in config
        },
        assignees: s.assigned_email ? [{
          type: 'user',
          value: s.assigned_email
        }] : [],
        sla_hours: s.sla_hours,
        escalation_rules: []
      })),
      is_template: false,
      tags: [formData.category],
      sla_settings: {
        enabled: true,
        total_workflow_hours: 120,
        warning_threshold_percent: 75,
        critical_threshold_percent: 90,
        business_hours_only: true,
        business_hours: { start: '09:00', end: '17:00', timezone: 'UTC', exclude_weekends: true }
      },
      notification_settings: {
        on_start: true,
        on_step_complete: true,
        on_complete: true,
        on_reject: true,
        on_escalation: true,
        on_sla_warning: true,
        channels: ['email', 'in_app'],
        digest_enabled: false,
        digest_frequency: 'daily'
      },
      target_system_config: formData.target_system_config.enabled ? formData.target_system_config : undefined
    };

    if (workflow) {
      // Update existing workflow
      await updateWorkflow(workflow.id, workflowData);
      onOpenChange(false);
    } else {
      // Create new workflow
      const newWorkflow = await createWorkflow(workflowData);
      console.log('🎯 Workflow created:', newWorkflow);
      // Call the callback with the new workflow ID if provided
      if (newWorkflow?.id && onWorkflowCreated) {
        console.log('🎯 Calling onWorkflowCreated callback with ID:', newWorkflow.id);
        onWorkflowCreated(newWorkflow.id);
        // Don't close the dialog here - let the parent handle it
      } else {
        console.warn('⚠️ No callback or workflow ID:', { 
          hasCallback: !!onWorkflowCreated, 
          workflowId: newWorkflow?.id 
        });
        // Only close if no callback (standalone usage)
        onOpenChange(false);
      }
    }
    
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setUseTemplate(false);
    setSelectedTemplate(null);
    setFormData({
      name: '',
      description: '',
      category: 'approval',
      color: WORKFLOW_COLORS[0],
      trigger_type: 'manual',
      trigger_document_types: [],
      schedule_type: 'daily',
      schedule_time: '09:00',
      schedule_day: 'monday',
      schedule_date: 1,
      schedule_cron: '',
      steps: [],
      target_system_config: {
        enabled: false,
        system_type: 'sap',
        endpoint_url: '',
        username: '',
        password: '',
        entity_set: '',
        field_mapping: {}
      }
    });
  };

  const addStep = (type: StepType) => {
    const baseStep = {
      name: `${STEP_TYPE_CONFIG[type].label} Step`,
      type,
      sla_hours: 48,
      assigned_email: ''
    };

    // Add condition-specific fields
    if (type === 'condition') {
      setFormData(prev => ({
        ...prev,
        steps: [
          ...prev.steps,
          {
            ...baseStep,
            condition_label: '',
            condition_field: '',
            condition_operator: 'greater_than',
            condition_value: ''
          }
        ]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        steps: [...prev.steps, baseStep]
      }));
    }
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index: number, updates: Partial<{
    name: string;
    type: StepType;
    sla_hours: number;
    assigned_email: string;
    condition_label: string;
    condition_field: string;
    condition_operator: string;
    condition_value: string;
  }>) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, ...updates } : s)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {workflow ? 'Edit Workflow' : 'Create Workflow'}
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — 
            {step === 1 && ' Choose a starting point'}
            {step === 2 && ' Basic Information'}
            {step === 3 && ' Define Steps'}
            {step === 4 && ' Target System Integration'}
            {step === 5 && ' Review & Create'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4 flex-shrink-0">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {/* Step 1: Template or Blank */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUseTemplate(false)}
                  className={`p-6 rounded-lg border text-left transition-all ${
                    !useTemplate ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Plus className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">Blank Workflow</h3>
                  <p className="text-sm text-muted-foreground">
                    Start from scratch and define your own steps
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setUseTemplate(true)}
                  className={`p-6 rounded-lg border text-left transition-all ${
                    useTemplate ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <GitBranch className="h-8 w-8 mb-3 text-primary" />
                  <h3 className="font-semibold mb-1">Use Template</h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-built workflow template
                  </p>
                </button>
              </div>

              {useTemplate && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {WORKFLOW_TEMPLATES.map((template, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(template.name);
                        setFormData(prev => ({
                          ...prev,
                          name: template.name,
                          description: template.description,
                          category: template.category
                        }));
                      }}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedTemplate === template.name
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-6 rounded flex items-center justify-center bg-primary text-primary-foreground">
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Info */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Document Approval"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this workflow does..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Workflow Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approval">Approval</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="hr">HR</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Category helps AI suggest this workflow for matching documents
                </p>
              </div>

              <div>
                <Label>Workflow Color</Label>
                <div className="flex gap-2 mt-2">
                  {WORKFLOW_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Trigger Type</Label>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  Choose how this workflow should be initiated
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TRIGGER_TYPE_CONFIG) as [TriggerType, typeof TRIGGER_TYPE_CONFIG[TriggerType]][])
                    .slice(0, 4)
                    .map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, trigger_type: key }))}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          formData.trigger_type === key
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {triggerIcons[key]}
                          <span className="font-medium text-sm">{config.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {key === 'manual' && 'Start workflow manually'}
                          {key === 'document_upload' && 'Trigger on document upload'}
                          {key === 'form_submission' && 'Trigger on form submission'}
                          {key === 'schedule' && 'Run on a schedule'}
                        </p>
                      </button>
                    ))}
                </div>
              </div>

              {/* Schedule Configuration for schedule trigger */}
              {formData.trigger_type === 'schedule' && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <Label className="mb-3 block">Schedule Configuration</Label>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-2 block">Schedule Type</Label>
                      <Select 
                        value={formData.schedule_type} 
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, schedule_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">⏰ Every Hour</SelectItem>
                          <SelectItem value="daily">📅 Daily</SelectItem>
                          <SelectItem value="weekly">📆 Weekly</SelectItem>
                          <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                          <SelectItem value="cron">⚙️ Custom (Cron)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.schedule_type !== 'hourly' && formData.schedule_type !== 'cron' && (
                      <div>
                        <Label className="text-xs mb-2 block">Time</Label>
                        <Input
                          type="time"
                          value={formData.schedule_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, schedule_time: e.target.value }))}
                        />
                      </div>
                    )}

                    {formData.schedule_type === 'weekly' && (
                      <div>
                        <Label className="text-xs mb-2 block">Day of Week</Label>
                        <Select 
                          value={formData.schedule_day} 
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, schedule_day: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.schedule_type === 'monthly' && (
                      <div>
                        <Label className="text-xs mb-2 block">Day of Month</Label>
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.schedule_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, schedule_date: parseInt(e.target.value) || 1 }))}
                        />
                      </div>
                    )}

                    {formData.schedule_type === 'cron' && (
                      <div>
                        <Label className="text-xs mb-2 block">Cron Expression</Label>
                        <Input
                          placeholder="0 9 * * 1-5"
                          value={formData.schedule_cron}
                          onChange={(e) => setFormData(prev => ({ ...prev, schedule_cron: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Example: "0 9 * * 1-5" = 9 AM on weekdays
                        </p>
                      </div>
                    )}

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        ℹ️ <strong>Schedule Preview:</strong> {getSchedulePreview(formData)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Types Configuration for document_upload trigger */}
              {formData.trigger_type === 'document_upload' && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <Label className="mb-2 block">Document Types to Trigger</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select which document types should auto-start this workflow
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'all', label: 'All Documents', icon: '📄' },
                      { value: 'invoice', label: 'Invoices', icon: '🧾' },
                      { value: 'flight-invoice', label: 'Flight Invoices', icon: '✈️' },
                      { value: 'hotel-invoice', label: 'Hotel Invoices', icon: '🏨' },
                      { value: 'tax-invoice', label: 'Tax Invoices', icon: '💼' },
                      { value: 'purchase-order', label: 'Purchase Orders', icon: '📝' },
                      { value: 'contract', label: 'Contracts', icon: '📜' },
                      { value: 'receipt', label: 'Receipts', icon: '🧾' },
                      { value: 'bill', label: 'Bills', icon: '💵' },
                      { value: 'bank-statement', label: 'Bank Statements', icon: '🏦' },
                      { value: 'resume', label: 'Resumes', icon: '👤' },
                      { value: 'id-document', label: 'ID Documents', icon: '🪪' }
                    ].map((docType) => (
                      <button
                        key={docType.value}
                        type="button"
                        onClick={() => {
                          if (docType.value === 'all') {
                            setFormData(prev => ({ ...prev, trigger_document_types: ['all'] }));
                          } else {
                            setFormData(prev => {
                              const types = prev.trigger_document_types.filter(t => t !== 'all');
                              const isSelected = types.includes(docType.value);
                              return {
                                ...prev,
                                trigger_document_types: isSelected
                                  ? types.filter(t => t !== docType.value)
                                  : [...types, docType.value]
                              };
                            });
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all text-sm ${
                          formData.trigger_document_types.includes(docType.value) || 
                          (formData.trigger_document_types.includes('all') && docType.value === 'all')
                            ? 'border-primary bg-primary/10 font-medium'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="mr-1">{docType.icon}</span>
                        {docType.label}
                      </button>
                    ))}
                  </div>
                  {formData.trigger_document_types.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ Select at least one document type or "All Documents"
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Define Steps */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Workflow Steps</Label>
                <Select onValueChange={(v) => addStep(v as StepType)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add step..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STEP_TYPE_CONFIG) as [StepType, typeof STEP_TYPE_CONFIG[StepType]][])
                      .slice(0, 5)
                      .map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            {stepIcons[key]}
                            {config.label}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.steps.length === 0 ? (
                <div className="p-8 border-2 border-dashed rounded-lg text-center">
                  <GitBranch className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    No steps added yet. Add steps to define your workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.steps.map((s, index) => {
                    const stepConfig = STEP_TYPE_CONFIG[s.type];
                    return (
                      <div key={index} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            {stepIcons[s.type]}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{index + 1}</Badge>
                              <Input
                                value={s.name}
                                onChange={(e) => updateStep(index, { name: e.target.value })}
                                placeholder="Step name"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStep(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            
                            {/* Consistent blue-themed UI for all steps */}
                            <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                {stepIcons[s.type]}
                                <Label className="text-sm font-semibold">Step Configuration</Label>
                              </div>

                              {/* Condition-specific fields */}
                              {s.type === 'condition' && (
                                <div className="space-y-3 pb-3 border-b border-blue-200 dark:border-blue-800">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Condition Label:</Label>
                                    <Input
                                      value={s.condition_label || ''}
                                      onChange={(e) => updateStep(index, { condition_label: e.target.value })}
                                      placeholder="e.g., Amount > 10000"
                                      className="h-8"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Field to Check:</Label>
                                    <Select
                                      value={s.condition_field || ''}
                                      onValueChange={(value) => updateStep(index, { condition_field: value })}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue placeholder="Select a field..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <ScrollArea className="h-72">
                                          {availableFields.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                              Loading fields...
                                            </div>
                                          ) : (
                                            availableFields.map((field) => (
                                              <SelectItem key={field.name} value={field.name}>
                                                <div className="flex flex-col">
                                                  <div className="flex items-center gap-2">
                                                    <span className="font-medium">{field.label}</span>
                                                    <Badge variant="outline" className="text-[10px]">
                                                      {field.type}
                                                    </Badge>
                                                  </div>
                                                  <span className="text-xs text-muted-foreground">
                                                    {field.name}
                                                  </span>
                                                </div>
                                              </SelectItem>
                                            ))
                                          )}
                                        </ScrollArea>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-muted-foreground">
                                      Select from extracted document fields
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Operator:</Label>
                                      <Select
                                        value={s.condition_operator || 'greater_than'}
                                        onValueChange={(value) => updateStep(index, { condition_operator: value })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="equals">Equals (=)</SelectItem>
                                          <SelectItem value="not_equals">Not Equals (≠)</SelectItem>
                                          <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                                          <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                                          <SelectItem value="greater_or_equal">Greater or Equal (≥)</SelectItem>
                                          <SelectItem value="less_or_equal">Less or Equal (≤)</SelectItem>
                                          <SelectItem value="contains">Contains</SelectItem>
                                          <SelectItem value="not_contains">Not Contains</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    <div className="space-y-2">
                                      <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">Value:</Label>
                                      <Input
                                        value={s.condition_value || ''}
                                        onChange={(e) => updateStep(index, { condition_value: e.target.value })}
                                        placeholder="e.g., 10000"
                                        className="h-8"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Common fields for ALL steps (including condition) */}
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300">SLA Time:</Label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      value={s.sla_hours}
                                      onChange={(e) => updateStep(index, { sla_hours: parseFloat(e.target.value) || 48 })}
                                      className="w-20 h-8"
                                      step="0.01"
                                      min="0.01"
                                    />
                                    <span className="text-xs text-muted-foreground">hours</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Assign to:
                                  </Label>
                                  <Select
                                    value={s.assigned_email}
                                    onValueChange={(value) => updateStep(index, { assigned_email: value })}
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Select employee or enter email" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <ScrollArea className="h-48">
                                        {employees.length === 0 ? (
                                          <div className="p-4 text-center text-sm text-muted-foreground">
                                            <User className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                            No employees found. Enter email manually below.
                                          </div>
                                        ) : (
                                          employees.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.email}>
                                              <div className="flex flex-col">
                                                <span className="font-medium">{emp.full_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                  {emp.role} • {emp.department} • {emp.email}
                                                </span>
                                              </div>
                                            </SelectItem>
                                          ))
                                        )}
                                      </ScrollArea>
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="email"
                                    placeholder="Or enter email manually"
                                    value={s.assigned_email}
                                    onChange={(e) => updateStep(index, { assigned_email: e.target.value })}
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Target System Integration */}
          {step === 4 && (
            <div className="space-y-4">
              <TargetSystemConfig
                config={formData.target_system_config}
                onChange={(target_system_config) =>
                  setFormData({ ...formData, target_system_config })
                }
              />
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: formData.color }}
                  >
                    <GitBranch className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{formData.name || 'Untitled Workflow'}</h3>
                    <p className="text-sm text-muted-foreground">{formData.steps.length} steps</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {formData.description || 'No description'}
                </p>

                <div className="flex gap-2 mb-4">
                  <Badge>{TRIGGER_TYPE_CONFIG[formData.trigger_type].label}</Badge>
                  <Badge variant="outline">{formData.category}</Badge>
                </div>

                {formData.steps.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Workflow Steps:</p>
                    <div className="space-y-2">
                      {formData.steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="h-5 w-5 p-0 justify-center">
                            {i + 1}
                          </Badge>
                          {stepIcons[s.type]}
                          <span>{s.name}</span>
                          <span className="text-muted-foreground ml-auto">
                            {s.sla_hours}h SLA
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between flex-shrink-0 mt-4 pt-4 border-t">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {step === 4 && (
              <Button variant="ghost" onClick={handleNext}>
                Skip This Step
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={handleNext}>
                {step === 4 ? 'Continue' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={isLoading || !formData.name}>
                <Check className="h-4 w-4 mr-2" />
                {workflow ? 'Update Workflow' : 'Create Workflow'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

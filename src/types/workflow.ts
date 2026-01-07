export interface ProcessingSteps {
  capture: 'pending' | 'processing' | 'completed' | 'error';
  understand: 'pending' | 'processing' | 'completed' | 'error';
  process: 'pending' | 'processing' | 'completed' | 'error';
  finalize: 'pending' | 'processing' | 'completed' | 'error';
}

export interface DocumentData {
  id: string;
  filename: string;
  originalFile: File;
  preprocessedImage?: string;
  convertedImages?: string[]; // Store the exact images sent to LLM
  ocrText?: string;
  layoutData?: any;
  extractedFields: FormField[];
  templateMatch?: TemplateMatch;
  confidence: number;
  hierarchicalData?: any; // Preserve hierarchical structure for table rendering
}

export interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'checkbox' | 'select' | 'textarea';
  value: any;
  confidence: number;
  required?: boolean;
  validation?: ValidationRule[];
  position?: { x: number; y: number; width: number; height: number };
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

export interface TemplateMatch {
  id: string;
  name: string;
  confidence: number;
  version: string;
  documentType: string;
  matchedFields: number;
  totalFields: number;
  totalExtractedFields?: number;
  matchedFieldNames?: string[];
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'doer' | 'reviewer' | 'approver';
  assignee: string;
  sla: number; // hours
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  comments?: string;
  completedAt?: Date;
}

export interface WorkflowInstance {
  id: string;
  documentId: string;
  stages: WorkflowStage[];
  currentStage: number;
  status: 'active' | 'completed' | 'rejected' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
  // Extended properties for workflow dashboard
  workflow_id?: string;
  document_name?: string;
  workflow?: Workflow;
  priority?: Priority;
  started_at?: string;
  started_by?: string;
  current_step_id?: string;
  current_step_index?: number;
  escalation_count?: number;
  step_instances?: StepInstance[];
  // Phase 1: Document extraction
  extracted_data?: Record<string, any>;
  extraction_status?: 'extracted' | 'failed' | 'no_schema' | 'not_ready' | 'error';
  data_status?: string;
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'pdf' | 'api';
  destination?: string;
  includeOriginal: boolean;
  includeAuditTrail: boolean;
}

// ============= Enhanced Workflow Types =============

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TriggerType = 'manual' | 'document_upload' | 'form_submission' | 'schedule' | 'api_webhook' | 'condition';
export type StepType = 'approval' | 'review' | 'task' | 'notification' | 'condition' | 'parallel' | 'integration';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type EscalationAction = 'notify' | 'reassign' | 'escalate_manager' | 'auto_approve' | 'auto_reject' | 'pause_workflow';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  steps: WorkflowStep[];
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  is_template: boolean;
  category: string;
  tags: string[];
  sla_settings: SLASettings;
  notification_settings: WorkflowNotificationSettings;
  stats: {
    total_runs: number;
    completed_runs: number;
    avg_completion_time: number;
    success_rate: number;
  };
}

export interface TriggerConfig {
  document_types?: string[];
  form_ids?: string[];
  schedule_cron?: string;
  webhook_url?: string;
  conditions?: TriggerCondition[];
}

export interface TriggerCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  order: number;
  config: StepConfig;
  assignees: StepAssignee[];
  sla_hours: number;
  escalation_rules: StepEscalationRule[];
  required_fields?: string[];
  conditions?: StepCondition[];
}

export interface StepConfig {
  approval_type?: 'single' | 'all' | 'majority';
  min_approvals?: number;
  allow_delegation?: boolean;
  require_comment?: boolean;
  notification_template?: string;
  integration_type?: string;
  integration_config?: any;
  parallel_branches?: WorkflowStep[][];
}

export interface StepAssignee {
  type: 'user' | 'role' | 'group' | 'dynamic';
  value: string;
  fallback?: StepAssignee;
}

export interface StepEscalationRule {
  trigger_after_hours: number;
  action: EscalationAction;
  notify_users?: string[];
  reassign_to?: StepAssignee;
}

export interface StepCondition {
  field: string;
  operator: string;
  value: any;
  next_step_id?: string;
}

export interface SLASettings {
  enabled: boolean;
  total_workflow_hours: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  business_hours_only: boolean;
  business_hours: {
    start: string;
    end: string;
    timezone: string;
    exclude_weekends: boolean;
    holidays?: string[];
  };
}

export interface WorkflowNotificationSettings {
  on_start: boolean;
  on_step_complete: boolean;
  on_complete: boolean;
  on_reject: boolean;
  on_escalation: boolean;
  on_sla_warning: boolean;
  channels: ('email' | 'in_app' | 'slack' | 'teams')[];
  digest_enabled: boolean;
  digest_frequency: 'hourly' | 'daily' | 'weekly';
}

export interface StepInstance {
  id: string;
  step_id: string;
  step_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped';
  assigned_to: string;
  started_at?: string;
  completed_at?: string;
  completed_by?: string;
  decision?: 'approved' | 'rejected' | 'delegated';
  comments?: string;
  attachments?: string[];
  sla_due_at?: string;
  is_overdue: boolean;
  escalation_level: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  workflow_id?: string;
  is_global: boolean;
  is_active: boolean;
  priority: Priority;
  conditions: EscalationCondition[];
  actions: EscalationActionConfig[];
  trigger_after_hours: number;
  trigger_after_minutes?: number;
  repeat_every_hours?: number;
  repeat_every_minutes?: number;
  max_escalations: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  trigger_count: number;
  last_triggered_at?: string;
}

export interface EscalationCondition {
  type: 'time_elapsed' | 'sla_breach' | 'no_action' | 'rejection_count' | 'custom';
  threshold_hours?: number;
  threshold_count?: number;
  custom_expression?: string;
}

export interface EscalationActionConfig {
  action: EscalationAction;
  delay_hours: number;
  notify_users?: string[];
  notify_roles?: string[];
  reassign_to?: StepAssignee;
  message_template?: string;
}

export interface EscalationHistory {
  id: string;
  instance_id: string;
  rule_id: string;
  action_taken: EscalationAction;
  triggered_at: string;
  original_assignee: string;
  new_assignee?: string;
  notes?: string;
}

export interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  draft_workflows?: number;
  running_instances: number;
  completed_today: number;
  completed_this_month?: number;
  pending_approvals: number;
  overdue_tasks: number;
  overdue_steps?: number;
  avg_completion_time: number;
  average_completion_time_hours?: number;
  escalation_rate: number;
  sla_compliance_rate?: number;
}

// Configuration objects
export const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: 'FileEdit' },
  active: { label: 'Active', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: 'Play' },
  paused: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: 'Pause' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: 'Archive' }
};

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', icon: 'ArrowDown' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: 'Minus' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', icon: 'ArrowUp' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: 'AlertTriangle' }
};

export const TRIGGER_TYPE_CONFIG: Record<TriggerType, { label: string; description: string; icon: string }> = {
  manual: { label: 'Manual Start', description: 'Start workflow manually', icon: 'Hand' },
  document_upload: { label: 'Document Upload', description: 'Trigger on document upload', icon: 'Upload' },
  form_submission: { label: 'Form Submission', description: 'Trigger on form submission', icon: 'FileText' },
  schedule: { label: 'Schedule', description: 'Run on a schedule', icon: 'Calendar' },
  api_webhook: { label: 'API/Webhook', description: 'Trigger via API call', icon: 'Webhook' },
  condition: { label: 'Condition', description: 'Trigger based on conditions', icon: 'GitBranch' }
};

export const STEP_TYPE_CONFIG: Record<StepType, { label: string; description: string; icon: string }> = {
  approval: { label: 'Approval', description: 'Requires approval from assignees', icon: 'CheckCircle' },
  review: { label: 'Review', description: 'Review without approval decision', icon: 'Eye' },
  task: { label: 'Task', description: 'Complete a specific task', icon: 'ClipboardList' },
  notification: { label: 'Notification', description: 'Send notifications', icon: 'Bell' },
  condition: { label: 'Condition', description: 'Branch based on conditions', icon: 'GitBranch' },
  parallel: { label: 'Parallel', description: 'Execute steps in parallel', icon: 'GitMerge' },
  integration: { label: 'Integration', description: 'External system integration', icon: 'Plug' }
};

export const ESCALATION_ACTION_CONFIG: Record<EscalationAction, { label: string; description: string; icon: string }> = {
  notify: { label: 'Send Notification', description: 'Notify specified users', icon: 'Bell' },
  reassign: { label: 'Reassign Task', description: 'Reassign to another user', icon: 'UserPlus' },
  escalate_manager: { label: 'Escalate to Manager', description: 'Escalate to assignee\'s manager', icon: 'ArrowUpCircle' },
  auto_approve: { label: 'Auto Approve', description: 'Automatically approve the step', icon: 'CheckCircle' },
  auto_reject: { label: 'Auto Reject', description: 'Automatically reject the step', icon: 'XCircle' },
  pause_workflow: { label: 'Pause Workflow', description: 'Pause the workflow for review', icon: 'PauseCircle' }
};

export const WORKFLOW_TEMPLATES = [
  {
    id: 'document_approval',
    name: 'Document Approval',
    description: 'Standard document review and approval workflow',
    category: 'approval',
    steps: ['Submit', 'Review', 'Approve', 'Publish']
  },
  {
    id: 'invoice_processing',
    name: 'Invoice Processing',
    description: 'Invoice review, approval, and payment workflow',
    category: 'finance',
    steps: ['Receive', 'Validate', 'Approve', 'Process Payment']
  },
  {
    id: 'contract_review',
    name: 'Contract Review',
    description: 'Multi-stage contract review with legal approval',
    category: 'legal',
    steps: ['Draft Review', 'Legal Review', 'Executive Approval', 'Sign']
  },
  {
    id: 'hr_onboarding',
    name: 'HR Onboarding',
    description: 'Employee onboarding documentation workflow',
    category: 'HR',
    steps: ['Document Collection', 'HR Review', 'Manager Approval', 'IT Setup', 'Complete']
  }
];

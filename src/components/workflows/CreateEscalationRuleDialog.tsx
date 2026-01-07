import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Zap,
  ChevronRight,
  ChevronLeft,
  Check,
  Trash2,
  Bell,
  UserPlus,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  AlertTriangle,
  ChevronsUpDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useWorkflows } from '@/hooks/useWorkflows';
import {
  Priority,
  EscalationAction,
  PRIORITY_CONFIG,
  ESCALATION_ACTION_CONFIG
} from '@/types/workflow';

interface CreateEscalationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string;  // NEW: Pre-select workflow when opened from workflow context
  workflowName?: string;  // NEW: For display purposes
}

const actionIcons: Record<EscalationAction, React.ReactNode> = {
  notify: <Bell className="h-4 w-4" />,
  reassign: <UserPlus className="h-4 w-4" />,
  escalate_manager: <ArrowUpRight className="h-4 w-4" />,
  auto_approve: <CheckCircle className="h-4 w-4" />,
  auto_reject: <XCircle className="h-4 w-4" />,
  pause_workflow: <PauseCircle className="h-4 w-4" />
};

export const CreateEscalationRuleDialog: React.FC<CreateEscalationRuleDialogProps> = ({
  open,
  onOpenChange,
  workflowId,
  workflowName
}) => {
  const { workflows, createEscalationRule, isLoading } = useWorkflows();
  const [step, setStep] = useState(1);
  const [users, setUsers] = useState<{ email: string; name?: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [managerSearchOpen, setManagerSearchOpen] = useState<{ [key: number]: boolean }>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    scope: workflowId ? 'workflow' as const : 'global' as const,
    workflow_id: workflowId || undefined,
    priority: 'medium' as Priority,
    trigger_after_hours: 24,
    trigger_after_minutes: undefined as number | undefined,
    repeat_every_hours: 12,
    repeat_every_minutes: undefined as number | undefined,
    max_escalations: 3,
    actions: [] as { 
      action: EscalationAction; 
      delay_hours: number;
      assignee?: { email: string; name?: string };  // For reassign
      manager_email?: string;  // For escalate_manager
      reason?: string;  // For auto_reject
    }[],
    notify_assignee: true,
    notify_escalation_target: true,
    notify_workflow_owner: true
  });

  const totalSteps = 3;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleCreate = async () => {
    await createEscalationRule({
      name: formData.name,
      description: formData.description,
      is_active: formData.is_active,
      is_global: formData.scope === 'global',           // NEW: Set based on scope
      workflow_id: formData.scope === 'workflow' ? formData.workflow_id : null,  // NEW
      priority: formData.priority,
      trigger_after_hours: formData.trigger_after_hours,
      trigger_after_minutes: formData.trigger_after_minutes,
      repeat_every_hours: formData.repeat_every_hours,
      repeat_every_minutes: formData.repeat_every_minutes,
      max_escalations: formData.max_escalations,
      actions: formData.actions
    });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      is_active: true,
      scope: workflowId ? 'workflow' : 'global',  // Reset to workflow scope if opened from workflow
      workflow_id: workflowId || undefined,       // Keep the workflow pre-selected
      priority: 'medium',
      trigger_after_hours: 24,
      trigger_after_minutes: undefined,
      repeat_every_hours: 12,
      repeat_every_minutes: undefined,
      max_escalations: 3,
      actions: [],
      notify_assignee: true,
      notify_escalation_target: true,
      notify_workflow_owner: true
    });
  };

  // Fetch users from auth.users (for manager selection)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!open) return;
      
      setLoadingUsers(true);
      try {
        // Get distinct emails from workflow_step_instances assigned_email
        const { data, error } = await supabase
          .from('workflow_step_instances')
          .select('assigned_email')
          .not('assigned_email', 'is', null);
        
        if (error) throw error;
        
        // Get unique emails
        const uniqueEmails = Array.from(new Set(data?.map(d => d.assigned_email).filter(Boolean)));
        setUsers(uniqueEmails.map(email => ({ email: email as string })));
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    fetchUsers();
  }, [open]);

  const addAction = (action: EscalationAction) => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { action, delay_hours: 0 }]
    }));
  };

  const removeAction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Create Escalation Rule
          </DialogTitle>
          <DialogDescription>
            Step {step} of {totalSteps} — 
            {step === 1 && ' Basic Settings'}
            {step === 2 && ' Timing & Actions'}
            {step === 3 && ' Review & Create'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {/* Step 1: Basic Settings */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Rule Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Standard Escalation"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="When should this rule trigger..."
                  className="mt-1"
                  rows={2}
                />
              </div>

              {/* NEW: Scope Selection */}
              <div>
                <Label htmlFor="scope">Rule Scope</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value: 'global' | 'workflow' | 'step') => 
                    setFormData(prev => ({ ...prev, scope: value, workflow_id: undefined }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <div>
                          <div className="font-medium">Global</div>
                          <div className="text-xs text-muted-foreground">Applies to all workflows</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="workflow">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500" />
                        <div>
                          <div className="font-medium">Specific Workflow</div>
                          <div className="text-xs text-muted-foreground">Applies to one workflow only</div>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="step" disabled>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        <div>
                          <div className="font-medium">Specific Step</div>
                          <div className="text-xs text-muted-foreground">Configure in Workflow Builder</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.scope === 'global' && 'This rule will apply to all workflow steps across the system'}
                  {formData.scope === 'workflow' && 'This rule will only apply to steps in the selected workflow'}
                  {formData.scope === 'step' && 'Step-specific rules are configured in the Workflow Builder'}
                </p>
              </div>

              {/* NEW: Workflow Selector (only if scope is 'workflow') */}
              {formData.scope === 'workflow' && (
                <div>
                  <Label htmlFor="workflow">Select Workflow</Label>
                  <Select
                    value={formData.workflow_id || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, workflow_id: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a workflow..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {workflows && workflows.filter(w => !w.is_template).map(workflow => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant={workflow.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {workflow.status}
                            </Badge>
                            <span>{workflow.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Priority Level</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {(Object.entries(PRIORITY_CONFIG) as [Priority, typeof PRIORITY_CONFIG[Priority]][])
                    .map(([key, config]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: key }))}
                        className={`p-3 rounded-lg border text-center transition-all ${
                          formData.priority === key
                            ? `border-primary ${config.color}`
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium text-sm">
                          {config.label}
                        </span>
                      </button>
                    ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-muted-foreground">Enable this rule immediately</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          )}

          {/* Step 2: Timing & Actions */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timing
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trigger">Trigger After</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <Input
                          id="trigger-hours"
                          type="number"
                          placeholder="Hours"
                          value={formData.trigger_after_hours || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, trigger_after_hours: parseInt(e.target.value) || undefined }))}
                        />
                        <span className="text-xs text-muted-foreground mt-0.5 block">hours</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          id="trigger-minutes"
                          type="number"
                          placeholder="Minutes"
                          value={formData.trigger_after_minutes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, trigger_after_minutes: parseInt(e.target.value) || undefined }))}
                        />
                        <span className="text-xs text-muted-foreground mt-0.5 block">minutes (testing)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Use minutes for fast testing</p>
                  </div>
                  <div>
                    <Label htmlFor="repeat">Repeat Every</Label>
                    <div className="flex gap-2 mt-1">
                      <div className="flex-1">
                        <Input
                          id="repeat-hours"
                          type="number"
                          placeholder="Hours"
                          value={formData.repeat_every_hours || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, repeat_every_hours: parseInt(e.target.value) || undefined }))}
                        />
                        <span className="text-xs text-muted-foreground mt-0.5 block">hours</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          id="repeat-minutes"
                          type="number"
                          placeholder="Minutes"
                          value={formData.repeat_every_minutes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, repeat_every_minutes: parseInt(e.target.value) || undefined }))}
                        />
                        <span className="text-xs text-muted-foreground mt-0.5 block">minutes (testing)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Optional - leave empty to trigger once</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="max">Max Escalations</Label>
                  <Input
                    id="max"
                    type="number"
                    value={formData.max_escalations}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_escalations: parseInt(e.target.value) || 3 }))}
                    className="mt-1 w-32"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Actions
                  </h4>
                  <Select onValueChange={(v) => addAction(v as EscalationAction)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Add action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(ESCALATION_ACTION_CONFIG) as [EscalationAction, typeof ESCALATION_ACTION_CONFIG[EscalationAction]][])
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {actionIcons[key]}
                              {config.label}
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.actions.length === 0 ? (
                  <div className="p-6 border-2 border-dashed rounded-lg text-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Add actions to execute when this rule triggers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.actions.map((action, index) => {
                      const config = ESCALATION_ACTION_CONFIG[action.action];
                      return (
                        <div
                          key={index}
                          className="p-3 rounded-lg border bg-card space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="h-6 w-6 p-0 justify-center">
                                {index + 1}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {actionIcons[action.action]}
                                <span className="font-medium text-sm">{config.label}</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => removeAction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Configuration fields based on action type */}
                          {action.action === 'reassign' && (
                            <div className="space-y-2 pl-9">
                              <Label htmlFor={`reassign-email-${index}`} className="text-xs">
                                Reassign To (Email)
                              </Label>
                              <Input
                                id={`reassign-email-${index}`}
                                type="email"
                                placeholder="user@company.com"
                                value={action.assignee?.email || ''}
                                onChange={(e) => {
                                  const updated = [...formData.actions];
                                  updated[index] = {
                                    ...updated[index],
                                    assignee: { email: e.target.value }
                                  };
                                  setFormData(prev => ({ ...prev, actions: updated }));
                                }}
                                className="h-8"
                              />
                            </div>
                          )}

                          {action.action === 'escalate_manager' && (
                            <div className="space-y-2 pl-9">
                              <Label htmlFor={`manager-email-${index}`} className="text-xs">
                                Manager Email
                              </Label>
                              <Popover 
                                open={managerSearchOpen[index]} 
                                onOpenChange={(isOpen) => setManagerSearchOpen(prev => ({ ...prev, [index]: isOpen }))}
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={managerSearchOpen[index]}
                                    className="h-8 w-full justify-between text-sm"
                                  >
                                    {action.manager_email || "Select or enter manager email..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                  <Command>
                                    <CommandInput 
                                      placeholder="Search or type email..." 
                                      value={action.manager_email || ''}
                                      onValueChange={(value) => {
                                        const updated = [...formData.actions];
                                        updated[index] = {
                                          ...updated[index],
                                          manager_email: value
                                        };
                                        setFormData(prev => ({ ...prev, actions: updated }));
                                      }}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        {loadingUsers ? "Loading users..." : "No users found. Type to enter manually."}
                                      </CommandEmpty>
                                      {users.length > 0 && (
                                        <CommandGroup heading="Available Users">
                                          {users.map((user) => (
                                            <CommandItem
                                              key={user.email}
                                              value={user.email}
                                              onSelect={() => {
                                                const updated = [...formData.actions];
                                                updated[index] = {
                                                  ...updated[index],
                                                  manager_email: user.email
                                                };
                                                setFormData(prev => ({ ...prev, actions: updated }));
                                                setManagerSearchOpen(prev => ({ ...prev, [index]: false }));
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  action.manager_email === user.email ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              {user.email}
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      )}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}

                          {action.action === 'auto_reject' && (
                            <div className="space-y-2 pl-9">
                              <Label htmlFor={`reject-reason-${index}`} className="text-xs">
                                Rejection Reason (Optional)
                              </Label>
                              <Input
                                id={`reject-reason-${index}`}
                                placeholder="e.g., SLA exceeded"
                                value={action.reason || ''}
                                onChange={(e) => {
                                  const updated = [...formData.actions];
                                  updated[index] = {
                                    ...updated[index],
                                    reason: e.target.value
                                  };
                                  setFormData(prev => ({ ...prev, actions: updated }));
                                }}
                                className="h-8"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Notifications
                </h4>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Assignee</span>
                    <Switch
                      checked={formData.notify_assignee}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_assignee: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Escalation Target</span>
                    <Switch
                      checked={formData.notify_escalation_target}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_escalation_target: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Notify Workflow Owner</span>
                    <Switch
                      checked={formData.notify_workflow_owner}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_workflow_owner: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${PRIORITY_CONFIG[formData.priority].color}`}>
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{formData.name || 'Untitled Rule'}</h3>
                    <Badge className={PRIORITY_CONFIG[formData.priority].color}>
                      {PRIORITY_CONFIG[formData.priority].label} Priority
                    </Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {formData.description || 'No description'}
                </p>

                <div className="space-y-2 text-sm">
                  {/* NEW: Show scope */}
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      formData.scope === 'global' ? 'bg-blue-500' : 
                      formData.scope === 'workflow' ? 'bg-purple-500' : 
                      'bg-orange-500'
                    }`} />
                    <span className="font-medium">
                      {formData.scope === 'global' && 'Global Rule - Applies to all workflows'}
                      {formData.scope === 'workflow' && `Workflow Rule - ${workflows?.find(w => w.id === formData.workflow_id)?.name || 'Selected workflow'}`}
                      {formData.scope === 'step' && 'Step-specific Rule'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Triggers after {formData.trigger_after_hours || 0} hours
                      {formData.trigger_after_minutes ? ` ${formData.trigger_after_minutes} minutes` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formData.repeat_every_hours || formData.repeat_every_minutes ? (
                        <>
                          Repeats every {formData.repeat_every_hours || 0} hours
                          {formData.repeat_every_minutes ? ` ${formData.repeat_every_minutes} minutes` : ''}
                        </>
                      ) : (
                        'Triggers once only'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span>Max {formData.max_escalations} escalations</span>
                  </div>
                </div>

                {formData.actions.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Actions ({formData.actions.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.actions.map((action, i) => (
                        <Badge key={i} variant="outline" className="gap-1">
                          {actionIcons[action.action]}
                          {ESCALATION_ACTION_CONFIG[action.action].label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex justify-between">
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
            {step < totalSteps ? (
              <Button 
                onClick={handleNext}
                disabled={
                  (step === 1 && !formData.name) ||
                  (step === 1 && formData.scope === 'workflow' && !formData.workflow_id)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={isLoading || !formData.name}>
                <Check className="h-4 w-4 mr-2" />
                Create Rule
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

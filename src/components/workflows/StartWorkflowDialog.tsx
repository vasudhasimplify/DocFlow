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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  ChevronRight
} from 'lucide-react';
import { workflowApi } from '@/services/workflowApi';
import { toast } from 'sonner';
import { PRIORITY_CONFIG, Workflow as WorkflowType } from '@/types/workflow';

// Extended workflow type with color property
interface WorkflowWithColor extends WorkflowType {
  color?: string;
}

interface Document {
  id: string;
  file_name: string;
  file_type?: string;
}

interface StartWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  onSuccess?: (instanceId: string) => void;
}

export const StartWorkflowDialog: React.FC<StartWorkflowDialogProps> = ({
  open,
  onOpenChange,
  document,
  onSuccess,
}) => {
  const [workflows, setWorkflows] = useState<WorkflowWithColor[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [priority, setPriority] = useState<string>('medium');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingWorkflows, setIsFetchingWorkflows] = useState(false);
  const [showStepAssignment, setShowStepAssignment] = useState(false);
  const [stepEmails, setStepEmails] = useState<Record<string, string>>({});

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  // Fetch active workflows
  useEffect(() => {
    if (open) {
      fetchActiveWorkflows();
    }
  }, [open]);

  const fetchActiveWorkflows = async () => {
    setIsFetchingWorkflows(true);
    try {
      const data = await workflowApi.listWorkflows({ status: 'active' });
      // Filter out templates, only show custom workflows or allow templates
      const activeWorkflows = Array.isArray(data) ? data.filter(w => w.status === 'active') : [];
      setWorkflows(activeWorkflows);
      
      if (activeWorkflows.length === 0) {
        toast.warning('No active workflows found. Create and activate a workflow first.');
      }
    } catch (error: any) {
      console.error('Error fetching workflows:', error);
      toast.error('Failed to load workflows');
      setWorkflows([]);
    } finally {
      setIsFetchingWorkflows(false);
    }
  };

  const handleStart = async () => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow');
      return;
    }

    // Check if workflow has predefined emails
    const workflowSteps = selectedWorkflow?.steps || [];
    const hasPredefinedEmails = workflowSteps.every((step: any) => 
      step.config?.assigned_email || step.assignees?.[0]?.value
    );

    // Show step assignment UI only if workflow doesn't have predefined emails
    if (!hasPredefinedEmails && !showStepAssignment && workflowSteps.length > 0) {
      setShowStepAssignment(true);
      return;
    }

    // If showing assignment UI, validate all steps have emails
    if (showStepAssignment) {
      const missingEmails = workflowSteps.filter((step: any) => !stepEmails[step.id]?.trim());
      
      if (missingEmails.length > 0) {
        toast.error('Please assign an email for each step');
        return;
      }

      // Validate email format
      const invalidEmails = Object.values(stepEmails).filter(
        (email: string) => email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
      
      if (invalidEmails.length > 0) {
        toast.error('Please enter valid email addresses');
        return;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = workflowSteps.filter((step: any) => {
      const email = stepEmails[step.id]?.trim();
      return email && !emailRegex.test(email);
    });
    
    if (invalidEmails.length > 0) {
      toast.error('Please enter valid email addresses');
      return;
    }

    setIsLoading(true);
    try {
      const instance = await workflowApi.startInstance(selectedWorkflowId, {
        document_id: document.id,
        priority,
        metadata: {
          notes,
          document_name: document.file_name,
          started_at: new Date().toISOString(),
        },
        step_assignments: stepEmails,
      });

      toast.success('Workflow started successfully!', {
        description: `${selectedWorkflow?.name} is now running on ${document.file_name}`,
      });

      onSuccess?.(instance.id);
      onOpenChange(false);

      // Reset form
      setSelectedWorkflowId('');
      setPriority('medium');
      setNotes('');
      setStepEmails({});
      setShowStepAssignment(false);
    } catch (error: any) {
      console.error('Error starting workflow:', error);
      toast.error('Failed to start workflow', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEstimatedTime = () => {
    if (!selectedWorkflow) return null;
    const totalHours = selectedWorkflow.steps.reduce((sum, step) => sum + (step.sla_hours || 24), 0);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Start Workflow
          </DialogTitle>
          <DialogDescription>
            Start an automated workflow on this document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Info */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{document.file_name}</p>
              <p className="text-sm text-muted-foreground">
                {document.file_type || 'Document'}
              </p>
            </div>
          </div>

          {/* Workflow Selection */}
          <div className="space-y-2">
            <Label htmlFor="workflow">Select Workflow *</Label>
            {isFetchingWorkflows ? (
              <div className="flex items-center justify-center p-8 border rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="p-8 text-center border rounded-lg bg-muted/50">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium mb-1">No Active Workflows</p>
                <p className="text-sm text-muted-foreground">
                  Create a workflow and activate it to start using it
                </p>
              </div>
            ) : (
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger id="workflow">
                  <SelectValue placeholder="Choose a workflow..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: workflow.color || '#6B7280' }}
                          />
                          <span>{workflow.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {workflow.steps?.length || 0} steps
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Workflow Preview */}
          {selectedWorkflow && (
            <div className="p-4 border rounded-lg space-y-3 bg-accent/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{selectedWorkflow.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedWorkflow.description || 'No description'}
                  </p>
                </div>
                <Badge>{selectedWorkflow.category}</Badge>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedWorkflow.steps?.length || 0} steps</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Est. {calculateEstimatedTime()}</span>
                </div>
              </div>

              {/* Steps Preview */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase">Steps</p>
                {selectedWorkflow.steps?.slice(0, 5).map((step, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{step.name}</span>
                    {step.sla_hours && (
                      <span className="text-xs text-muted-foreground">
                        ({step.sla_hours}h SLA)
                      </span>
                    )}
                  </div>
                ))}
                {selectedWorkflow.steps?.length > 5 && (
                  <p className="text-xs text-muted-foreground pl-3.5">
                    +{selectedWorkflow.steps.length - 5} more steps...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step Email Assignment */}
          {selectedWorkflow && (
            <>
              {selectedWorkflow.steps?.some((step: any) => 
                step.config?.assigned_email || step.assignees?.[0]?.value
              ) && !showStepAssignment && (
                <div className="p-4 border rounded-lg space-y-2 bg-green-50/50 border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <p className="font-medium text-green-900">Steps Already Assigned</p>
                  </div>
                  <p className="text-sm text-green-700">
                    This workflow has predefined assignees for each step.
                  </p>
                </div>
              )}
              
              {showStepAssignment && (
                <div className="p-4 border rounded-lg space-y-3 bg-blue-50/50 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <p className="font-medium text-blue-900">Assign Reviewers to Each Step</p>
                  </div>
                  <p className="text-sm text-blue-700">
                    Enter the email address of the person responsible for each workflow step.
                  </p>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-3 pr-4">
                      {selectedWorkflow.steps?.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm font-medium truncate">{step.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <Input
                            type="email"
                            placeholder="email@example.com"
                            value={stepEmails[step.id] || ''}
                            onChange={(e) => setStepEmails(prev => ({
                              ...prev,
                              [step.id]: e.target.value
                            }))}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className="h-4 w-4"
                        style={{ color: config.color }}
                      />
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional context or instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          {showStepAssignment && (
            <Button
              variant="outline"
              onClick={() => setShowStepAssignment(false)}
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setShowStepAssignment(false);
              setStepEmails({});
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={!selectedWorkflowId || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : showStepAssignment ? (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                Start Workflow
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Assign Steps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Activity,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  FileText,
  ChevronRight,
  Play,
  Trash2,
  Send,
  MessageSquare,
  ArrowRightLeft
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { PRIORITY_CONFIG } from '@/types/workflow';
import { format, formatDistanceToNow } from 'date-fns';
import { ExtractedDataViewer } from './ExtractedDataViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const stepStatusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-gray-500', bgColor: 'bg-gray-100' },
  in_progress: { icon: <Play className="h-4 w-4" />, color: 'text-blue-500', bgColor: 'bg-blue-100' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500', bgColor: 'bg-green-100' },
  skipped: { icon: <ChevronRight className="h-4 w-4" />, color: 'text-gray-400', bgColor: 'bg-gray-50' },
  rejected: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-500', bgColor: 'bg-red-100' },
  escalated: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500', bgColor: 'bg-orange-100' }
};

interface WorkflowInstancesListProps {
  filter?: 'active' | 'completed';
}

export const WorkflowInstancesList: React.FC<WorkflowInstancesListProps> = ({ filter = 'active' }) => {
  const { instances, workflows, approveStep, rejectStep, deleteInstance, isLoading, fetchInstances } = useWorkflows();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInstance, setSelectedInstance] = useState<any | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject';
    instance: any;
    step: any;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<any | null>(null);
  const [comment, setComment] = useState('');
  const [sendToOriginator, setSendToOriginator] = useState(true);
  
  // Redirect workflow dialog - user initiated
  const [redirectDialog, setRedirectDialog] = useState<any | null>(null);
  const [selectedRedirectWorkflow, setSelectedRedirectWorkflow] = useState<string>('');

  // Listen for open-workflow-instance event (from email links)
  useEffect(() => {
    const handleOpenInstance = (event: CustomEvent) => {
      const { instanceId } = event.detail;
      const instance = instances.find(i => i.id === instanceId);
      if (instance) {
        setSelectedInstance(instance);
      }
    };

    window.addEventListener('open-workflow-instance' as any, handleOpenInstance);
    return () => {
      window.removeEventListener('open-workflow-instance' as any, handleOpenInstance);
    };
  }, [instances]);

  // Filter instances by status based on filter prop - EXCLUDE cancelled from the start
  const statusFilteredInstances = filter === 'completed' 
    ? instances.filter(inst => (inst.status === 'completed' || inst.status === 'rejected') && inst.status !== 'cancelled')
    : instances.filter(inst => (inst.status === 'active' || inst.status === 'paused') && inst.status !== 'cancelled');

  // Apply search filter
  const filteredInstances = statusFilteredInstances.filter(inst =>
    (inst.document_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.workflow?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = async () => {
    if (!actionDialog) return;

    try {
      if (actionDialog.type === 'approve') {
        await approveStep(actionDialog.instance.id, actionDialog.step.step_id, comment);
        
        // Send comment to originator if enabled
        if (sendToOriginator && comment.trim() && actionDialog.instance.started_by) {
          await sendCommentToOriginator(actionDialog.instance, comment, 'approved');
        }
        
        toast({
          title: 'Step Approved',
          description: comment ? 'Approval comment sent to originator' : 'Step approved successfully',
        });
      } else {
        await rejectStep(actionDialog.instance.id, actionDialog.step.step_id, comment);
        
        // Always notify originator on rejection
        if (actionDialog.instance.started_by) {
          await sendCommentToOriginator(actionDialog.instance, comment, 'rejected');
        }
        
        toast({
          title: 'Step Rejected',
          description: 'Rejection notification sent to originator',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform action',
        variant: 'destructive'
      });
    }

    setActionDialog(null);
    setComment('');
    setSelectedInstance(null);
  };

  // Send comment notification to the document originator
  const sendCommentToOriginator = async (instance: any, commentText: string, action: string) => {
    try {
      // Insert into lock_notifications table (reusing existing notification infrastructure)
      await supabase.from('lock_notifications').insert({
        document_id: instance.document_id,
        lock_id: null, // Not related to a lock
        notified_user_id: instance.started_by,
        notification_type: action === 'approved' ? 'workflow_approved' : 'workflow_rejected',
        message: `Your workflow "${instance.workflow?.name}" was ${action}. ${commentText ? `Comment: ${commentText}` : ''}`,
        is_read: false,
      });
      console.log(`📧 Notification sent to originator for ${action} workflow`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  // Handle redirect workflow - user decides wrong workflow was started
  const handleRedirectWorkflow = async () => {
    if (!redirectDialog || !selectedRedirectWorkflow) return;

    try {
      // Cancel current workflow instance
      await (supabase as any)
        .from('workflow_instances')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', redirectDialog.id);

      // Also cancel all pending step instances for this workflow
      await (supabase as any)
        .from('workflow_step_instances')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('instance_id', redirectDialog.id)
        .in('status', ['pending', 'in_progress']);

      console.log('✅ Previous workflow and steps cancelled');

      // Get the selected workflow
      const selectedWorkflow = workflows.find(w => w.id === selectedRedirectWorkflow);
      
      if (selectedWorkflow && redirectDialog.document_id) {
        // Use backend API to create new workflow instance properly (with steps and emails)
        // API endpoint is POST /{workflow_id}/instances
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/workflows/${selectedRedirectWorkflow}/instances`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            document_id: redirectDialog.document_id,
            priority: redirectDialog.priority,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to start workflow');
        }

        const result = await response.json();
        console.log('✅ New workflow created with steps:', result);

        // Send notification to originator about the redirect
        await supabase.from('lock_notifications').insert({
          document_id: redirectDialog.document_id,
          lock_id: null,
          notified_user_id: redirectDialog.started_by,
          notification_type: 'workflow_approved', // Reusing existing type
          message: `Your workflow "${redirectDialog.workflow?.name}" was redirected to "${selectedWorkflow.name}"`,
          is_read: false,
        });

        toast({
          title: 'Workflow Redirected',
          description: `Document redirected to "${selectedWorkflow.name}" with email notifications sent`,
        });
      }
    } catch (error) {
      console.error('Redirect failed:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to redirect workflow',
        variant: 'destructive'
      });
    }

    setRedirectDialog(null);
    setSelectedRedirectWorkflow('');
    fetchInstances();
  };
  
  const handleDelete = async () => {
    if (!deleteDialog) return;
    
    await deleteInstance(deleteDialog.id);
    setDeleteDialog(null);
    setSelectedInstance(null);
    fetchInstances();
  };

  const getProgress = (instance: any) => {
    const steps = instance.step_instances || [];
    const completedSteps = steps.filter((s: any) => s.status === 'completed').length;
    const totalSteps = instance.workflow?.steps?.length || steps.length || 1;
    return (completedSteps / totalSteps) * 100;
  };

  const isOverdue = (step: any) => {
    return step.due_at && new Date(step.due_at) < new Date() && step.status !== 'completed';
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search running workflows..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Instances List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Running Workflow Instances</CardTitle>
          <CardDescription>
            Active workflows awaiting action or completion
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {filteredInstances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No running workflows</h3>
                <p className="text-muted-foreground">
                  Start a workflow to see it here
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredInstances.map((instance) => {
                  const progress = getProgress(instance);
                  const currentStep = (instance.step_instances || []).find((s: any) => s.step_id === instance.current_step_id);
                  const priorityConfig = PRIORITY_CONFIG[instance.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
                  const hasOverdue = (instance.step_instances || []).some(isOverdue);

                  return (
                    <div
                      key={instance.id}
                      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedInstance(instance)}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: instance.workflow?.color || '#6B7280' }}
                        >
                          <Activity className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{instance.workflow?.name || 'Workflow'}</span>
                            <Badge className={priorityConfig.color}>
                              {priorityConfig.label}
                            </Badge>
                            {instance.status === 'paused' && (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                ⏸️ Paused
                              </Badge>
                            )}
                            {hasOverdue && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                            {(instance.escalation_count || 0) > 0 && (
                              <Badge variant="outline" className="text-orange-600">
                                {instance.escalation_count}x Escalated
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <FileText className="h-4 w-4" />
                            <span className="truncate">{instance.document_name || 'No document'}</span>
                          </div>

                          {/* Progress */}
                          <div className="flex items-center gap-3 mb-2">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(progress)}%
                            </span>
                          </div>

                          {/* Current Step */}
                          {currentStep && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Current:</span>
                              <Badge
                                variant="outline"
                                className={stepStatusConfig[currentStep.status]?.color}
                              >
                                {currentStep.step_name || currentStep.step?.name}
                              </Badge>
                              {(currentStep.assigned_email || currentStep.assigned_to) && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {currentStep.assigned_email || currentStep.assigned_to}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {instance.started_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Started {formatDistanceToNow(new Date(instance.started_at))} ago
                              </span>
                            )}
                            {instance.started_by && instance.started_by === user?.id && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                by You
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteDialog(instance);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Instance Detail Dialog */}
      <Dialog open={!!selectedInstance} onOpenChange={() => setSelectedInstance(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          {selectedInstance && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedInstance.workflow?.color || '#6B7280' }}
                  >
                    <Activity className="h-4 w-4" />
                  </div>
                  {selectedInstance.workflow?.name || 'Workflow'}
                </DialogTitle>
                <DialogDescription>
                  {selectedInstance.document_name || 'Workflow instance details'}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-6">
                  {/* Extracted Data Section - Phase 2 */}
                  <ExtractedDataViewer instance={selectedInstance} />

                  {/* Steps Timeline */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Workflow Steps</h4>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                    <div className="space-y-4">
                      {(selectedInstance.step_instances || [])
                        .filter((stepInst: any) => {
                          // If step has manual email assignment, match by email only
                          if (stepInst.assigned_email) {
                            return stepInst.assigned_email.toLowerCase() === user?.email?.toLowerCase();
                          }
                          // Otherwise, match by user ID (legacy/system assignments)
                          return stepInst.assigned_to === user?.id;
                        })
                        .map((stepInst: any, index: number) => {
                        const stepConfig = stepStatusConfig[stepInst.status] || stepStatusConfig.pending;
                        const overdue = isOverdue(stepInst);

                        return (
                          <div key={stepInst.id || index} className="relative flex gap-4 pl-10">
                            <div className={`absolute left-2 h-5 w-5 rounded-full border-2 border-background ${stepConfig.bgColor} flex items-center justify-center`}>
                              <span className={stepConfig.color}>{stepConfig.icon}</span>
                            </div>

                            <div className="flex-1 p-3 rounded-lg border bg-card">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{stepInst.step_name || stepInst.step?.name}</span>
                                  <Badge variant="outline" className={stepConfig.color}>
                                    {stepInst.status.replace('_', ' ')}
                                  </Badge>
                                  {overdue && (
                                    <Badge variant="destructive">Overdue</Badge>
                                  )}
                                </div>
                              </div>

                              {(stepInst.assigned_email || stepInst.assigned_to) && (
                                <div className="flex items-center gap-2 text-sm mb-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  {stepInst.assigned_email || stepInst.assigned_to}
                                </div>
                              )}

                              {stepInst.due_at && (
                                <div className={`text-xs ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  Due: {format(new Date(stepInst.due_at), 'MMM d, yyyy HH:mm')}
                                </div>
                              )}

                              {/* Escalation History */}
                              {(stepInst.escalation_history || []).length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-medium text-orange-600 mb-1">
                                    Escalation History
                                  </p>
                                  {(stepInst.escalation_history || []).map((eh: any) => (
                                    <div key={eh.id} className="text-xs text-muted-foreground">
                                      {eh.action_taken} - {format(new Date(eh.triggered_at), 'MMM d HH:mm')}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons - Only show if user is assigned */}
                              {stepInst.status === 'in_progress' && 
                               (stepInst.assigned_email 
                                 ? stepInst.assigned_email.toLowerCase() === user?.email?.toLowerCase()
                                 : stepInst.assigned_to === user?.id
                               ) && (
                                <div className="flex gap-2 mt-3 pt-3 border-t">
                                  <Button
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionDialog({
                                        type: 'approve',
                                        instance: selectedInstance,
                                        step: stepInst
                                      });
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActionDialog({
                                        type: 'reject',
                                        instance: selectedInstance,
                                        step: stepInst
                                      });
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              </ScrollArea>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {/* Wrong Workflow? Redirect option */}
                {selectedInstance.status === 'active' && (
                  <Button 
                    variant="outline" 
                    className="text-amber-600 border-amber-300 hover:bg-amber-50"
                    onClick={() => {
                      setRedirectDialog(selectedInstance);
                      setSelectedInstance(null);
                    }}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Wrong Workflow? Redirect
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedInstance(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog with Comments to Originator */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionDialog?.type === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Approve Step
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Reject Step
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'approve'
                ? 'Add a comment (optional) to send to the document originator'
                : 'Please provide a reason for rejection (required)'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{actionDialog.instance.document_name}</p>
                <p className="text-sm text-muted-foreground">
                  Step: {actionDialog.step.step_name || 'Current Step'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comment {actionDialog.type === 'reject' && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={actionDialog.type === 'approve'
                    ? 'Add an optional comment for the originator...'
                    : 'Please explain why you are rejecting this step...'}
                  rows={3}
                />
              </div>

              {actionDialog.type === 'approve' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendToOriginator"
                    checked={sendToOriginator}
                    onChange={(e) => setSendToOriginator(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="sendToOriginator" className="text-sm cursor-pointer flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Send comment to originator
                  </Label>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isLoading || (actionDialog?.type === 'reject' && !comment.trim())}
              variant={actionDialog?.type === 'reject' ? 'destructive' : 'default'}
            >
              {actionDialog?.type === 'approve' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Workflow Instance
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow instance? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="font-medium">{deleteDialog.workflow?.name || 'Workflow'}</p>
              <p className="text-sm text-muted-foreground">
                Document: {deleteDialog.document_name || 'No document'}
              </p>
              <p className="text-sm text-muted-foreground">
                Started: {deleteDialog.started_at ? formatDistanceToNow(new Date(deleteDialog.started_at)) : 'Unknown'} ago
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redirect Workflow Dialog - User initiated */}
      <Dialog open={!!redirectDialog} onOpenChange={() => setRedirectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-amber-500" />
              Redirect to Correct Workflow
            </DialogTitle>
            <DialogDescription>
              If this document was assigned to the wrong workflow, select the correct one below.
            </DialogDescription>
          </DialogHeader>

          {redirectDialog && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{redirectDialog.document_name}</p>
                <p className="text-sm text-muted-foreground">
                  Current Workflow: {redirectDialog.workflow?.name || 'Unknown'}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Select Correct Workflow</Label>
                <Select value={selectedRedirectWorkflow} onValueChange={setSelectedRedirectWorkflow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the correct workflow..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.length === 0 ? (
                      <SelectItem value="none" disabled>No workflows available</SelectItem>
                    ) : (
                      workflows
                        .filter(w => w.id !== redirectDialog.workflow_id)
                        .map(w => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} {w.category ? `(${w.category})` : ''} 
                            {w.status !== 'active' ? ` [${w.status}]` : ''}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
                {workflows.length === 0 && (
                  <p className="text-xs text-amber-600">No workflows loaded. Try refreshing the page.</p>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                The current workflow will be cancelled and a new one will be started with the selected workflow.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRedirectDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRedirectWorkflow}
              disabled={!selectedRedirectWorkflow || isLoading}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Redirect Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

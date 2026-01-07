import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Trash2
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { useAuth } from '@/hooks/useAuth';
import { PRIORITY_CONFIG } from '@/types/workflow';
import { format, formatDistanceToNow } from 'date-fns';
import { ExtractedDataViewer } from './ExtractedDataViewer';

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
  const { instances, approveStep, rejectStep, deleteInstance, isLoading, fetchInstances } = useWorkflows();
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

  // Filter instances by status based on filter prop
  const statusFilteredInstances = filter === 'completed' 
    ? instances.filter(inst => inst.status === 'completed' || inst.status === 'rejected')
    : instances.filter(inst => inst.status === 'active' || inst.status === 'paused');

  const filteredInstances = statusFilteredInstances.filter(inst =>
    (inst.document_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.workflow?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAction = async () => {
    if (!actionDialog) return;

    if (actionDialog.type === 'approve') {
      await approveStep(actionDialog.instance.id, actionDialog.step.step_id, comment);
    } else {
      await rejectStep(actionDialog.instance.id, actionDialog.step.step_id, comment);
    }

    setActionDialog(null);
    setComment('');
    setSelectedInstance(null);
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

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedInstance(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'approve' ? 'Approve Step' : 'Reject Step'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'approve'
                ? 'Add an optional comment and approve this step'
                : 'Please provide a reason for rejection'}
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm font-medium">
              {actionDialog?.type === 'approve' ? 'Comment (optional)' : 'Rejection Reason'}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={actionDialog?.type === 'approve'
                ? 'Add a comment...'
                : 'Explain why this is being rejected...'}
              className="mt-1"
              rows={3}
            />
          </div>

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
    </div>
  );
};

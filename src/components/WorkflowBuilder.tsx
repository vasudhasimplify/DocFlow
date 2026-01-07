import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  User, 
  Settings,
  Play,
  Save,
  Zap,
  Timer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WorkflowStage {
  id: string;
  name: string;
  description?: string;
  assignee: string;
  notificationEmails?: string[]; // Additional email addresses for CC
  slaHours: number;
  autoApprove: boolean;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
  }>;
  actions: Array<{
    type: 'email' | 'webhook' | 'approval' | 'assignment';
    config: Record<string, any>;
  }>;
}

interface WorkflowBuilderProps {
  initialStages?: WorkflowStage[];
  onSave: (stages: WorkflowStage[]) => void;
  formFields?: Array<{ id: string; label: string; type: string }>;
}

export const WorkflowBuilder = ({ 
  initialStages = [], 
  onSave,
  formFields = []
}: WorkflowBuilderProps) => {
  const [stages, setStages] = useState<WorkflowStage[]>(
    initialStages.length > 0 ? initialStages : [
      {
        id: 'intake',
        name: 'Form Submission',
        description: 'Initial form submission and validation',
        assignee: 'system',
        slaHours: 1,
        autoApprove: true,
        conditions: [],
        actions: [{ type: 'email', config: { template: 'submission_confirmation' } }]
      }
    ]
  );
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [draggedStage, setDraggedStage] = useState<string | null>(null);

  const addStage = () => {
    const newStage: WorkflowStage = {
      id: `stage_${Date.now()}`,
      name: 'New Stage',
      description: '',
      assignee: 'reviewer',
      slaHours: 24,
      autoApprove: false,
      conditions: [],
      actions: []
    };
    setStages([...stages, newStage]);
    setSelectedStage(newStage.id);
  };

  const updateStage = (stageId: string, updates: Partial<WorkflowStage>) => {
    setStages(prev => 
      prev.map(stage => 
        stage.id === stageId ? { ...stage, ...updates } : stage
      )
    );
  };

  const deleteStage = (stageId: string) => {
    if (stages.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "Workflow must have at least one stage",
        variant: "destructive"
      });
      return;
    }
    setStages(prev => prev.filter(stage => stage.id !== stageId));
    setSelectedStage(null);
  };

  const moveStage = (fromIndex: number, toIndex: number) => {
    const newStages = [...stages];
    const [movedStage] = newStages.splice(fromIndex, 1);
    newStages.splice(toIndex, 0, movedStage);
    setStages(newStages);
  };

  const handleDragStart = (e: React.DragEvent, stageId: string) => {
    setDraggedStage(stageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (!draggedStage || draggedStage === targetStageId) return;

    const draggedIndex = stages.findIndex(s => s.id === draggedStage);
    const targetIndex = stages.findIndex(s => s.id === targetStageId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      moveStage(draggedIndex, targetIndex);
    }
    setDraggedStage(null);
  };

  const addCondition = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (stage && formFields.length > 0) {
      updateStage(stageId, {
        conditions: [
          ...stage.conditions,
          { field: formFields[0].id, operator: 'equals', value: '' }
        ]
      });
    }
  };

  const addAction = (stageId: string, actionType: 'email' | 'webhook' | 'approval' | 'assignment') => {
    const stage = stages.find(s => s.id === stageId);
    if (stage) {
      const newAction = {
        type: actionType,
        config: actionType === 'email' 
          ? { template: 'notification', recipient: '' }
          : actionType === 'webhook'
          ? { url: '', method: 'POST' }
          : actionType === 'assignment'
          ? { assignee: '', notify: true }
          : { required: true }
      };
      
      updateStage(stageId, {
        actions: [...stage.actions, newAction]
      });
    }
  };

  const validateWorkflow = () => {
    const issues: string[] = [];
    
    stages.forEach((stage, index) => {
      if (!stage.name.trim()) {
        issues.push(`Stage ${index + 1}: Name is required`);
      }
      if (!stage.assignee.trim()) {
        issues.push(`Stage ${index + 1}: Assignee is required`);
      }
      if (stage.slaHours <= 0) {
        issues.push(`Stage ${index + 1}: SLA must be greater than 0`);
      }
    });

    return issues;
  };

  const saveWorkflow = () => {
    const issues = validateWorkflow();
    if (issues.length > 0) {
      toast({
        title: "Validation Failed",
        description: issues.join(', '),
        variant: "destructive"
      });
      return;
    }

    onSave(stages);
    toast({
      title: "Workflow Saved",
      description: `Successfully saved workflow with ${stages.length} stages`
    });
  };

  const selectedStageData = stages.find(s => s.id === selectedStage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold">Workflow Builder</h3>
            <p className="text-muted-foreground">
              Design your document processing workflow with drag-and-drop stages
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addStage}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stage
            </Button>
            <Button onClick={saveWorkflow}>
              <Save className="mr-2 h-4 w-4" />
              Save Workflow
            </Button>
          </div>
        </div>

        {/* Workflow Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{stages.length}</div>
            <div className="text-sm text-muted-foreground">Total Stages</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-secondary">
              {stages.reduce((acc, s) => acc + s.slaHours, 0)}h
            </div>
            <div className="text-sm text-muted-foreground">Total SLA</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">
              {stages.filter(s => s.autoApprove).length}
            </div>
            <div className="text-sm text-muted-foreground">Auto-Approve</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning">
              {stages.reduce((acc, s) => acc + s.actions.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Actions</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Canvas */}
        <Card className="lg:col-span-2 p-6">
          <h4 className="text-lg font-semibold mb-4">Workflow Stages</h4>
          
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.id} className="flex items-center gap-4">
                <div
                  className={`flex-1 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedStage === stage.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } ${draggedStage === stage.id ? 'opacity-50' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, stage.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.name}</span>
                      {stage.autoApprove && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="mr-1 h-3 w-3" />
                          Auto
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {stage.slaHours}h
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {stage.assignee}
                    </div>
                    {stage.conditions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {stage.conditions.length} conditions
                      </div>
                    )}
                    {stage.actions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {stage.actions.length} actions
                      </div>
                    )}
                  </div>
                  
                  {stage.description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {stage.description}
                    </p>
                  )}
                </div>

                {index < stages.length - 1 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Stage Editor */}
        <Card className="p-6">
          <h4 className="text-lg font-semibold mb-4">Stage Configuration</h4>
          
          {selectedStageData ? (
            <div className="space-y-4">
              <div>
                <Label>Stage Name</Label>
                <Input
                  value={selectedStageData.name}
                  onChange={(e) => updateStage(selectedStage!, { name: e.target.value })}
                  placeholder="Enter stage name"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={selectedStageData.description || ''}
                  onChange={(e) => updateStage(selectedStage!, { description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div>
                <Label>Assignee</Label>
                <Input
                  value={selectedStageData.assignee}
                  onChange={(e) => updateStage(selectedStage!, { assignee: e.target.value })}
                  placeholder="e.g., reviewer, manager, system"
                />
              </div>

              <div>
                <Label>
                  Additional Notification Emails (CC)
                  <span className="text-xs text-gray-500 ml-2">Optional - comma separated</span>
                </Label>
                <Input
                  value={selectedStageData.notificationEmails?.join(', ') || ''}
                  onChange={(e) => {
                    const emails = e.target.value
                      .split(',')
                      .map(email => email.trim())
                      .filter(email => email.length > 0);
                    updateStage(selectedStage!, { notificationEmails: emails });
                  }}
                  placeholder="user@example.com, manager@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  These emails will be notified when this step is assigned and completed
                </p>
              </div>

              <div>
                <Label>SLA (hours)</Label>
                <Input
                  type="number"
                  value={selectedStageData.slaHours}
                  onChange={(e) => updateStage(selectedStage!, { slaHours: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedStageData.autoApprove}
                  onChange={(e) => updateStage(selectedStage!, { autoApprove: e.target.checked })}
                />
                <Label>Auto-approve this stage</Label>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Actions</Label>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addAction(selectedStage!, 'email')}
                    >
                      Email
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => addAction(selectedStage!, 'webhook')}
                    >
                      Webhook
                    </Button>
                  </div>
                </div>
                {selectedStageData.actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No actions configured</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStageData.actions.map((action, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {action.type}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => deleteStage(selectedStage!)}
                  disabled={stages.length <= 1}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Select a stage to configure its settings
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GitBranch,
  Play,
  Pause,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  FileCheck,
  FileSignature,
  Receipt,
  FileText,
  Zap
} from 'lucide-react';
import { STATUS_CONFIG, TRIGGER_TYPE_CONFIG } from '@/types/workflow';
import { useWorkflows } from '@/hooks/useWorkflows';
import { format } from 'date-fns';
import { WorkflowDetailsDialog } from './WorkflowDetailsDialog';

interface WorkflowCardProps {
  workflow: any;
  onEdit?: (workflow: any) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  approval: <FileCheck className="h-5 w-5" />,
  legal: <FileSignature className="h-5 w-5" />,
  finance: <Receipt className="h-5 w-5" />,
  hr: <FileText className="h-5 w-5" />,
  default: <GitBranch className="h-5 w-5" />
};

export const WorkflowCard: React.FC<WorkflowCardProps> = ({ workflow, onEdit }) => {
  const { escalationRules, activateWorkflow, pauseWorkflow, deleteWorkflow, duplicateWorkflow } = useWorkflows();
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const statusConfig = STATUS_CONFIG[workflow.status as keyof typeof STATUS_CONFIG];
  const triggerType = workflow.trigger_type || workflow.trigger?.type || 'manual';
  const triggerConfig = TRIGGER_TYPE_CONFIG[triggerType as keyof typeof TRIGGER_TYPE_CONFIG];
  
  // Get escalation rules for this workflow
  const workflowRules = escalationRules.filter(rule => 
    rule.is_global || rule.workflow_id === workflow.id
  );
  const workflowSpecificRules = escalationRules.filter(rule => rule.workflow_id === workflow.id);
  const globalRules = escalationRules.filter(rule => rule.is_global);

  const handleToggleStatus = async () => {
    if (workflow.status === 'active') {
      await pauseWorkflow(workflow.id);
    } else if (workflow.status === 'draft' || workflow.status === 'paused') {
      await activateWorkflow(workflow.id);
    }
  };

  const handleDuplicate = async () => {
    await duplicateWorkflow(workflow.id);
  };

  const handleViewRuns = () => {
    // Navigate to instances tab with filter for this workflow
    const event = new CustomEvent('view-workflow-instances', { detail: { workflowId: workflow.id } });
    window.dispatchEvent(event);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <div
        className="h-2"
        style={{ backgroundColor: workflow.color || '#6B7280' }}
      />
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: workflow.color || '#6B7280' }}
            >
              {categoryIcons[workflow.category || 'default'] || categoryIcons.default}
            </div>
            <div>
              <h3 className="font-semibold">{workflow.name}</h3>
              <p className="text-xs text-muted-foreground">v{workflow.version}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(workflow)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleViewRuns}>
                <Eye className="h-4 w-4 mr-2" />
                View Runs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteWorkflow(workflow.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {workflow.description || 'No description'}
        </p>

        {/* Status and Trigger */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusConfig && (
            <Badge className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          )}
          {triggerConfig && (
            <Badge variant="outline" className="text-xs">
              {triggerConfig.label}
            </Badge>
          )}
        </div>

        {/* Steps Count */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            {workflow.steps?.length || 0} steps
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            {workflow.run_count || workflow.stats?.total_runs || 0} runs
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            {workflowRules.length} rules
            {workflowSpecificRules.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {workflowSpecificRules.length} specific
              </Badge>
            )}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="text-xs text-muted-foreground">
            {workflow.last_run_at ? (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last run: {format(new Date(workflow.last_run_at), 'MMM d')}
              </span>
            ) : (
              <span>Never run</span>
            )}
          </div>
          <Button
            size="sm"
            variant={workflow.status === 'active' ? 'outline' : 'default'}
            onClick={handleToggleStatus}
            disabled={workflow.status === 'archived'}
          >
            {workflow.status === 'active' ? (
              <>
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1" />
                Activate
              </>
            )}
          </Button>
        </div>
      </CardContent>
      
      <WorkflowDetailsDialog
        workflow={workflow}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </Card>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Zap,
  Plus,
  Globe,
  Workflow as WorkflowIcon,
  Clock,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { PRIORITY_CONFIG } from '@/types/workflow';
import { CreateEscalationRuleDialog } from './CreateEscalationRuleDialog';

interface WorkflowEscalationRulesTabProps {
  workflowId: string;
  workflowName: string;
}

export const WorkflowEscalationRulesTab: React.FC<WorkflowEscalationRulesTabProps> = ({
  workflowId,
  workflowName
}) => {
  const { escalationRules } = useWorkflows();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Filter rules applicable to this workflow
  const workflowSpecificRules = escalationRules.filter(r => r.workflow_id === workflowId);
  const globalRules = escalationRules.filter(r => r.is_global);
  const totalApplicableRules = workflowSpecificRules.length + globalRules.length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <WorkflowIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Workflow-Specific</p>
                <p className="text-2xl font-bold">{workflowSpecificRules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Global Rules</p>
                <p className="text-2xl font-bold">{globalRules.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Active</p>
                <p className="text-2xl font-bold">{totalApplicableRules}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-sm">Rule Priority</p>
              <p className="text-sm text-muted-foreground">
                Workflow-specific rules <strong>override</strong> global rules. If you have workflow-specific
                rules configured, global rules will be ignored for this workflow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow-Specific Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                Workflow-Specific Rules
              </CardTitle>
              <CardDescription>
                Rules that apply only to "{workflowName}"
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workflowSpecificRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No workflow-specific rules configured</p>
              <p className="text-xs mt-1">Global rules will apply to this workflow</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {workflowSpecificRules.map(rule => (
                  <RuleCard key={rule.id} rule={rule} type="workflow" />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Global Rules (Read-Only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            Global Rules
          </CardTitle>
          <CardDescription>
            {workflowSpecificRules.length > 0 
              ? 'These global rules are currently overridden by workflow-specific rules above'
              : 'These global rules currently apply to this workflow'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {globalRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No global rules configured</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {globalRules.map(rule => (
                  <RuleCard 
                    key={rule.id} 
                    rule={rule} 
                    type="global" 
                    isOverridden={workflowSpecificRules.length > 0}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <CreateEscalationRuleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        workflowId={workflowId}
        workflowName={workflowName}
      />
    </div>
  );
};

// Helper component for rule cards
const RuleCard: React.FC<{ rule: any; type: 'workflow' | 'global'; isOverridden?: boolean }> = ({ 
  rule, 
  type,
  isOverridden = false 
}) => {
  const priorityConfig = PRIORITY_CONFIG[rule.priority];

  return (
    <div className={`p-3 rounded-lg border ${isOverridden ? 'opacity-50' : 'hover:bg-accent/50'} transition-colors`}>
      <div className="flex items-start gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${priorityConfig.color}`}>
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{rule.name}</span>
            <Badge className={`${priorityConfig.color} text-xs`}>
              {priorityConfig.label}
            </Badge>
            {isOverridden && (
              <Badge variant="outline" className="text-xs">
                Overridden
              </Badge>
            )}
            {!rule.is_active && (
              <Badge variant="secondary" className="text-xs">
                Disabled
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
            {rule.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rule.trigger_after_minutes ? `${rule.trigger_after_minutes}m` : `${rule.trigger_after_hours}h`}
            </span>
            <span>{rule.actions?.length || 0} actions</span>
            <span>Max {rule.max_escalations}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

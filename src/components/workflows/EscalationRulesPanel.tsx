import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Zap,
  Plus,
  Search,
  Clock,
  Bell,
  UserPlus,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  PauseCircle,
  MoreVertical,
  Edit,
  Trash2,
  Copy
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { EscalationAction, PRIORITY_CONFIG, ESCALATION_ACTION_CONFIG } from '@/types/workflow';
import { CreateEscalationRuleDialog } from './CreateEscalationRuleDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const actionIcons: Record<EscalationAction, React.ReactNode> = {
  notify: <Bell className="h-4 w-4" />,
  reassign: <UserPlus className="h-4 w-4" />,
  escalate_manager: <ArrowUpRight className="h-4 w-4" />,
  auto_approve: <CheckCircle className="h-4 w-4" />,
  auto_reject: <XCircle className="h-4 w-4" />,
  pause_workflow: <PauseCircle className="h-4 w-4" />
};

export const EscalationRulesPanel: React.FC = () => {
  const { workflows, escalationRules, updateEscalationRule, deleteEscalationRule, isLoading } = useWorkflows();
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'global' | 'workflow'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredRules = escalationRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesScope = scopeFilter === 'all' || 
                        (scopeFilter === 'global' && rule.is_global) ||
                        (scopeFilter === 'workflow' && !rule.is_global && rule.workflow_id);
    return matchesSearch && matchesScope;
  });

  // Count rules by scope
  const globalCount = escalationRules.filter(r => r.is_global).length;
  const workflowCount = escalationRules.filter(r => !r.is_global && r.workflow_id).length;

  const handleToggleActive = async (rule: any) => {
    await updateEscalationRule(rule.id, { is_active: !rule.is_active });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search escalation rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Scope Filter Tabs */}
      <Tabs value={scopeFilter} onValueChange={(v: any) => setScopeFilter(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All Rules
            <Badge variant="secondary" className="ml-2">{escalationRules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="global">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Global
              <Badge variant="secondary" className="ml-1">{globalCount}</Badge>
            </div>
          </TabsTrigger>
          <TabsTrigger value="workflow">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              Workflow-Specific
              <Badge variant="secondary" className="ml-1">{workflowCount}</Badge>
            </div>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Escalation Rules</p>
              <p className="text-sm text-muted-foreground">
                Define automatic actions when workflow steps are overdue. Rules can send notifications,
                reassign tasks, escalate to managers, or auto-approve/reject after specified timeouts.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Rules</CardTitle>
          <CardDescription>
            Manage escalation rules for workflow automation
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No escalation rules</h3>
                <p className="text-muted-foreground mb-4">
                  Create rules to automate workflow escalations
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredRules.map((rule) => {
                  const priorityConfig = PRIORITY_CONFIG[rule.priority];

                  return (
                    <div
                      key={rule.id}
                      className="p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${priorityConfig.color}`}>
                          <Zap className="h-5 w-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{rule.name}</span>
                            
                            {/* Scope Badge */}
                            {rule.is_global ? (
                              <Badge variant="outline" className="gap-1">
                                <div className="h-2 w-2 rounded-full bg-blue-500" />
                                Global
                              </Badge>
                            ) : rule.workflow_id ? (
                              <Badge variant="outline" className="gap-1">
                                <div className="h-2 w-2 rounded-full bg-purple-500" />
                                {workflows?.find(w => w.id === rule.workflow_id)?.name || 'Workflow'}
                              </Badge>
                            ) : null}
                            
                            <Badge className={priorityConfig.color}>
                              {priorityConfig.label}
                            </Badge>
                            {!rule.is_active && (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {rule.description}
                          </p>

                          {/* Timing */}
                          <div className="flex items-center gap-4 text-sm mb-3">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Trigger after {rule.trigger_after_hours || rule.conditions?.[0]?.threshold_hours || 24}h
                            </span>
                            {rule.repeat_every_hours && (
                              <span className="text-muted-foreground">
                                Repeat every {rule.repeat_every_hours}h
                              </span>
                            )}
                            {rule.max_escalations && (
                              <span className="text-muted-foreground">
                                Max {rule.max_escalations} escalations
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {rule.actions.map((action, index) => {
                              const actionConfig = ESCALATION_ACTION_CONFIG[action.action];
                              return (
                                <Badge key={index} variant="outline" className="gap-1">
                                  {actionIcons[action.action]}
                                  {actionConfig?.label || action.action}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={() => handleToggleActive(rule)}
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteEscalationRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <CreateEscalationRuleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
};

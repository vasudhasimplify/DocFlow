import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useSearchParams } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Zap,
  BarChart3,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { STATUS_CONFIG, WorkflowStatus } from '@/types/workflow';
import { WorkflowCard } from './WorkflowCard';
import { WorkflowInstancesList } from './WorkflowInstancesList';
import { EscalationRulesPanel } from './EscalationRulesPanel';
import { CreateWorkflowDialog } from './CreateWorkflowDialog';

export const WorkflowDashboard: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState('workflows');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);

  // Handle instance query parameter from email links
  useEffect(() => {
    const instanceId = searchParams.get('instance');
    if (instanceId) {
      setActiveTab('instances');
      // Trigger opening the instance dialog in WorkflowInstancesList
      setTimeout(() => {
        const event = new CustomEvent('open-workflow-instance', { detail: { instanceId } });
        window.dispatchEvent(event);
      }, 500);
    }
  }, [searchParams]);

  // Listen for view workflow instances event
  useEffect(() => {
    const handleViewInstances = (event: CustomEvent) => {
      setActiveTab('instances');
    };

    window.addEventListener('view-workflow-instances' as any, handleViewInstances);
    return () => {
      window.removeEventListener('view-workflow-instances' as any, handleViewInstances);
    };
  }, []);

  const { workflows, instances, stats, isLoading, fetchWorkflows, fetchInstances, fetchStats } = useWorkflows();

  const handleRefresh = async () => {
    await Promise.all([fetchWorkflows(), fetchInstances(), fetchStats()]);
  };

  // Defensive: Ensure workflows is always an array
  const safeWorkflows = Array.isArray(workflows) ? workflows : [];
  const safeInstances = Array.isArray(instances) ? instances : [];

  // Separate templates from custom workflows
  const templates = safeWorkflows.filter(w => w.is_template === true);
  const customWorkflows = safeWorkflows.filter(w => w.is_template !== true);

  const filteredWorkflows = customWorkflows.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         w.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTemplates = templates.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         w.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const activeInstances = safeInstances.filter(i => i.status === 'active');
  const completedInstances = safeInstances.filter(i => i.status === 'completed' || i.status === 'rejected');
  const overdueInstances = safeInstances.filter(i => 
    i.status === 'active' && 
    (i.step_instances || []).some(s => s.is_overdue)
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Automate document processes with customizable workflows
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-3xl font-bold">{stats.active_workflows}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.draft_workflows || 0} in draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Running Instances</p>
                <p className="text-3xl font-bold">{stats.running_instances}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.pending_approvals} pending approvals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SLA Compliance</p>
                <p className="text-3xl font-bold text-green-600">{stats.sla_compliance_rate ?? 0}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
            <Progress value={stats.sla_compliance_rate ?? 0} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue Steps</p>
                <p className="text-3xl font-bold text-destructive">{stats.overdue_steps || stats.overdue_tasks}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.escalation_rate}% escalation rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {overdueInstances.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium">
                  {overdueInstances.length} workflow{overdueInstances.length > 1 ? 's' : ''} require attention
                </p>
                <p className="text-sm text-muted-foreground">
                  Steps are overdue or have been escalated
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('instances')}>
                View Details
                <ArrowUpRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="workflows" className="gap-2">
              <GitBranch className="h-4 w-4" />
              My Workflows ({customWorkflows.length})
            </TabsTrigger>
            <TabsTrigger value="instances" className="gap-2">
              <Activity className="h-4 w-4" />
              Running
              {activeInstances.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {activeInstances.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Completed
              {completedInstances.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {completedInstances.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="escalations" className="gap-2">
              <Zap className="h-4 w-4" />
              Escalation Rules
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {activeTab === 'workflows' && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
                  className="h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="all">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        <TabsContent value="workflows" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkflows.map((workflow) => (
              <WorkflowCard 
                key={workflow.id} 
                workflow={workflow} 
                onEdit={(wf) => {
                  setEditingWorkflow(wf);
                  setIsCreateDialogOpen(true);
                }}
              />
            ))}
            {filteredWorkflows.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No custom workflows yet</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search' : 'Create your first workflow or use a template'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="instances" className="mt-0">
          <WorkflowInstancesList />
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <WorkflowInstancesList filter="completed" />
        </TabsContent>

        <TabsContent value="escalations" className="mt-0">
          <EscalationRulesPanel />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Workflow Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Track workflow performance, bottlenecks, and completion times
                </p>
              </div>
              <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground mb-2">{activeInstances.length}</p>
                  <p className="text-sm text-muted-foreground">Active Workflows</p>
                  <p className="text-xs text-muted-foreground mt-1">Currently running instances</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground mb-2">
                    {stats.avg_completion_time > 0 ? `${stats.avg_completion_time.toFixed(1)}h` : '0h'}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                  <p className="text-xs text-muted-foreground mt-1">Time from start to completion</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-foreground mb-2">
                    {stats.escalation_rate >= 0 ? `${stats.escalation_rate.toFixed(1)}%` : '0%'}
                  </p>
                  <p className="text-sm text-muted-foreground">Escalation Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">Tasks exceeding SLA deadlines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateWorkflowDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) setEditingWorkflow(null); // Clear edit state when closing
        }}
        workflow={editingWorkflow}
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  Settings,
  Zap,
  FileText
} from 'lucide-react';
import { WorkflowEscalationRulesTab } from './WorkflowEscalationRulesTab';
import { STATUS_CONFIG } from '@/types/workflow';

interface WorkflowDetailsDialogProps {
  workflow: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WorkflowDetailsDialog: React.FC<WorkflowDetailsDialogProps> = ({
  workflow,
  open,
  onOpenChange
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const statusConfig = STATUS_CONFIG[workflow.status as keyof typeof STATUS_CONFIG];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: workflow.color || '#6B7280' }}
            >
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{workflow.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                {statusConfig && (
                  <Badge className={statusConfig.color}>
                    {statusConfig.label}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">v{workflow.version}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="steps" className="gap-2">
              <GitBranch className="h-4 w-4" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="escalations" className="gap-2">
              <Zap className="h-4 w-4" />
              Escalation Rules
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] mt-4">
            <TabsContent value="overview" className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">
                  {workflow.description || 'No description provided'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Category</h3>
                <Badge variant="outline">{workflow.category || 'General'}</Badge>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Trigger Type</h3>
                <Badge variant="outline">
                  {workflow.trigger_type || workflow.trigger?.type || 'Manual'}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total Runs</p>
                    <p className="text-2xl font-bold">{workflow.run_count || workflow.stats?.total_runs || 0}</p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Steps</p>
                    <p className="text-2xl font-bold">{workflow.steps?.length || 0}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="steps" className="space-y-3">
              {workflow.steps && workflow.steps.length > 0 ? (
                workflow.steps.map((step: any, index: number) => (
                  <div key={step.id || index} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{step.name}</p>
                        <p className="text-sm text-muted-foreground">{step.step_type}</p>
                      </div>
                      {step.sla_hours && (
                        <Badge variant="outline">SLA: {step.sla_hours}h</Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No steps configured</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="escalations">
              <WorkflowEscalationRulesTab
                workflowId={workflow.id}
                workflowName={workflow.name}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

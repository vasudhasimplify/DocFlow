import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Activity,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  ChevronRight,
  ChevronDown,
  Play,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { PRIORITY_CONFIG } from '@/types/workflow';
import { formatDistanceToNow } from 'date-fns';

const stepStatusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-gray-500' },
  in_progress: { icon: <Play className="h-4 w-4" />, color: 'text-blue-500' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
  rejected: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-500' },
};

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
  'Invoice': 'bg-blue-500',
  'Purchase Order': 'bg-green-500',
  'Contract': 'bg-purple-500',
  'HR Document': 'bg-pink-500',
  'Legal': 'bg-red-500',
  'Financial': 'bg-amber-500',
  'General': 'bg-gray-500',
};

interface WorkflowInstancesAdminViewProps {
  filter?: 'active' | 'completed';
}

export const WorkflowInstancesAdminView: React.FC<WorkflowInstancesAdminViewProps> = ({ filter = 'active' }) => {
  const { instances, fetchInstances } = useWorkflows();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  // Filter instances by status
  const statusFilteredInstances = filter === 'completed' 
    ? instances.filter(inst => inst.status === 'completed' || inst.status === 'rejected')
    : instances.filter(inst => inst.status === 'active');

  const filteredInstances = statusFilteredInstances.filter(inst =>
    (inst.document_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (inst.workflow?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group instances by category, then by employee
  const groupedInstances = useMemo(() => {
    const groups: Record<string, Record<string, any[]>> = {};
    
    filteredInstances.forEach(instance => {
      // Get category from workflow
      const category = instance.workflow?.category || 'General';
      
      // Get employee (originator)
      const employeeId = instance.started_by || 'unknown';
      const employeeName = (instance as any).started_by_email || `User ${employeeId?.substring(0, 8)}...`;
      const employeeKey = `${employeeId}|${employeeName}`;
      
      if (!groups[category]) {
        groups[category] = {};
      }
      if (!groups[category][employeeKey]) {
        groups[category][employeeKey] = [];
      }
      groups[category][employeeKey].push(instance);
    });
    
    return groups;
  }, [filteredInstances]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleEmployee = (employeeKey: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeKey)) {
      newExpanded.delete(employeeKey);
    } else {
      newExpanded.add(employeeKey);
    }
    setExpandedEmployees(newExpanded);
  };

  // Expand all by default
  useEffect(() => {
    const allCategories = new Set(Object.keys(groupedInstances));
    const allEmployees = new Set<string>();
    Object.values(groupedInstances).forEach(employees => {
      Object.keys(employees).forEach(emp => allEmployees.add(emp));
    });
    setExpandedCategories(allCategories);
    setExpandedEmployees(allEmployees);
  }, [groupedInstances]);

  const getProgress = (instance: any) => {
    const steps = instance.step_instances || [];
    const completedSteps = steps.filter((s: any) => s.status === 'completed').length;
    const totalSteps = instance.workflow?.steps?.length || steps.length || 1;
    return (completedSteps / totalSteps) * 100;
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || categoryColors['General'];
  };

  const getCategoryCount = (category: string) => {
    return Object.values(groupedInstances[category] || {}).reduce((sum, docs) => sum + docs.length, 0);
  };

  return (
    <div className="space-y-4">
      {/* Search & Refresh */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by document or workflow name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchInstances()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Category-wise Grouped View */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Workflows by Category
          </CardTitle>
          <CardDescription>
            Category → Employee → Documents
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {Object.keys(groupedInstances).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No workflows found</h3>
                <p className="text-muted-foreground">
                  {filter === 'active' ? 'No active workflows' : 'No completed workflows'}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {Object.entries(groupedInstances).map(([category, employees]) => (
                  <Collapsible
                    key={category}
                    open={expandedCategories.has(category)}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    {/* Category Header */}
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 p-4 hover:bg-accent/50 cursor-pointer transition-colors">
                        {expandedCategories.has(category) ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className={`h-8 w-8 rounded-lg ${getCategoryColor(category)} flex items-center justify-center`}>
                          <FolderOpen className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="font-semibold">{category}</span>
                        </div>
                        <Badge variant="secondary">
                          {getCategoryCount(category)} {getCategoryCount(category) === 1 ? 'document' : 'documents'}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="pl-8 border-l-2 border-muted ml-6">
                        {Object.entries(employees).map(([employeeKey, docs]) => {
                          const [, employeeName] = employeeKey.split('|');
                          
                          return (
                            <Collapsible
                              key={employeeKey}
                              open={expandedEmployees.has(employeeKey)}
                              onOpenChange={() => toggleEmployee(employeeKey)}
                            >
                              {/* Employee Header */}
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-3 p-3 hover:bg-accent/30 cursor-pointer transition-colors">
                                  {expandedEmployees.has(employeeKey) ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <span className="font-medium">{employeeName}</span>
                                  <Badge variant="outline" className="ml-auto">
                                    {docs.length} {docs.length === 1 ? 'document' : 'documents'}
                                  </Badge>
                                </div>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                {/* Documents List - Vertical Column */}
                                <div className="pl-8 space-y-2 py-2">
                                  {docs.map((instance: any) => {
                                    const progress = getProgress(instance);
                                    const currentStep = (instance.step_instances || []).find((s: any) => s.step_id === instance.current_step_id);
                                    const priorityConfig = PRIORITY_CONFIG[instance.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;

                                    return (
                                      <div
                                        key={instance.id}
                                        className="p-3 rounded-lg border bg-card hover:shadow-sm transition-all"
                                      >
                                        <div className="flex items-start gap-3">
                                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                                          
                                          <div className="flex-1 min-w-0">
                                            {/* Document Name */}
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-medium truncate">
                                                {instance.document_name || 'No document'}
                                              </span>
                                              <Badge className={priorityConfig.color} variant="secondary">
                                                {priorityConfig.label}
                                              </Badge>
                                            </div>

                                            {/* Workflow Name */}
                                            <p className="text-sm text-muted-foreground mb-2">
                                              {instance.workflow?.name || 'Unknown Workflow'}
                                            </p>

                                            {/* Progress Bar */}
                                            <div className="flex items-center gap-2 mb-2">
                                              <Progress value={progress} className="h-2 flex-1" />
                                              <span className="text-xs text-muted-foreground w-10">
                                                {Math.round(progress)}%
                                              </span>
                                            </div>

                                            {/* Current Step */}
                                            {currentStep && (
                                              <div className="flex items-center gap-2 text-xs mb-1">
                                                <span className="text-muted-foreground">Current:</span>
                                                <Badge variant="outline" className={stepStatusConfig[currentStep.status]?.color}>
                                                  {currentStep.step_name || 'Step'}
                                                </Badge>
                                                {currentStep.assigned_email && (
                                                  <span className="text-muted-foreground">→ {currentStep.assigned_email}</span>
                                                )}
                                              </div>
                                            )}

                                            {/* Time Info */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                              <Clock className="h-3 w-3" />
                                              <span>Started {formatDistanceToNow(new Date(instance.started_at))} ago</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

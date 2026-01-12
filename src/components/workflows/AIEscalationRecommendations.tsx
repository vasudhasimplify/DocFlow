import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Sparkles,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  Shield,
  FileText,
  Settings
} from 'lucide-react';
import { useWorkflows } from '@/hooks/useWorkflows';
import { EscalationAction, PRIORITY_CONFIG } from '@/types/workflow';

interface AIEscalationRecommendationsProps {
  onCreateRule: (recommendation: RuleRecommendation) => void;
}

interface RuleRecommendation {
  workflowId: string;
  workflowName: string;
  workflowCategory?: string;
  suggestedRuleName: string;
  suggestedDescription: string;
  suggestedAction: EscalationAction;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  suggestedTriggerHours: number;
  reasoning: string;
  confidence: number;
}

// AI-based recommendations for escalation rules
const getRecommendations = (
  workflows: any[], 
  escalationRules: any[]
): RuleRecommendation[] => {
  const recommendations: RuleRecommendation[] = [];
  
  // Get workflow IDs that already have rules
  const workflowsWithRules = new Set(
    escalationRules
      .filter(r => r.workflow_id)
      .map(r => r.workflow_id)
  );
  
  // Check if there are global rules
  const hasGlobalRules = escalationRules.some(r => r.is_global);

  workflows.forEach(workflow => {
    // Skip if workflow already has specific rules
    if (workflowsWithRules.has(workflow.id)) return;
    
    // Skip if there are global rules (might be covered)
    // But still suggest workflow-specific if the workflow type warrants it
    
    const name = workflow.name?.toLowerCase() || '';
    const category = workflow.category?.toLowerCase() || '';
    const description = workflow.description?.toLowerCase() || '';
    
    // Invoice workflows - auto-reject for overdue
    if (name.includes('invoice') || category.includes('invoice') || category.includes('financial')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `Invoice Escalation - ${workflow.name}`,
        suggestedDescription: 'Auto-escalate overdue invoice approvals to manager after 48 hours',
        suggestedAction: 'escalate_manager',
        suggestedPriority: 'high',
        suggestedTriggerHours: 48,
        reasoning: 'Invoice workflows often have payment deadlines. Escalating to manager ensures timely processing and avoids late payment penalties.',
        confidence: 0.92
      });
    }
    
    // Contract workflows - escalate, never auto-approve
    else if (name.includes('contract') || category.includes('contract') || category.includes('legal')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `Contract Escalation - ${workflow.name}`,
        suggestedDescription: 'Escalate to legal department after 72 hours of inactivity',
        suggestedAction: 'escalate_manager',
        suggestedPriority: 'critical',
        suggestedTriggerHours: 72,
        reasoning: 'Contract workflows require careful review. Auto-approve is not recommended. Escalation ensures proper legal oversight.',
        confidence: 0.95
      });
    }
    
    // HR documents - notify and reassign
    else if (name.includes('hr') || category.includes('hr') || name.includes('employee') || name.includes('personnel')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `HR Document Escalation - ${workflow.name}`,
        suggestedDescription: 'Notify HR manager and reassign after 48 hours',
        suggestedAction: 'reassign',
        suggestedPriority: 'medium',
        suggestedTriggerHours: 48,
        reasoning: 'HR documents affect employee relations. Timely processing is important but auto-approve/reject is risky due to sensitivity.',
        confidence: 0.88
      });
    }
    
    // Purchase orders - can auto-approve low value
    else if (name.includes('purchase') || name.includes('po') || category.includes('procurement')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `PO Auto-Approve - ${workflow.name}`,
        suggestedDescription: 'Auto-approve low-priority purchase orders after 72 hours',
        suggestedAction: 'auto_approve',
        suggestedPriority: 'low',
        suggestedTriggerHours: 72,
        reasoning: 'Low-priority purchase orders under threshold amounts can be safely auto-approved to prevent operational delays.',
        confidence: 0.78
      });
    }
    
    // Expense reports - auto-approve small amounts
    else if (name.includes('expense') || name.includes('reimbursement')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `Expense Auto-Approve - ${workflow.name}`,
        suggestedDescription: 'Auto-approve expense reports after 96 hours if under threshold',
        suggestedAction: 'auto_approve',
        suggestedPriority: 'low',
        suggestedTriggerHours: 96,
        reasoning: 'Small expense reports can be auto-approved to improve employee satisfaction and reduce administrative burden.',
        confidence: 0.75
      });
    }
    
    // Time-sensitive documents - auto-reject if too delayed
    else if (name.includes('urgent') || description.includes('time-sensitive') || description.includes('deadline')) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `Urgent Timeout - ${workflow.name}`,
        suggestedDescription: 'Auto-reject urgent requests after 24 hours to prevent stale processing',
        suggestedAction: 'auto_reject',
        suggestedPriority: 'critical',
        suggestedTriggerHours: 24,
        reasoning: 'Time-sensitive workflows should be rejected if not processed in time, allowing requestors to resubmit or escalate through other channels.',
        confidence: 0.82
      });
    }
    
    // Default recommendation for workflows without rules
    else if (!hasGlobalRules) {
      recommendations.push({
        workflowId: workflow.id,
        workflowName: workflow.name,
        workflowCategory: workflow.category,
        suggestedRuleName: `Standard Escalation - ${workflow.name}`,
        suggestedDescription: 'Notify assignee and escalate to manager after 48 hours',
        suggestedAction: 'notify',
        suggestedPriority: 'medium',
        suggestedTriggerHours: 48,
        reasoning: 'Every workflow should have basic escalation rules to prevent tasks from being forgotten.',
        confidence: 0.70
      });
    }
  });
  
  // Sort by confidence
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

const getActionIcon = (action: EscalationAction) => {
  switch (action) {
    case 'auto_approve': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'auto_reject': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'escalate_manager': return <Zap className="h-4 w-4 text-amber-500" />;
    case 'reassign': return <Settings className="h-4 w-4 text-blue-500" />;
    case 'notify': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'pause_workflow': return <Clock className="h-4 w-4 text-gray-500" />;
    default: return <Zap className="h-4 w-4" />;
  }
};

const getActionLabel = (action: EscalationAction) => {
  switch (action) {
    case 'auto_approve': return 'Auto-Approve';
    case 'auto_reject': return 'Auto-Reject';
    case 'escalate_manager': return 'Escalate to Manager';
    case 'reassign': return 'Reassign Task';
    case 'notify': return 'Send Notification';
    case 'pause_workflow': return 'Pause Workflow';
    default: return action;
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.9) return 'bg-green-500';
  if (confidence >= 0.8) return 'bg-emerald-500';
  if (confidence >= 0.7) return 'bg-yellow-500';
  return 'bg-orange-500';
};

export const AIEscalationRecommendations: React.FC<AIEscalationRecommendationsProps> = ({
  onCreateRule
}) => {
  const { workflows, escalationRules } = useWorkflows();
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
  
  const recommendations = useMemo(() => 
    getRecommendations(workflows, escalationRules),
    [workflows, escalationRules]
  );
  
  // Count workflows without any rules
  const workflowsWithRules = new Set(
    escalationRules.filter(r => r.workflow_id).map(r => r.workflow_id)
  );
  const workflowsWithoutRules = workflows.filter(w => !workflowsWithRules.has(w.id));
  const hasGlobalRules = escalationRules.some(r => r.is_global);
  
  const handleApplyRecommendation = (rec: RuleRecommendation) => {
    setAppliedRecommendations(prev => new Set([...prev, rec.workflowId]));
    onCreateRule(rec);
  };
  
  if (recommendations.length === 0 && workflowsWithoutRules.length === 0) {
    return (
      <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <AlertTitle className="text-green-800 dark:text-green-200">All Workflows Covered</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          All your workflows have escalation rules configured. Great job!
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Summary Alert */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          AI Recommendations Available
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          {workflowsWithoutRules.length} workflow{workflowsWithoutRules.length !== 1 ? 's' : ''} 
          {!hasGlobalRules ? ' have no escalation rules' : ' could benefit from specific rules'}.
          {recommendations.length > 0 && ` We have ${recommendations.length} AI-generated suggestions.`}
        </AlertDescription>
      </Alert>

      {/* Workflows without rules */}
      {workflowsWithoutRules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Workflows Without Escalation Rules
            </CardTitle>
            <CardDescription className="text-xs">
              These workflows don't have specific escalation rules configured
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {workflowsWithoutRules.slice(0, 8).map(w => (
                <Badge key={w.id} variant="outline" className="text-xs">
                  {w.name}
                </Badge>
              ))}
              {workflowsWithoutRules.length > 8 && (
                <Badge variant="secondary" className="text-xs">
                  +{workflowsWithoutRules.length - 8} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            AI-Suggested Escalation Rules
          </CardTitle>
          <CardDescription>
            Based on workflow types and best practices
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {recommendations.map((rec, index) => (
                <div 
                  key={`${rec.workflowId}-${index}`}
                  className={`p-4 transition-colors ${
                    appliedRecommendations.has(rec.workflowId) 
                      ? 'bg-green-50 dark:bg-green-950/20' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      PRIORITY_CONFIG[rec.suggestedPriority]?.color || 'bg-gray-100'
                    }`}>
                      {getActionIcon(rec.suggestedAction)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{rec.suggestedRuleName}</span>
                        <Badge variant="outline" className="text-xs gap-1">
                          <div className={`h-2 w-2 rounded-full ${getConfidenceColor(rec.confidence)}`} />
                          {Math.round(rec.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.suggestedDescription}
                      </p>
                      
                      {/* Suggested settings */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          {getActionIcon(rec.suggestedAction)}
                          {getActionLabel(rec.suggestedAction)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          After {rec.suggestedTriggerHours}h
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {rec.suggestedPriority} priority
                        </Badge>
                      </div>
                      
                      {/* Reasoning */}
                      <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
                        <span className="font-medium">AI Reasoning: </span>
                        {rec.reasoning}
                      </div>
                    </div>
                    
                    <div className="shrink-0">
                      {appliedRecommendations.has(rec.workflowId) ? (
                        <Badge className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          Apply
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {recommendations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Specific Recommendations</h3>
                  <p className="text-muted-foreground text-sm">
                    Your workflows are either covered by global rules or don't match known patterns.
                    You can still create custom rules manually.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Auto-approve vs Auto-reject guidance */}
      <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">When to use Auto-Approve vs Auto-Reject</p>
              <div className="mt-2 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <p><strong>Auto-Approve:</strong> Low-risk, low-value items like small expenses, routine POs under threshold</p>
                <p><strong>Auto-Reject:</strong> Time-sensitive requests that become invalid after deadline (e.g., event approvals)</p>
                <p><strong>Neither:</strong> Contracts, HR documents, high-value items - always escalate to manager instead</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

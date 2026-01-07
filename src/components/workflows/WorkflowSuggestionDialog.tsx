import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  GitBranch,
  Sparkles,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  Mail,
  User,
} from 'lucide-react';
import { workflowApi } from '@/services/workflowApi';
import { toast } from 'sonner';
import { Workflow as WorkflowType } from '@/types/workflow';
import { ExtractedDataViewer } from './ExtractedDataViewer';

interface Document {
  id: string;
  file_name: string;
  file_type?: string;
  document_type?: string;
}

interface WorkflowSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  documentType: string;
  confidence?: number;
  onStartWorkflow?: (workflowId: string) => void;
  onCreateWorkflow?: () => void;
  onSkip?: () => void;
}

interface WorkflowWithColor extends Omit<WorkflowType, 'steps'> {
  color?: string;
  steps?: any[];
}

export const WorkflowSuggestionDialog: React.FC<WorkflowSuggestionDialogProps> = ({
  open,
  onOpenChange,
  document,
  documentType,
  confidence = 0,
  onStartWorkflow,
  onCreateWorkflow,
  onSkip,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [suggestedWorkflow, setSuggestedWorkflow] = useState<WorkflowWithColor | null>(null);
  const [alternativeWorkflows, setAlternativeWorkflows] = useState<WorkflowWithColor[]>([]);
  const [message, setMessage] = useState('');
  const [hasMatching, setHasMatching] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  
  // NEW: Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<'extracted' | 'failed' | 'no_schema' | 'not_ready' | 'error' | null>(null);
  
  // NEW: Step assignment state
  const [showStepAssignment, setShowStepAssignment] = useState(false);
  const [stepEmails, setStepEmails] = useState<Record<string, string>>({});

  // Fetch workflow suggestion and extract data when dialog opens
  useEffect(() => {
    if (open && document?.id && documentType) {
      fetchSuggestion();
      extractDocumentData();
    }
  }, [open, document?.id, documentType]);

  const fetchSuggestion = async () => {
    setIsLoading(true);
    try {
      const response = await workflowApi.suggestWorkflow({
        document_id: document.id,
        document_type: documentType,
        document_name: document.file_name,
        confidence,
      });

      setSuggestedWorkflow(response.suggested_workflow as WorkflowWithColor);
      setAlternativeWorkflows(response.alternative_workflows as WorkflowWithColor[]);
      setMessage(response.message);
      setHasMatching(response.has_matching_workflow);
      
      if (response.suggested_workflow) {
        setSelectedWorkflowId(response.suggested_workflow.id);
      }
    } catch (error: any) {
      console.error('Error fetching workflow suggestion:', error);
      toast.error('Failed to get workflow suggestion');
      setMessage('Unable to suggest a workflow at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  const extractDocumentData = async () => {
    setIsExtracting(true);
    try {
      const result = await workflowApi.extractDocumentFields(document.id);
      setExtractedData(result.extracted_data);
      setExtractionStatus(result.status);
      
      if (result.status === 'extracted') {
        console.log('✅ Extracted document fields:', result.extracted_data);
      } else {
        console.log(`ℹ️  Extraction status: ${result.status} - ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error extracting document data:', error);
      setExtractionStatus('error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStartWorkflow = async () => {
    if (!selectedWorkflowId) {
      toast.error('Please select a workflow');
      return;
    }

    // Show step assignment UI first
    if (!showStepAssignment) {
      setShowStepAssignment(true);
      return;
    }

    // Validate all steps have emails
    const workflowSteps = selectedWorkflow?.steps || [];
    const missingEmails = workflowSteps.filter((step: any) => !stepEmails[step.id]?.trim());
    
    if (missingEmails.length > 0) {
      toast.error('Please assign an email for each step');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = workflowSteps.filter((step: any) => {
      const email = stepEmails[step.id]?.trim();
      return email && !emailRegex.test(email);
    });
    
    if (invalidEmails.length > 0) {
      toast.error('Please enter valid email addresses');
      return;
    }

    setIsStarting(true);
    try {
      const instance = await workflowApi.startInstance(selectedWorkflowId, {
        document_id: document.id,
        priority: 'medium',
        metadata: {
          document_type: documentType,
          auto_suggested: true,
          suggestion_confidence: confidence,
        },
        // Pass pre-extracted data
        extracted_data: extractedData || undefined,
        extraction_status: extractionStatus || undefined,
        // NEW: Pass step email assignments
        step_assignments: stepEmails,
      });

      toast.success('Workflow started successfully!', {
        description: `Workflow is now running on ${document.file_name}`,
      });

      onStartWorkflow?.(selectedWorkflowId);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error starting workflow:', error);
      toast.error('Failed to start workflow', {
        description: error.message || 'Please try again',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCreateWorkflow = () => {
    onCreateWorkflow?.();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  const selectedWorkflow = selectedWorkflowId 
    ? (suggestedWorkflow?.id === selectedWorkflowId ? suggestedWorkflow : alternativeWorkflows.find(w => w.id === selectedWorkflowId))
    : suggestedWorkflow;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Workflow Suggestion
          </DialogTitle>
          <DialogDescription>
            Based on the document classification, we've identified a recommended workflow
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Analyzing document and finding workflows...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Document Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{document.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{documentType}</Badge>
                      {confidence > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round(confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Message */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <p className="text-sm">{message}</p>
            </div>

            {/* Extracted Document Data */}
            {!isExtracting && extractionStatus && (
              <ExtractedDataViewer 
                instance={{ 
                  extracted_data: extractedData,
                  extraction_status: extractionStatus,
                  data_status: extractionStatus === 'extracted' ? 'extracted' : undefined
                } as any}
              />
            )}
            {isExtracting && (
              <Card className="bg-muted/30">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Extracting document fields...</span>
                </CardContent>
              </Card>
            )}

            {/* Suggested Workflow */}
            {suggestedWorkflow && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Recommended Workflow
                  </h3>
                </div>
                
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedWorkflowId === suggestedWorkflow.id 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedWorkflowId(suggestedWorkflow.id)}
                >
                  <div
                    className="h-2 rounded-t-lg"
                    style={{ backgroundColor: suggestedWorkflow.color || '#6B7280' }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{suggestedWorkflow.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestedWorkflow.description || 'No description'}
                        </p>
                      </div>
                      <Badge>{suggestedWorkflow.category}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        {suggestedWorkflow.steps?.length || 0} steps
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Est. {calculateEstimatedTime(suggestedWorkflow.steps || [])}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* No Matching Workflow */}
            {!suggestedWorkflow && !isLoading && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium mb-2">No Matching Workflow Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    There's no workflow configured for "{documentType}" documents yet.
                  </p>
                  <Button onClick={handleCreateWorkflow} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Workflow
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Alternative Workflows */}
            {alternativeWorkflows.length > 0 && (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="w-full justify-between"
                >
                  <span className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Other Workflows ({alternativeWorkflows.length})
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${showAlternatives ? 'rotate-90' : ''}`} />
                </Button>

                {showAlternatives && (
                  <ScrollArea className="h-48 rounded-lg border p-2">
                    <RadioGroup
                      value={selectedWorkflowId || ''}
                      onValueChange={setSelectedWorkflowId}
                      className="space-y-2"
                    >
                      {alternativeWorkflows.map((workflow) => (
                        <div
                          key={workflow.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 ${
                            selectedWorkflowId === workflow.id ? 'border-primary bg-primary/5' : ''
                          }`}
                          onClick={() => setSelectedWorkflowId(workflow.id)}
                        >
                          <RadioGroupItem value={workflow.id} id={workflow.id} />
                          <div
                            className="h-3 w-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: workflow.color || '#6B7280' }}
                          />
                          <Label htmlFor={workflow.id} className="flex-1 cursor-pointer">
                            <span className="font-medium">{workflow.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {workflow.steps?.length || 0} steps
                            </span>
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {workflow.category}
                          </Badge>
                        </div>
                      ))}
                    </RadioGroup>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Create New Option */}
            {(suggestedWorkflow || alternativeWorkflows.length > 0) && !showStepAssignment && (
              <>
                <Separator />
                <div className="flex items-center justify-center">
                  <Button
                    variant="link"
                    onClick={handleCreateWorkflow}
                    className="text-muted-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create a new workflow instead
                  </Button>
                </div>
              </>
            )}

            {/* Step Assignment UI */}
            {showStepAssignment && selectedWorkflow && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Mail className="h-4 w-4 text-primary" />
                    Assign Steps to Team Members
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter email addresses for each workflow step. Each person will receive notifications.
                  </p>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedWorkflow.steps?.map((step: any, index: number) => (
                    <Card key={step.id} className="border-l-4" style={{ borderLeftColor: selectedWorkflow.color || '#6B7280' }}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{step.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {step.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="assignee@example.com"
                                value={stepEmails[step.id] || ''}
                                onChange={(e) => setStepEmails(prev => ({
                                  ...prev,
                                  [step.id]: e.target.value
                                }))}
                                className="flex-1"
                              />
                            </div>
                            {step.sla_hours && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                SLA: {step.sla_hours} hours
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {showStepAssignment && (
            <Button
              variant="outline"
              onClick={() => setShowStepAssignment(false)}
              disabled={isStarting}
            >
              Back
            </Button>
          )}
          {!showStepAssignment && (
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isStarting}
            >
              Skip for Now
            </Button>
          )}
          {(suggestedWorkflow || selectedWorkflowId) && (
            <Button
              onClick={handleStartWorkflow}
              disabled={!selectedWorkflowId || isStarting}
              className="gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : showStepAssignment ? (
                <>
                  Start Workflow
                  <CheckCircle2 className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next: Assign Steps
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Helper function to calculate estimated time
function calculateEstimatedTime(steps: any[]): string {
  if (!steps || steps.length === 0) return '1h';
  const totalHours = steps.reduce((sum, step) => sum + (step.sla_hours || 24), 0);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

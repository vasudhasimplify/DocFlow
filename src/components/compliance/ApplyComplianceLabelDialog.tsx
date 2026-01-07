import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield,
  Search,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText
} from 'lucide-react';
import { useComplianceLabels } from '@/hooks/useComplianceLabels';
import {
  ComplianceLabel,
  COMPLIANCE_FRAMEWORKS,
  DATA_CLASSIFICATION_CONFIG,
  SENSITIVITY_LEVEL_CONFIG
} from '@/types/compliance';

interface ApplyComplianceLabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName?: string;
  onApply?: (labelId: string) => void;
}

export const ApplyComplianceLabelDialog: React.FC<ApplyComplianceLabelDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentName,
  onApply
}) => {
  const { labels, applyLabel, isLoading } = useComplianceLabels();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<ComplianceLabel | null>(null);
  const [justification, setJustification] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const filteredLabels = labels.filter(label =>
    label.is_active &&
    (label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      COMPLIANCE_FRAMEWORKS[label.framework].name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSelectLabel = (label: ComplianceLabel) => {
    setSelectedLabel(label);
    setStep('confirm');
  };

  const handleApply = async () => {
    if (selectedLabel) {
      await applyLabel(documentId, selectedLabel.id, justification);
      onApply?.(selectedLabel.id);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedLabel(null);
    setJustification('');
    setAcknowledged(false);
    setStep('select');
    setSearchQuery('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Apply Compliance Label
          </DialogTitle>
          <DialogDescription>
            {documentName ? (
              <>Apply a compliance label to "{documentName}"</>
            ) : (
              'Select a compliance label to apply to this document'
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredLabels.map((label) => {
                  const frameworkConfig = COMPLIANCE_FRAMEWORKS[label.framework];
                  const classificationConfig = DATA_CLASSIFICATION_CONFIG[label.data_classification];
                  const sensitivityConfig = SENSITIVITY_LEVEL_CONFIG[label.sensitivity_level];

                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => handleSelectLabel(label)}
                      className="w-full p-4 rounded-lg border text-left hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: label.color }}
                        >
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{label.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {label.code}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                            {label.description}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge className={frameworkConfig.color + ' text-white text-xs'}>
                              {frameworkConfig.name}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${classificationConfig.color}`}>
                              {classificationConfig.label}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${sensitivityConfig.color}`}>
                              {sensitivityConfig.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {filteredLabels.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Shield className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No labels found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : selectedLabel && (
          <div className="space-y-4">
            {/* Selected Label Summary */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: selectedLabel.color }}
                >
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold">{selectedLabel.name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedLabel.code}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge className={COMPLIANCE_FRAMEWORKS[selectedLabel.framework].color + ' text-white'}>
                  {COMPLIANCE_FRAMEWORKS[selectedLabel.framework].name}
                </Badge>
                <Badge variant="outline">
                  {DATA_CLASSIFICATION_CONFIG[selectedLabel.data_classification].label}
                </Badge>
              </div>

              {/* Requirements Warning */}
              <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                  <div className="text-yellow-800">
                    <p className="font-medium mb-1">This label enforces:</p>
                    <ul className="text-xs space-y-0.5">
                      {selectedLabel.encryption_required && <li>• Encryption required</li>}
                      {selectedLabel.access_logging_required && <li>• All access will be logged</li>}
                      {selectedLabel.download_restricted && <li>• Downloads are restricted</li>}
                      {selectedLabel.sharing_restricted && <li>• Sharing is restricted</li>}
                      {selectedLabel.deletion_requires_approval && <li>• Deletion requires approval</li>}
                      {selectedLabel.retention_required && (
                        <li>• Retention period: {Math.round(selectedLabel.retention_period_days! / 365)} years</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Justification */}
            <div>
              <label className="text-sm font-medium">Justification (optional)</label>
              <Textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Why is this label being applied..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Acknowledgment */}
            {selectedLabel.requires_acknowledgment && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
                  />
                  <label htmlFor="acknowledge" className="text-sm leading-relaxed cursor-pointer">
                    {selectedLabel.acknowledgment_text ||
                      'I acknowledge that I understand the compliance requirements associated with this label.'}
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'select' ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button
                onClick={handleApply}
                disabled={isLoading || (selectedLabel?.requires_acknowledgment && !acknowledged)}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Label
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

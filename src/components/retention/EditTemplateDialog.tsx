import React, { useState, useEffect } from 'react';
import { Shield, Clock, Save, Plus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  COMPLIANCE_FRAMEWORKS,
  DISPOSITION_ACTIONS,
  TRIGGER_TYPES,
  type RetentionPolicyTemplate,
  type DispositionAction,
  type TriggerType,
  type ComplianceFramework,
} from '@/types/retention';
import { cn } from '@/lib/utils';

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: RetentionPolicyTemplate | null;
  onSuccess: () => void;
}

export const EditTemplateDialog: React.FC<EditTemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [retentionUnit, setRetentionUnit] = useState<'days' | 'months' | 'years'>('years');
  const [dispositionAction, setDispositionAction] = useState<DispositionAction>('review');
  const [triggerType, setTriggerType] = useState<TriggerType>('creation_date');
  const [complianceFramework, setComplianceFramework] = useState<ComplianceFramework | ''>('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [notificationDays, setNotificationDays] = useState(30);

  // Load template data when dialog opens
  useEffect(() => {
    if (template && open) {
      setName(template.name);
      setDescription(template.description || '');
      
      // Convert days to appropriate unit
      const days = template.retention_period_days;
      if (days % 365 === 0) {
        setRetentionUnit('years');
        setRetentionDays(days / 365);
      } else if (days % 30 === 0) {
        setRetentionUnit('months');
        setRetentionDays(days / 30);
      } else {
        setRetentionUnit('days');
        setRetentionDays(days);
      }

      setDispositionAction(template.disposition_action);
      setTriggerType(template.trigger_type);
      setComplianceFramework(template.compliance_framework || '');
      setRequiresApproval(template.requires_approval || false);
      setNotificationDays(template.notification_days_before || 30);
    }
  }, [template, open]);

  const getRetentionInDays = () => {
    switch (retentionUnit) {
      case 'years': return retentionDays * 365;
      case 'months': return retentionDays * 30;
      default: return retentionDays;
    }
  };

  const handleSubmit = async () => {
    if (!template) return;

    setIsSubmitting(true);
    try {
      console.log('Updating template:', template.id);
      console.log('Update data:', {
        name,
        description,
        retention_period_days: getRetentionInDays(),
        disposition_action: dispositionAction,
        trigger_type: triggerType,
        compliance_framework: complianceFramework || null,
        requires_approval: requiresApproval,
      });

      const { data, error } = await supabase
        .from('retention_policy_templates')
        .update({
          name,
          description,
          retention_period_days: getRetentionInDays(),
          disposition_action: dispositionAction,
          trigger_type: triggerType,
          compliance_framework: complianceFramework || null,
          requires_approval: requiresApproval,
        })
        .eq('id', template.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      toast({ title: 'Success', description: 'Template updated successfully' });
      onSuccess();
      setShowCreatePolicy(true);
    } catch (error) {
      console.error('Failed to update template:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update template', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Edit Template: {template.name}
          </DialogTitle>
          <DialogDescription>
            Modify the retention policy template settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Basic Information
            </h3>
            
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateDesc">Description</Label>
                <Textarea
                  id="templateDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Compliance Framework</Label>
                <Select 
                  value={complianceFramework} 
                  onValueChange={(v) => setComplianceFramework(v as ComplianceFramework)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPLIANCE_FRAMEWORKS.map((fw) => (
                      <SelectItem key={fw.value} value={fw.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{fw.label}</span>
                          <span className="text-xs text-muted-foreground">{fw.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Retention Period */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Retention Period
            </h3>
            
            <div className="p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm">Retain for</span>
                  <Input
                    type="number"
                    min={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value) || 1)}
                    className="w-20 h-8"
                  />
                  <Select 
                    value={retentionUnit} 
                    onValueChange={(v) => setRetentionUnit(v as typeof retentionUnit)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                      <SelectItem value="years">Years</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    = {getRetentionInDays().toLocaleString()} days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Trigger & Action
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Retention Starts From</Label>
                <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>When Expired</Label>
                <Select 
                  value={dispositionAction} 
                  onValueChange={(v) => setDispositionAction(v as DispositionAction)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPOSITION_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Settings
            </h3>
            
            <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
              <div className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2 transition-colors",
                requiresApproval 
                  ? "bg-primary/10 border-primary/30" 
                  : "bg-muted/30 border-muted"
              )}>
                <div className="space-y-1 flex-1">
                  <Label className="font-medium flex items-center gap-2">
                    Require Approval
                    <Badge 
                      variant={requiresApproval ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {requiresApproval ? "ON" : "OFF"}
                    </Badge>
                  </Label>
                  <p className={cn(
                    "text-xs",
                    requiresApproval ? "text-primary font-medium" : "text-muted-foreground"
                  )}>
                    {requiresApproval 
                      ? "✓ Disposition will require manual approval"
                      : "⚠ Disposition will execute automatically"
                    }
                  </p>
                </div>
                <Switch 
                  checked={requiresApproval} 
                  onCheckedChange={setRequiresApproval}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="font-medium">Notification Before Expiry</Label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">Send alert</span>
                  <Input
                    type="number"
                    min={0}
                    value={notificationDays}
                    onChange={(e) => setNotificationDays(parseInt(e.target.value) || 0)}
                    className="w-20 h-8"
                  />
                  <span className="text-sm text-muted-foreground">days before expiry</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          {showCreatePolicy ? (
            <>
              <Button variant="outline" onClick={() => { setShowCreatePolicy(false); onOpenChange(false); }}>
                Close
              </Button>
              <Button onClick={() => {
                setShowCreatePolicy(false);
                onOpenChange(false);
                // Navigate to create policy with template pre-selected
                window.location.hash = '#retention?action=create-policy&templateId=' + template?.id;
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Policy from Template
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !name}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

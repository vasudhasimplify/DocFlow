import React, { useState, useEffect } from 'react';
import { Scale, User, Mail, FileText, AlertTriangle, CalendarIcon, Info } from 'lucide-react';
import { format } from 'date-fns';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { cn } from '@/lib/utils';
import type { LegalHold } from '@/types/retention';

interface CreateLegalHoldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: LegalHold;
}

export const CreateLegalHoldDialog: React.FC<CreateLegalHoldDialogProps> = ({
  open,
  onOpenChange,
  initialData,
}) => {
  const { createLegalHold, updateLegalHold } = useRetentionPolicies();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!initialData;

  // Form state
  const [name, setName] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [matterId, setMatterId] = useState('');
  const [custodianName, setCustodianName] = useState('');
  const [custodianEmail, setCustodianEmail] = useState('');
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (initialData && open) {
      setName(initialData.name);
      setHoldReason(initialData.hold_reason);
      setMatterId(initialData.matter_id || '');
      setCustodianName(initialData.custodian_name || '');
      setCustodianEmail(initialData.custodian_email || '');
      setEndDate(initialData.end_date ? new Date(initialData.end_date) : undefined);
      setNotes(initialData.notes || '');
    } else if (!open) {
      resetForm();
    }
  }, [initialData, open]);

  const handleSubmit = async () => {
    if (!name || !holdReason) return;

    setIsSubmitting(true);
    try {
      if (isEditing && initialData) {
        // Update existing hold
        await updateLegalHold(initialData.id, {
          name,
          hold_reason: holdReason,
          matter_id: matterId || undefined,
          custodian_name: custodianName || undefined,
          custodian_email: custodianEmail || undefined,
          end_date: endDate ? endDate.toISOString() : undefined,
          notes: notes || undefined,
        });
      } else {
        // Create new hold
        await createLegalHold({
          name,
          hold_reason: holdReason,
          matter_id: matterId || undefined,
          custodian_name: custodianName || undefined,
          custodian_email: custodianEmail || undefined,
          start_date: new Date().toISOString(),
          end_date: endDate ? endDate.toISOString() : undefined,
          status: 'active',
          document_ids: [],
          folder_ids: [],
          notes: notes || undefined,
          metadata: {},
        });
      }
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save legal hold:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setHoldReason('');
    setMatterId('');
    setCustodianName('');
    setCustodianEmail('');
    setEndDate(undefined);
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-500" />
            {isEditing ? 'Edit Legal Hold' : 'Create Legal Hold'}
          </DialogTitle>
          <DialogDescription>
            Protect documents from disposition during litigation or investigation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert className="bg-purple-500/10 border-purple-500/30">
            <AlertTriangle className="h-4 w-4 text-purple-500" />
            <AlertDescription className="text-sm">
              Documents under legal hold will be protected from all retention policy actions until the hold is released.
            </AlertDescription>
          </Alert>

          {/* Hold Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Info className="h-4 w-4" />
              Hold Information
            </h3>
            
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="holdName">Hold Name *</Label>
                <Input
                  id="holdName"
                  placeholder="e.g., Smith v. Company Litigation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="holdReason">Reason for Hold *</Label>
                <Textarea
                  id="holdReason"
                  placeholder="Describe the legal matter or investigation requiring this hold..."
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Case Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Case Details
            </h3>
            
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="matterId" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Matter/Case ID
                </Label>
                <Input
                  id="matterId"
                  placeholder="CASE-2025-001"
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Expected End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Custodian Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" />
              Custodian Information
              <span className="text-xs font-normal normal-case">(optional)</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="custodianName" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Custodian Name
                </Label>
                <Input
                  id="custodianName"
                  placeholder="Legal counsel name"
                  value={custodianName}
                  onChange={(e) => setCustodianName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custodianEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Custodian Email
                </Label>
                <Input
                  id="custodianEmail"
                  type="email"
                  placeholder="counsel@firm.com"
                  value={custodianEmail}
                  onChange={(e) => setCustodianEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Additional Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any additional information about this hold..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !name || !holdReason}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Scale className="h-4 w-4 mr-2" />
            Create Legal Hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

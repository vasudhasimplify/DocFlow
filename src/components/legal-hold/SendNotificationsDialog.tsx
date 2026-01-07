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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Send, AlertTriangle } from 'lucide-react';
import type { EnhancedLegalHold } from '@/types/legalHold';

interface SendNotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hold: EnhancedLegalHold;
  onSend: (custodianIds: string[], message: string) => Promise<void>;
}

export const SendNotificationsDialog: React.FC<SendNotificationsDialogProps> = ({
  open,
  onOpenChange,
  hold,
  onSend
}) => {
  const [message, setMessage] = useState(`You are receiving this notification regarding Legal Hold: ${hold.name}\n\nMatter: ${hold.matter_name}\nMatter ID: ${hold.matter_id}\n\nPlease review the attached documents and acknowledge receipt of this legal hold notice.`);
  const [selectedCustodians, setSelectedCustodians] = useState<string[]>(
    hold.custodians.map(c => c.id)
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (selectedCustodians.length === 0) return;
    
    setSending(true);
    try {
      await onSend(selectedCustodians, message);
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const toggleCustodian = (custodianId: string) => {
    setSelectedCustodians(prev => 
      prev.includes(custodianId)
        ? prev.filter(id => id !== custodianId)
        : [...prev, custodianId]
    );
  };

  const selectAll = () => {
    setSelectedCustodians(hold.custodians.map(c => c.id));
  };

  const deselectAll = () => {
    setSelectedCustodians([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            Send Notifications
          </DialogTitle>
          <DialogDescription>
            Send legal hold notifications to selected custodians for "{hold.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Notifications will be sent via email to the selected custodians.
              They will receive instructions to acknowledge the legal hold.
            </AlertDescription>
          </Alert>

          {/* Custodian Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Custodians ({selectedCustodians.length} selected)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAll}
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                >
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
              {hold.custodians.map((custodian) => (
                <div
                  key={custodian.id}
                  className="flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                >
                  <Checkbox
                    id={custodian.id}
                    checked={selectedCustodians.includes(custodian.id)}
                    onCheckedChange={() => toggleCustodian(custodian.id)}
                  />
                  <label
                    htmlFor={custodian.id}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{custodian.name}</div>
                    <div className="text-sm text-muted-foreground">{custodian.email}</div>
                    {custodian.status === 'acknowledged' && (
                      <div className="text-xs text-green-600">Already acknowledged</div>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Notification Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Enter notification message..."
            />
            <p className="text-xs text-muted-foreground">
              This message will be included in the email notification sent to custodians.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={selectedCustodians.length === 0 || sending}
          >
            <Send className="w-4 h-4 mr-2" />
            {sending ? 'Sending...' : `Send to ${selectedCustodians.length} Custodian${selectedCustodians.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Lock, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CheckOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
  onCheckOutComplete?: () => void;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes', description: 'Quick edit' },
  { value: '60', label: '1 hour', description: 'Standard edit' },
  { value: '120', label: '2 hours', description: 'Extended edit' },
  { value: '480', label: '8 hours', description: 'Full day' },
  { value: '0', label: 'No expiration', description: 'Until manually checked in' },
];

export const CheckOutDialog: React.FC<CheckOutDialogProps> = ({
  open,
  onOpenChange,
  documentId,
  documentName,
  onCheckOutComplete
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState('60');
  const [reason, setReason] = useState('');

  const handleCheckOut = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if document is already locked and not expired
      const { data: existingLock } = await supabase
        .from('document_locks')
        .select('*')
        .eq('document_id', documentId)
        .eq('is_active', true)
        .maybeSingle();

      if (existingLock) {
        // Check if lock is actually expired
        const isExpired = existingLock.expires_at && new Date(existingLock.expires_at) < new Date();
        
        if (isExpired) {
          // Lock is expired, mark it as inactive and allow new checkout
          await supabase
            .from('document_locks')
            .update({ is_active: false })
            .eq('id', existingLock.id);
          // Continue with creating new lock
        } else {
          // Lock is still active
          const isLockedByCurrentUser = existingLock.locked_by === user.id;
          
          toast({
            title: isLockedByCurrentUser ? 'Already Checked Out' : 'Document Locked',
            description: isLockedByCurrentUser 
              ? 'You have already checked out this document. Go to Check In/Out tab to manage it.'
              : 'This document is currently checked out by another user.',
            variant: 'destructive'
          });
          
          // Close the dialog
          onOpenChange(false);
          return;
        }
      }

      // Calculate expiration
      let expiresAt: string | null = null;
      if (duration !== '0') {
        const expirationDate = new Date();
        expirationDate.setMinutes(expirationDate.getMinutes() + parseInt(duration));
        expiresAt = expirationDate.toISOString();
      }

      // Create lock
      const lockData: any = {
        document_id: documentId,
        locked_by: user.id,
        is_active: true
      };
      
      if (reason && reason.trim()) {
        lockData.lock_reason = reason.trim();
      }
      
      if (expiresAt) {
        lockData.expires_at = expiresAt;
      }

      const { error } = await supabase
        .from('document_locks')
        .insert(lockData);

      if (error) throw error;

      toast({
        title: 'Document Checked Out',
        description: `You now have exclusive edit access${expiresAt ? ` for ${duration} minutes` : ''}.`
      });

      onCheckOutComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Check-out error:', error);
      toast({
        title: 'Check-out Failed',
        description: error instanceof Error ? error.message : 'Failed to check out document',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Check Out Document
          </DialogTitle>
          <DialogDescription>
            Checking out "{documentName}" will give you exclusive edit access.
            Other users will only be able to view the document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lock Duration
            </Label>
            <RadioGroup value={duration} onValueChange={setDuration}>
              {DURATION_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={option.value} id={`duration-${option.value}`} />
                  <Label 
                    htmlFor={`duration-${option.value}`} 
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      - {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Updating financial data, Making revisions..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This will be visible to other users who try to access the document.
            </p>
          </div>

          {/* Warning for no expiration */}
          {duration === '0' && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600">No Expiration Selected</p>
                <p className="text-muted-foreground">
                  The document will remain locked until you manually check it in.
                  Remember to check in when you're done editing.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCheckOut} disabled={isLoading}>
            {isLoading ? 'Checking Out...' : 'Check Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckOutDialog;

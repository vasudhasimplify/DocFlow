import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserMinus, AlertTriangle, Loader2, Send } from 'lucide-react';
import { useOwnershipTransfer } from '@/hooks/useOwnershipTransfer';

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentName: string;
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
}: TransferOwnershipDialogProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { initiateTransfer } = useOwnershipTransfer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    // Show confirmation dialog instead of submitting immediately
    setShowConfirmation(true);
  };

  const handleConfirmedTransfer = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    try {
      const result = await initiateTransfer(documentId, email.trim(), message.trim() || undefined);
      if (result) {
        setEmail('');
        setMessage('');
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-primary" />
              Transfer Ownership
            </DialogTitle>
            <DialogDescription>
              Transfer ownership of "{documentName}" to another user. They will receive full control of this document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Warning:</strong> Transferring ownership will give the recipient full control of this document. 
                  You will lose all access including view permission. This action requires the recipient's acceptance.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="email">Recipient Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter the new owner's email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The recipient will receive an email notification and must accept the transfer.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a message to the recipient..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!email.trim() || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Transfer Request
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Ownership Transfer
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to transfer ownership of <strong>"{documentName}"</strong> to <strong>{email}</strong>?
              </p>
              <p className="text-amber-600 font-medium">
                ⚠️ After the transfer is accepted, you will lose ALL access to this document, including view permission.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmedTransfer}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Yes, Transfer Ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

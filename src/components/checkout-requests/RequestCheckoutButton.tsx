import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Lock, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

interface RequestCheckoutButtonProps {
  documentId: string;
  documentName: string;
  shareId?: string;
  shareLinkId?: string;
  userEmail: string;
  userName?: string;
  onRequestSent?: () => void;
}

export function RequestCheckoutButton({
  documentId,
  documentName,
  shareId,
  shareLinkId,
  userEmail,
  userName,
  onRequestSent
}: RequestCheckoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // If userEmail looks like an anonymous guest ID, prompt for real email
  const isAnonymous = userEmail.includes('@anonymous.local');
  const [email, setEmail] = useState(isAnonymous ? '' : userEmail);
  const [name, setName] = useState(userName || '');

  const handleRequestCheckout = async () => {
    // Validate email and name if anonymous
    if (isAnonymous) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error('Please provide a valid email address');
        return;
      }
      if (!name || name.trim().length === 0) {
        toast.error('Please provide your name');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/checkout-requests/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: documentId,
          requester_email: email,
          requester_name: name || email.split('@')[0],
          share_id: shareId,
          share_link_id: shareLinkId,
          request_message: message.trim() || undefined
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to send request');
      }

      toast.success('Edit request sent!', {
        description: 'The document owner will be notified of your request.'
      });
      
      setIsOpen(false);
      setMessage('');
      if (isAnonymous) {
        setEmail('');
        setName('');
      }
      onRequestSent?.();
    } catch (error: any) {
      toast.error('Failed to send request', {
        description: error.message
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="default" 
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Lock className="h-4 w-4" />
        Request Edit Access
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Request Edit Access
            </DialogTitle>
            <DialogDescription className="break-words">
              Request permission to edit <strong className="break-all">"{documentName}"</strong>. The owner will be notified via email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isAnonymous && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required to receive the approval notification
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="message">Message to Owner (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Explain why you need edit access..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Help the owner understand why you need to edit this document.
              </p>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 You'll receive an email notification when your request is approved or rejected.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRequestCheckout} 
              disabled={isLoading || (isAnonymous && (!email || !name))}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

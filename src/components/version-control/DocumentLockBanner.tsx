import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Lock, Unlock, Clock, AlertTriangle, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useLockNotifications } from '@/hooks/useLockNotifications';
import type { DocumentLock, LockNotification } from '@/types/versionControl';

interface DocumentLockBannerProps {
  lock: DocumentLock | null;
  isLockedByCurrentUser: boolean;
  canEdit: boolean;
  notifications: LockNotification[];
  onLock: () => void;
  onUnlock: () => void;
  onDismissNotification: (id: string) => void;
  isLoading?: boolean;
  documentId: string;
}

export function DocumentLockBanner({
  lock,
  isLockedByCurrentUser,
  canEdit,
  notifications,
  onLock,
  onUnlock,
  onDismissNotification,
  isLoading,
  documentId,
}: DocumentLockBannerProps) {
  const { requestAccess } = useLockNotifications();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const isLocked = !!lock?.is_active;
  const expiresAt = lock?.expires_at ? new Date(lock.expires_at) : null;
  const isExpiringSoon = expiresAt && (expiresAt.getTime() - Date.now()) < 10 * 60 * 1000; // 10 minutes

  // Show notifications
  const activeNotifications = notifications.filter(n => !n.is_read);

  if (!isLocked && activeNotifications.length === 0 && canEdit) {
    // Show lock button when document is available
    return (
      <div className="flex items-center justify-between p-3 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Unlock className="h-4 w-4" />
          <span>Document is available for editing</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onLock}
                disabled={isLoading}
              >
                <Lock className="h-4 w-4 mr-2" />
                Lock for Editing
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Lock this document to prevent others from editing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (isLocked && isLockedByCurrentUser) {
    // Locked by current user
    return (
      <div className="border-b border-border">
        <div className={cn(
          'flex items-center justify-between p-3',
          isExpiringSoon ? 'bg-amber-500/10' : 'bg-primary/10'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              isExpiringSoon ? 'bg-amber-500/20' : 'bg-primary/20'
            )}>
              <Lock className={cn(
                'h-4 w-4',
                isExpiringSoon ? 'text-amber-500' : 'text-primary'
              )} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                You're editing this document
              </p>
              {expiresAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {isExpiringSoon ? (
                    <span className="text-amber-500">
                      Lock {expiresAt.getTime() > Date.now() ? 'expires' : 'expired'} {formatDistanceToNow(expiresAt, { addSuffix: true })}
                    </span>
                  ) : (
                    <span>
                      Lock {expiresAt.getTime() > Date.now() ? 'expires' : 'expired'} at {format(expiresAt, 'HH:mm')}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpiringSoon && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLock}
                disabled={isLoading}
              >
                Extend Lock
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnlock}
              disabled={isLoading}
            >
              <Unlock className="h-4 w-4 mr-2" />
              Release Lock
            </Button>
          </div>
        </div>

        {/* Notifications for the lock owner */}
        {activeNotifications.length > 0 && (
          <div className="p-3 bg-muted/30 space-y-2">
            {activeNotifications.map(notification => (
              <Alert key={notification.id} variant="default" className="py-2">
                <Bell className="h-4 w-4" />
                <AlertTitle className="text-sm">Edit Request</AlertTitle>
                <AlertDescription className="text-xs flex items-center justify-between">
                  <span>{notification.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6"
                    onClick={() => onDismissNotification(notification.id)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLocked && !isLockedByCurrentUser) {
    // Locked by another user
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          Document Locked
          <Badge variant="outline" className="ml-2 text-xs">
            Read Only
          </Badge>
        </AlertTitle>
        <AlertDescription>
          <div className="flex items-center justify-between mt-2">
            <div className="space-y-1">
              {lock?.locker_email && (
                <p className="text-sm flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Locked by {lock.locker_email}
                </p>
              )}
              {lock?.lock_reason && (
                <p className="text-xs text-muted-foreground">
                  Reason: {lock.lock_reason}
                </p>
              )}
              {expiresAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {expiresAt.getTime() > Date.now() ? 'Available' : 'Was locked until'} {formatDistanceToNow(expiresAt, { addSuffix: true })}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRequestDialog(true)}
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              Request Access
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const handleRequestAccess = async () => {
    const success = await requestAccess(documentId, requestMessage || undefined);
    if (success) {
      setShowRequestDialog(false);
      setRequestMessage('');
    }
  };

  return (
    <>
      {/* Request Access Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document Access</DialogTitle>
            <DialogDescription>
              Send a request to the document owner to release the lock
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (Optional)</label>
              <Textarea
                placeholder="Explain why you need access..."
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestAccess}>
              <Bell className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

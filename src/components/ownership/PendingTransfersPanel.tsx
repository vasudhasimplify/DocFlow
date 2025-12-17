import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  UserCheck,
  UserX,
  Clock,
  FileText,
  Mail,
  Check,
  X,
  Inbox,
} from 'lucide-react';
import { useOwnershipTransfer, OwnershipTransfer } from '@/hooks/useOwnershipTransfer';
import { formatDistanceToNow } from 'date-fns';

export function PendingTransfersPanel() {
  const {
    pendingIncoming,
    pendingOutgoing,
    transfers,
    isLoading,
    acceptTransfer,
    rejectTransfer,
    cancelTransfer,
  } = useOwnershipTransfer();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: OwnershipTransfer['status']) => {
    const variants: Record<typeof status, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'outline', icon: <Clock className="h-3 w-3 mr-1" /> },
      accepted: { variant: 'default', icon: <Check className="h-3 w-3 mr-1" /> },
      rejected: { variant: 'destructive', icon: <X className="h-3 w-3 mr-1" /> },
      cancelled: { variant: 'secondary', icon: <X className="h-3 w-3 mr-1" /> },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Pending Outgoing Transfers */}
      {pendingOutgoing.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-600" />
              Pending Outgoing Transfers
              <Badge variant="secondary">{pendingOutgoing.length}</Badge>
            </CardTitle>
            <CardDescription>
              Transfers you initiated waiting for acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {pendingOutgoing.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{transfer.document?.file_name || 'Document Transfer'}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>To: {transfer.to_user_email}</span>
                          </div>
                          {transfer.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              "{transfer.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => cancelTransfer(transfer.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel Transfer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Pending Incoming Transfers */}
      {pendingIncoming.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-primary" />
              Pending Transfers
              <Badge variant="secondary">{pendingIncoming.length}</Badge>
            </CardTitle>
            <CardDescription>
              Documents waiting for your acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {pendingIncoming.map((transfer) => (
                  <div
                    key={transfer.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{transfer.document?.file_name || 'Document Transfer'}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>From: {transfer.from_user_email || 'Unknown User'}</span>
                          </div>
                          {transfer.message && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              "{transfer.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => acceptTransfer(transfer.id)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => rejectTransfer(transfer.id)}
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Transfer History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No ownership transfers yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {transfers.slice(0, 10).map((transfer) => (
                  <div
                    key={transfer.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {transfer.document?.file_name || 'Document'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          To: {transfer.to_user_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(transfer.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getStatusBadge(transfer.status)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

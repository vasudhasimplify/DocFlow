import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Clock, Mail, FileText, Loader2, AlertCircle, CheckCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface CheckoutRequest {
  id: string;
  document_id: string;
  document_name: string;
  requester_email: string;
  requester_name: string;
  request_message: string;
  requested_at: string;
  status: string;
}

interface PendingRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingRequestsDialog({ open, onOpenChange }: PendingRequestsDialogProps) {
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CheckoutRequest | null>(null);
  const [duration, setDuration] = useState<number>(1); // Default 1 hour
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[PendingRequests] No user found');
        return;
      }

      console.log('[PendingRequests] Fetching for user:', user.id);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = `${API_BASE_URL}/api/v1/checkout-requests/pending`;
      console.log('[PendingRequests] Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[PendingRequests] Received data:', data);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[PendingRequests] Error fetching requests:', error);
      toast.error('Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, requesterName: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/checkout-requests/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          request_id: requestId,
          duration_hours: duration
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to approve request');
      }
      
      toast.success(`Request approved for ${requesterName}`);
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, requesterName: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/api/v1/checkout-requests/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          request_id: requestId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to reject request');
      }
      
      toast.success(`Request rejected for ${requesterName}`);
      await fetchRequests();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const openApprovalDialog = (request: CheckoutRequest) => {
    setSelectedRequest(request);
    setDuration(1);
    setShowApprovalDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              Pending Checkout Requests
            </DialogTitle>
            <DialogDescription className="text-base">
              Review and manage checkout requests from team members for your documents
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[550px] pr-4 mt-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                <p className="text-sm text-muted-foreground">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-16">
                <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xl font-semibold mb-2">All Clear!</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You don't have any pending checkout requests at the moment. 
                  Requests will appear here when team members need access to your documents.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <Card key={request.id} className="border-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          {/* Document Info */}
                          <div className="flex items-start gap-3">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-base mb-1 line-clamp-1">
                                {request.document_name}
                              </h3>
                              <Badge variant="secondary" className="text-xs">
                                Checkout Request
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Requester Info */}
                          <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg">
                            <div className="p-1.5 bg-white dark:bg-gray-800 rounded-full">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{request.requester_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{request.requester_email}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0">
                              Guest User
                            </Badge>
                          </div>
                          
                          {/* Request Message */}
                          {request.request_message && (
                            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                              <div className="flex items-start gap-2">
                                <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-1">Request Message:</p>
                                  <p className="text-sm text-amber-800 dark:text-amber-200">{request.request_message}</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Timestamp */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>Requested {format(new Date(request.requested_at), 'PPp')}</span>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="default"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openApprovalDialog(request)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </>
                            )}
                          </Button>
                          
                          <Button
                            size="default"
                            variant="destructive"
                            onClick={() => handleReject(request.id, request.requester_name)}
                            disabled={processingId === request.id}
                          >
                            {processingId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Approval Duration Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              Approve Checkout Request
            </DialogTitle>
            <DialogDescription className="pt-2">
              Set how long <span className="font-semibold text-foreground">{selectedRequest?.requester_name}</span> can 
              edit <span className="font-semibold text-foreground">{selectedRequest?.document_name}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">Checkout Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>1 Hour</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>2 Hours</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>4 Hours</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="8">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>8 Hours (1 Day)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="24">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>24 Hours</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="48">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>48 Hours (2 Days)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="72">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>72 Hours (3 Days)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="168">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>1 Week</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The document will be automatically released after this period
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedRequest && handleApprove(selectedRequest.id, selectedRequest.requester_name)}
              disabled={processingId === selectedRequest?.id}
            >
              {processingId === selectedRequest?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Approve Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

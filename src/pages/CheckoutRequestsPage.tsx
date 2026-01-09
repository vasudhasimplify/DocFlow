import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Clock, Mail, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

export function CheckoutRequestsPage() {
  const [requests, setRequests] = useState<CheckoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`http://localhost:8000/api/v1/checkout-requests/pending?user_id=${user.id}`);
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, requesterName: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('http://localhost:8000/api/v1/checkout-requests/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          request_id: requestId,
          duration_hours: 24
        })
      });

      if (!response.ok) throw new Error('Failed to approve request');

      toast.success('Request approved!', {
        description: `${requesterName} has been granted 24-hour edit access.`
      });
      
      fetchRequests();
    } catch (error) {
      toast.error('Failed to approve request');
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string, requesterName: string) => {
    setProcessingId(requestId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`http://localhost:8000/api/v1/checkout-requests/reject`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          request_id: requestId
        })
      });

      if (!response.ok) throw new Error('Failed to reject request');

      toast.success('Request rejected', {
        description: `${requesterName}'s request has been declined.`
      });
      
      fetchRequests();
    } catch (error) {
      toast.error('Failed to reject request');
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Checkout Requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage edit access requests from users who have view-only access to your documents.
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No pending requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              When users request edit access, they'll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req.id} className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg">{req.document_name}</CardTitle>
                    </div>
                    <CardDescription className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {req.requester_name || req.requester_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(req.requested_at)}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{req.status}</Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-4">
                {req.request_message && (
                  <Alert className="mb-4">
                    <AlertDescription className="text-sm">
                      "{req.request_message}"
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleApprove(req.id, req.requester_name || req.requester_email)}
                    disabled={processingId === req.id}
                    className="gap-2"
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Approve (24h access)
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleReject(req.id, req.requester_name || req.requester_email)}
                    disabled={processingId === req.id}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground mt-3">
                  Approving will grant {req.requester_name || req.requester_email} the ability to edit this document for 24 hours.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

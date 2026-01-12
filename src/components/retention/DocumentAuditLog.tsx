import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Upload,
  Download,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Share2,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Shield,
  Archive,
  RefreshCw,
  FileCheck,
  FileX,
  Calendar,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditEvent {
  id: string;
  document_id: string;
  user_id: string;
  action: string;
  action_category: string;
  resource_type: string;
  resource_name: string | null;
  details: any;
  metadata: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    email: string;
  };
}

interface DispositionAudit {
  id: string;
  document_id: string;
  action: string;
  action_by: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  certificate_number: string | null;
  created_at: string;
  user?: {
    email: string;
  };
}

interface DocumentAuditLogProps {
  documentId: string;
}

const actionIcons: Record<string, any> = {
  upload: Upload,
  download: Download,
  view: Eye,
  edit: Edit,
  delete: Trash2,
  lock: Lock,
  unlock: Unlock,
  share: Share2,
  checkout: Lock,
  checkin: Unlock,
  disposed: Trash2,
  archived: Archive,
  transferred: RefreshCw,
  extended: Calendar,
  held: Shield,
  released: CheckCircle,
  exception_granted: AlertCircle,
  approved: CheckCircle,
  rejected: FileX,
  review: FileCheck,
};

const actionColors: Record<string, string> = {
  upload: 'bg-blue-100 text-blue-800',
  download: 'bg-green-100 text-green-800',
  view: 'bg-gray-100 text-gray-800',
  edit: 'bg-purple-100 text-purple-800',
  delete: 'bg-red-100 text-red-800',
  lock: 'bg-orange-100 text-orange-800',
  unlock: 'bg-emerald-100 text-emerald-800',
  share: 'bg-cyan-100 text-cyan-800',
  checkout: 'bg-orange-100 text-orange-800',
  checkin: 'bg-emerald-100 text-emerald-800',
  disposed: 'bg-red-100 text-red-800',
  archived: 'bg-amber-100 text-amber-800',
  transferred: 'bg-indigo-100 text-indigo-800',
  extended: 'bg-blue-100 text-blue-800',
  held: 'bg-yellow-100 text-yellow-800',
  released: 'bg-green-100 text-green-800',
  exception_granted: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  review: 'bg-blue-100 text-blue-800',
};

// Format audit details for user-friendly display
const formatDetailsForUser = (details: any, action: string): React.ReactNode => {
  if (!details || typeof details !== 'object') return null;
  
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  
  const friendlyLabels: Record<string, string> = {
    shared_with: 'Shared with',
    permission_level: 'Permission',
    notes: 'Notes',
    ai_model: 'AI Model',
    processing_time_ms: 'Processing time',
    file_size: 'File size',
    file_type: 'File type',
    folder: 'Folder',
    version: 'Version',
    reason: 'Reason',
    previous_status: 'Previous status',
    new_status: 'New status',
    retention_days: 'Retention period',
    policy_name: 'Policy',
    workflow_id: 'Workflow',
    workflow_name: 'Workflow name',
    step_name: 'Step',
    assignee: 'Assigned to',
    comment: 'Comment',
    lock_type: 'Lock type',
    expires_at: 'Expires',
    action_by: 'Action by',
    source: 'Source',
    destination: 'Destination',
  };
  
  return (
    <div className="space-y-1">
      {Object.entries(details).map(([key, value]) => {
        // Skip internal or technical fields
        if (key.startsWith('_') || key === 'id' || key === 'user_id' || key === 'document_id') {
          return null;
        }
        
        const label = friendlyLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let displayValue = formatValue(key, value);
        
        // Format specific values
        if (key === 'processing_time_ms' && typeof value === 'number') {
          displayValue = `${(value / 1000).toFixed(2)}s`;
        }
        if (key === 'file_size' && typeof value === 'number') {
          displayValue = value > 1024 * 1024 
            ? `${(value / (1024 * 1024)).toFixed(2)} MB`
            : `${(value / 1024).toFixed(2)} KB`;
        }
        if (key.includes('date') || key.includes('_at') || key === 'expires_at') {
          try {
            displayValue = new Date(value as string).toLocaleString();
          } catch (e) { /* keep original */ }
        }
        
        return (
          <div key={key} className="flex items-start gap-2">
            <span className="text-muted-foreground font-medium min-w-[100px]">{label}:</span>
            <span className="text-foreground">{displayValue}</span>
          </div>
        );
      })}
    </div>
  );
};

export function DocumentAuditLog({ documentId }: DocumentAuditLogProps) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [dispositionAudits, setDispositionAudits] = useState<DispositionAudit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, [documentId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // Fetch general audit events (if table exists)
      try {
        const { data: events, error: eventsError } = await supabase
          .from('audit_events')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false });

        if (!eventsError) {
          setAuditEvents(events || []);
        }
      } catch (err) {
        console.log('audit_events table not available:', err);
      }

      // Fetch disposition audit logs (retention-specific, if table exists)
      try {
        const { data: dispositions, error: dispositionError } = await supabase
          .from('disposition_audit_log')
          .select('*')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false });

        if (!dispositionError) {
          setDispositionAudits(dispositions || []);
        }
      } catch (err) {
        console.log('disposition_audit_log table not available:', err);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Combine and sort all events
  const allEvents = [
    ...auditEvents.map(e => ({
      ...e,
      type: 'audit_event',
      timestamp: e.created_at,
      user_email: 'System User', // Will fetch user details separately
    })),
    ...dispositionAudits.map(d => ({
      ...d,
      type: 'disposition_audit',
      timestamp: d.created_at,
      user_email: 'System User', // Will fetch user details separately
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getEventIcon = (event: any) => {
    const action = event.type === 'audit_event' ? event.action.toLowerCase() : event.action;
    const Icon = actionIcons[action] || Activity;
    return Icon;
  };

  const getEventColor = (event: any) => {
    const action = event.type === 'audit_event' ? event.action.toLowerCase() : event.action;
    return actionColors[action] || 'bg-gray-100 text-gray-800';
  };

  const formatEventDescription = (event: any) => {
    if (event.type === 'disposition_audit') {
      let description = event.action.replace('_', ' ').toUpperCase();
      if (event.previous_status && event.new_status) {
        description += ` (${event.previous_status} → ${event.new_status})`;
      }
      if (event.reason) {
        description += ` - ${event.reason}`;
      }
      if (event.certificate_number) {
        description += ` [Cert: ${event.certificate_number}]`;
      }
      return description;
    }

    // Audit event
    let description = event.action.replace('_', ' ').toUpperCase();
    if (event.resource_name) {
      description += ` - ${event.resource_name}`;
    }
    if (event.details?.comment) {
      description += ` - "${event.details.comment}"`;
    }
    if (event.details?.reason) {
      description += ` - ${event.details.reason}`;
    }
    return description;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Document Audit Trail
        </CardTitle>
        <CardDescription>
          Complete sequence of events and actions performed on this document
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : allEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No audit events found for this document</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {allEvents.map((event, index) => {
                const Icon = getEventIcon(event);
                const colorClass = getEventColor(event);

                return (
                  <div key={`${event.type}-${event.id}`} className="relative">
                    {/* Timeline connector line */}
                    {index < allEvents.length - 1 && (
                      <div className="absolute left-[21px] top-10 bottom-0 w-0.5 bg-border" />
                    )}

                    {/* Event card */}
                    <div className="flex gap-4">
                      {/* Icon circle */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass} z-10`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Event details */}
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {formatEventDescription(event)}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {event.user_email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                              </span>
                              {event.ip_address && (
                                <span className="flex items-center gap-1">
                                  <Shield className="h-3 w-3" />
                                  {event.ip_address}
                                </span>
                              )}
                            </div>

                            {/* Additional metadata - formatted for users */}
                            {event.type === 'audit_event' && event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-2 p-2 bg-muted rounded-md text-xs space-y-1">
                                {formatDetailsForUser(event.details, event.action)}
                              </div>
                            )}
                          </div>

                          {/* Badge for event type */}
                          <Badge variant="outline" className="text-xs">
                            {event.type === 'audit_event' ? event.action_category : 'RETENTION'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

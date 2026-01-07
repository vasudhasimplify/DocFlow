import React from 'react';
import { 
  Clock, Scale, FileText, CheckCircle, Archive, Trash2, Lock, 
  AlertTriangle, TrendingUp, PieChart as PieChartIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLegalHoldDocCounts } from '@/hooks/useLegalHoldDocCounts';
import type { 
  RetentionPolicy, 
  DocumentRetentionStatus, 
  LegalHold, 
  DispositionAuditLog 
} from '@/types/retention';

interface RetentionOverviewProps {
  policies: RetentionPolicy[];
  documentStatuses: DocumentRetentionStatus[];
  legalHolds: LegalHold[];
  auditLogs: DispositionAuditLog[];
  stats: {
    total_policies: number;
    active_policies: number;
    total_documents_tracked: number;
    documents_pending_review: number;
    documents_expiring_soon: number;
    active_legal_holds: number;
    documents_disposed_this_month: number;
  };
}

export const RetentionOverview: React.FC<RetentionOverviewProps> = ({
  policies,
  documentStatuses,
  legalHolds,
  auditLogs,
  stats
}) => {
  const [documentsMap, setDocumentsMap] = React.useState<Map<string, { file_name: string }>>(new Map());
  const { docCounts } = useLegalHoldDocCounts(legalHolds.map(h => h.id));

  // Fetch document details
  React.useEffect(() => {
    const fetchDocuments = async () => {
      if (documentStatuses.length === 0) return;
      
      const uniqueDocIds = Array.from(new Set(documentStatuses.map(d => d.document_id)));
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name')
        .in('id', uniqueDocIds);
      
      if (data && !error) {
        const newMap = new Map();
        data.forEach(doc => newMap.set(doc.id, { file_name: doc.file_name }));
        setDocumentsMap(newMap);
      }
    };
    
    fetchDocuments();
  }, [documentStatuses]);

  // Calculate status distribution for pie chart (only current/active documents)
  const activeDocuments = documentStatuses.filter(doc => 
    doc.current_status !== 'disposed' && doc.current_status !== 'archived'
  );
  
  const statusCounts = activeDocuments.reduce((acc, doc) => {
    acc[doc.current_status] = (acc[doc.current_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value,
    color: 
      name === 'active' ? '#10b981' :
      name === 'expired' ? '#f59e0b' :
      name === 'pending_review' ? '#3b82f6' :
      name === 'pending_approval' ? '#8b5cf6' :
      name === 'on_hold' ? '#a855f7' :
      name === 'disposed' ? '#ef4444' : '#6b7280'
  }));

  // Calculate expiration timeline (next 12 months)
  const getExpirationTimeline = () => {
    const now = new Date();
    const months = [];
    
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      
      const count = documentStatuses.filter(doc => {
        const expDate = new Date(doc.retention_end_date);
        return expDate.getMonth() === monthDate.getMonth() && 
               expDate.getFullYear() === monthDate.getFullYear() &&
               doc.current_status === 'active';
      }).length;
      
      months.push({
        month: monthName,
        count
      });
    }
    
    return months;
  };

  const expirationData = getExpirationTimeline();

  // Calculate disposition actions over time (last 30 days)
  const getDispositionTrend = () => {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const disposed = auditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString() && 
               log.action === 'disposed';
      }).length;
      
      const archived = auditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString() && 
               log.action === 'archived';
      }).length;
      
      if (i % 5 === 0 || disposed > 0 || archived > 0) {
        days.push({
          date: dayLabel,
          disposed,
          archived
        });
      }
    }
    
    return days;
  };

  const dispositionTrend = getDispositionTrend();

  // Calculate policy compliance distribution
  const policyData = policies
    .filter(p => p.is_active)
    .map(policy => ({
      name: policy.name.length > 15 ? policy.name.slice(0, 15) + '...' : policy.name,
      documents: documentStatuses.filter(d => d.policy_id === policy.id).length
    }))
    .sort((a, b) => b.documents - a.documents)
    .slice(0, 5);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      {/* Document Status Distribution - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-blue-500" />
            Document Status Distribution
          </CardTitle>
          <CardDescription>Current retention status breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {statusData.map((status, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  <span>{status.name}</span>
                </div>
                <Badge variant="secondary">{String(status.value)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiration Timeline - Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Expiration Timeline (Next 12 Months)
          </CardTitle>
          <CardDescription>Documents expiring each month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expirationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                name="Expiring Documents"
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
          {stats.documents_expiring_soon > 0 && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800 dark:text-orange-200">
                <strong>{stats.documents_expiring_soon}</strong> documents expiring in the next 30 days
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Policy Usage - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top Policies by Document Count
          </CardTitle>
          <CardDescription>Most frequently applied retention policies</CardDescription>
        </CardHeader>
        <CardContent>
          {policyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={policyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="documents" name="Documents" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active policies with documents yet</p>
              <p className="text-xs mt-1">Apply policies to documents to see statistics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposition Activity Trend - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-purple-500" />
            Disposition Activity (Last 30 Days)
          </CardTitle>
          <CardDescription>Daily disposition and archival actions</CardDescription>
        </CardHeader>
        <CardContent>
          {dispositionTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dispositionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="disposed" name="Disposed" fill="#ef4444" stackId="a" />
                <Bar dataKey="archived" name="Archived" fill="#8b5cf6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No disposition activity in the last 30 days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Expiring Soon - List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Documents Expiring Soon
          </CardTitle>
          <CardDescription>Documents approaching retention deadline</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {documentStatuses
              .filter(s => {
                // Exclude terminal states (disposed/archived)
                if (s.current_status === 'disposed' || s.current_status === 'archived') {
                  return false;
                }
                
                const now = Date.now();
                const endTime = new Date(s.retention_end_date).getTime();
                const daysLeft = Math.ceil((endTime - now) / (24 * 60 * 60 * 1000));
                const isExpiringSoon = daysLeft <= 30 && daysLeft > 0 && 
                  (s.current_status === 'active' || s.current_status === 'pending_review' || s.current_status === 'pending_approval');
                
                // Debug log for active documents
                if (s.current_status === 'active' || s.current_status === 'pending_review' || s.current_status === 'pending_approval') {
                  console.log('📅 Document retention check:', {
                    doc_id: s.document_id.slice(0, 8),
                    status: s.current_status,
                    end_date: s.retention_end_date,
                    days_left: daysLeft,
                    will_show: isExpiringSoon
                  });
                }
                
                return isExpiringSoon;
              })
              .slice(0, 10)
              .map((doc) => {
                const daysLeft = Math.ceil((new Date(doc.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                const fileName = documentsMap.get(doc.document_id)?.file_name || `Document ${doc.document_id.slice(0, 8)}...`;
                
                return (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires: {new Date(doc.retention_end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>
                      {daysLeft} days
                    </Badge>
                  </div>
                );
              })}
            {documentStatuses.filter(s => {
              const daysLeft = Math.ceil((new Date(s.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
              return daysLeft <= 30 && daysLeft > 0;
            }).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents expiring soon</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Active Legal Holds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-500" />
            Active Legal Holds
          </CardTitle>
          <CardDescription>Documents under litigation hold</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {legalHolds
              .filter(h => h.status === 'active')
              .map((hold) => (
                <div key={hold.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <Lock className="h-4 w-4 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">{hold.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {docCounts.get(hold.id) || 0} documents • {hold.custodian_name || 'No custodian'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500">Active</Badge>
                </div>
              ))}
            {legalHolds.filter(h => h.status === 'active').length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Scale className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active legal holds</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

import React from 'react';
import { 
  Clock, Scale, FileText, CheckCircle, Archive, Trash2, Lock, 
  AlertTriangle, TrendingUp, PieChart as PieChartIcon, X, Filter,
  ArrowLeft, ExternalLink, Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLegalHoldDocCounts } from '@/hooks/useLegalHoldDocCounts';
import type { 
  RetentionPolicy, 
  DocumentRetentionStatus, 
  LegalHold, 
  DispositionAuditLog 
} from '@/types/retention';

type DocumentFilterType = 
  | 'active' 
  | 'pending_review' 
  | 'pending_approval' 
  | 'on_hold' 
  | 'disposed' 
  | 'archived'
  | 'expiring_soon'
  | 'legal_hold'
  | 'all';

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
    documents_on_hold?: number;
  };
  onNavigateToDocuments?: (filter?: DocumentFilterType) => void;
  onNavigateToLegalHolds?: () => void;
}

export const RetentionOverview: React.FC<RetentionOverviewProps> = ({
  policies,
  documentStatuses,
  legalHolds,
  auditLogs,
  stats,
  onNavigateToDocuments,
  onNavigateToLegalHolds
}) => {
  const [documentsMap, setDocumentsMap] = React.useState<Map<string, { file_name: string }>>(new Map());
  const { docCounts } = useLegalHoldDocCounts(legalHolds.map(h => h.id));
  
  // State for document list dialog
  const [showDocumentsDialog, setShowDocumentsDialog] = React.useState(false);
  const [dialogTitle, setDialogTitle] = React.useState('');
  const [dialogDescription, setDialogDescription] = React.useState('');
  const [filteredDocuments, setFilteredDocuments] = React.useState<DocumentRetentionStatus[]>([]);
  const [currentFilter, setCurrentFilter] = React.useState<DocumentFilterType | null>(null);
  
  // State for disposition activity filter
  const [dispositionDaysFilter, setDispositionDaysFilter] = React.useState<number>(30);

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

  // Filter descriptions for tooltips
  const filterDescriptions: Record<string, string> = {
    active: 'Documents currently within their retention period and available for use',
    pending_review: 'Documents awaiting review before final disposition decision',
    pending_approval: 'Documents awaiting approval for disposition action',
    on_hold: 'Documents under legal hold that cannot be disposed',
    disposed: 'Documents that have been permanently deleted or removed',
    archived: 'Documents moved to long-term archival storage',
    expiring_soon: 'Documents with retention periods ending within 30 days',
    legal_hold: 'Active legal holds preventing document disposition',
    all: 'All documents tracked under retention policies'
  };

  // Helper function to open documents dialog with filtered list
  const openDocumentsDialog = (
    filterType: DocumentFilterType, 
    title: string, 
    description: string
  ) => {
    let docs: DocumentRetentionStatus[] = [];
    
    switch (filterType) {
      case 'active':
        docs = documentStatuses.filter(d => d.current_status === 'active');
        break;
      case 'pending_review':
        docs = documentStatuses.filter(d => d.current_status === 'pending_review');
        break;
      case 'pending_approval':
        docs = documentStatuses.filter(d => d.current_status === 'pending_approval');
        break;
      case 'on_hold':
        docs = documentStatuses.filter(d => d.current_status === 'on_hold');
        break;
      case 'disposed':
        docs = documentStatuses.filter(d => d.current_status === 'disposed');
        break;
      case 'archived':
        docs = documentStatuses.filter(d => d.current_status === 'archived');
        break;
      case 'expiring_soon':
        docs = documentStatuses.filter(d => {
          const daysLeft = Math.ceil((new Date(d.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
          return daysLeft <= 30 && daysLeft > 0 && d.current_status === 'active';
        });
        break;
      case 'all':
        docs = documentStatuses;
        break;
      default:
        docs = documentStatuses;
    }
    
    setFilteredDocuments(docs);
    setDialogTitle(title);
    setDialogDescription(description);
    setCurrentFilter(filterType);
    setShowDocumentsDialog(true);
  };

  // Handle viewing documents with navigation back to overview
  const handleViewAllDocuments = () => {
    setShowDocumentsDialog(false);
    if (onNavigateToDocuments && currentFilter) {
      onNavigateToDocuments(currentFilter);
    }
  };

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

  // Calculate disposition actions over time (based on filter: 30, 90, or 365 days)
  const getDispositionTrend = (days: number = 30) => {
    const result = [];
    const interval = days <= 30 ? 1 : days <= 90 ? 3 : 7; // Group by day, 3 days, or week
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    
    // Debug: Log audit logs to see what we have
    console.log('📊 Disposition Trend Debug:', {
      totalAuditLogs: auditLogs.length,
      daysFilter: days,
      disposedLogs: auditLogs.filter(l => l.action === 'disposed').length,
      archivedLogs: auditLogs.filter(l => l.action === 'archived').length,
      allActions: [...new Set(auditLogs.map(l => l.action))]
    });
    
    for (let i = days - 1; i >= 0; i -= interval) {
      const endDate = new Date(now);
      endDate.setDate(now.getDate() - i);
      endDate.setHours(23, 59, 59, 999);
      
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - i - interval + 1);
      startDate.setHours(0, 0, 0, 0);
      
      const dayLabel = days <= 30 
        ? endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : days <= 90
        ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : `Week ${Math.ceil((days - i) / 7)}`;
      
      const disposed = auditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startDate && logDate <= endDate && log.action === 'disposed';
      }).length;
      
      const archived = auditLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startDate && logDate <= endDate && log.action === 'archived';
      }).length;
      
      // Always show regular interval data points for consistent visualization
      result.push({
        date: dayLabel,
        disposed,
        archived
      });
    }
    
    // If no data points, ensure we return at least some structure
    if (result.length === 0) {
      const sampleDates = days <= 30 ? 6 : days <= 90 ? 10 : 12;
      for (let i = 0; i < sampleDates; i++) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor((days / sampleDates) * i));
        result.unshift({
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          disposed: 0,
          archived: 0
        });
      }
    }
    
    return result;
  };

  const dispositionTrend = getDispositionTrend(dispositionDaysFilter);
  
  // Calculate total disposition stats for the selected period
  const totalDisposed = dispositionTrend.reduce((acc, d) => acc + d.disposed, 0);
  const totalArchived = dispositionTrend.reduce((acc, d) => acc + d.archived, 0);

  // Calculate policy compliance distribution with full policy data
  const policyData = policies
    .filter(p => p.is_active)
    .map(policy => ({
      id: policy.id,
      name: policy.name.length > 15 ? policy.name.slice(0, 15) + '...' : policy.name,
      fullName: policy.name,
      documents: documentStatuses.filter(d => d.policy_id === policy.id).length
    }))
    .sort((a, b) => b.documents - a.documents)
    .slice(0, 5);

  // Function to open documents dialog for a specific policy
  const openPolicyDocumentsDialog = (policyId: string, policyName: string, docCount: number) => {
    const docs = documentStatuses.filter(d => d.policy_id === policyId);
    setFilteredDocuments(docs);
    setDialogTitle(`Documents under "${policyName}"`);
    setDialogDescription(`${docCount} documents are managed by this retention policy`);
    setCurrentFilter(null);
    setShowDocumentsDialog(true);
  };

  // Function to open documents dialog for a legal hold
  const openLegalHoldDocumentsDialog = (holdId: string, holdName: string, docCount: number) => {
    const docs = documentStatuses.filter(d => d.legal_hold_ids?.includes(holdId));
    setFilteredDocuments(docs);
    setDialogTitle(`Documents under Legal Hold: "${holdName}"`);
    setDialogDescription(`${docCount} documents are under this legal hold and cannot be disposed`);
    setCurrentFilter('on_hold');
    setShowDocumentsDialog(true);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  // Data for expiring soon mini chart
  const expiringDocsData = React.useMemo(() => {
    const now = Date.now();
    const periods = [
      { label: '1-7 days', min: 1, max: 7, color: '#ef4444' },
      { label: '8-14 days', min: 8, max: 14, color: '#f97316' },
      { label: '15-21 days', min: 15, max: 21, color: '#f59e0b' },
      { label: '22-30 days', min: 22, max: 30, color: '#eab308' },
    ];
    
    return periods.map(period => ({
      name: period.label,
      count: documentStatuses.filter(d => {
        const daysLeft = Math.ceil((new Date(d.retention_end_date).getTime() - now) / (24 * 60 * 60 * 1000));
        return daysLeft >= period.min && daysLeft <= period.max && 
               d.current_status === 'active';
      }).length,
      color: period.color
    }));
  }, [documentStatuses]);

  // Data for legal holds mini chart
  const legalHoldsData = React.useMemo(() => {
    const activeHolds = legalHolds.filter(h => h.status === 'active');
    return activeHolds.map(hold => ({
      id: hold.id,
      name: hold.name.length > 15 ? hold.name.slice(0, 12) + '...' : hold.name,
      documents: docCounts.get(hold.id) || 0,
      fullName: hold.name
    })).sort((a, b) => b.documents - a.documents).slice(0, 5);
  }, [legalHolds, docCounts]);

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Document Status Distribution - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-blue-500" />
              Document Status Distribution
            </CardTitle>
            <CardDescription>Current retention status breakdown - click on status to view documents</CardDescription>
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
                  style={{ cursor: 'pointer' }}
                  onClick={(data) => {
                    const statusKey = data.name.toLowerCase().replace(' ', '_') as DocumentFilterType;
                    openDocumentsDialog(
                      statusKey,
                      `${data.name} Documents`,
                      filterDescriptions[statusKey] || `Documents with ${data.name} status`
                    );
                  }}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusData.map((status, idx) => {
                const statusKey = status.name.toLowerCase().replace(' ', '_') as DocumentFilterType;
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => openDocumentsDialog(
                          statusKey,
                          `${status.name} Documents`,
                          filterDescriptions[statusKey] || `Documents with ${status.name} status`
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                          <span>{status.name}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <Badge variant="secondary" className="font-bold">{String(status.value)}</Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[250px]">
                      <p className="text-sm">{filterDescriptions[statusKey] || `Click to view ${status.name} documents`}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
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
                <RechartsTooltip />
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="mt-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-center gap-2 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                    onClick={() => openDocumentsDialog(
                      'expiring_soon',
                      'Documents Expiring Soon',
                      filterDescriptions.expiring_soon
                    )}
                  >
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>{stats.documents_expiring_soon}</strong> documents expiring in the next 30 days
                    </span>
                    <ExternalLink className="h-3 w-3 text-orange-600 ml-auto" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to view expiring documents</p>
                </TooltipContent>
              </Tooltip>
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
          <CardDescription>Most frequently applied retention policies - click bar to view documents</CardDescription>
        </CardHeader>
        <CardContent>
          {policyData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={policyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip 
                    formatter={(value: number, name: string, props: { payload?: { fullName?: string; id?: string } }) => [
                      `${value} documents`,
                      props.payload?.fullName || name
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="documents" 
                    name="Documents" 
                    fill="#3b82f6" 
                    style={{ cursor: 'pointer' }}
                    onClick={(data) => {
                      if (data && data.id) {
                        openPolicyDocumentsDialog(data.id, data.fullName || data.name, data.documents);
                      }
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {policyData.map((policy, idx) => (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        onClick={() => openPolicyDocumentsDialog(policy.id, policy.fullName, policy.documents)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span className="text-sm">{policy.fullName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{policy.documents} docs</Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Click to view {policy.documents} documents under this policy</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active policies with documents yet</p>
              <p className="text-xs mt-1">Apply policies to documents to see statistics</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disposition Activity Trend - Bar Chart with Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-purple-500" />
                Disposition Activity
              </CardTitle>
              <CardDescription>Disposition and archival actions over time</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={String(dispositionDaysFilter)}
                    onValueChange={(value) => setDispositionDaysFilter(Number(value))}
                  >
                    <SelectTrigger className="w-[130px] h-8">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Last 30 Days</SelectItem>
                      <SelectItem value="90">Last 90 Days</SelectItem>
                      <SelectItem value="365">Last Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter disposition activity by time period</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {dispositionTrend.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dispositionTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="disposed" name="Disposed" fill="#ef4444" stackId="a" />
                  <Bar dataKey="archived" name="Archived" fill="#8b5cf6" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-950 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                      onClick={() => openDocumentsDialog(
                        'disposed',
                        'Disposed Documents',
                        `Documents permanently deleted in the last ${dispositionDaysFilter} days`
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-700 dark:text-red-300">
                        <strong>{totalDisposed}</strong> Disposed
                      </span>
                      <ExternalLink className="h-3 w-3 text-red-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to view disposed documents</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-50 dark:bg-purple-950 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors"
                      onClick={() => openDocumentsDialog(
                        'archived',
                        'Archived Documents',
                        `Documents moved to archive in the last ${dispositionDaysFilter} days`
                      )}
                    >
                      <Archive className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-purple-700 dark:text-purple-300">
                        <strong>{totalArchived}</strong> Archived
                      </span>
                      <ExternalLink className="h-3 w-3 text-purple-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to view archived documents</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No disposition activity in the last {dispositionDaysFilter} days</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Expiring Soon - List with Mini Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Documents Expiring Soon
              </CardTitle>
              <CardDescription>Documents approaching retention deadline</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openDocumentsDialog(
                    'expiring_soon',
                    'All Documents Expiring Soon',
                    filterDescriptions.expiring_soon
                  )}
                >
                  View All
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View all documents expiring within 30 days</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mini visualization for expiring documents */}
          {expiringDocsData.some(d => d.count > 0) && (
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={expiringDocsData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} fontSize={10} />
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [`${value} documents`, name]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {expiringDocsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ScrollArea className="h-[200px]">
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-purple-500" />
                Active Legal Holds
              </CardTitle>
              <CardDescription>Documents under litigation hold - click to view documents</CardDescription>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onNavigateToLegalHolds?.()}
                >
                  Manage Holds
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to Legal Holds management</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mini visualization for legal holds */}
          {legalHoldsData.length > 0 && (
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={legalHoldsData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} fontSize={10} />
                  <RechartsTooltip 
                    formatter={(value: number, name: string, props: { payload?: { fullName?: string } }) => [
                      `${value} documents`,
                      props.payload?.fullName || name
                    ]}
                  />
                  <Bar dataKey="documents" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <ScrollArea className="h-[200px]">
            {legalHolds
              .filter(h => h.status === 'active')
              .map((hold) => {
                const holdDocCount = docCounts.get(hold.id) || 0;
                return (
                  <div key={hold.id} className="flex items-center justify-between py-2 border-b last:border-0 px-2">
                    <div className="flex items-center gap-3 flex-1">
                      <Lock className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">{hold.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {holdDocCount} documents • {hold.custodian_name || 'No custodian'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-purple-500">Active</Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => openLegalHoldDocumentsDialog(hold.id, hold.name, holdDocCount)}
                            disabled={holdDocCount === 0}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{holdDocCount > 0 ? `View ${holdDocCount} documents under this hold` : 'No documents under this hold'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
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

      {/* Document List Dialog */}
      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] mt-4">
            {filteredDocuments.length > 0 ? (
              <div className="space-y-2">
                {filteredDocuments.slice(0, 50).map((doc) => {
                  const fileName = documentsMap.get(doc.document_id)?.file_name || `Document ${doc.document_id.slice(0, 8)}...`;
                  const daysLeft = Math.ceil((new Date(doc.retention_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                  
                  return (
                    <div 
                      key={doc.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            Status: {doc.current_status} • 
                            {daysLeft > 0 
                              ? ` ${daysLeft} days remaining`
                              : ' Expired'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={
                          doc.current_status === 'active' ? 'default' :
                          doc.current_status === 'on_hold' ? 'secondary' :
                          doc.current_status === 'disposed' ? 'destructive' : 'outline'
                        }
                      >
                        {doc.current_status.replace('_', ' ')}
                      </Badge>
                    </div>
                  );
                })}
                {filteredDocuments.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Showing 50 of {filteredDocuments.length} documents
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No documents found</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Total: <strong>{filteredDocuments.length}</strong> documents
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDocumentsDialog(false)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Overview
              </Button>
              {onNavigateToDocuments && (
                <Button onClick={handleViewAllDocuments}>
                  View All in Documents Tab
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { useToast } from '@/hooks/use-toast';
import { AuditCategory } from '@/types/audit';
import AuditTimeline from './AuditTimeline';
import AuditStatsCards from './AuditStatsCards';
import {
  Activity,
  BarChart3,
  Download,
  RefreshCw,
  Clock,
  Shield,
  Settings,
} from 'lucide-react';

interface AuditDashboardProps {
  documentId?: string;
  folderId?: string;
  title?: string;
  showStats?: boolean;
}

const AuditDashboard: React.FC<AuditDashboardProps> = ({
  documentId,
  folderId,
  title = 'Activity & Audit Trail',
  showStats = true,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('timeline');

  const {
    events,
    stats,
    isLoading,
    hasMore,
    totalCount,
    fetchEvents,
    fetchStats,
    loadMore,
    exportEvents,
  } = useAuditTrail({
    documentId,
    folderId,
    autoFetch: true,
  });

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const data = await exportEvents({}, format);
      const blob = new Blob([data], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export complete',
        description: `Audit trail exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not export audit trail',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    fetchEvents({});
    if (showStats) fetchStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              Track all document and user activities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {totalCount.toLocaleString()} events
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          {showStats && (
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <AuditTimeline
            events={events}
            isLoading={isLoading}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onFilter={fetchEvents}
            onExport={handleExport}
            maxHeight="calc(100vh - 300px)"
          />
        </TabsContent>

        {showStats && (
          <TabsContent value="analytics" className="mt-6">
            <AuditStatsCards
              stats={stats}
              isLoading={isLoading}
              events={events}
              onRequestEvents={() => fetchEvents({})}
              onSwitchToTimeline={() => setActiveTab('timeline')}
            />
          </TabsContent>
        )}

        <TabsContent value="security" className="mt-6">
          <AuditTimeline
            events={events.filter(e =>
              e.action_category === 'access_control' ||
              e.action_category === 'security' ||
              e.action.includes('shared') ||
              e.action.includes('access')
            )}
            isLoading={isLoading}
            showFilters={false}
            onExport={handleExport}
            maxHeight="calc(100vh - 300px)"
            compact
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuditDashboard;

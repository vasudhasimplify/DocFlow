import React, { useState } from 'react';
import { AuditStats, AUDIT_CATEGORY_COLORS, AUDIT_CATEGORY_LABELS, AuditCategory, AuditEvent } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Activity,
  TrendingUp,
  FileText,
  Users,
  Clock,
  BarChart3,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface AuditStatsCardsProps {
  stats: AuditStats | null;
  isLoading?: boolean;
  events?: AuditEvent[];
  onRequestEvents?: () => void;
  onSwitchToTimeline?: () => void;
}

type DialogType = 'total' | 'today' | 'week' | 'documents' | 'category' | 'document' | 'user' | null;

interface DialogState {
  type: DialogType;
  data?: any;
}

const AuditStatsCards: React.FC<AuditStatsCardsProps> = ({
  stats,
  isLoading,
  events = [],
  onRequestEvents,
  onSwitchToTimeline,
}) => {
  const [dialogState, setDialogState] = useState<DialogState>({ type: null });

  const openDialog = (type: DialogType, data?: any) => {
    // Request events to be loaded when dialog opens
    if (events.length === 0 && onRequestEvents) {
      onRequestEvents();
    }
    setDialogState({ type, data });
  };

  const closeDialog = () => {
    setDialogState({ type: null });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-8 bg-muted rounded w-16 mb-2" />
              <div className="h-4 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Events',
      value: stats.total_events.toLocaleString(),
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      filter: 'all' as const,
    },
    {
      title: 'Today',
      value: stats.events_today.toLocaleString(),
      icon: Clock,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
      change: stats.events_today > 0 ? `+${stats.events_today}` : '0',
      filter: 'today' as const,
    },
    {
      title: 'This Week',
      value: stats.events_this_week.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      filter: 'week' as const,
    },
    {
      title: 'Active Documents',
      value: stats.most_active_documents.length.toString(),
      icon: FileText,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
      filter: 'documents' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
            onClick={() => {
              // Total Events redirects to Timeline, others open dialogs
              if (stat.filter === 'all' && onSwitchToTimeline) {
                onSwitchToTimeline();
              } else if (stat.filter !== 'all') {
                openDialog(stat.filter);
              }
            }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.change && (
                    <p className="text-xs text-green-500 mt-1">{stat.change} today</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Activity by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stats.action_breakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, count]) => {
                const total = Object.values(stats.action_breakdown).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div
                    key={category}
                    className="space-y-1 p-2 rounded-lg -mx-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDialog('category', { category, count, label: AUDIT_CATEGORY_LABELS[category as AuditCategory] })}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: AUDIT_CATEGORY_COLORS[category as AuditCategory] }}
                        />
                        <span>{AUDIT_CATEGORY_LABELS[category as AuditCategory]}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: AUDIT_CATEGORY_COLORS[category as AuditCategory],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Most active */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Most active documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Most Active Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.most_active_documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No document activity yet
              </p>
            ) : (
              <div className="space-y-1">
                {stats.most_active_documents.slice(0, 5).map((doc, index) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-2 rounded-lg -mx-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDialog('document', doc)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[180px]">{doc.document_name}</span>
                    </div>
                    <span className="text-sm font-medium">{doc.event_count} events</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most active users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Most Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.most_active_users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No user activity yet
              </p>
            ) : (
              <div className="space-y-1">
                {stats.most_active_users.slice(0, 5).map((user, index) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-2 rounded-lg -mx-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openDialog('user', user)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm truncate max-w-[180px]">{user.user_name}</span>
                    </div>
                    <span className="text-sm font-medium">{user.event_count} events</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={dialogState.type !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState.type === 'total' && 'Total Events'}
              {dialogState.type === 'today' && "Today's Activity"}
              {dialogState.type === 'week' && "This Week's Activity"}
              {dialogState.type === 'documents' && 'Active Documents'}
              {dialogState.type === 'category' && dialogState.data?.label}
              {dialogState.type === 'document' && dialogState.data?.document_name}
              {dialogState.type === 'user' && dialogState.data?.user_name}
            </DialogTitle>
            <DialogDescription>
              {dialogState.type === 'total' && `${stats.total_events} total events recorded in the system.`}
              {dialogState.type === 'today' && `${stats.events_today} events recorded today.`}
              {dialogState.type === 'week' && `${stats.events_this_week} events recorded this week.`}
              {dialogState.type === 'documents' && `${stats.most_active_documents.length} documents with recent activity.`}
              {dialogState.type === 'category' && `${dialogState.data?.count} events in this category.`}
              {dialogState.type === 'document' && `${dialogState.data?.event_count} events for this document.`}
              {dialogState.type === 'user' && `${dialogState.data?.event_count} events by this user.`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Event List Component - reused for different filters */}
            {(() => {
              let filteredEvents: AuditEvent[] = [];

              if (dialogState.type === 'total') {
                filteredEvents = events;
              } else if (dialogState.type === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                filteredEvents = events.filter(e => new Date(e.created_at) >= today);
              } else if (dialogState.type === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                filteredEvents = events.filter(e => new Date(e.created_at) >= weekAgo);
              } else if (dialogState.type === 'category') {
                filteredEvents = events.filter(e => e.action_category === dialogState.data?.category);
              } else if (dialogState.type === 'document') {
                filteredEvents = events.filter(e => e.document_id === dialogState.data?.document_id);
              } else if (dialogState.type === 'user') {
                filteredEvents = events.filter(e => e.user_id === dialogState.data?.user_id);
              }

              if (dialogState.type === 'documents') {
                // Documents tab shows document list, not events
                return (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2 pr-4">
                      {stats.most_active_documents.map((doc, i) => (
                        <div key={doc.document_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-amber-500" />
                            <span className="text-sm truncate max-w-[200px]">{doc.document_name}</span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{doc.event_count} events</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                );
              }

              if (filteredEvents.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No events found</p>
                  </div>
                );
              }

              return (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {filteredEvents.slice(0, 50).map((event) => (
                      <div key={event.id} className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.action}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {event.resource_name || event.resource_id}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: AUDIT_CATEGORY_COLORS[event.action_category as AuditCategory] || '#888' }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {AUDIT_CATEGORY_LABELS[event.action_category as AuditCategory] || event.action_category}
                          </span>
                        </div>
                      </div>
                    ))}
                    {filteredEvents.length > 50 && (
                      <p className="text-xs text-center text-muted-foreground py-2">
                        Showing 50 of {filteredEvents.length} events
                      </p>
                    )}
                  </div>
                </ScrollArea>
              );
            })()}
          </div>

          <Button onClick={closeDialog} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditStatsCards;

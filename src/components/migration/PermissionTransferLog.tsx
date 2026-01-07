import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, AlertCircle, Clock, Users } from 'lucide-react';
import type { MigrationAuditLog } from '@/types/migration';

interface PermissionTransferLogProps {
    auditLogs: MigrationAuditLog[];
    isLoading?: boolean;
}

export function PermissionTransferLog({ auditLogs, isLoading }: PermissionTransferLogProps) {
    // Filter for permission-related events
    const permissionLogs = auditLogs.filter(log =>
        ['permission_applied', 'permission_skipped', 'permission_failed'].includes(log.event_type)
    );

    const getEventIcon = (eventType: string) => {
        switch (eventType) {
            case 'permission_applied':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'permission_skipped':
                return <AlertCircle className="h-4 w-4 text-yellow-500" />;
            case 'permission_failed':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getEventBadge = (eventType: string) => {
        switch (eventType) {
            case 'permission_applied':
                return <Badge variant="default" className="bg-green-100 text-green-800">Applied</Badge>;
            case 'permission_skipped':
                return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Skipped</Badge>;
            case 'permission_failed':
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{eventType}</Badge>;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    // Count by type
    const appliedCount = permissionLogs.filter(l => l.event_type === 'permission_applied').length;
    const skippedCount = permissionLogs.filter(l => l.event_type === 'permission_skipped').length;
    const failedCount = permissionLogs.filter(l => l.event_type === 'permission_failed').length;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Permission Transfer Log
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-muted-foreground py-4">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Permission Transfer Log
                </CardTitle>
                <div className="flex gap-4 text-sm">
                    <span className="text-green-600">✓ {appliedCount} applied</span>
                    <span className="text-yellow-600">⚠ {skippedCount} skipped</span>
                    <span className="text-red-600">✗ {failedCount} failed</span>
                </div>
            </CardHeader>
            <CardContent>
                {permissionLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                        <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No permission transfers yet.</p>
                        <p className="text-xs mt-1">Permission logs will appear here after migrating files with shared access.</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                            {permissionLogs.map((log, index) => (
                                <div key={log.id || index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                    {getEventIcon(log.event_type)}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getEventBadge(log.event_type)}
                                            <span className="text-xs text-muted-foreground">
                                                {formatTimestamp(log.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm mt-1 break-words">
                                            {typeof log.error_message === 'string'
                                                ? log.error_message
                                                : (log.error_message ? JSON.stringify(log.error_message) : 'No details available')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}

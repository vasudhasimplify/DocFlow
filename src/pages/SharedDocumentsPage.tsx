import React from 'react';
import { ShareLinksDashboard } from '@/components/sharing/ShareLinksDashboard';

const SharedDocumentsPage: React.FC = () => {
    return (
        <div className="h-full w-full p-6 overflow-hidden">
            <div className="h-full flex flex-col space-y-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Shared Documents</h1>
                    <p className="text-muted-foreground">
                        Manage your shared documents, track views, and update permissions.
                    </p>
                </div>
                <div className="flex-1 overflow-auto bg-card rounded-lg border shadow-sm p-6">
                    <ShareLinksDashboard />
                </div>
            </div>
        </div>
    );
};

export default SharedDocumentsPage;

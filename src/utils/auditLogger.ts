/**
 * Audit Logger Utility
 * Standalone function to log audit events without requiring the full hook
 */
import { supabase } from '@/integrations/supabase/client';
import { AuditAction, AuditCategory, AuditDetails, AuditMetadata } from '@/types/audit';

// Get device/browser info
const getMetadata = (): AuditMetadata => {
    const ua = navigator.userAgent;
    let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/i.test(ua)) deviceType = 'tablet';

    let browser = 'Unknown';
    if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';

    let os = 'Unknown';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios/i.test(ua)) os = 'iOS';

    return {
        device_type: deviceType,
        browser,
        os,
        trigger_source: 'user',
    };
};

interface LogAuditEventParams {
    action: AuditAction;
    category: AuditCategory;
    resourceType: 'document' | 'folder' | 'template' | 'form' | 'user' | 'system';
    resourceName?: string;
    documentId?: string;
    folderId?: string;
    details?: AuditDetails;
}

/**
 * Log an audit event to the database
 * This is a fire-and-forget function that won't block the UI
 */
export const logAuditEvent = async (params: LogAuditEventParams): Promise<void> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.warn('Audit: No user logged in, skipping audit log');
            return;
        }

        const metadata = getMetadata();

        const event = {
            user_id: user.id,
            action: params.action,
            action_category: params.category,
            resource_type: params.resourceType,
            resource_name: params.resourceName,
            document_id: params.documentId,
            folder_id: params.folderId,
            details: params.details || {},
            metadata,
            user_agent: navigator.userAgent,
            session_id: sessionStorage.getItem('session_id') || undefined,
        };

        // Fire and forget - don't await
        (supabase as any)
            .from('audit_events')
            .insert(event)
            .then(({ error }: { error: any }) => {
                if (error) {
                    console.warn('Audit log failed:', error.message);
                }
            });
    } catch (error) {
        console.warn('Audit logging error:', error);
    }
};

// Convenience functions for common actions
export const logDocumentCreated = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.created',
        category: 'document_management',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentViewed = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.viewed',
        category: 'document_management',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentDownloaded = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.downloaded',
        category: 'export',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentDeleted = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.deleted',
        category: 'document_management',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentShared = (documentId: string, documentName: string, sharedWith: string[], permission: string) => {
    logAuditEvent({
        action: 'document.shared',
        category: 'access_control',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            shared_with: sharedWith,
            permission_level: permission,
        },
    });
};

export const logDocumentMoved = (documentId: string, documentName: string, sourceFolderId?: string, destFolderId?: string) => {
    logAuditEvent({
        action: 'document.moved',
        category: 'document_management',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            source_folder_id: sourceFolderId,
            destination_folder_id: destFolderId,
        },
    });
};

export const logFolderCreated = (folderId: string, folderName: string) => {
    logAuditEvent({
        action: 'folder.created',
        category: 'document_management',
        resourceType: 'folder',
        resourceName: folderName,
        folderId,
    });
};

export const logFolderDeleted = (folderId: string, folderName: string) => {
    logAuditEvent({
        action: 'folder.deleted',
        category: 'document_management',
        resourceType: 'folder',
        resourceName: folderName,
        folderId,
    });
};

export const logUserLogin = () => {
    logAuditEvent({
        action: 'user.login',
        category: 'user_activity',
        resourceType: 'user',
    });
};

export const logUserLogout = () => {
    logAuditEvent({
        action: 'user.logout',
        category: 'user_activity',
        resourceType: 'user',
    });
};

export const logSearchPerformed = (query: string, resultsCount: number) => {
    logAuditEvent({
        action: 'system.search_performed',
        category: 'user_activity',
        resourceType: 'system',
        details: {
            search_query: query,
            results_count: resultsCount,
        },
    });
};

export const logLinkCopied = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.shared',
        category: 'access_control',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            reason: 'Share link copied to clipboard',
        },
    });
};

export const logDocumentPrinted = (documentId: string, documentName: string) => {
    logAuditEvent({
        action: 'document.printed',
        category: 'export',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentStarred = (documentId: string, documentName: string, starred: boolean) => {
    logAuditEvent({
        action: starred ? 'document.starred' : 'document.unstarred',
        category: 'user_activity',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
    });
};

export const logDocumentExported = (documentId: string, documentName: string, format: string) => {
    logAuditEvent({
        action: 'document.exported',
        category: 'export',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            export_format: format,
        },
    });
};

export const logDocumentWatermarked = (documentId: string, documentName: string, watermarkName: string) => {
    logAuditEvent({
        action: 'document.updated',
        category: 'security',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            reason: `Watermark "${watermarkName}" applied`,
        },
    });
};

export const logAccessGranted = (documentId: string, documentName: string, grantedTo: string, permission: string) => {
    logAuditEvent({
        action: 'access.granted',
        category: 'access_control',
        resourceType: 'document',
        resourceName: documentName,
        documentId,
        details: {
            shared_with: [grantedTo],
            permission_level: permission,
        },
    });
};

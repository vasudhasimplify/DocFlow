import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DocumentRestrictions {
    hasRestrictions: boolean;
    restrictDownload: boolean;
    restrictPrint: boolean;
    restrictShare: boolean;
    restrictExternalShare: boolean;
    matchedRules: string[];
}

/**
 * Hook to check if a document has access restrictions applied via content rules
 */
export function useDocumentRestrictions() {
    /**
     * Check if a document has any access restrictions applied
     */
    const getDocumentRestrictions = useCallback(async (documentId: string): Promise<DocumentRestrictions> => {
        const result: DocumentRestrictions = {
            hasRestrictions: false,
            restrictDownload: false,
            restrictPrint: false,
            restrictShare: false,
            restrictExternalShare: false,
            matchedRules: []
        };

        if (!documentId) return result;

        try {
            // Get all rule applications for this document
            const { data: applications, error } = await supabase
                .from('content_rule_applications')
                .select(`
          id,
          rule_id,
          actions_applied,
          content_access_rules:rule_id (
            id,
            name,
            is_active,
            restrict_download,
            restrict_print,
            restrict_share,
            restrict_external_share
          )
        `)
                .eq('document_id', documentId);

            if (error) {
                console.error('Error fetching document restrictions:', error);
                return result;
            }

            if (!applications || applications.length === 0) {
                return result;
            }

            // Aggregate restrictions from all active rules
            for (const app of applications) {
                const rule = app.content_access_rules as any;
                if (!rule || !rule.is_active) continue;

                result.matchedRules.push(rule.name);

                // Use actions_applied from the application record (most reliable)
                const actions = app.actions_applied as any;
                if (actions) {
                    if (actions.restrict_download) result.restrictDownload = true;
                    if (actions.restrict_print) result.restrictPrint = true;
                    if (actions.restrict_share) result.restrictShare = true;
                    if (actions.restrict_external_share) result.restrictExternalShare = true;
                }

                // Also check rule level restrictions (fallback)
                if (rule.restrict_download) result.restrictDownload = true;
                if (rule.restrict_print) result.restrictPrint = true;
                if (rule.restrict_share) result.restrictShare = true;
                if (rule.restrict_external_share) result.restrictExternalShare = true;
            }

            result.hasRestrictions = result.restrictDownload || result.restrictPrint ||
                result.restrictShare || result.restrictExternalShare;

            console.log(`📋 Document ${documentId} restrictions:`, result);
            return result;
        } catch (error) {
            console.error('Error checking document restrictions:', error);
            return result;
        }
    }, []);

    return {
        getDocumentRestrictions
    };
}

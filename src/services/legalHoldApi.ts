import { backendConfig } from './backendConfig';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedLegalHold, CreateLegalHoldParams, LegalHoldAuditEntry } from '@/types/legalHold';

const BASE_URL = backendConfig.getFastApiUrl();

async function getHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Content-Type': 'application/json',
        'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
    };
}

export const legalHoldApi = {
    async getHolds(): Promise<EnhancedLegalHold[]> {
        // Use Supabase directly for now to avoid CORS/auth issues
        const { data: holds, error } = await supabase
            .from('legal_holds')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching legal holds:', error);
            throw error;
        }
        
        console.log('Fetched holds:', holds?.length || 0);
        
        // Fetch custodians for each hold
        const enrichedHolds = await Promise.all((holds || []).map(async (hold) => {
            const { data: custodians, error: custError } = await supabase
                .from('legal_hold_custodians')
                .select('*')
                .eq('hold_id', hold.id);
            
            if (custError) {
                console.error(`Error fetching custodians for hold ${hold.id}:`, custError);
            }
            
            console.log(`Hold ${hold.name}: ${custodians?.length || 0} custodians`);
            
            // Calculate days active with proper date handling
            let daysActive = 0;
            if (hold.created_at) {
                const createdDate = new Date(hold.created_at);
                if (!isNaN(createdDate.getTime())) {
                    daysActive = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                }
            }
            
            // Use cached stats from database if available, otherwise calculate
            const documentCount = hold.cached_document_count ?? 0;
            const totalSize = hold.cached_total_size_bytes ?? 0;
            const custodianCount = hold.cached_custodian_count ?? (custodians || []).length;
            
            const acknowledgedCount = (custodians || []).filter((c: any) => c.status === 'acknowledged').length;
            const escalatedCount = (custodians || []).filter((c: any) => c.status === 'escalated').length;
            
            return {
                ...hold,
                custodians: custodians || [],
                document_count: documentCount,
                folder_count: 0,
                total_size_bytes: totalSize,
                stats: {
                    total_custodians: custodianCount,
                    custodians_acknowledged: acknowledgedCount,
                    pending_custodians: custodianCount - acknowledgedCount - escalatedCount,
                    escalated_custodians: escalatedCount,
                    total_documents: documentCount,
                    total_size_bytes: totalSize,
                    notifications_sent: 0,
                    days_active: daysActive
                }
            };
        }));
        
        return enrichedHolds as EnhancedLegalHold[];
    },

    async getHold(id: string): Promise<EnhancedLegalHold> {
        const { data: hold, error } = await supabase
            .from('legal_holds')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Fetch custodians
        const { data: custodians } = await supabase
            .from('legal_hold_custodians')
            .select('*')
            .eq('hold_id', id);
        
        const totalCustodians = (custodians || []).length;
        const acknowledgedCount = (custodians || []).filter((c: any) => c.status === 'acknowledged').length;
        const escalatedCount = (custodians || []).filter((c: any) => c.status === 'escalated').length;
        
        return {
            ...hold,
            custodians: custodians || [],
            document_count: 0,
            folder_count: 0,
            total_size_bytes: 0,
            stats: {
                total_custodians: totalCustodians,
                custodians_acknowledged: acknowledgedCount,
                pending_custodians: totalCustodians - acknowledgedCount - escalatedCount,
                escalated_custodians: escalatedCount,
                total_documents: 0,
                total_size_bytes: 0,
                notifications_sent: 0,
                days_active: Math.floor((Date.now() - new Date(hold.created_at).getTime()) / (1000 * 60 * 60 * 24))
            }
        } as EnhancedLegalHold;
    },

    async updateHold(holdId: string, params: Partial<CreateLegalHoldParams>): Promise<EnhancedLegalHold> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Extract custodian_emails before updating (it's not a DB column)
        const { custodian_emails, ...dbParams } = params;
        
        const { data: updatedHold, error } = await supabase
            .from('legal_holds')
            .update(dbParams)
            .eq('id', holdId)
            .select()
            .single();
        
        if (error) throw error;
        
        // Recalculate document count if scope or scope_details changed
        if (params.scope || params.scope_details) {
            try {
                let query = supabase.from('documents').select('id', { count: 'exact', head: true });
                const scope = params.scope || updatedHold.scope;
                const scopeDetails = params.scope_details || updatedHold.scope_details;
                
                // Apply scope filters
                if (scope === 'specific_documents' && scopeDetails?.document_ids?.length) {
                    query = query.in('id', scopeDetails.document_ids);
                } else if (scope === 'search_criteria' && scopeDetails) {
                    if (scopeDetails.keywords?.length) {
                        query = query.or(`file_name.ilike.%${scopeDetails.keywords[0]}%,extracted_text.ilike.%${scopeDetails.keywords[0]}%`);
                    }
                    if (scopeDetails.date_range) {
                        if (scopeDetails.date_range.start) {
                            query = query.gte('created_at', scopeDetails.date_range.start);
                        }
                        if (scopeDetails.date_range.end) {
                            query = query.lte('created_at', scopeDetails.date_range.end);
                        }
                    }
                } else if (scope === 'date_range' && scopeDetails?.date_range) {
                    if (scopeDetails.date_range.start) {
                        query = query.gte('created_at', scopeDetails.date_range.start);
                    }
                    if (scopeDetails.date_range.end) {
                        query = query.lte('created_at', scopeDetails.date_range.end);
                    }
                }
                
                const { count } = await query;
                const documentCount = count || 0;
                
                // Update cached document count
                await supabase
                    .from('legal_holds')
                    .update({ cached_document_count: documentCount })
                    .eq('id', holdId);
                    
                console.log(`📊 Updated document count to ${documentCount} for legal hold`);
            } catch (err) {
                console.error('Error recalculating document count:', err);
            }
        }
        
        // Create audit log entry for hold update
        await supabase.from('legal_hold_audit_log').insert({
            hold_id: holdId,
            action: 'hold_updated',
            actor_id: user.id,
            target_type: 'legal_hold',
            details: dbParams
        });
        
        // Fetch with custodians
        return this.getHold(updatedHold.id);
    },

    async createHold(params: CreateLegalHoldParams): Promise<EnhancedLegalHold> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        // Extract custodian_emails before inserting (it's not a DB column)
        const { custodian_emails, ...dbParams } = params;
        
        const holdData = {
            ...dbParams,
            created_by: user.id,
            status: 'pending_approval'  // Start as pending, requires approval to become active
        };
        
        const { data: newHold, error } = await supabase
            .from('legal_holds')
            .insert(holdData)
            .select()
            .single();
        
        if (error) throw error;
        
        // Create audit log entry for hold creation
        await supabase.from('legal_hold_audit_log').insert({
            hold_id: newHold.id,
            action: 'hold_created',
            actor_id: user.id,
            target_type: 'legal_hold',
            details: {
                name: newHold.name,
                matter_id: newHold.matter_id,
                status: newHold.status
            }
        });
        
        // Insert custodians
        if (custodian_emails && custodian_emails.length > 0) {
            console.log('🔒 Creating custodian records from standalone tab:', custodian_emails);
            
            const custodianRecords = custodian_emails.map(email => {
                // Extract name from email if not provided (use part before @)
                const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return {
                    hold_id: newHold.id,
                    name: name,
                    email,
                    status: 'pending',
                    added_by: user.id
                };
            });
            
            console.log('👤 Inserting custodians:', custodianRecords);
            
            const { data: insertedCustodians, error: custError } = await supabase
                .from('legal_hold_custodians')
                .insert(custodianRecords)
                .select();
            
            if (custError) {
                console.error('❌ Failed to insert custodians:', custError);
            } else {
                console.log('✅ Custodians inserted:', insertedCustodians);
                
                // Create audit log entries for each custodian
                if (insertedCustodians && insertedCustodians.length > 0) {
                    const auditEntries = insertedCustodians.map(custodian => ({
                        hold_id: newHold.id,
                        action: 'custodian_added',
                        actor_id: user.id,
                        target_type: 'custodian',
                        target_id: custodian.id,
                        target_name: custodian.name,
                        details: { email: custodian.email }
                    }));
                    await supabase.from('legal_hold_audit_log').insert(auditEntries);
                }
            }
        }
        
        // Calculate document count based on scope
        let documentCount = 0;
        try {
            let query = supabase.from('documents').select('id', { count: 'exact', head: true });
            
            // Apply scope filters
            if (params.scope === 'specific_documents' && params.scope_details?.document_ids?.length) {
                query = query.in('id', params.scope_details.document_ids);
            } else if (params.scope === 'search_criteria' && params.scope_details) {
                // Filter by keywords if provided
                if (params.scope_details.keywords?.length) {
                    const keywordFilter = params.scope_details.keywords.map(k => `%${k}%`).join('|');
                    query = query.or(`file_name.ilike.%${params.scope_details.keywords[0]}%,extracted_text.ilike.%${params.scope_details.keywords[0]}%`);
                }
                // Filter by date range if provided
                if (params.scope_details.date_range) {
                    if (params.scope_details.date_range.start) {
                        query = query.gte('created_at', params.scope_details.date_range.start);
                    }
                    if (params.scope_details.date_range.end) {
                        query = query.lte('created_at', params.scope_details.date_range.end);
                    }
                }
            } else if (params.scope === 'date_range' && params.scope_details?.date_range) {
                if (params.scope_details.date_range.start) {
                    query = query.gte('created_at', params.scope_details.date_range.start);
                }
                if (params.scope_details.date_range.end) {
                    query = query.lte('created_at', params.scope_details.date_range.end);
                }
            }
            // Note: custodian_content and folder scopes would need additional logic
            
            const { count } = await query;
            documentCount = count || 0;
            
            // Update cached document count
            await supabase
                .from('legal_holds')
                .update({ cached_document_count: documentCount })
                .eq('id', newHold.id);
                
            console.log(`📊 Calculated ${documentCount} documents for legal hold`);
        } catch (err) {
            console.error('Error calculating document count:', err);
        }
        
        // Fetch with custodians
        return this.getHold(newHold.id);
    },

    async releaseHold(holdId: string, reason: string, approvedBy?: string): Promise<void> {
        const { error } = await supabase
            .from('legal_holds')
            .update({
                status: 'released',
                release_reason: reason,
                released_at: new Date().toISOString(),
                released_by: approvedBy
            })
            .eq('id', holdId);
        
        if (error) throw error;
    },

    async approveHold(holdId: string): Promise<EnhancedLegalHold> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: updatedHold, error } = await supabase
            .from('legal_holds')
            .update({
                status: 'active',
                effective_date: new Date().toISOString()
            })
            .eq('id', holdId)
            .select()
            .single();
        
        if (error) throw error;

        // Create audit log entry for approval
        await supabase.from('legal_hold_audit_log').insert({
            hold_id: holdId,
            action: 'hold_approved',
            actor_id: user.id,
            target_type: 'legal_hold',
            details: { approved_at: new Date().toISOString() }
        });

        return this.getHold(holdId);
    },

    async rejectHold(holdId: string, reason: string): Promise<EnhancedLegalHold> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: updatedHold, error } = await supabase
            .from('legal_holds')
            .update({
                status: 'draft',
                internal_notes: `Rejected: ${reason}`
            })
            .eq('id', holdId)
            .select()
            .single();
        
        if (error) throw error;

        // Create audit log entry for rejection
        await supabase.from('legal_hold_audit_log').insert({
            hold_id: holdId,
            action: 'hold_rejected',
            actor_id: user.id,
            target_type: 'legal_hold',
            details: { reason, rejected_at: new Date().toISOString() }
        });

        return this.getHold(holdId);
    },

    async addCustodian(holdId: string, custodian: { name: string; email: string; department?: string; title?: string }): Promise<void> {
        const { error } = await supabase
            .from('legal_hold_custodians')
            .insert({
                hold_id: holdId,
                ...custodian,
                status: 'pending',
                notified_at: new Date().toISOString()
            });
        
        if (error) throw error;
    },

    async removeCustodian(holdId: string, custodianId: string): Promise<void> {
        const { error } = await supabase
            .from('legal_hold_custodians')
            .delete()
            .eq('id', custodianId)
            .eq('hold_id', holdId);
        
        if (error) throw error;
    },

    async sendReminder(holdId: string, custodianId: string): Promise<void> {
        try {
            // Get auth headers
            const headers = await getHeaders();
            
            // Call backend API to send reminder email
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/legal-holds/${holdId}/custodians/${custodianId}/remind`, {
                method: 'POST',
                headers: headers,
            });

            if (!response.ok) {
                // If backend fails, still update database
                console.warn('Backend reminder failed, updating database only');
            }

            // Update last_reminder_sent timestamp and increment count
            const { data: custodian } = await supabase
                .from('legal_hold_custodians')
                .select('reminder_count')
                .eq('id', custodianId)
                .single();

            const { error } = await supabase
                .from('legal_hold_custodians')
                .update({ 
                    last_reminder_sent: new Date().toISOString(),
                    reminder_count: (custodian?.reminder_count || 0) + 1
                })
                .eq('id', custodianId)
                .eq('hold_id', holdId);
            
            if (error) throw error;
        } catch (error) {
            console.error('Error sending reminder:', error);
            throw error;
        }
    },

    async escalateCustodian(holdId: string, custodianId: string): Promise<void> {
        try {
            // Get custodian info first
            const { data: custodian } = await supabase
                .from('legal_hold_custodians')
                .select('name, email')
                .eq('id', custodianId)
                .single();

            // Get auth headers
            const headers = await getHeaders();
            
            // Call backend API to send escalation notification
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/legal-holds/${holdId}/custodians/${custodianId}/escalate`, {
                method: 'POST',
                headers: headers,
            });

            if (!response.ok) {
                console.warn('Backend escalation failed, updating database only');
            }

            const { error } = await supabase
                .from('legal_hold_custodians')
                .update({
                    status: 'escalated',
                    escalated_at: new Date().toISOString()
                })
                .eq('id', custodianId)
                .eq('hold_id', holdId);
            
            if (error) throw error;

            // Create audit log entry
            if (custodian) {
                await supabase.from('legal_hold_audit_log').insert({
                    hold_id: holdId,
                    action: 'custodian_escalated',
                    target_type: 'custodian',
                    target_id: custodianId,
                    target_name: custodian.name,
                    details: { email: custodian.email }
                });
            }
        } catch (error) {
            console.error('Error escalating custodian:', error);
            throw error;
        }
    },

    async acknowledgeCustodian(holdId: string, custodianId: string): Promise<void> {
        // Get custodian info first
        const { data: custodian } = await supabase
            .from('legal_hold_custodians')
            .select('name, email')
            .eq('id', custodianId)
            .single();

        const { error } = await supabase
            .from('legal_hold_custodians')
            .update({
                status: 'acknowledged',
                acknowledged_at: new Date().toISOString()
            })
            .eq('id', custodianId)
            .eq('hold_id', holdId);
        
        if (error) throw error;

        // Create audit log entry
        if (custodian) {
            await supabase.from('legal_hold_audit_log').insert({
                hold_id: holdId,
                action: 'custodian_acknowledged',
                target_type: 'custodian',
                target_id: custodianId,
                target_name: custodian.name,
                details: { email: custodian.email }
            });
        }
    },

    async sendNotifications(holdId: string, custodianIds: string[], message: string): Promise<void> {
        try {
            // Get auth headers
            const headers = await getHeaders();
            
            // Call backend API to send actual emails
            const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await fetch(`${backendUrl}/api/legal-holds/${holdId}/send-notifications`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    custodian_ids: custodianIds,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to send notifications: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('📧 Notification result:', result);
            
            // Backend already updates the database, but let's refresh from DB
            // First fetch current custodians to get their reminder counts
            const { data: custodians } = await supabase
                .from('legal_hold_custodians')
                .select('id, reminder_count')
                .in('id', custodianIds)
                .eq('hold_id', holdId);
            
            // Update each custodian individually to increment reminder_count
            if (custodians) {
                await Promise.all(custodians.map(custodian =>
                    supabase
                        .from('legal_hold_custodians')
                        .update({ 
                            last_reminder_sent: new Date().toISOString(),
                            reminder_count: (custodian.reminder_count || 0) + 1
                        })
                        .eq('id', custodian.id)
                ));
            }
            
            // Create audit log entry
            await supabase.from('legal_hold_audit_log').insert({
                hold_id: holdId,
                action: 'notifications_sent',
                target_type: 'notification',
                details: { 
                    custodian_count: custodianIds.length,
                    message: message,
                    sent_via: 'email_api'
                }
            });
        } catch (error) {
            console.error('Error sending notifications:', error);
            throw error;
        }
    },

    async getAuditTrail(holdId: string): Promise<LegalHoldAuditEntry[]> {
        const { data, error } = await supabase
            .from('legal_hold_audit_log')
            .select('*')
            .eq('hold_id', holdId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []) as LegalHoldAuditEntry[];
    }
};

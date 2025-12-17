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
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/`, { headers });
        if (!response.ok) throw new Error('Failed to fetch legal holds');
        return await response.json();
    },

    async getHold(id: string): Promise<EnhancedLegalHold> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${id}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch legal hold');
        return await response.json();
    },

    async createHold(params: CreateLegalHoldParams): Promise<EnhancedLegalHold> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Failed to create legal hold');
        }
        return await response.json();
    },

    async releaseHold(holdId: string, reason: string, approvedBy?: string): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/release`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ reason, approved_by: approvedBy }),
        });
        if (!response.ok) throw new Error('Failed to release legal hold');
    },

    async addCustodian(holdId: string, custodian: { name: string; email: string; department?: string; title?: string }): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/custodians`, {
            method: 'POST',
            headers,
            body: JSON.stringify(custodian),
        });
        if (!response.ok) throw new Error('Failed to add custodian');
    },

    async removeCustodian(holdId: string, custodianId: string): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/custodians/${custodianId}`, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) throw new Error('Failed to remove custodian');
    },

    async sendReminder(holdId: string, custodianId: string): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/custodians/${custodianId}/remind`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) throw new Error('Failed to send reminder');
    },

    async escalateCustodian(holdId: string, custodianId: string): Promise<void> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/custodians/${custodianId}/escalate`, {
            method: 'POST',
            headers,
        });
        if (!response.ok) throw new Error('Failed to escalate custodian');
    },

    async getAuditTrail(holdId: string): Promise<LegalHoldAuditEntry[]> {
        const headers = await getHeaders();
        const response = await fetch(`${BASE_URL}/api/legal-holds/${holdId}/audit-trail`, { headers });
        if (!response.ok) throw new Error('Failed to fetch audit trail');
        return await response.json();
    }
};

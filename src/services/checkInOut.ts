/**
 * Check In/Out API Service
 */

import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/checkinout`;

export interface CheckoutOptions {
  documentId: string;
  lockReason?: string;
  durationHours?: number;
}

export interface CheckoutResponse {
  id: string;
  document_id: string;
  document_name?: string;
  locked_by: string;
  locked_at: string;
  lock_reason?: string;
  expires_at?: string;
  is_active: boolean;
}

/**
 * Check out (lock) a document
 */
export async function checkoutDocument(options: CheckoutOptions): Promise<CheckoutResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      document_id: options.documentId,
      lock_reason: options.lockReason,
      duration_hours: options.durationHours || 24,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check out document');
  }

  return response.json();
}

/**
 * Check in (unlock) a document
 */
export async function checkinDocument(lockId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/checkin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      lock_id: lockId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check in document');
  }
}

/**
 * Check if a document is locked
 */
export async function checkLockStatus(documentId: string) {
  const response = await fetch(`${API_BASE_URL}/document/${documentId}/lock-status`);

  if (!response.ok) {
    throw new Error('Failed to check lock status');
  }

  return response.json();
}

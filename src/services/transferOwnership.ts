/**
 * Ownership Transfer API Service
 */

import { supabase } from '@/integrations/supabase/client';
import { env } from '@/config/env';

const API_BASE_URL = `${env.apiBaseUrl}/api/v1/transfers`;

export interface TransferOptions {
  documentId: string;
  toUserEmail: string;
  message?: string;
}

export interface TransferResponse {
  id: string;
  document_id: string;
  from_user_id: string;
  to_user_id: string;
  to_user_email: string;
  status: string;
  message?: string;
  transferred_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Initiate ownership transfer for a document
 */
export async function initiateTransfer(options: TransferOptions): Promise<TransferResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      document_id: options.documentId,
      to_user_email: options.toUserEmail,
      message: options.message,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to initiate transfer');
  }

  return response.json();
}

/**
 * Accept a transfer
 */
export async function acceptTransfer(transferId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/${transferId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to accept transfer');
  }
}

/**
 * Reject a transfer
 */
export async function rejectTransfer(transferId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/${transferId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to reject transfer');
  }
}

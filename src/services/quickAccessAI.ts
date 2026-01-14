/**
 * API service for Quick Access AI scoring functionality
 */

import { supabase } from '@/integrations/supabase/client';
import { env } from '@/config/env';

const API_BASE_URL = env.apiBaseUrl;

export interface AIScoreResponse {
  score: number;
  reason: string;
  document_id: string;
}

export interface BatchScoreResponse {
  message: string;
  count: number;
  user_id: string;
}

/**
 * Calculate AI scores for all user documents (async, returns immediately)
 */
export async function calculateAIScoresBatch(limit?: number): Promise<BatchScoreResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const url = new URL(`${API_BASE_URL}/api/v1/quick-access/calculate-scores`);
  if (limit) url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to start AI scoring: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate AI scores synchronously (blocks until complete)
 */
export async function calculateAIScoresSync(limit: number = 50): Promise<BatchScoreResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const url = new URL(`${API_BASE_URL}/api/v1/quick-access/calculate-scores/sync`);
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to calculate scores: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Calculate AI score for a single document
 */
export async function calculateSingleScore(documentId: string): Promise<AIScoreResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(
    `${API_BASE_URL}/quick-access/calculate-score/${documentId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': user.id,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to calculate score: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get AI-scored documents for current user
 */
export async function getAIScores(
  minScore: number = 0.5,
  limit: number = 20
): Promise<AIScoreResponse[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const url = new URL(`${API_BASE_URL}/quick-access/scores`);
  url.searchParams.set('min_score', minScore.toString());
  url.searchParams.set('limit', limit.toString());

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch scores: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Reset all AI scores for current user
 */
export async function resetAIScores(): Promise<{ message: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/quick-access/scores`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to reset scores: ${response.statusText}`);
  }

  return response.json();
}

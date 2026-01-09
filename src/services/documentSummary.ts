/**
 * API service for Document Summary functionality
 */

import { supabase } from '@/integrations/supabase/client';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface DocumentSummary {
  summary: string;
  metadata: {
    documentName?: string;
    document_id?: string;
    file_name?: string;
    wordCount?: number;
    charCount?: number;
    estimatedReadTime?: number;
    generatedAt?: string;
    summary_type?: string;
    model_used?: string;
    error?: string;
  };
}

export type SummaryType = 'brief' | 'detailed' | 'executive' | 'bullet' | 'action-items' | string;

/**
 * Generate a summary for a specific document
 */
export async function generateDocumentSummary(
  documentId: string,
  summaryType: SummaryType = 'brief',
  language: string = 'en'
): Promise<DocumentSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(`${API_BASE_URL}/document-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': user.id,
    },
    body: JSON.stringify({
      documentId,
      userId: user.id,
      summary_type: summaryType, // Send the actual custom type
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `Failed to generate summary: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Calculate metadata if not provided
  const summaryText = result.summary || '';
  const wordCount = summaryText.split(/\s+/).filter(Boolean).length;
  const charCount = summaryText.length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute

  return {
    summary: summaryText,
    metadata: {
      ...result.metadata,
      wordCount: result.metadata?.wordCount || wordCount,
      charCount: result.metadata?.charCount || charCount,
      estimatedReadTime: result.metadata?.estimatedReadTime || estimatedReadTime,
      generatedAt: result.metadata?.generatedAt || new Date().toISOString(),
      summary_type: summaryType,
    },
  };
}

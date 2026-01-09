import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logAuditEvent } from '@/utils/auditLogger';

export interface AISearchResult {
  id: string;
  name: string;
  original_name?: string;
  document_type?: string;
  mime_type?: string;
  file_size?: number;
  created_at: string;
  storage_path?: string;
  relevanceScore: number;
  matchedKeywords: string[];
  matchReasons: string[];
  metadata?: {
    classification?: {
      category: string;
      categoryName: string;
      confidence: number;
      tags?: string[];
    };
  };
}

export interface QueryAnalysis {
  intent: string;
  documentTypes?: string[];
  timePeriod?: string;
  keywords: string[];
  contentSearch?: string;
  fileTypes?: string[];
  senderOrRecipient?: string;
  sortBy?: string;
  confidence: number;
}

export interface SearchFilters {
  documentTypes: string[];
  dateFilter?: { start: Date; end?: Date };
  fileTypes: string[];
  keywords: string[];
}

export interface AISearchResponse {
  success: boolean;
  query: string;
  analysis: QueryAnalysis;
  filters: SearchFilters;
  results: AISearchResult[];
  totalFound: number;
  summary: string;
  error?: string;
}

export const useAISearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [searchResponse, setSearchResponse] = useState<AISearchResponse | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const { toast } = useToast();

  const search = useCallback(async (query: string, limit = 20): Promise<AISearchResponse | null> => {
    if (!query.trim()) {
      setResults([]);
      setSearchResponse(null);
      return null;
    }

    setIsSearching(true);
    setLastQuery(query);

    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: {
          query,
          userId: user?.user?.id,
          limit
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results);
      setSearchResponse(data);

      toast({
        title: 'AI Search Complete',
        description: data.summary,
      });

      // Log AI search to audit trail
      logAuditEvent({
        action: 'system.search_performed',
        category: 'ai_processing',
        resourceType: 'system',
        resourceName: 'AI Search',
        details: {
          query: query,
          results_count: data.totalFound,
          intent: data.analysis?.intent
        }
      });

      return data;

    } catch (error) {
      console.error('AI Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Search failed';

      toast({
        title: 'Search Failed',
        description: errorMessage,
        variant: 'destructive'
      });

      return null;
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const clearSearch = useCallback(() => {
    setResults([]);
    setSearchResponse(null);
    setLastQuery('');
  }, []);

  return {
    isSearching,
    results,
    searchResponse,
    lastQuery,
    search,
    clearSearch
  };
};

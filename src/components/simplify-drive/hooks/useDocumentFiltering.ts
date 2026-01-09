import { useState, useEffect, useMemo } from 'react';
import type { Document, SortOrder } from '../types';

interface UseDocumentFilteringOptions {
  documents: Document[];
  searchQuery: string;
  selectedFolder: string;
  selectedTag: string;
  sortBy: string;
  sortOrder: SortOrder;
}

export function useDocumentFiltering({
  documents,
  searchQuery,
  selectedFolder,
  selectedTag,
  sortBy,
  sortOrder,
}: UseDocumentFilteringOptions) {
  const filteredDocuments = useMemo(() => {
    console.log('🔍 useDocumentFiltering: Input documents:', documents.length, 'selectedFolder:', selectedFolder);
    
    // Check if search query has legal hold filter with document IDs
    const legalHoldMatch = searchQuery.match(/legal_hold:(\S+):(\S+)/);
    let legalHoldDocumentIds: string[] = [];
    let cleanSearchQuery = searchQuery;
    
    if (legalHoldMatch) {
      const [, , documentIdsStr] = legalHoldMatch;
      legalHoldDocumentIds = documentIdsStr.split(',');
      cleanSearchQuery = searchQuery.replace(/legal_hold:\S+:\S+/, '').trim();
    }
    
    let filtered = documents.filter(doc => {
      const searchLower = searchQuery.toLowerCase();
      
      // Helper function to recursively search in any object structure
      const searchInObject = (obj: any, depth: number = 0): boolean => {
        if (!obj || depth > 5) return false; // Limit recursion depth
        
        if (typeof obj === 'string') {
          return obj.toLowerCase().includes(searchLower);
        }
        
        if (Array.isArray(obj)) {
          return obj.some(item => searchInObject(item, depth + 1));
        }
        
        if (typeof obj === 'object') {
          for (const key in obj) {
            if (key.startsWith('_')) continue; // Skip metadata keys like _keyOrder
            const value = obj[key];
            if (searchInObject(value, depth + 1)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      // Helper function to search in hierarchical data structure
      const searchInHierarchicalData = (data: any): boolean => {
        if (!data || typeof data !== 'object') return false;
        
        // Search in hierarchical_data (snake_case - database format)
        if (data.hierarchical_data && typeof data.hierarchical_data === 'object') {
          if (searchInObject(data.hierarchical_data)) return true;
        }
        
        // Search in hierarchicalData (camelCase - frontend format)
        if (data.hierarchicalData && typeof data.hierarchicalData === 'object') {
          if (searchInObject(data.hierarchicalData)) return true;
        }
        
        // Also search in extractedFields array if it exists
        if (Array.isArray(data.extractedFields)) {
          for (const field of data.extractedFields) {
            if (field.value && typeof field.value === 'string' && field.value.toLowerCase().includes(searchLower)) {
              return true;
            }
            if (field.label && typeof field.label === 'string' && field.label.toLowerCase().includes(searchLower)) {
              return true;
            }
          }
        }
        
        // Search in entire data object as fallback (for flat structures)
        return searchInObject(data);
      };
      
      const matchesSearch = searchQuery === '' || 
        // Search in file name
        doc.file_name.toLowerCase().includes(searchLower) ||
        // Search in extracted text content
        doc.extracted_text?.toLowerCase().includes(searchLower) ||
        // Search in hierarchical data structure (analysis_result)
        searchInHierarchicalData(doc.analysis_result) ||
        // Search in AI summary
        doc.insights?.summary?.toLowerCase().includes(searchLower) ||
        // Search in AI-generated title
        doc.insights?.ai_generated_title?.toLowerCase().includes(searchLower) ||
        // Search in key topics
        doc.insights?.key_topics?.some(topic => topic.toLowerCase().includes(searchLower)) ||
        // Search in tags
        doc.tags?.some(tag => tag.name.toLowerCase().includes(searchLower)) ||
        // Search in document type
        doc.file_type?.toLowerCase().includes(searchLower);
      
      // Legal hold filter - filter by document IDs
      if (legalHoldDocumentIds.length > 0) {
        if (!legalHoldDocumentIds.includes(doc.id)) {
          return false;
        }
      }

      // Debug: Log search results for non-empty queries
      if (searchQuery && searchQuery.length > 2) {
        const hasAnalysisResult = !!doc.analysis_result && Object.keys(doc.analysis_result).length > 0;
        if (hasAnalysisResult) {
          console.log(`🔎 Search "${searchQuery}" in doc "${doc.file_name}":`, {
            matchesSearch,
            hasAnalysisResult,
            analysisResultKeys: Object.keys(doc.analysis_result || {}),
            hasHierarchicalData: !!doc.analysis_result?.hierarchical_data,
            hasHierarchicalDataCamel: !!doc.analysis_result?.hierarchicalData
          });
        }
      }

      // When a specific folder is selected (not 'all', 'recycle-bin', or 'media-browser'),
      // the backend already filters documents, so we should not filter again on frontend
      const isSpecificFolderView = selectedFolder !== 'all' && 
        selectedFolder !== 'recycle-bin' && 
        selectedFolder !== 'media-browser';
      
      const matchesFolder = selectedFolder === 'all' || 
        selectedFolder === 'recycle-bin' ||
        selectedFolder === 'media-browser' ||
        isSpecificFolderView || // Backend already filtered, accept all
        doc.folders?.some(folder => folder.id === selectedFolder);

      const matchesTag = selectedTag === 'all' || 
        doc.tags?.some(tag => tag.id === selectedTag);

      return matchesSearch && matchesFolder && matchesTag;
    });

    // Sort documents
    filtered.sort((a, b) => {
      // Sort by the selected field
      switch (sortBy) {
        case 'name': {
          const aName = (a.file_name || '').toLowerCase();
          const bName = (b.file_name || '').toLowerCase();
          const comparison = aName.localeCompare(bName);
          return sortOrder === 'asc' ? comparison : -comparison;
        }
        case 'size': {
          const aSize = a.file_size || 0;
          const bSize = b.file_size || 0;
          return sortOrder === 'asc' ? aSize - bSize : bSize - aSize;
        }
        case 'importance': {
          const aScore = a.insights?.importance_score || 0;
          const bScore = b.insights?.importance_score || 0;
          return sortOrder === 'asc' ? aScore - bScore : bScore - aScore;
        }
        case 'created_at':
        default: {
          // Parse dates and get timestamps (newer dates = larger timestamps)
          const now = Date.now();
          let aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          let bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          
          // Treat future dates as very old (push them to bottom when sorting by newest first)
          // This handles timezone issues where documents have incorrect future timestamps
          if (aTime > now) aTime = 0;
          if (bTime > now) bTime = 0;
          
          // For desc (newest first): larger timestamp should come first (return negative when a > b)
          // For asc (oldest first): smaller timestamp should come first (return negative when a < b)
          return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
        }
      }
    });

    console.log('🔍 useDocumentFiltering: Filtered documents:', filtered.length, 'sortBy:', sortBy, 'sortOrder:', sortOrder);
    
    // Debug: Log first few documents with their timestamps
    if (filtered.length > 0) {
      console.log('📅 First 5 documents after sort:');
      filtered.slice(0, 5).forEach((doc, i) => {
        const timestamp = doc.created_at ? new Date(doc.created_at).getTime() : 0;
        console.log(`  ${i + 1}. "${doc.file_name}" - created_at: ${doc.created_at} (${timestamp}) - status: ${doc.processing_status}`);
      });
    }
    
    return filtered;
  }, [documents, searchQuery, selectedFolder, selectedTag, sortBy, sortOrder]);

  return { filteredDocuments };
}

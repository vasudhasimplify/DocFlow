import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logDocumentStarred } from '@/utils/auditLogger';

export interface Favorite {
  id: string;
  document_id: string;
  user_id: string;
  created_at: string;
  notes: string | null;
  color: string;
}

export interface FavoriteWithDocument extends Favorite {
  document?: {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
    storage_url: string | null;
  };
}

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteWithDocument[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFavorites = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setFavorites([]);
        setFavoriteIds(new Set());
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('document_favorites')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const favs = (data || []) as FavoriteWithDocument[];
      setFavorites(favs);
      setFavoriteIds(new Set(favs.map(f => f.document_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (documentId: string, notes?: string, color?: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add favorites",
          variant: "destructive",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('document_favorites')
        .insert({
          document_id: documentId,
          user_id: user.user.id,
          notes: notes || null,
          color: color || 'yellow',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already favorited",
            description: "This document is already in your favorites",
          });
          return false;
        }
        throw error;
      }

      setFavorites(prev => [data as FavoriteWithDocument, ...prev]);
      setFavoriteIds(prev => new Set([...prev, documentId]));

      toast({
        title: "Added to favorites",
        description: "Document has been starred",
      });

      // Log starred event to audit trail
      logDocumentStarred(documentId, 'Document', true);

      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast({
        title: "Failed to add favorite",
        description: "Could not star this document",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const removeFavorite = useCallback(async (documentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { error } = await supabase
        .from('document_favorites')
        .delete()
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.document_id !== documentId));
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });

      toast({
        title: "Removed from favorites",
        description: "Document has been unstarred",
      });

      // Log unstarred event to audit trail
      logDocumentStarred(documentId, 'Document', false);

      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Failed to remove favorite",
        description: "Could not unstar this document",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const toggleFavorite = useCallback(async (documentId: string) => {
    if (favoriteIds.has(documentId)) {
      return removeFavorite(documentId);
    } else {
      return addFavorite(documentId);
    }
  }, [favoriteIds, addFavorite, removeFavorite]);

  const isFavorite = useCallback((documentId: string) => {
    return favoriteIds.has(documentId);
  }, [favoriteIds]);

  const updateFavoriteNotes = useCallback(async (documentId: string, notes: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { error } = await supabase
        .from('document_favorites')
        .update({ notes })
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      setFavorites(prev =>
        prev.map(f => f.document_id === documentId ? { ...f, notes } : f)
      );

      toast({
        title: "Notes updated",
        description: "Your notes have been saved",
      });

      return true;
    } catch (error) {
      console.error('Error updating notes:', error);
      return false;
    }
  }, [toast]);

  const updateFavoriteColor = useCallback(async (documentId: string, color: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { error } = await supabase
        .from('document_favorites')
        .update({ color })
        .eq('document_id', documentId)
        .eq('user_id', user.user.id);

      if (error) throw error;

      setFavorites(prev =>
        prev.map(f => f.document_id === documentId ? { ...f, color } : f)
      );

      return true;
    } catch (error) {
      console.error('Error updating color:', error);
      return false;
    }
  }, []);

  return {
    favorites,
    favoriteIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    updateFavoriteNotes,
    updateFavoriteColor,
    refetch: fetchFavorites,
  };
};

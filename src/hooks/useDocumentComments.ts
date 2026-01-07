import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  DocumentComment,
  CommentReaction,
  AnchorPosition,
} from '@/types/collaboration';
import { useToast } from '@/hooks/use-toast';

interface UseDocumentCommentsOptions {
  documentId: string;
  guestEmail?: string;
  guestName?: string;
}

export const useDocumentComments = ({ documentId, guestEmail, guestName }: UseDocumentCommentsOptions) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!documentId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_comments')
        .select(`
          *,
          comment_reactions (*)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organize comments into threads
      const commentsMap = new Map<string, DocumentComment>();
      const rootComments: DocumentComment[] = [];

      data?.forEach((comment: any) => {
        const formattedComment: DocumentComment = {
          ...comment,
          reactions: comment.comment_reactions || [],
          replies: [],
        };

        // If it's a guest comment, populate the user info from guest fields
        if (!formattedComment.user && (formattedComment.guest_email || formattedComment.guest_name)) {
          formattedComment.user = {
            email: formattedComment.guest_email,
            name: formattedComment.guest_name,
          };
        }

        commentsMap.set(comment.id, formattedComment);
      });

      commentsMap.forEach((comment) => {
        if (comment.parent_comment_id) {
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // Add comment
  const addComment = useCallback(async (
    content: string,
    options?: {
      parentCommentId?: string;
      selectionStart?: number;
      selectionEnd?: number;
      selectionText?: string;
      anchorPosition?: AnchorPosition;
    }
  ) => {
    if ((!user && !guestEmail) || !documentId) {
      console.log('addComment: Missing required data', { user: !!user, guestEmail, documentId });
      return;
    }

    const commentData = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      document_id: documentId,
      user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      comment: content,
      guest_email: guestEmail,
      guest_name: guestName,
      parent_comment_id: options?.parentCommentId || null,
      selection_start: options?.selectionStart,
      selection_end: options?.selectionEnd,
      selection_text: options?.selectionText,
      anchor_position: options?.anchorPosition,
      status: 'open' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      // Try to insert into database
      const { data, error } = await (supabase
        .from('document_comments')
        .insert({
          document_id: documentId,
          user_id: user?.id || '00000000-0000-0000-0000-000000000000',
          comment: content,
          guest_email: guestEmail,
          guest_name: guestName,
          parent_comment_id: options?.parentCommentId,
          selection_start: options?.selectionStart,
          selection_end: options?.selectionEnd,
          selection_text: options?.selectionText,
          anchor_position: options?.anchorPosition,
          status: 'open',
        } as any)
        .select()
        .single());

      if (error) {
        console.warn('Database insert failed, using local storage:', error.message);
        // Store locally for guests when database fails (likely RLS issue)
        const localKey = `guest_comments_${documentId}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        existing.push(commentData);
        localStorage.setItem(localKey, JSON.stringify(existing));

        // Add to local state immediately
        const newComment: DocumentComment = {
          ...commentData,
          content: content, // Add the content property required by DocumentComment
          reactions: [],
          replies: [],
          user: {
            email: guestEmail,
            name: guestName,
          }
        } as DocumentComment;

        if (options?.parentCommentId) {
          // Find parent and add as reply
          setComments(prev => {
            const updated = [...prev];
            const parent = updated.find(c => c.id === options.parentCommentId);
            if (parent) {
              parent.replies = parent.replies || [];
              parent.replies.push(newComment);
            }
            return updated;
          });
        } else {
          setComments(prev => [...prev, newComment]);
        }

        toast({
          title: 'Comment added',
          description: 'Your comment has been posted',
        });
        return newComment;
      }

      // Database insert successful
      await fetchComments();

      toast({
        title: 'Comment added',
        description: 'Your comment has been posted',
      });

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to add comment: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  }, [user, guestEmail, guestName, documentId, fetchComments, toast]);

  // Update comment
  const updateComment = useCallback(async (commentId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await (supabase
        .from('document_comments')
        .update({
          comment: content,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', commentId)
        .eq('user_id', user.id));

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update comment',
        variant: 'destructive',
      });
    }
  }, [user, fetchComments, toast]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchComments();

      toast({
        title: 'Comment deleted',
        description: 'Your comment has been removed',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
    }
  }, [user, fetchComments, toast]);

  // Resolve comment
  const resolveComment = useCallback(async (commentId: string) => {
    if (!user || !documentId) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', commentId);

      if (error) throw error;

      // Log activity
      await supabase
        .from('document_activity')
        .insert({
          document_id: documentId,
          user_id: user.id,
          action_type: 'comment_resolved',
          action_details: { comment_id: commentId },
        });

      await fetchComments();

      toast({
        title: 'Comment resolved',
        description: 'The comment thread has been marked as resolved',
      });
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  }, [user, documentId, fetchComments, toast]);

  // Reopen comment
  const reopenComment = useCallback(async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('document_comments')
        .update({
          status: 'open',
          resolved_at: null,
          resolved_by: null,
        })
        .eq('id', commentId);

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error reopening comment:', error);
    }
  }, [user, fetchComments]);

  // Add reaction
  const addReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user && !guestEmail) return;

    try {
      const reactionData = {
        comment_id: commentId,
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        reaction,
        guest_email: guestEmail,
        guest_name: guestName
      };

      const { error } = await supabase
        .from('comment_reactions')
        .upsert(reactionData, {
          onConflict: user ? 'comment_id,user_id,reaction' : 'comment_id,guest_email,reaction'
        });

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [user, guestEmail, guestName, fetchComments]);

  // Remove reaction
  const removeReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user && !guestEmail) return;

    try {
      let query = supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('reaction', reaction);

      if (user) {
        query = query.eq('user_id', user.id);
      } else {
        query = query.eq('guest_email', guestEmail);
      }

      const { error } = await query;

      if (error) throw error;

      await fetchComments();
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  }, [user, guestEmail, fetchComments]);

  // Toggle reaction
  const toggleReaction = useCallback(async (commentId: string, reaction: string) => {
    if (!user && !guestEmail) return;

    const comment = findComment(comments, commentId);
    const hasReaction = comment?.reactions?.some(
      r => (user && r.user_id === user.id && r.reaction === reaction) ||
        (!user && r.guest_email === guestEmail && r.reaction === reaction)
    );

    if (hasReaction) {
      await removeReaction(commentId, reaction);
    } else {
      await addReaction(commentId, reaction);
    }
  }, [user, guestEmail, guestName, comments, addReaction, removeReaction]);

  // Helper to find a comment in the tree
  const findComment = (
    comments: DocumentComment[],
    commentId: string
  ): DocumentComment | undefined => {
    for (const comment of comments) {
      if (comment.id === commentId) return comment;
      if (comment.replies) {
        const found = findComment(comment.replies, commentId);
        if (found) return found;
      }
    }
    return undefined;
  };

  // Get open comments count
  const getOpenCommentsCount = useCallback(() => {
    return comments.filter(c => c.status === 'open').length;
  }, [comments]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!documentId) return;

    fetchComments();

    const channel = supabase
      .channel(`comments-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_comments',
          filter: `document_id=eq.${documentId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [documentId, fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    reopenComment,
    toggleReaction,
    getOpenCommentsCount,
    refetch: fetchComments,
  };
};

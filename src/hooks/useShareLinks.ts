import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedShareLink, CreateShareLinkParams } from '@/types/shareLink';
import { logAuditEvent } from '@/utils/auditLogger';

import {
  loadShareLinksFromStorage,
  saveShareLinksToStorage
} from '@/utils/shareLinkStorage';

export function useShareLinks(resourceId?: string, resourceType?: string) {
  const [links, setLinks] = useState<EnhancedShareLink[]>(() => loadShareLinksFromStorage());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const initialFetchDone = useRef(false);

  // Save to localStorage whenever links change
  useEffect(() => {
    saveShareLinksToStorage(links);
  }, [links]);

  // Sync from localStorage when tab becomes visible or storage changes
  useEffect(() => {
    const syncFromStorage = () => {
      const storedLinks = loadShareLinksFromStorage();
      // Only update if there are actual changes
      if (JSON.stringify(storedLinks) !== JSON.stringify(links)) {
        setLinks(storedLinks);
      }
    };

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      // Check for both storage keys just in case
      if (e.key === 'share_links_cache') {
        syncFromStorage();
      }
    };

    // Listen for visibility change (when user returns to this tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromStorage();
      }
    };

    // Listen for focus (when user clicks back on this window)
    const handleFocus = () => {
      syncFromStorage();
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [links]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      // First, reload from localStorage to get any updates
      const currentLocalLinks = loadShareLinksFromStorage();
      setLinks(currentLocalLinks);

      // Query both tables: external_shares (legacy) and share_links (new)
      let allDbLinks: any[] = [];

      // Query external_shares (legacy table)
      let query1 = supabase.from('external_shares').select('*');
      if (resourceId) query1 = query1.eq('resource_id', resourceId);
      if (resourceType) query1 = query1.eq('resource_type', resourceType);
      const { data: data1 } = await query1;
      if (data1) allDbLinks.push(...data1);

      // Query share_links (new table with use_count)
      let query2 = supabase.from('share_links').select('*');
      if (resourceId) query2 = query2.eq('resource_id', resourceId);
      if (resourceType) query2 = query2.eq('resource_type', resourceType);
      const { data: data2 } = await query2;
      if (data2) {
        console.log('📊 share_links from DB:', data2.map(l => ({ id: l.id, name: l.resource_name, use_count: l.use_count })));
        allDbLinks.push(...data2);
      }

      if (allDbLinks.length > 0) {
        // Merge database links with local links (prefer database for use_count)
        setLinks(prevLinks => {
          const dbIds = new Set(allDbLinks.map((d: any) => d.id));
          const localOnly = prevLinks.filter(l => !dbIds.has(l.id));

          // For database links, ensure use_count is preserved
          const mergedDbLinks = allDbLinks.map(dbLink => ({
            ...dbLink,
            use_count: dbLink.use_count || 0,
            download_count: dbLink.download_count || 0
          }));

          return [...mergedDbLinks, ...localOnly];
        });
      }
      // If no data, keep existing local links
    } catch (err) {
      console.warn('Failed to fetch from database, using local data:', err);
    } finally {
      setLoading(false);
    }
  }, [resourceId, resourceType]);

  // Fetch on mount (only once)
  useEffect(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchLinks();
    }
  }, [fetchLinks]);

  const createLink = useCallback(async (params: CreateShareLinkParams): Promise<EnhancedShareLink | null> => {
    setLoading(true);
    try {
      // Generate a Supabase signed URL for the document (works from any browser)
      let signedUrl: string | undefined;

      if (params.resource_type === 'document') {
        // Fetch document storage_path
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('storage_path')
          .eq('id', params.resource_id)
          .single();

        if (!docError && docData?.storage_path) {
          // Calculate expiry in seconds based on expires_in_hours (default to 7 days if not specified)
          const expirySeconds = params.expires_in_hours
            ? params.expires_in_hours * 60 * 60
            : 7 * 24 * 60 * 60; // 7 days default

          // Generate signed URL
          const { data: urlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(docData.storage_path, expirySeconds);

          if (!urlError && urlData?.signedUrl) {
            signedUrl = urlData.signedUrl;
          }
        }
      }

      const newLink: EnhancedShareLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        resource_name: params.resource_name,
        invitation_token: Math.random().toString(36).substring(2, 12),
        token: Math.random().toString(36).substring(2, 12), // Keep for backwards compatibility
        short_code: Math.random().toString(36).substring(2, 7),
        permission: params.permission,
        allow_download: params.allow_download ?? params.permission === 'download',
        allow_print: params.allow_print ?? false,
        allow_copy: params.allow_copy ?? false,
        password_protected: !!params.password,
        password_hash: params.password, // In a real app, this should be hashed securely
        require_email: params.require_email ?? false,
        require_name: params.require_name ?? false,
        allowed_emails: params.allowed_emails,
        allowed_domains: params.allowed_domains,
        blocked_emails: params.blocked_emails,
        max_uses: params.max_uses,
        use_count: 0,
        expires_at: params.expires_in_hours
          ? new Date(Date.now() + params.expires_in_hours * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default 7 days
        notify_on_access: params.notify_on_access ?? false,
        track_views: true,
        watermark_enabled: params.watermark_enabled ?? false,
        watermark_text: params.watermark_text,
        download_count: 0,
        unique_visitor_ids: [],
        name: params.name,
        created_by: user?.id || 'anonymous',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        signed_url: signedUrl, // Direct signed URL that works anywhere
      };

      // Save to database (share_links table - designed for public share links)
      try {
        // Generate proper UUID for database
        const dbId = crypto.randomUUID();

        // Use share_links table - matches schema from 20251212_simplifydrive_migration.sql
        // Columns: id, resource_type, resource_id, resource_name, token, short_code, permission, 
        //          allow_download, allow_print, password_protected, password_hash, max_uses, 
        //          use_count, expires_at, created_by, is_active, name, notify_on_access, require_email, signed_url
        const dbRecord = {
          id: dbId,
          resource_type: newLink.resource_type,
          resource_id: newLink.resource_id,
          resource_name: newLink.resource_name,
          token: newLink.token,                    // Main lookup field
          short_code: newLink.token,               // Also use as short_code for /s/ routes
          permission: newLink.permission,
          allow_download: newLink.allow_download,
          allow_print: newLink.allow_print,
          password_protected: newLink.password_protected,
          password_hash: newLink.password_hash,
          max_uses: newLink.max_uses,
          use_count: 0,
          expires_at: newLink.expires_at,
          created_by: user?.id,                    // Required field
          is_active: true,
          name: newLink.name,
          notify_on_access: newLink.notify_on_access,
          require_email: newLink.require_email,
          signed_url: signedUrl,                   // Direct signed URL
        };

        console.log('📤 Saving share link to share_links table:', { token: newLink.token, resource_name: newLink.resource_name });

        const { error } = await supabase
          .from('share_links')
          .insert(dbRecord);

        if (error) {
          console.error('❌ Database insert to share_links failed:', error);
          toast({
            title: 'Warning',
            description: 'Link created locally. May not work in other browsers.',
            variant: 'destructive'
          });
        } else {
          console.log('✅ Share link saved to share_links successfully! Token:', newLink.token);
          newLink.id = dbId;
        }
      } catch (dbErr) {
        console.error('Database unavailable, saving locally:', dbErr);
      }

      // Always update local state
      setLinks(prev => [newLink, ...prev]);

      toast({
        title: 'Link created',
        description: 'Share link has been created successfully'
      });

      // Log share link creation to audit trail with recipient info
      logAuditEvent({
        action: 'document.shared',
        category: 'access_control',
        resourceType: params.resource_type as any,
        resourceName: params.resource_name,
        documentId: params.resource_type === 'document' ? params.resource_id : undefined,
        details: {
          permission_level: params.permission,
          shared_with: params.guest_email ? [params.guest_email] : params.allowed_emails || [],
          reason: 'Share link created',
        },
      });

      return newLink;
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateLink = useCallback(async (
    linkId: string,
    updates: Partial<EnhancedShareLink>
  ): Promise<boolean> => {
    const originalLink = links.find(l => l.id === linkId);

    try {
      // Optimistic update
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? { ...link, ...updates, updated_at: new Date().toISOString() }
          : link
      ));

      // Try to update database - update BOTH tables to ensure consistency
      try {
        // Update share_links table (primary storage for new links)
        await supabase
          .from('share_links')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', linkId);
        console.log('✅ Updated share_links table for', linkId);
      } catch (dbErr) {
        console.warn('share_links update failed:', dbErr);
      }

      try {
        // Also update external_shares (legacy table)
        await supabase
          .from('external_shares')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', linkId);
      } catch (dbErr) {
        console.warn('external_shares update failed:', dbErr);
      }

      toast({
        title: 'Link updated',
        description: 'Share link settings have been updated'
      });
      return true;
    } catch (err) {
      // Rollback
      if (originalLink) {
        setLinks(prev => prev.map(link =>
          link.id === linkId ? originalLink : link
        ));
      }
      toast({
        title: 'Error',
        description: 'Failed to update share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, links]);

  const revokeLink = useCallback(async (linkId: string): Promise<boolean> => {
    const originalLink = links.find(l => l.id === linkId);

    try {
      // Optimistic update - immediately update local state
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? { ...link, is_active: false, updated_at: new Date().toISOString() }
          : link
      ));

      // Try to update database
      try {
        await supabase
          .from('external_shares')
          .update({
            is_active: false,
            status: 'revoked',
            updated_at: new Date().toISOString()
          })
          .eq('id', linkId);
      } catch (dbErr) {
        console.warn('Database update failed:', dbErr);
      }

      toast({
        title: 'Link revoked',
        description: 'Share link has been disabled'
      });

      // Log share link revocation to audit trail
      if (originalLink) {
        logAuditEvent({
          action: 'access.revoked',
          category: 'access_control',
          resourceType: originalLink.resource_type as any,
          resourceName: originalLink.resource_name,
          documentId: originalLink.resource_type === 'document' ? originalLink.resource_id : undefined,
          details: {
            reason: 'Share link revoked',
          },
        });
      }

      return true;
    } catch (err) {
      // Rollback on error
      if (originalLink) {
        setLinks(prev => prev.map(link =>
          link.id === linkId ? originalLink : link
        ));
      }
      toast({
        title: 'Error',
        description: 'Failed to revoke share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, links]);

  const reactivateLink = useCallback(async (linkId: string): Promise<boolean> => {
    const originalLink = links.find(l => l.id === linkId);

    try {
      // Optimistic update
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? { ...link, is_active: true, updated_at: new Date().toISOString() }
          : link
      ));

      // Try to update database
      try {
        await supabase
          .from('external_shares')
          .update({
            is_active: true,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', linkId);
      } catch (dbErr) {
        console.warn('Database update failed:', dbErr);
      }

      toast({
        title: 'Link reactivated',
        description: 'Share link has been enabled'
      });
      return true;
    } catch (err) {
      if (originalLink) {
        setLinks(prev => prev.map(link =>
          link.id === linkId ? originalLink : link
        ));
      }
      toast({
        title: 'Error',
        description: 'Failed to reactivate share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, links]);

  const deleteLink = useCallback(async (linkId: string): Promise<boolean> => {
    const originalLinks = [...links];

    try {
      // Optimistic delete
      setLinks(prev => prev.filter(link => link.id !== linkId));

      // Try to delete from database
      try {
        await supabase
          .from('external_shares')
          .delete()
          .eq('id', linkId);
      } catch (dbErr) {
        console.warn('Database delete failed:', dbErr);
      }

      toast({
        title: 'Link deleted',
        description: 'Share link has been permanently deleted'
      });
      return true;
    } catch (err) {
      // Rollback
      setLinks(originalLinks);
      toast({
        title: 'Error',
        description: 'Failed to delete share link',
        variant: 'destructive'
      });
      return false;
    }
  }, [toast, links]);

  const duplicateLink = useCallback(async (linkId: string): Promise<EnhancedShareLink | null> => {
    const original = links.find(l => l.id === linkId);
    if (!original) return null;

    const duplicate: EnhancedShareLink = {
      ...original,
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invitation_token: Math.random().toString(36).substring(2, 12),
      token: Math.random().toString(36).substring(2, 12),
      short_code: Math.random().toString(36).substring(2, 7),
      name: original.name ? `${original.name} (copy)` : 'Copy',
      use_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_accessed_at: undefined,
      analytics: undefined
    };

    // Try to save to database
    try {
      await supabase
        .from('external_shares')
        .insert(duplicate);
    } catch (dbErr) {
      console.warn('Database insert failed:', dbErr);
    }

    setLinks(prev => [duplicate, ...prev]);
    toast({
      title: 'Link duplicated',
      description: 'A copy of the share link has been created'
    });
    return duplicate;
  }, [links, toast]);

  // Increment view count for a link
  const incrementViewCount = useCallback(async (linkId: string): Promise<boolean> => {
    try {
      // Optimistic update - immediately update local state
      setLinks(prev => prev.map(link =>
        link.id === linkId
          ? {
            ...link,
            use_count: link.use_count + 1,
            last_accessed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          : link
      ));

      // Try to update database
      try {
        await supabase
          .from('external_shares')
          .update({
            last_accessed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', linkId);

        // Also try to increment using RPC if available
        await supabase.rpc('increment_view_count', { share_id: linkId });
      } catch (dbErr) {
        console.log('Database update for view count failed, using local only');
      }

      return true;
    } catch (err) {
      console.error('Failed to increment view count:', err);
      return false;
    }
  }, []);

  // Get total views across all links
  const totalViews = links.reduce((sum, l) => sum + (l.use_count || 0), 0);

  // Filter functions for different categories
  const getActiveLinks = useCallback(() => {
    return links.filter(l => {
      // Must be active
      if (!l.is_active) return false;
      // Must not be expired by date
      if (l.expires_at && new Date(l.expires_at) <= new Date()) return false;
      // Must not have reached max uses limit
      if (l.max_uses && l.use_count >= l.max_uses) return false;
      return true;
    });
  }, [links]);

  const getExpiredLinks = useCallback(() => {
    // Show links that have passed their expiration date (regardless of is_active status)
    // Also include links that reached their max_uses limit
    return links.filter(l => {
      const isExpiredByDate = l.expires_at && new Date(l.expires_at) <= new Date();
      const isExpiredByUsage = l.max_uses && l.use_count >= l.max_uses;
      return isExpiredByDate || isExpiredByUsage;
    });
  }, [links]);

  const getRevokedLinks = useCallback(() => {
    return links.filter(l => !l.is_active);
  }, [links]);

  return {
    links,
    loading,
    totalViews,
    activeLinks: getActiveLinks(),
    expiredLinks: getExpiredLinks(),
    revokedLinks: getRevokedLinks(),
    createLink,
    updateLink,
    revokeLink,
    reactivateLink,
    deleteLink,
    duplicateLink,
    incrementViewCount,
    refreshLinks: fetchLinks
  };
}

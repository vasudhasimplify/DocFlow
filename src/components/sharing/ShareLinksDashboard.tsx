import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Link,
  Copy,
  Check,
  Plus,
  MoreHorizontal,
  Eye,
  Download,
  Edit,
  MessageSquare,
  Lock,
  Clock,
  Users,
  Mail,
  ExternalLink,
  Trash2,
  Pause,
  Play,
  BarChart3,
  Globe,
  Smartphone,
  Monitor,
  QrCode,
  Settings,
  Search,
  Filter,
  TrendingUp
} from 'lucide-react';
import { useShareLinks } from '@/hooks/useShareLinks';
import { useToast } from '@/hooks/use-toast';
import type { EnhancedShareLink, ShareLinkPermission } from '@/types/shareLink';
import {
  SHARE_LINK_PERMISSION_INFO,
  generateShareUrl,
  generateQRCodeUrl
} from '@/types/shareLink';
import { formatDistanceToNow, format } from 'date-fns';
import { QuickShareDialog } from './QuickShareDialog';
import { ShareLinkAnalyticsPanel } from './ShareLinkAnalyticsPanel';

interface ShareLinksDashboardProps {
  resourceId?: string;
  resourceType?: 'document' | 'folder' | 'workspace' | 'form';
  resourceName?: string;
}

export const ShareLinksDashboard: React.FC<ShareLinksDashboardProps> = ({
  resourceId,
  resourceType = 'document',
  resourceName = 'Document'
}) => {
  const {
    links,
    loading,
    totalViews,
    activeLinks,
    expiredLinks,
    revokedLinks,
    createLink,
    updateLink,
    revokeLink,
    reactivateLink,
    deleteLink,
    duplicateLink,
    incrementViewCount,
    refreshLinks
  } = useShareLinks(resourceId);
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLink, setSelectedLink] = useState<EnhancedShareLink | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredLinks = (activeTab === 'active' ? activeLinks : activeTab === 'expired' ? expiredLinks : revokedLinks)
    .filter(l =>
      l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.resource_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalActiveLinks = activeLinks.length;

  const copyLink = async (link: EnhancedShareLink) => {
    // Always use token-based URL that routes through GuestAccessPage
    const url = generateShareUrl(link.token);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for non-secure contexts (http://192.168.x.x)
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
          throw new Error('Failed to copy');
        }

        document.body.removeChild(textArea);
      }

      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Link copied',
        description: 'Share link copied to clipboard'
      });
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast({
        title: 'Copy failed',
        description: 'Could not copy link to clipboard',
        variant: 'destructive'
      });
    }
  };

  const getPermissionIcon = (perm: ShareLinkPermission) => {
    switch (perm) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'download': return <Download className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (link: EnhancedShareLink) => {
    if (!link.is_active) {
      return <Badge variant="destructive">Revoked</Badge>;
    }
    if (link.expires_at && new Date(link.expires_at) <= new Date()) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (link.max_uses && link.use_count >= link.max_uses) {
      return <Badge variant="secondary">Limit Reached</Badge>;
    }
    return <Badge variant="default" className="bg-green-500">Active</Badge>;
  };

  if (selectedLink) {
    return (
      <ShareLinkAnalyticsPanel
        link={selectedLink}
        onBack={() => setSelectedLink(null)}
        onUpdate={updateLink}
        onRevoke={revokeLink}
        onDelete={deleteLink}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="by-me" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="by-me" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Shared by me
          </TabsTrigger>
          <TabsTrigger value="with-me" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Shared with me
          </TabsTrigger>
        </TabsList>

        <TabsContent value="by-me" className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Links</p>
                    <p className="text-2xl font-bold">{totalActiveLinks}</p>
                  </div>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Link className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-2xl font-bold">{totalViews}</p>
                  </div>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Eye className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Password Protected</p>
                    <p className="text-2xl font-bold">
                      {links.filter(l => l.password_protected).length}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Lock className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold">
                      {activeLinks.filter(l => l.expires_at && new Date(l.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}
                    </p>
                  </div>
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  My Shared Links
                </CardTitle>
                <CardDescription>
                  Manage ownership and track links you created
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Link
              </Button>
            </CardHeader>

            <CardContent>
              {/* Search and Filter */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search links..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="active" className="flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    Active
                    <Badge variant="secondary" className="ml-1">{activeLinks.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="expired" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expired
                    <Badge variant="secondary" className="ml-1">{expiredLinks.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="revoked" className="flex items-center gap-2">
                    <Pause className="w-4 h-4" />
                    Revoked
                    <Badge variant="secondary" className="ml-1">{revokedLinks.length}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  <ScrollArea className="h-[400px]">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : filteredLinks.length === 0 ? (
                      <div className="text-center py-8">
                        <Link className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No links found</p>
                        {activeTab === 'active' && (
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowCreateDialog(true)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Create your first link
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredLinks.map((link) => (
                          <div
                            key={link.id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            {/* Icon & Permission */}
                            <div className="p-2 bg-muted rounded-lg">
                              {getPermissionIcon(link.permission)}
                            </div>

                            {/* Link Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium truncate">
                                  {link.name || link.resource_name || 'Untitled Link'}
                                </p>
                                {getStatusBadge(link)}
                                {link.password_protected && (
                                  <Lock className="w-3 h-3 text-muted-foreground" />
                                )}
                                {link.require_email && (
                                  <Mail className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {link.use_count} views
                                  {link.max_uses && ` / ${link.max_uses}`}
                                </span>
                                <span>
                                  Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
                                </span>
                                {link.expires_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(link.expires_at) > new Date()
                                      ? `Expires ${format(new Date(link.expires_at), 'MMM d')}`
                                      : 'Expired'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Usage Progress */}
                            {link.max_uses && (
                              <div className="w-24">
                                <Progress
                                  value={(link.use_count / link.max_uses) * 100}
                                  className="h-2"
                                />
                                <p className="text-xs text-muted-foreground text-center mt-1">
                                  {Math.round((link.use_count / link.max_uses) * 100)}% used
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => copyLink(link)}
                              >
                                {copiedId === link.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedLink(link)}
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => window.open(generateShareUrl(link.token), '_blank')}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => copyLink(link)}>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Link
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setSelectedLink(link)}>
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    View Analytics
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => duplicateLink(link.id)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      incrementViewCount(link.id);
                                      toast({
                                        title: 'View recorded',
                                        description: `View count for "${link.name || link.resource_name}" increased by 1`
                                      });
                                    }}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Simulate View
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {link.is_active ? (
                                    <DropdownMenuItem onClick={() => revokeLink(link.id)}>
                                      <Pause className="w-4 h-4 mr-2" />
                                      Revoke Link
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => reactivateLink(link.id)}>
                                      <Play className="w-4 h-4 mr-2" />
                                      Reactivate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteLink(link.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="with-me">
          <SharedWithMeList />
        </TabsContent>
      </Tabs>

      <QuickShareDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateLink={createLink}
      />
    </div>
  );
};

function SharedWithMeList() {
  // Use explicit type to avoid import errors if not exported
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchSharedWithMe = async () => {
      try {
        // Get the current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.error("SharedWithMeList: No session found");
          setLoading(false);
          return;
        }

        const response = await fetch('/api/shares/shared-with-me', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          setShares(data);
        } else {
          console.error("SharedWithMeList: Expected array but got", data);
          setShares([]);
        }
      } catch (err) {
        console.error("Failed to fetch shared with me", err);
        setShares([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedWithMe();
  }, []);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  if (shares.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Download className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p>No documents have been shared with you yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared With Me</CardTitle>
        <CardDescription>Documents others have shared with you</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {shares.map(share => {
            // Check if this is a direct share (shared with registered user) or a guest link share
            const isDirectShare = share.invitation_token?.startsWith('direct-');
            const shareType = isDirectShare ? 'Direct Share' : 'Guest Share';

            const handleOpen = () => {
              if (isDirectShare) {
                // For direct shares, navigate to the document in SimplifyDrive
                window.location.href = `/documents?doc=${share.resource_id}`;
              } else {
                // For guest shares, open the guest link
                window.open(generateShareUrl(share.invitation_token), '_blank');
              }
            };

            return (
              <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${isDirectShare ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {share.permission === 'view' ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{share.resource_name || 'Untitled'}</p>
                      <Badge variant="secondary" className={isDirectShare ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                        {shareType}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {share.owner_email ? `From: ${share.owner_email}` : (share.owner_id ? 'From: SimplifyDrive User' : 'Guest Link')} • {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleOpen}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Unified list showing all shares (Guest Sharing + E-Signatures)
function SharedByMeList() {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchAllShares = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const allShares: any[] = [];

        // 1. Fetch Share Links
        const { data: shareLinks } = await supabase
          .from('share_links')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (shareLinks) {
          shareLinks.forEach(link => {
            allShares.push({
              id: link.id,
              type: 'link',
              documentName: link.name || link.resource_name || 'Document',
              recipientEmail: 'Public Link',
              permission: link.permission || 'view',
              status: link.is_active ? (link.expires_at && new Date(link.expires_at) < new Date() ? 'expired' : 'active') : 'revoked',
              viewCount: link.use_count || 0,
              createdAt: link.created_at,
              token: link.token
            });
          });
        }

        // 2. Fetch Guest Shares (external_shares)
        const { data: guestShares } = await supabase
          .from('external_shares')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (guestShares) {
          guestShares.forEach(share => {
            allShares.push({
              id: share.id,
              type: 'guest',
              documentName: share.resource_name || 'Document',
              recipientEmail: share.guest_email,
              permission: share.permission,
              status: share.status,
              viewCount: share.view_count || 0,
              createdAt: share.created_at,
              token: share.invitation_token
            });
          });
        }

        // 2. Fetch E-Signature Requests
        try {
          const { data: signatureRequests } = await supabase
            .from('signature_requests')
            .select('*, signature_signers(*)')
            .eq('requester_id', user.id)
            .order('created_at', { ascending: false });

          if (signatureRequests) {
            signatureRequests.forEach((req: any) => {
              const signers = req.signature_signers || [];
              const signerEmails = signers.map((s: any) => s.email).join(', ');
              allShares.push({
                id: req.id,
                type: 'signature',
                documentName: req.title || req.document_name || 'Document',
                recipientEmail: signerEmails || 'No signers',
                permission: 'sign',
                status: req.status,
                viewCount: 0,
                createdAt: req.created_at,
                token: null
              });
            });
          }
        } catch (err) {
          console.log('Signature requests table may not exist:', err);
        }

        // Sort by createdAt
        allShares.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setShares(allShares);
      } catch (err) {
        console.error('Failed to fetch shares:', err);
        setShares([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllShares();
  }, []);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'link':
        return <Badge className="bg-green-500 text-white">Share Link</Badge>;
      case 'guest':
        return <Badge className="bg-blue-500 text-white">Guest Share</Badge>;
      case 'signature':
        return <Badge className="bg-purple-500 text-white">E-Signature</Badge>;
      default:
        return <Badge variant="secondary">Share</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'active':
        return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
      case 'accepted':
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
      case 'expired':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Expired</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-red-600 border-red-600">Revoked</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;

  if (shares.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Documents Shared by Me
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-8">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p>You haven't shared any documents yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Documents Shared by Me
        </CardTitle>
        <CardDescription>All documents you've shared via links, guest sharing, or e-signatures</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {shares.map(share => (
              <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${share.type === 'signature' ? 'bg-purple-100 text-purple-600' : share.type === 'link' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {share.type === 'signature' ? <Edit className="w-4 h-4" /> : share.type === 'link' ? <Link className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{share.documentName}</p>
                      {getTypeBadge(share.type)}
                      {getStatusBadge(share.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      To: {share.recipientEmail} • {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                      {share.viewCount > 0 && ` • ${share.viewCount} views`}
                    </p>
                  </div>
                </div>
                {share.token && (
                  <Button variant="outline" size="sm" onClick={() => window.open(generateShareUrl(share.token), '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  UserPlus,
  Mail,
  Link2,
  Copy,
  Send,
  Clock,
  Eye,
  Download,
  Shield,
  RefreshCw,
  XCircle,
  CheckCircle,
  Trash2,
  MoreHorizontal,
  Users,
  Activity,
  Globe,
  Lock,
  Loader2,
  AlertTriangle,
  Search,
  Check,
  ChevronsUpDown,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { useExternalSharing, ExternalShare, CreateExternalShareParams, checkUserByEmail, UserCheckResult } from '@/hooks/useExternalSharing';
import { useDocumentRestrictions } from '@/hooks/useDocumentRestrictions';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/clipboard';

interface ExternalSharingPanelProps {
  documents?: { id: string; file_name: string }[];
}

export function ExternalSharingPanel({ documents }: ExternalSharingPanelProps) {
  const {
    shares,
    loading,
    createShare,
    revokeShare,
    deleteShare,
    resendInvitation,
    getShareUrl,
    getShareStats,
  } = useExternalSharing();
  const { getDocumentRestrictions } = useDocumentRestrictions();
  const { toast } = useToast();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [selectedShare, setSelectedShare] = useState<ExternalShare | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailShare, setDetailShare] = useState<ExternalShare | null>(null);
  const [guestEmails, setGuestEmails] = useState<string[]>([]);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [openDocSelector, setOpenDocSelector] = useState(false);
  // Track detected SimplifyDrive users (email -> user info)
  const [detectedUsers, setDetectedUsers] = useState<Map<string, { userId: string; displayName: string }>>(new Map());
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [formData, setFormData] = useState<CreateExternalShareParams>({
    resource_type: 'document',
    resource_id: '',
    resource_name: '',
    guest_email: '',
    guest_name: '',
    permission: 'view',
    allow_download: true,
    allow_print: true,
    expires_in_days: 7,
    message: '',
  });

  const stats = getShareStats();

  const handleViewDetails = (share: ExternalShare) => {
    setDetailShare(share);
    setShowDetailDialog(true);
  };

  // Add email to list and check if it's a registered user
  const addEmail = async () => {
    const email = newEmailInput.trim().toLowerCase();
    if (email && /\S+@\S+\.\S+/.test(email) && !guestEmails.includes(email)) {
      setCheckingEmail(true);
      try {
        // Check if this email belongs to a registered SimplifyDrive user
        const userCheck = await checkUserByEmail(email);
        if (userCheck.isUser && userCheck.userId) {
          setDetectedUsers(prev => {
            const newMap = new Map(prev);
            newMap.set(email, {
              userId: userCheck.userId!,
              displayName: userCheck.displayName || email
            });
            return newMap;
          });
          toast({
            title: "SimplifyDrive user detected",
            description: `${userCheck.displayName || email} is a registered user. Document will appear in their "Shared with me".`,
          });
        }
        setGuestEmails(prev => [...prev, email]);
        setNewEmailInput('');
      } finally {
        setCheckingEmail(false);
      }
    }
  };

  // Remove email from list
  const removeEmail = (emailToRemove: string) => {
    setGuestEmails(prev => prev.filter(e => e !== emailToRemove));
    // Also remove from detected users
    setDetectedUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(emailToRemove);
      return newMap;
    });
  };

  // Handle Enter key to add email
  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleInvite = async () => {
    if (guestEmails.length === 0 || !formData.resource_id) return;

    // Check for access restrictions on the document
    const restrictions = await getDocumentRestrictions(formData.resource_id);

    if (restrictions.restrictExternalShare) {
      toast({
        title: "🚫 External Sharing Restricted",
        description: `This document is restricted from external sharing by access rule(s): ${restrictions.matchedRules.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (restrictions.restrictShare) {
      toast({
        title: "🚫 Sharing Restricted",
        description: `This document is restricted from sharing by access rule(s): ${restrictions.matchedRules.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // Send invitations to all emails
    for (const email of guestEmails) {
      // Check if this is a registered SimplifyDrive user
      const detectedUser = detectedUsers.get(email.toLowerCase());

      const shareParams = {
        ...formData,
        guest_email: email,
        // Override permissions based on document restrictions
        allow_download: restrictions.restrictDownload ? false : formData.allow_download,
        allow_print: restrictions.restrictPrint ? false : formData.allow_print,
        // Pass the registered user ID if this is a SimplifyDrive user
        registered_user_id: detectedUser?.userId,
      };
      const share = await createShare(shareParams);
      if (share) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Show result toast
    if (successCount > 0) {
      toast({
        title: `✅ ${successCount} invitation${successCount > 1 ? 's' : ''} sent`,
        description: failCount > 0 ? `${failCount} failed to send` : undefined,
      });
    }

    // Reset form
    setShowInviteDialog(false);
    setGuestEmails([]);
    setDetectedUsers(new Map()); // Reset detected users
    setNewEmailInput('');
    setFormData({
      resource_type: 'document',
      resource_id: '',
      resource_name: '',
      guest_email: '',
      guest_name: '',
      permission: 'view',
      allow_download: true,
      allow_print: true,
      expires_in_days: 7,
      message: '',
    });
  };

  const copyShareLink = async (share: ExternalShare) => {
    const url = getShareUrl(share);
    const success = await copyToClipboard(url);
    
    if (success) {
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
    } else {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually: " + url,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: ExternalShare['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'revoked':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'expired':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPermissionIcon = (permission: ExternalShare['permission']) => {
    switch (permission) {
      case 'view':
        return <Eye className="h-3 w-3" />;
      case 'download':
        return <Download className="h-3 w-3" />;
      case 'edit':
        return <Globe className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">External Sharing</h2>
          <p className="text-muted-foreground">Invite external users (guests) to access your documents</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Guest
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalViews}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.revoked}</p>
                <p className="text-sm text-muted-foreground">Revoked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shares List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({stats.active})</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
          <TabsTrigger value="all">All Shares</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <SharesList
            shares={shares.filter(s => s.status === 'accepted' || s.status === 'pending')}
            onCopyLink={copyShareLink}
            onRevoke={revokeShare}
            onResend={resendInvitation}
            onDelete={deleteShare}
            onViewDetails={handleViewDetails}
            getStatusColor={getStatusColor}
            getPermissionIcon={getPermissionIcon}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <SharesList
            shares={shares.filter(s => s.status === 'pending')}
            onCopyLink={copyShareLink}
            onRevoke={revokeShare}
            onResend={resendInvitation}
            onDelete={deleteShare}
            onViewDetails={handleViewDetails}
            getStatusColor={getStatusColor}
            getPermissionIcon={getPermissionIcon}
          />
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          <SharesList
            shares={shares.filter(s => s.status === 'expired')}
            onCopyLink={copyShareLink}
            onRevoke={revokeShare}
            onResend={resendInvitation}
            onDelete={deleteShare}
            onViewDetails={handleViewDetails}
            getStatusColor={getStatusColor}
            getPermissionIcon={getPermissionIcon}
          />
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <SharesList
            shares={shares}
            onCopyLink={copyShareLink}
            onRevoke={revokeShare}
            onResend={resendInvitation}
            onDelete={deleteShare}
            onViewDetails={handleViewDetails}
            getStatusColor={getStatusColor}
            getPermissionIcon={getPermissionIcon}
          />
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite External Guest</DialogTitle>
            <DialogDescription>
              Share documents with external users who don't have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Document</Label>
              <Popover open={openDocSelector} onOpenChange={setOpenDocSelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDocSelector}
                    className="w-full justify-between"
                  >
                    {formData.resource_id
                      ? documents?.find(d => d.id === formData.resource_id)?.file_name
                      : "Choose a document to share..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search documents..." />
                    <CommandList>
                      <CommandEmpty>No document found.</CommandEmpty>
                      <CommandGroup>
                        {documents?.map(doc => (
                          <CommandItem
                            key={doc.id}
                            value={doc.file_name}
                            onSelect={() => {
                              setFormData(prev => ({
                                ...prev,
                                resource_id: doc.id,
                                resource_name: doc.file_name,
                              }));
                              setOpenDocSelector(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${formData.resource_id === doc.id ? 'opacity-100' : 'opacity-0'}`}
                            />
                            {doc.file_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Multi-email input */}
            <div className="space-y-2">
              <Label>Guest Emails *</Label>
              <div className="space-y-2">
                {/* Added emails as badges */}
                {guestEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                    {guestEmails.map(email => {
                      const isRegisteredUser = detectedUsers.has(email.toLowerCase());
                      const userInfo = detectedUsers.get(email.toLowerCase());
                      return (
                        <Badge
                          key={email}
                          variant={isRegisteredUser ? "default" : "secondary"}
                          className={`gap-1 pr-1 ${isRegisteredUser ? 'bg-primary text-primary-foreground' : ''}`}
                        >
                          {isRegisteredUser && <Users className="h-3 w-3" />}
                          {email}
                          {isRegisteredUser && (
                            <span className="text-xs opacity-80 ml-1">(SimplifyDrive)</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeEmail(email)}
                            className="ml-1 rounded-full hover:bg-white/20 p-0.5"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                {/* Input for adding new emails */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmailInput}
                    onChange={e => setNewEmailInput(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="guest@example.com (press Enter to add)"
                    className="flex-1"
                    disabled={checkingEmail}
                  />
                  <Button
                    variant="outline"
                    type="button"
                    onClick={addEmail}
                    disabled={!newEmailInput.trim() || !/\S+@\S+\.\S+/.test(newEmailInput) || checkingEmail}
                  >
                    {checkingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {guestEmails.length} recipient{guestEmails.length !== 1 ? 's' : ''} added
                  {detectedUsers.size > 0 && ` • ${detectedUsers.size} SimplifyDrive user${detectedUsers.size !== 1 ? 's' : ''}`}
                  {' '}• Press Enter or comma to add
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Permission Level</Label>
                <Select
                  value={formData.permission}
                  onValueChange={v => {
                    const newPermission = v as 'view' | 'download' | 'edit';
                    setFormData(prev => ({
                      ...prev,
                      permission: newPermission,
                      // Sync allow_download with permission
                      allow_download: newPermission === 'download' || newPermission === 'edit'
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="download">Can Download</SelectItem>
                    <SelectItem value="edit">Can Edit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Expires In</Label>
                <Select
                  value={String(formData.expires_in_days || 0)}
                  onValueChange={v => setFormData(prev => ({ ...prev, expires_in_days: parseInt(v) || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="0">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className={formData.permission === 'view' ? 'text-muted-foreground' : ''}>
                    Allow Download
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {formData.permission === 'view'
                      ? 'Disabled for View Only permission'
                      : 'Guest can download the file'}
                  </p>
                </div>
                <Switch
                  checked={formData.allow_download}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, allow_download: checked }))}
                  disabled={formData.permission === 'view'}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Print</Label>
                  <p className="text-xs text-muted-foreground">Guest can print the document</p>
                </div>
                <Switch
                  checked={formData.allow_print}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, allow_print: checked }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={formData.message || ''}
                onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Hi, I'd like to share this document with you..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={guestEmails.length === 0 || !formData.resource_id}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send {guestEmails.length > 1 ? `${guestEmails.length} Invitations` : 'Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Share Details</DialogTitle>
            <DialogDescription>
              Complete information about this external share
            </DialogDescription>
          </DialogHeader>
          {detailShare && (
            <div className="space-y-6 py-4">
              {/* Guest Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Guest Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{detailShare.guest_email}</p>
                  </div>
                  {detailShare.guest_name && (
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{detailShare.guest_name}</p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Document Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Document</h3>
                <div>
                  <Label className="text-muted-foreground">File Name</Label>
                  <p className="font-medium">{detailShare.resource_name || 'Unnamed document'}</p>
                </div>
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Permissions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Permission Level</Label>
                    <Badge variant="secondary" className="mt-1">
                      {getPermissionIcon(detailShare.permission)}
                      <span className="ml-1 capitalize">{detailShare.permission}</span>
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Can Download</Label>
                    <p className="font-medium">{detailShare.allow_download ? '✓ Yes' : '✗ No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Can Print</Label>
                    <p className="font-medium">{detailShare.allow_print ? '✓ Yes' : '✗ No'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={getStatusColor(detailShare.status)}>
                      {detailShare.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Activity Stats */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Activity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Views</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Eye className="h-4 w-4 text-primary" />
                      <p className="text-xl font-bold">{detailShare.view_count || 0}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Downloads</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Download className="h-4 w-4 text-primary" />
                      <p className="text-xl font-bold">{detailShare.download_count || 0}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Prints</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Activity className="h-4 w-4 text-primary" />
                      <p className="text-xl font-bold">{detailShare.print_count || 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">{format(new Date(detailShare.created_at), 'PPp')}</p>
                  </div>
                  {detailShare.expires_at && (
                    <div>
                      <Label className="text-muted-foreground">Expires</Label>
                      <p className="font-medium">
                        {format(new Date(detailShare.expires_at), 'PPp')}
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatDistanceToNow(new Date(detailShare.expires_at), { addSuffix: true })})
                        </span>
                      </p>
                    </div>
                  )}
                  {detailShare.last_accessed_at && (
                    <div>
                      <Label className="text-muted-foreground">Last Accessed</Label>
                      <p className="font-medium">{format(new Date(detailShare.last_accessed_at), 'PPp')}</p>
                    </div>
                  )}
                </div>
              </div>

              {detailShare.message && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Message</Label>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm">{detailShare.message}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
            {detailShare && (
              <Button onClick={() => {
                copyShareLink(detailShare);
                setShowDetailDialog(false);
              }} className="gap-2">
                <Copy className="h-4 w-4" />
                Copy Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

// SharesList component
function SharesList({
  shares,
  onCopyLink,
  onRevoke,
  onResend,
  onDelete,
  onViewDetails,
  getStatusColor,
  getPermissionIcon,
}: {
  shares: ExternalShare[];
  onCopyLink: (share: ExternalShare) => void;
  onRevoke: (shareId: string) => void;
  onResend: (shareId: string) => void;
  onDelete: (shareId: string) => void;
  onViewDetails: (share: ExternalShare) => void;
  getStatusColor: (status: ExternalShare['status']) => string;
  getPermissionIcon: (permission: ExternalShare['permission']) => React.ReactNode;
}) {
  if (shares.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No External Shares</h3>
          <p className="text-muted-foreground text-center">
            Invite external users to collaborate on your documents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {shares.map(share => (
        <Card
          key={share.id}
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => onViewDetails(share)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 rounded-full bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{share.guest_email}</span>
                    {share.guest_name && (
                      <span className="text-sm text-muted-foreground">
                        ({share.guest_name})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {share.resource_name || 'Unnamed document'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getPermissionIcon(share.permission)}
                      <span className="capitalize">{share.permission}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>{share.view_count} views</span>
                    </div>
                    {share.expires_at && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Expires {formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => onCopyLink(share)}>
                  <Copy className="h-4 w-4" />
                </Button>
                {share.status === 'pending' && (
                  <Button variant="ghost" size="sm" onClick={() => onResend(share.id)}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                {(share.status === 'pending' || share.status === 'accepted') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevoke(share.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(share.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link,
  Send,
  Settings,
  Users,
  Pencil,
  Eye,
  X,
  Check,
  Copy,
  Globe,
  Lock,
  Clock,
  CalendarIcon,
  AlertTriangle,
  Shield,
  Download,
  Ban,
  Infinity,
  Timer,
  Zap,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addHours, addDays, addMonths, differenceInDays, differenceInHours, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  documentId: string;
  documentUrl: string;
  onShare: (config: ShareConfig) => Promise<void>;
}

interface ShareConfig {
  emails: string[];
  permission: 'view' | 'comment' | 'edit' | 'download';
  message: string;
  expiresAt: Date | null;
  maxUses: number | null;
  requirePassword: boolean;
  password?: string;
  requireEmail: boolean;
  allowDownload: boolean;
  watermarkEnabled: boolean;
  notifyOnAccess: boolean;
}

interface SharedUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  permission: 'view' | 'comment' | 'edit';
}

const QUICK_EXPIRATION_OPTIONS = [
  { label: '1 hour', value: 'hour', icon: Timer, getDate: () => addHours(new Date(), 1) },
  { label: '24 hours', value: 'day', icon: Clock, getDate: () => addDays(new Date(), 1) },
  { label: '7 days', value: 'week', icon: CalendarIcon, getDate: () => addDays(new Date(), 7) },
  { label: '30 days', value: 'month', icon: CalendarIcon, getDate: () => addDays(new Date(), 30) },
  { label: '90 days', value: 'quarter', icon: CalendarIcon, getDate: () => addDays(new Date(), 90) },
  { label: 'Never', value: 'never', icon: Infinity, getDate: () => null },
];

export const EnhancedShareDialog: React.FC<EnhancedShareDialogProps> = ({
  open,
  onOpenChange,
  documentName,
  documentId,
  documentUrl,
  onShare
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'invite' | 'link'>('invite');
  const [emailInput, setEmailInput] = useState('');
  const [message, setMessage] = useState('');
  const [permission, setPermission] = useState<'view' | 'comment' | 'edit' | 'download'>('view');
  const [addedEmails, setAddedEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Expiration settings
  const [expirationMode, setExpirationMode] = useState<string>('week');
  const [customExpirationDate, setCustomExpirationDate] = useState<Date | undefined>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Security settings
  const [maxUses, setMaxUses] = useState<string>('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [requireEmail, setRequireEmail] = useState(false);
  const [allowDownload, setAllowDownload] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [notifyOnAccess, setNotifyOnAccess] = useState(false);

  // Mock shared users
  const [sharedUsers] = useState<SharedUser[]>([
    { id: '1', email: 'deep@simplifyai.id', name: 'Deep Bhau', permission: 'edit' },
  ]);

  const getExpirationDate = (): Date | null => {
    if (expirationMode === 'custom' && customExpirationDate) {
      return customExpirationDate;
    }
    const option = QUICK_EXPIRATION_OPTIONS.find(o => o.value === expirationMode);
    return option?.getDate() || null;
  };

  const getExpirationLabel = (): string => {
    const expDate = getExpirationDate();
    if (!expDate) return 'Never expires';

    const now = new Date();
    const diffHours = differenceInHours(expDate, now);
    const diffDays = differenceInDays(expDate, now);

    if (diffHours < 24) {
      return `Expires in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 30) {
      return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return `Expires ${format(expDate, 'MMM d, yyyy')}`;
    }
  };

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim()) {
      e.preventDefault();
      const email = emailInput.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        return;
      }

      if (!addedEmails.includes(email)) {
        setAddedEmails([...addedEmails, email]);
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setAddedEmails(addedEmails.filter(e => e !== email));
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(documentUrl);
      toast({
        title: "Link copied",
        description: "Document link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard",
        variant: "destructive"
      });
    }
  };

  const handleSend = async () => {
    if (activeTab === 'invite' && addedEmails.length === 0) {
      toast({
        title: "No recipients",
        description: "Please add at least one email address",
        variant: "destructive"
      });
      return;
    }

    if (requirePassword && password.length < 4) {
      toast({
        title: "Password too short",
        description: "Password must be at least 4 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await onShare({
        emails: addedEmails,
        permission,
        message,
        expiresAt: getExpirationDate(),
        maxUses: maxUses ? parseInt(maxUses) : null,
        requirePassword,
        password: requirePassword ? password : undefined,
        requireEmail,
        allowDownload: allowDownload || permission === 'download' || permission === 'comment',
        watermarkEnabled,
        notifyOnAccess,
      });

      toast({
        title: "Shared successfully",
        description: activeTab === 'invite'
          ? `Document shared with ${addedEmails.length} people`
          : "Share link created successfully",
      });

      setAddedEmails([]);
      setMessage('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Could not share the document",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const truncatedName = documentName.length > 30
    ? `${documentName.substring(0, 15)}...${documentName.substring(documentName.length - 12)}`
    : documentName;

  const expirationDate = getExpirationDate();
  const isExpiringSoon = expirationDate && differenceInHours(expirationDate, new Date()) < 24;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Share "{truncatedName}"
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'invite' | 'link')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite" className="gap-2">
              <Users className="w-4 h-4" />
              Invite People
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <Link className="w-4 h-4" />
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 mt-4">
            {/* Email Input */}
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Add emails (press Enter)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleAddEmail}
                  className="pl-10"
                />
              </div>
              <Select value={permission} onValueChange={(v: 'view' | 'comment' | 'edit' | 'download') => setPermission(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Can view
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Can comment
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      Can edit
                    </div>
                  </SelectItem>
                  <SelectItem value="download">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Can download
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Added Emails */}
            {addedEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {addedEmails.map(email => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="flex items-center gap-1 pl-2 pr-1 py-1"
                  >
                    {email}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveEmail(email)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Message */}
            <Textarea
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            {/* Expiration Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Link Expiration
                </Label>
                <Badge
                  variant={expirationDate ? (isExpiringSoon ? "destructive" : "secondary") : "outline"}
                  className="gap-1"
                >
                  {isExpiringSoon && <AlertTriangle className="w-3 h-3" />}
                  {getExpirationLabel()}
                </Badge>
              </div>

              {/* Quick Expiration Options */}
              <div className="grid grid-cols-3 gap-2">
                {QUICK_EXPIRATION_OPTIONS.map(option => (
                  <Button
                    key={option.value}
                    variant={expirationMode === option.value ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      setExpirationMode(option.value);
                      setShowCustomDatePicker(false);
                    }}
                  >
                    <option.icon className="w-3 h-3" />
                    {option.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Picker */}
              <div className="flex items-center gap-2">
                <Button
                  variant={expirationMode === 'custom' ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 text-xs flex-1"
                  onClick={() => {
                    setExpirationMode('custom');
                    setShowCustomDatePicker(true);
                  }}
                >
                  <CalendarIcon className="w-3 h-3" />
                  Custom Date
                </Button>

                {expirationMode === 'custom' && (
                  <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        {customExpirationDate
                          ? format(customExpirationDate, 'MMM d, yyyy')
                          : 'Select date'
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customExpirationDate}
                        onSelect={(date) => {
                          setCustomExpirationDate(date);
                          setShowCustomDatePicker(false);
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Max Uses */}
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm">
                <Ban className="w-4 h-4" />
                Maximum uses
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="Unlimited"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-28 h-8 text-sm"
              />
            </div>

            {/* Security Options */}
            <div className="space-y-3 pt-2 border-t">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Shield className="w-4 h-4" />
                Security Options
              </Label>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="require-password" className="text-sm font-normal">
                    Require password
                  </Label>
                  <Switch
                    id="require-password"
                    checked={requirePassword}
                    onCheckedChange={setRequirePassword}
                  />
                </div>

                {requirePassword && (
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-8"
                  />
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="require-email" className="text-sm font-normal">
                    Require email to view
                  </Label>
                  <Switch
                    id="require-email"
                    checked={requireEmail}
                    onCheckedChange={setRequireEmail}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="allow-download" className="text-sm font-normal">
                    Allow download
                  </Label>
                  <Switch
                    id="allow-download"
                    checked={allowDownload}
                    onCheckedChange={setAllowDownload}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="watermark" className="text-sm font-normal">
                    Add watermark
                  </Label>
                  <Switch
                    id="watermark"
                    checked={watermarkEnabled}
                    onCheckedChange={setWatermarkEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="notify" className="text-sm font-normal">
                    Notify on access
                  </Label>
                  <Switch
                    id="notify"
                    checked={notifyOnAccess}
                    onCheckedChange={setNotifyOnAccess}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Shared Users (show in both tabs) */}
        {sharedUsers.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">Shared with</p>
            <div className="space-y-2">
              {sharedUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.permission === 'edit' ? 'Can edit' : 'Can view'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {sharedUsers.slice(0, 3).map(user => (
                <Avatar key={user.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleCopyLink} className="gap-2">
              <Copy className="w-4 h-4" />
              Copy link
            </Button>

            <Button
              onClick={handleSend}
              disabled={loading || (activeTab === 'invite' && addedEmails.length === 0)}
              className="gap-2"
            >
              {activeTab === 'invite' ? (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Create Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

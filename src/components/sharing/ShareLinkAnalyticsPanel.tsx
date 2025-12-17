import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Copy,
  Check,
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
  Tablet,
  QrCode,
  Settings,
  TrendingUp,
  MapPin,
  Calendar
} from 'lucide-react';
import type { EnhancedShareLink, ShareLinkPermission } from '@/types/shareLink';
import { SHARE_LINK_PERMISSION_INFO, generateShareUrl, generateQRCodeUrl } from '@/types/shareLink';
import { formatDistanceToNow, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ShareLinkAnalyticsPanelProps {
  link: EnhancedShareLink;
  onBack: () => void;
  onUpdate: (linkId: string, updates: Partial<EnhancedShareLink>) => Promise<boolean>;
  onRevoke: (linkId: string) => Promise<boolean>;
  onDelete: (linkId: string) => Promise<boolean>;
}

export const ShareLinkAnalyticsPanel: React.FC<ShareLinkAnalyticsPanelProps> = ({
  link,
  onBack,
  onUpdate,
  onRevoke,
  onDelete
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareUrl = generateShareUrl(link.token);
  const qrUrl = generateQRCodeUrl(shareUrl, 200);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Link copied',
      description: 'Share link copied to clipboard'
    });
  };

  const getPermissionIcon = (perm: ShareLinkPermission) => {
    switch (perm) {
      case 'view': return <Eye className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'download': return <Download className="w-4 h-4" />;
      case 'edit': return <Edit className="w-4 h-4" />;
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'desktop': return <Monitor className="w-4 h-4" />;
      case 'mobile': return <Smartphone className="w-4 h-4" />;
      case 'tablet': return <Tablet className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  const analytics = link.analytics || {
    total_views: link.use_count,
    unique_visitors: link.unique_visitor_ids?.length || (link.use_count > 0 ? 1 : 0),
    download_count: link.download_count || 0,
    avg_view_duration_seconds: 120,
    views_by_date: [],
    views_by_country: [],
    views_by_device: [
      { device: 'Desktop', views: Math.floor(link.use_count * 0.6) },
      { device: 'Mobile', views: Math.floor(link.use_count * 0.3) },
      { device: 'Tablet', views: Math.floor(link.use_count * 0.1) }
    ],
    recent_accesses: []
  };

  const isActive = link.is_active && (!link.expires_at || new Date(link.expires_at) > new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{link.name || link.resource_name || 'Share Link'}</h2>
          <p className="text-muted-foreground text-sm">
            Created {formatDistanceToNow(new Date(link.created_at), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <Badge variant="default" className="bg-green-500">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          <Button variant="outline" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            Copy Link
          </Button>
          <Button variant="outline" onClick={() => window.open(shareUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Total Views</span>
                </div>
                <p className="text-2xl font-bold">{analytics.total_views}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Unique Visitors</span>
                </div>
                <p className="text-2xl font-bold">{analytics.unique_visitors}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Downloads</span>
                </div>
                <p className="text-2xl font-bold">{analytics.download_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Avg. Duration</span>
                </div>
                <p className="text-2xl font-bold">
                  {Math.floor(analytics.avg_view_duration_seconds / 60)}m
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Device Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.views_by_device.map((item) => {
                  const percentage = analytics.total_views > 0
                    ? (item.views / analytics.total_views) * 100
                    : 0;
                  return (
                    <div key={item.device} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(item.device)}
                          <span className="font-medium">{item.device}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {item.views} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Geographic Distribution */}
          {analytics.views_by_country.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Geographic Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.views_by_country.map((item) => {
                    const percentage = analytics.total_views > 0
                      ? (item.views / analytics.total_views) * 100
                      : 0;
                    return (
                      <div key={item.country} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          <span>{item.country}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress value={percentage} className="w-24 h-2" />
                          <span className="text-muted-foreground w-16 text-right">
                            {item.views} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Details & QR */}
        <div className="space-y-6">
          {/* QR Code */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <img
                src={qrUrl}
                alt="QR Code"
                className="w-[160px] h-[160px] rounded-lg border mb-4"
              />
              <Button variant="outline" size="sm" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download QR
              </Button>
            </CardContent>
          </Card>

          {/* Link Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Link Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Permission</span>
                <div className="flex items-center gap-2">
                  {getPermissionIcon(link.permission)}
                  <span>{SHARE_LINK_PERMISSION_INFO[link.permission].label}</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Password</span>
                <Badge variant={link.password_protected ? 'default' : 'secondary'}>
                  {link.password_protected ? 'Protected' : 'None'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email Required</span>
                <Badge variant={link.require_email ? 'default' : 'secondary'}>
                  {link.require_email ? 'Yes' : 'No'}
                </Badge>
              </div>

              {link.expires_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(link.expires_at), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {link.max_uses && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Usage Limit</span>
                  <span>{link.use_count} / {link.max_uses}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Download</span>
                <Badge variant={link.allow_download ? 'default' : 'secondary'}>
                  {link.allow_download ? 'Allowed' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Watermark</span>
                <Badge variant={link.watermark_enabled ? 'default' : 'secondary'}>
                  {link.watermark_enabled ? 'Enabled' : 'None'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-2">
              {isActive ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onRevoke(link.id)}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Revoke Link
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onUpdate(link.id, { is_active: true })}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Reactivate Link
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  await onDelete(link.id);
                  onBack();
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Permanently
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

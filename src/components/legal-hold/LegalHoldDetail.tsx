import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Scale,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Bell,
  Mail,
  MoreHorizontal,
  Send,
  Unlock,
  History,
  Building,
  Calendar,
  Shield,
  Gavel,
  Search,
  User,
  TrendingUp,
  Eye
} from 'lucide-react';
import type { EnhancedLegalHold, LegalHoldCustodian, LegalHoldAuditEntry } from '@/types/legalHold';
import { LEGAL_HOLD_STATUS_CONFIG, CUSTODIAN_STATUS_CONFIG } from '@/types/legalHold';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { useLegalHolds } from '@/hooks/useLegalHolds';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface LegalHoldDetailProps {
  hold: EnhancedLegalHold;
  onBack: () => void;
  onRelease: (holdId: string, reason: string, approvedBy?: string) => Promise<boolean>;
}

export const LegalHoldDetail: React.FC<LegalHoldDetailProps> = ({
  hold,
  onBack,
  onRelease
}) => {
  const { sendReminder, escalateCustodian, acknowledgeCustodian, addCustodian, removeCustodian, getAuditTrail, sendNotifications } = useLegalHolds();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [auditEntries, setAuditEntries] = useState<LegalHoldAuditEntry[]>([]);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [createdByEmail, setCreatedByEmail] = useState<string>('');
  const [showAddCustodianDialog, setShowAddCustodianDialog] = useState(false);
  const [newCustodianName, setNewCustodianName] = useState('');
  const [newCustodianEmail, setNewCustodianEmail] = useState('');
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedCustodians, setSelectedCustodians] = useState<string[]>([]);

  useEffect(() => {
    // Fetch creator's email from auth metadata
    const fetchCreatorEmail = async () => {
      if (hold.created_by) {
        // Try to get user data from Supabase auth
        const { data: { user } } = await supabase.auth.getUser();
        
        // If current user is the creator, use their email
        if (user && user.id === hold.created_by) {
          setCreatedByEmail(user.email || hold.created_by);
        } else {
          // Otherwise, try profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', hold.created_by)
            .single();
          
          if (data && !error) {
            setCreatedByEmail(data.full_name || data.email || hold.created_by);
          } else {
            // If profiles doesn't work, just show UUID (we can't access other users' auth data)
            setCreatedByEmail(hold.created_by);
          }
        }
      }
    };
    fetchCreatorEmail();
  }, [hold.created_by]);

  const handleViewDocuments = () => {
    navigate('/documents', { state: { legalHoldId: hold.id, legalHoldName: hold.name } });
  };

  useEffect(() => {
    getAuditTrail(hold.id).then(setAuditEntries);
  }, [hold.id, getAuditTrail]);

  const statusConfig = LEGAL_HOLD_STATUS_CONFIG[hold.status];
  
  // Use stats.days_active or calculate from created_at
  const daysActive = hold.stats?.days_active ?? 
    (hold.created_at ? differenceInDays(new Date(), new Date(hold.created_at)) : 0);
  
  // Fix acknowledgedPercent calculation
  const acknowledgedPercent = hold.stats && hold.stats.total_custodians > 0
    ? ((hold.stats.custodians_acknowledged || 0) / hold.stats.total_custodians) * 100
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await onRelease(hold.id, releaseReason);
      setShowReleaseDialog(false);
    } finally {
      setReleasing(false);
    }
  };

  const getCustodianStatusBadge = (status: LegalHoldCustodian['status']) => {
    const config = CUSTODIAN_STATUS_CONFIG[status];
    return (
      <Badge className={`${config.bgColor} ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const getAuditIcon = (action: string) => {
    if (action.includes('created')) return <Scale className="w-4 h-4" />;
    if (action.includes('custodian')) return <User className="w-4 h-4" />;
    if (action.includes('notification')) return <Mail className="w-4 h-4" />;
    if (action.includes('released')) return <Unlock className="w-4 h-4" />;
    if (action.includes('document')) return <FileText className="w-4 h-4" />;
    return <History className="w-4 h-4" />;
  };

  const formatAuditAction = (action: string) => {
    // Replace underscores with spaces and capitalize first letter of each word at sentence start
    const text = action.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Scale className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{hold.name}</h1>
                <Badge className={`${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  {hold.matter_name}
                </span>
                <span>Matter ID: {hold.matter_id}</span>
                {hold.case_number && <span>Case: {hold.case_number}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hold.status === 'active' && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedCustodians(hold.custodians.map(c => c.id));
                      setShowNotificationsDialog(true);
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send Notifications
                  </Button>
                  <Button 
                    variant="outline" 
                    className="text-destructive"
                    onClick={() => setShowReleaseDialog(true)}
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Release Hold
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Custodians</span>
                </div>
                <p className="text-2xl font-bold">{hold.stats?.total_custodians || 0}</p>
                {hold.stats && hold.stats.pending_custodians > 0 && (
                  <p className="text-xs text-orange-500">{hold.stats.pending_custodians} pending</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">Documents</span>
                </div>
                <p className="text-2xl font-bold">{hold.document_count.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm">Protected Size</span>
                </div>
                <p className="text-2xl font-bold">{formatBytes(hold.total_size_bytes)}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Days Active</span>
                </div>
                <p className="text-2xl font-bold">{daysActive}</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm">Notifications</span>
                </div>
                <p className="text-2xl font-bold">{hold.stats?.notifications_sent || 0}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="custodians" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Custodians
              <Badge variant="secondary">{hold.custodians.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="audit">
              <History className="w-4 h-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Hold Reason */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Preservation Notice</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{hold.hold_reason}</p>
                  </CardContent>
                </Card>

                {/* Acknowledgment Progress */}
                {hold.status === 'active' && hold.stats && hold.stats.total_custodians > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Acknowledgment Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {hold.stats.custodians_acknowledged || 0} of {hold.stats.total_custodians} custodians acknowledged
                          </span>
                          <span className="font-medium">{acknowledgedPercent.toFixed(0)}%</span>
                        </div>
                        <Progress value={acknowledgedPercent} className="h-3" />

                        <div className="grid grid-cols-3 gap-4 pt-4">
                          <div className="text-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                            <p className="text-xl font-bold">{hold.stats.custodians_acknowledged || 0}</p>
                            <p className="text-xs text-muted-foreground">Acknowledged</p>
                          </div>
                          <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                            <p className="text-xl font-bold">{hold.stats.pending_custodians || 0}</p>
                            <p className="text-xs text-muted-foreground">Pending</p>
                          </div>
                          <div className="text-center p-3 bg-red-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                            <p className="text-xl font-bold">{hold.stats.escalated_custodians || 0}</p>
                            <p className="text-xs text-muted-foreground">Escalated</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hold Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Issue Date</p>
                      <p className="font-medium">
                        {hold.issue_date && !isNaN(new Date(hold.issue_date).getTime()) 
                          ? format(new Date(hold.issue_date), 'PPP') 
                          : hold.created_at && !isNaN(new Date(hold.created_at).getTime())
                          ? format(new Date(hold.created_at), 'PPP')
                          : 'Not set'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Effective Date</p>
                      <p className="font-medium">
                        {hold.effective_date && !isNaN(new Date(hold.effective_date).getTime()) 
                          ? format(new Date(hold.effective_date), 'PPP') 
                          : hold.created_at && !isNaN(new Date(hold.created_at).getTime())
                          ? format(new Date(hold.created_at), 'PPP')
                          : 'Not set'}
                      </p>
                    </div>
                    {hold.anticipated_end_date && !isNaN(new Date(hold.anticipated_end_date).getTime()) && (
                      <div>
                        <p className="text-xs text-muted-foreground">Anticipated End</p>
                        <p className="font-medium">{format(new Date(hold.anticipated_end_date), 'PPP')}</p>
                      </div>
                    )}
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Issuing Attorney</p>
                      <p className="font-medium">{hold.issuing_attorney || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Created By</p>
                      <p className="font-medium">{createdByEmail || hold.created_by}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notification Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Acknowledgment Required</span>
                      <Badge variant={hold.requires_acknowledgment ? 'default' : 'secondary'}>
                        {hold.requires_acknowledgment ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Auto Reminders</span>
                      <Badge variant={hold.send_reminders ? 'default' : 'secondary'}>
                        {hold.send_reminders ? `Every ${hold.reminder_frequency_days} days` : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Escalation</span>
                      <Badge variant={hold.escalation_enabled ? 'default' : 'secondary'}>
                        {hold.escalation_enabled ? `After ${hold.escalation_after_days} days` : 'Disabled'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custodians">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Custodians</CardTitle>
                <Button 
                  size="sm"
                  onClick={() => setShowAddCustodianDialog(true)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Add Custodian
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {hold.custodians.map((custodian) => (
                      <div
                        key={custodian.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {custodian.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{custodian.name}</p>
                            {getCustodianStatusBadge(custodian.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{custodian.email}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            {custodian.department && <span>{custodian.department}</span>}
                            {custodian.title && <span>• {custodian.title}</span>}
                            {custodian.document_count !== undefined && (
                              <span>• {custodian.document_count} documents</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          {custodian.acknowledged_at ? (
                            <div className="text-green-600">
                              <p>Acknowledged</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(custodian.acknowledged_at), 'PPp')}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-orange-600">
                                <p>Pending</p>
                                {custodian.reminder_count > 0 && (
                                  <p className="text-xs">{custodian.reminder_count} reminders sent</p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await acknowledgeCustodian(hold.id, custodian.id);
                                }}
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Acknowledge
                              </Button>
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={async () => {
                              await sendReminder(hold.id, custodian.id);
                            }}>
                              <Send className="w-4 h-4 mr-2" />
                              Send Reminder
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleViewDocuments}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Documents
                            </DropdownMenuItem>
                            {custodian.status === 'pending' && (
                              <DropdownMenuItem onClick={async () => {
                                await escalateCustodian(hold.id, custodian.id);
                              }}>
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Escalate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={async () => {
                                if (confirm(`Remove ${custodian.name} from this legal hold?`)) {
                                  await removeCustodian(hold.id, custodian.id);
                                }
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {hold.document_count.toLocaleString()} Documents Protected
                </h3>
                <p className="text-muted-foreground mb-4">
                  View and manage documents under this legal hold
                </p>
                <Button onClick={handleViewDocuments}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Protected Documents
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Audit Trail</CardTitle>
                <CardDescription>Complete history of actions on this legal hold</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {auditEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          {getAuditIcon(entry.action)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            {entry.actor_name && entry.actor_name !== 'System Migration' && (
                              <>
                                <span className="font-medium">{entry.actor_name}</span>
                                {' '}
                              </>
                            )}
                            {formatAuditAction(entry.action)}
                            {entry.target_name && (
                              <>
                                {' - '}
                                <span className="font-medium">{entry.target_name}</span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Release Legal Hold
            </DialogTitle>
            <DialogDescription>
              This will lift the legal hold and allow normal retention policies to apply.
              Custodians will be notified of the release.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{hold.name}</p>
              <p className="text-sm text-muted-foreground">{hold.matter_name}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Release *</label>
              <Textarea
                placeholder="Provide a detailed reason for releasing this legal hold..."
                value={releaseReason}
                onChange={(e) => setReleaseReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRelease} 
              disabled={!releaseReason || releasing}
              variant="destructive"
            >
              {releasing ? 'Releasing...' : 'Release Hold'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custodian Dialog */}
      <Dialog open={showAddCustodianDialog} onOpenChange={setShowAddCustodianDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custodian</DialogTitle>
            <DialogDescription>
              Add a new custodian to this legal hold
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={newCustodianName}
                onChange={(e) => setNewCustodianName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full mt-1 px-3 py-2 border rounded-md"
                value={newCustodianEmail}
                onChange={(e) => setNewCustodianEmail(e.target.value)}
                placeholder="john.doe@company.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddCustodianDialog(false);
                setNewCustodianName('');
                setNewCustodianEmail('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (newCustodianName && newCustodianEmail) {
                  await addCustodian(hold.id, { name: newCustodianName, email: newCustodianEmail });
                  setShowAddCustodianDialog(false);
                  setNewCustodianName('');
                  setNewCustodianEmail('');
                }
              }}
              disabled={!newCustodianName || !newCustodianEmail}
            >
              Add Custodian
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Notifications Dialog */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notifications</DialogTitle>
            <DialogDescription>
              Send legal hold notifications to {selectedCustodians.length} custodian{selectedCustodians.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Additional Message (Optional)</label>
              <Textarea
                className="mt-1"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Add any additional instructions or context..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificationsDialog(false);
                setNotificationMessage('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await sendNotifications(hold.id, selectedCustodians, notificationMessage);
                setShowNotificationsDialog(false);
                setNotificationMessage('');
              }}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

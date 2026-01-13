import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Scale,
  Plus,
  Search,
  MoreHorizontal,
  FileText,
  Users,
  Calendar,
  AlertTriangle,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Bell,
  Eye,
  Edit,
  Unlock,
  Mail,
  TrendingUp,
  Building,
  Gavel,
  X,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { useLegalHolds } from '@/hooks/useLegalHolds';
import type { EnhancedLegalHold, LegalHoldStatus } from '@/types/legalHold';
import { LEGAL_HOLD_STATUS_CONFIG, MATTER_TYPES } from '@/types/legalHold';
import { formatDistanceToNow, format, differenceInDays } from 'date-fns';
import { CreateLegalHoldDialog } from './CreateLegalHoldDialog';
import { LegalHoldDetail } from './LegalHoldDetail';
import { SendNotificationsDialog } from './SendNotificationsDialog';
import { AILegalHoldRecommendations } from './AILegalHoldRecommendations';
import { AILegalHoldInsights } from './AILegalHoldInsights';
import { useNavigate } from 'react-router-dom';

export const LegalHoldDashboard: React.FC = () => {
  const { holds, loading, createHold, updateHold, releaseHold, approveHold, rejectHold, fetchHolds, sendNotifications, processReminders } = useLegalHolds();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedHold, setSelectedHold] = useState<EnhancedLegalHold | null>(null);
  const [editingHold, setEditingHold] = useState<EnhancedLegalHold | null>(null);
  const [notifyingHold, setNotifyingHold] = useState<EnhancedLegalHold | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Update selectedHold when holds change (e.g., after acknowledgement)
  useEffect(() => {
    if (selectedHold) {
      const updatedHold = holds.find(h => h.id === selectedHold.id);
      if (updatedHold) {
        setSelectedHold(updatedHold);
      }
    }
  }, [holds, selectedHold]);

  const activeHolds = holds.filter(h => h.status === 'active');
  const pendingHolds = holds.filter(h => h.status === 'pending_approval' || h.status === 'draft');
  const releasedHolds = holds.filter(h => h.status === 'released' || h.status === 'expired');

  const filteredHolds = (activeTab === 'active' ? activeHolds : activeTab === 'pending' ? pendingHolds : releasedHolds)
    .filter(h =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.matter_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.matter_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalCustodians = activeHolds.reduce((sum, h) => sum + (h.stats?.total_custodians || 0), 0);
  const pendingAcknowledgments = activeHolds.reduce((sum, h) => {
    const total = h.stats?.total_custodians || 0;
    const acknowledged = h.stats?.custodians_acknowledged || 0;
    return sum + (total - acknowledged);
  }, 0);
  const totalDocuments = activeHolds.reduce((sum, h) => sum + h.document_count, 0);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getMatterIcon = (type: EnhancedLegalHold['matter_type']) => {
    switch (type) {
      case 'litigation': return <Gavel className="w-4 h-4" />;
      case 'investigation': return <Search className="w-4 h-4" />;
      case 'regulatory': return <Shield className="w-4 h-4" />;
      case 'audit': return <FileText className="w-4 h-4" />;
      default: return <Scale className="w-4 h-4" />;
    }
  };

  if (selectedHold) {
    return (
      <LegalHoldDetail
        hold={selectedHold}
        onBack={() => setSelectedHold(null)}
        onRelease={releaseHold}
      />
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Scale className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Legal Hold Management</h1>
                <p className="text-muted-foreground">Preserve and protect documents for legal matters</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => processReminders()}
                className="border-orange-500/30 hover:bg-orange-500/5"
                title="Process all pending reminders and escalations"
              >
                <Bell className="w-4 h-4 mr-2 text-orange-600" />
                Process Reminders
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAIInsights(true)}
                className="border-purple-500/30 hover:bg-purple-500/5"
              >
                <BarChart3 className="w-4 h-4 mr-2 text-purple-600" />
                AI Insights
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAIRecommendations(true)}
                className="border-purple-500/30 hover:bg-purple-500/5"
              >
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                AI Recommendations
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Legal Hold
              </Button>
            </div>
          </div>

          {/* Warning Banner */}
          {pendingAcknowledgments > 0 && (
            <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="font-medium text-orange-700 dark:text-orange-400">
                    {pendingAcknowledgments} custodian{pendingAcknowledgments > 1 ? 's' : ''} pending acknowledgment
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Some custodians have not yet acknowledged their legal hold obligations
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Find all holds with pending custodians and open notification dialog
                    const holdsWithPending = [...activeHolds, ...pendingHolds].filter(
                      hold => hold.stats.pending_custodians > 0
                    );
                    if (holdsWithPending.length > 0) {
                      // For simplicity, send reminders to the first hold with pending custodians
                      // In a real app, you might want to show a selection dialog
                      const firstHold = holdsWithPending[0];
                      const pendingCustodians = firstHold.custodians.filter(
                        c => c.status === 'pending'
                      );
                      setSelectedHold(firstHold);
                      setNotificationDialogOpen(true);
                    }
                  }}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Send Reminders
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Holds</p>
                    <p className="text-2xl font-bold">{activeHolds.length}</p>
                  </div>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Scale className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Custodians</p>
                    <p className="text-2xl font-bold">{totalCustodians}</p>
                  </div>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Protected Documents</p>
                    <p className="text-2xl font-bold">{totalDocuments.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Acknowledgments</p>
                    <p className="text-2xl font-bold">{pendingAcknowledgments}</p>
                  </div>
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {/* Search and Tabs */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search legal holds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active
              <Badge variant="secondary" className="ml-1">{activeHolds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
              <Badge variant="secondary" className="ml-1">{pendingHolds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="released" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Released
              <Badge variant="secondary" className="ml-1">{releasedHolds.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <ScrollArea className="h-[calc(100vh-400px)]">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : filteredHolds.length === 0 ? (
                <div className="text-center py-12">
                  <Scale className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No legal holds found</h3>
                  <p className="text-muted-foreground mb-4">
                    {activeTab === 'active'
                      ? 'Create a legal hold to protect documents'
                      : 'No holds in this category'}
                  </p>
                  {activeTab === 'active' && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Legal Hold
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredHolds.map((hold) => {
                    const statusConfig = LEGAL_HOLD_STATUS_CONFIG[hold.status];
                    const acknowledgedPercent = hold.stats && hold.stats.total_custodians > 0
                      ? ((hold.stats.custodians_acknowledged || 0) / hold.stats.total_custodians) * 100
                      : 0;
                    
                    // Use days_active from stats if available
                    const daysActive = hold.stats?.days_active ?? 0;

                    return (
                      <Card
                        key={hold.id}
                        className="hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => setSelectedHold(hold)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`p-3 rounded-lg ${
                              hold.status === 'active' ? 'bg-purple-500/10' : 'bg-muted'
                            }`}>
                              {getMatterIcon(hold.matter_type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-lg truncate">{hold.name}</h3>
                                <Badge className={statusConfig.bgColor + ' ' + statusConfig.color}>
                                  {statusConfig.label}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {hold.matter_name}
                                </span>
                                <span>Matter ID: {hold.matter_id}</span>
                                {hold.case_number && (
                                  <span>Case: {hold.case_number}</span>
                                )}
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {hold.hold_reason}
                              </p>

                              {/* Stats Row */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Custodians</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{hold.stats?.total_custodians || 0}</span>
                                    {hold.stats && hold.stats.pending_custodians > 0 && (
                                      <Badge variant="outline" className="text-orange-600 text-xs">
                                        {hold.stats.pending_custodians} pending
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Documents</p>
                                  <span className="font-medium">{hold.document_count.toLocaleString()}</span>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Size</p>
                                  <span className="font-medium">{formatBytes(hold.total_size_bytes)}</span>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Active For</p>
                                  <span className="font-medium">{daysActive} days</span>
                                </div>
                              </div>

                              {/* Acknowledgment Progress */}
                              {hold.status === 'active' && hold.stats && hold.stats.total_custodians > 0 && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Acknowledgment Progress</span>
                                    <span className="font-medium">
                                      {hold.stats.custodians_acknowledged || 0}/{hold.stats.total_custodians}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={acknowledgedPercent} 
                                    className="h-2"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedHold(hold); }}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  
                                  {hold.status === 'pending_approval' && (
                                    <>
                                      <DropdownMenuItem 
                                        className="text-green-600" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Approve legal hold "${hold.name}"? This will activate the hold and notify custodians.`)) {
                                            approveHold(hold.id);
                                          }
                                        }}
                                      >
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Approve Hold
                                      </DropdownMenuItem>
                                      <DropdownMenuItem 
                                        className="text-orange-600" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const reason = prompt('Enter rejection reason:');
                                          if (reason) {
                                            rejectHold(hold.id, reason);
                                          }
                                        }}
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Reject Hold
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  
                                  <DropdownMenuItem onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setEditingHold(hold);
                                  }}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Hold
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate('/documents', { state: { legalHoldId: hold.id, legalHoldName: hold.name } }); }}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    View Documents
                                  </DropdownMenuItem>
                                  
                                  {hold.status === 'active' && (
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setNotifyingHold(hold); }}>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Send Notifications
                                    </DropdownMenuItem>
                                  )}
                                  
                                  {hold.status === 'active' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-destructive" 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm(`Are you sure you want to release the hold "${hold.name}"?`)) {
                                            releaseHold(hold.id, 'Released by user');
                                          }
                                        }}
                                      >
                                        <Unlock className="w-4 h-4 mr-2" />
                                        Release Hold
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <CreateLegalHoldDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateHold={createHold}
      />

      {/* Edit Dialog */}
      {editingHold && (
        <CreateLegalHoldDialog
          key={`edit-${editingHold.id}`}
          open={!!editingHold}
          onOpenChange={(open) => !open && setEditingHold(null)}
          onCreateHold={createHold}
          onUpdateHold={updateHold}
          initialData={editingHold}
        />
      )}

      {/* Send Notifications Dialog */}
      {notifyingHold && (
        <SendNotificationsDialog
          open={!!notifyingHold}
          onOpenChange={(open) => !open && setNotifyingHold(null)}
          hold={notifyingHold}
          onSend={async (custodianIds, message) => {
            await sendNotifications(notifyingHold.id, custodianIds, message);
            setNotifyingHold(null);
          }}
        />
      )}

      {/* AI Recommendations Dialog */}
      <Dialog open={showAIRecommendations} onOpenChange={setShowAIRecommendations}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Document Recommendations
            </DialogTitle>
            <DialogDescription>
              AI-powered analysis to identify documents that may require legal hold
            </DialogDescription>
          </DialogHeader>
          <AILegalHoldRecommendations
            holdReason=""
            keywords=""
            matterType="litigation"
            selectedDocumentIds={[]}
            onSelectDocuments={(ids) => {
              console.log('Selected documents for legal hold:', ids);
              // Could auto-fill these into the create dialog
            }}
          />
        </DialogContent>
      </Dialog>

      {/* AI Insights Dialog */}
      <AILegalHoldInsights
        open={showAIInsights}
        onOpenChange={setShowAIInsights}
      />
    </div>
  );
};

export default LegalHoldDashboard;

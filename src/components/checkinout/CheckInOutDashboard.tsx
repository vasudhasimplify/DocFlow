import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lock, 
  Unlock, 
  Clock, 
  User, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  History,
  Bell,
  Shield,
  Timer,
  Download,
  Upload
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CheckedOutDocument {
  id: string;
  document_id: string;
  document_name: string;
  locked_by: string;
  locker_email?: string;
  locked_at: string;
  lock_reason?: string;
  expires_at?: string;
  is_active: boolean;
  document_owner_id?: string;
}

interface CheckInOutHistory {
  id: string;
  document_id: string;
  document_name: string;
  action: 'check_out' | 'check_in' | 'force_unlock';
  performed_by: string;
  performer_email?: string;
  performed_at: string;
  notes?: string;
}

export const CheckInOutDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('my-checkouts');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [myCheckouts, setMyCheckouts] = useState<CheckedOutDocument[]>([]);
  const [allCheckouts, setAllCheckouts] = useState<CheckedOutDocument[]>([]);
  const [history, setHistory] = useState<CheckInOutHistory[]>([]);
  const [stats, setStats] = useState({
    myCheckedOut: 0,
    totalCheckedOut: 0,
    expiringSoon: 0,
    checkedInToday: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Auto-release expired locks
  useEffect(() => {
    const releaseExpiredLocks = async () => {
      if (!user) return;

      const { data: expiredLocks } = await supabase
        .from('document_locks')
        .select('id, document_id, expires_at')
        .eq('is_active', true)
        .not('expires_at', 'is', null);

      if (expiredLocks && expiredLocks.length > 0) {
        const now = Date.now();
        const expiredLockIds = expiredLocks
          .filter(lock => new Date(lock.expires_at!).getTime() < now)
          .map(lock => lock.id);

        if (expiredLockIds.length > 0) {
          await supabase
            .from('document_locks')
            .update({ is_active: false })
            .in('id', expiredLockIds);

          // Refresh data to show updated status
          fetchData();
        }
      }
    };

    releaseExpiredLocks();
    // Check every 30 seconds for expired locks
    const interval = setInterval(releaseExpiredLocks, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchMyCheckouts(),
        fetchAllCheckouts(),
        fetchHistory()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyCheckouts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('document_locks')
      .select(`
        id,
        document_id,
        locked_by,
        locked_at,
        lock_reason,
        expires_at,
        is_active
      `)
      .eq('locked_by', user.id)
      .eq('is_active', true)
      .order('locked_at', { ascending: false });

    if (error) {
      console.error('Error fetching my checkouts:', error);
      return;
    }

    // Fetch document names
    const documentIds = data?.map(d => d.document_id) || [];
    let documentsMap: Record<string, string> = {};
    
    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, file_name')
        .in('id', documentIds);
      
      if (docsError) {
        console.error('❌ Error fetching documents for My Checkouts:', docsError);
      } else {
        console.log('📄 Documents fetched for My Checkouts:', docs);
      }
      
      documentsMap = (docs || []).reduce((acc, doc) => {
        acc[doc.id] = doc.file_name;
        return acc;
      }, {} as Record<string, string>);
      
      console.log('📋 Documents map (My Checkouts):', documentsMap);
    }

    const checkouts: CheckedOutDocument[] = (data || []).map(lock => ({
      ...lock,
      document_name: documentsMap[lock.document_id] || 'Unknown Document',
      locker_email: user?.email || 'Unknown User'
    }));

    setMyCheckouts(checkouts);
    
    const expiringSoon = checkouts.filter(c => 
      c.expires_at && new Date(c.expires_at).getTime() - Date.now() < 30 * 60 * 1000
    ).length;

    setStats(prev => ({
      ...prev,
      myCheckedOut: checkouts.length,
      expiringSoon
    }));
  };

  const fetchAllCheckouts = async () => {
    const { data, error } = await supabase
      .from('document_locks')
      .select(`
        id,
        document_id,
        locked_by,
        locked_at,
        lock_reason,
        expires_at,
        is_active
      `)
      .eq('is_active', true)
      .order('locked_at', { ascending: false });

    if (error) {
      console.error('Error fetching all checkouts:', error);
      return;
    }

    // Fetch document names and owners
    const documentIds = data?.map(d => d.document_id) || [];
    let documentsMap: Record<string, string> = {};
    let documentOwnersMap: Record<string, string> = {};
    
    if (documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('id, file_name, user_id')
        .in('id', documentIds);
      
      if (docsError) {
        console.error('❌ Error fetching documents for All Checkouts:', docsError);
      } else {
        console.log('📄 Documents fetched for All Checkouts:', docs);
      }
      
      documentsMap = (docs || []).reduce((acc, doc) => {
        acc[doc.id] = doc.file_name;
        return acc;
      }, {} as Record<string, string>);
      
      documentOwnersMap = (docs || []).reduce((acc, doc) => {
        acc[doc.id] = doc.user_id;
        return acc;
      }, {} as Record<string, string>);
      
      console.log('📋 Documents map (All Checkouts):', documentsMap);
      console.log('👤 Document owners map:', documentOwnersMap);
    }

    // Fetch user emails for locked_by users
    const userIds = [...new Set(data?.map(d => d.locked_by) || [])];
    const userEmailsMap: Record<string, string> = {};
    
    for (const userId of userIds) {
      const { data: email } = await supabase.rpc('get_user_email_by_id', { user_id: userId });
      if (email) {
        userEmailsMap[userId] = email;
      }
    }

    const checkouts: CheckedOutDocument[] = (data || []).map(lock => ({
      ...lock,
      document_name: documentsMap[lock.document_id] || 'Unknown Document',
      locker_email: userEmailsMap[lock.locked_by] || 'Unknown User',
      document_owner_id: documentOwnersMap[lock.document_id]
    }));

    setAllCheckouts(checkouts);
    setStats(prev => ({
      ...prev,
      totalCheckedOut: checkouts.length
    }));
  };

  const fetchHistory = async () => {
    // For now, use lock_notifications as history proxy
    const { data, error } = await supabase
      .from('lock_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching history:', error);
      return;
    }

    // Transform to history format
    const historyData: CheckInOutHistory[] = (data || []).map(n => ({
      id: n.id,
      document_id: n.document_id,
      document_name: 'Document',
      action: n.notification_type === 'lock_released' ? 'check_in' : 'check_out',
      performed_by: n.notified_user_id,
      performed_at: n.created_at,
      notes: n.message || undefined
    }));

    setHistory(historyData);
  };

  const handleCheckIn = async (lockId: string, documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_locks')
        .update({ is_active: false })
        .eq('id', lockId);

      if (error) throw error;

      // Create notification
      await supabase.from('lock_notifications').insert({
        document_id: documentId,
        lock_id: lockId,
        notified_user_id: user?.id,
        notification_type: 'lock_released',
        message: 'Document checked in'
      });

      toast({
        title: 'Document Checked In',
        description: 'The document is now available for others to edit.'
      });

      fetchData();
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: 'Check-in Failed',
        description: error instanceof Error ? error.message : 'Failed to check in document',
        variant: 'destructive'
      });
    }
  };

  const handleForceUnlock = async (lockId: string, documentId: string) => {
    try {
      const { error } = await supabase
        .from('document_locks')
        .delete()
        .eq('id', lockId);

      if (error) throw error;

      toast({
        title: 'Document Force Unlocked',
        description: 'The document lock has been removed.'
      });

      fetchData();
    } catch (error) {
      console.error('Error force unlocking:', error);
      toast({
        title: 'Force Unlock Failed',
        description: error instanceof Error ? error.message : 'Failed to force unlock document',
        variant: 'destructive'
      });
    }
  };

  const handleExtendLock = async (lockId: string) => {
    try {
      const expirationDate = new Date();
      expirationDate.setHours(expirationDate.getHours() + 2); // Extend by 2 hours

      const { error } = await supabase
        .from('document_locks')
        .update({ expires_at: expirationDate.toISOString() })
        .eq('id', lockId);

      if (error) throw error;

      toast({
        title: 'Lock Extended',
        description: 'Your checkout has been extended by 2 hours.'
      });

      fetchData();
    } catch (error) {
      console.error('Error extending lock:', error);
      toast({
        title: 'Extension Failed',
        description: error instanceof Error ? error.message : 'Failed to extend lock',
        variant: 'destructive'
      });
    }
  };

  const filteredMyCheckouts = myCheckouts.filter(c =>
    c.document_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllCheckouts = allCheckouts.filter(c =>
    c.document_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() - Date.now() < 30 * 60 * 1000;
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Checked Out</p>
                <p className="text-2xl font-bold">{stats.myCheckedOut}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Lock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Checked Out</p>
                <p className="text-2xl font-bold">{stats.totalCheckedOut}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-full">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-full">
                <Timer className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-green-600">Ready</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Check-in / Check-out Management
              </CardTitle>
              <CardDescription>
                Manage document locks and track editing sessions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-checkouts" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                My Checkouts
                {myCheckouts.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{myCheckouts.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all-checkouts" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                All Checkouts
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-checkouts" className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredMyCheckouts.length === 0 ? (
                <div className="text-center py-12">
                  <Unlock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No Documents Checked Out</p>
                  <p className="text-sm text-muted-foreground">
                    Check out a document to start editing exclusively
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredMyCheckouts.map((checkout) => (
                      <CheckoutCard
                        key={checkout.id}
                        checkout={checkout}
                        isOwner={true}
                        isExpiringSoon={isExpiringSoon(checkout.expires_at)}
                        isExpired={isExpired(checkout.expires_at)}
                        onCheckIn={() => handleCheckIn(checkout.id, checkout.document_id)}
                        onExtend={() => handleExtendLock(checkout.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="all-checkouts" className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : filteredAllCheckouts.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">All Documents Available</p>
                  <p className="text-sm text-muted-foreground">
                    No documents are currently checked out
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredAllCheckouts.map((checkout) => (
                      <CheckoutCard
                        key={checkout.id}
                        checkout={checkout}
                        isOwner={checkout.locked_by === user?.id}
                        isExpiringSoon={isExpiringSoon(checkout.expires_at)}
                        isExpired={isExpired(checkout.expires_at)}
                        onCheckIn={() => handleCheckIn(checkout.id, checkout.document_id)}
                        onExtend={() => handleExtendLock(checkout.id)}
                        onForceUnlock={() => handleForceUnlock(checkout.id, checkout.document_id)}
                        showForceUnlock={checkout.document_owner_id === user?.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No History Yet</p>
                  <p className="text-sm text-muted-foreground">
                    Check-in/check-out activity will appear here
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-3 rounded-lg border bg-card"
                      >
                        <div className={`p-2 rounded-full ${
                          item.action === 'check_in' 
                            ? 'bg-green-500/10' 
                            : item.action === 'force_unlock'
                            ? 'bg-red-500/10'
                            : 'bg-blue-500/10'
                        }`}>
                          {item.action === 'check_in' ? (
                            <Upload className="h-4 w-4 text-green-500" />
                          ) : item.action === 'force_unlock' ? (
                            <Shield className="h-4 w-4 text-red-500" />
                          ) : (
                            <Download className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.action === 'check_in' ? 'Checked In' : 
                             item.action === 'force_unlock' ? 'Force Unlocked' : 'Checked Out'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.notes || 'No notes'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.performed_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

interface CheckoutCardProps {
  checkout: CheckedOutDocument;
  isOwner: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
  onCheckIn: () => void;
  onExtend: () => void;
  onForceUnlock?: () => void;
  showForceUnlock?: boolean;
}

const CheckoutCard: React.FC<CheckoutCardProps> = ({
  checkout,
  isOwner,
  isExpiringSoon,
  isExpired,
  onCheckIn,
  onExtend,
  onForceUnlock,
  showForceUnlock
}) => {
  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg border ${
      isExpired ? 'border-red-500/50 bg-red-500/5' :
      isExpiringSoon ? 'border-amber-500/50 bg-amber-500/5' : 
      'bg-card'
    }`}>
      <div className={`p-3 rounded-full ${
        isExpired ? 'bg-red-500/10' :
        isExpiringSoon ? 'bg-amber-500/10' : 
        'bg-primary/10'
      }`}>
        <Lock className={`h-5 w-5 ${
          isExpired ? 'text-red-500' :
          isExpiringSoon ? 'text-amber-500' : 
          'text-primary'
        }`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{checkout.document_name}</p>
          {isOwner && (
            <Badge variant="outline" className="text-xs">You</Badge>
          )}
          {isExpired && (
            <Badge variant="destructive" className="text-xs">Expired</Badge>
          )}
          {isExpiringSoon && !isExpired && (
            <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
              Expiring Soon
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {checkout.locker_email || 'Unknown User'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(checkout.locked_at), { addSuffix: true })}
          </span>
          {checkout.expires_at && (
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {new Date(checkout.expires_at).getTime() > Date.now() 
                ? `Expires ${formatDistanceToNow(new Date(checkout.expires_at), { addSuffix: true })}`
                : `Expired ${formatDistanceToNow(new Date(checkout.expires_at), { addSuffix: true })}`
              }
            </span>
          )}
        </div>
        {checkout.lock_reason && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            "{checkout.lock_reason}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isOwner && !isExpired && (
          <>
            {isExpiringSoon && (
              <Button variant="outline" size="sm" onClick={onExtend}>
                <Timer className="h-4 w-4 mr-1" />
                Extend
              </Button>
            )}
            <Button variant="default" size="sm" onClick={onCheckIn}>
              <Upload className="h-4 w-4 mr-1" />
              Check In
            </Button>
          </>
        )}
        {isOwner && isExpired && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Auto-releasing...
          </Badge>
        )}
        {showForceUnlock && onForceUnlock && (
          <Button variant="destructive" size="sm" onClick={onForceUnlock}>
            <Shield className="h-4 w-4 mr-1" />
            Force Unlock
          </Button>
        )}
      </div>
    </div>
  );
};

export default CheckInOutDashboard;

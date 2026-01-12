import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Bug,
    Lightbulb,
    Search,
    RefreshCw,
    MessageSquare,
    Clock,
    AlertTriangle,
    TrendingUp,
    MoreHorizontal
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import FeedbackDetailDialog from '@/components/feedback/FeedbackDetailDialog';

interface FeedbackItem {
    id: string;
    user_id: string;
    feedback_type: 'bug_report' | 'feature_request';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'submitted' | 'under_review' | 'in_progress' | 'resolved' | 'closed' | 'rejected';
    user_email?: string;
    user_name?: string;
    user_role?: string;
    browser_info?: any;
    current_page_url?: string;
    attachments?: any[];
    admin_notes?: string;
    created_at: string;
    updated_at: string;
}

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'low':
            return <Badge variant="outline" className="bg-gray-100 text-gray-800">Low</Badge>;
        case 'medium':
            return <Badge variant="outline" className="bg-blue-100 text-blue-800">Medium</Badge>;
        case 'high':
            return <Badge variant="outline" className="bg-orange-100 text-orange-800">High</Badge>;
        case 'critical':
            return <Badge variant="destructive">Critical</Badge>;
        default:
            return <Badge variant="outline">{priority}</Badge>;
    }
};

const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
        submitted: 'bg-yellow-100 text-yellow-800',
        under_review: 'bg-purple-100 text-purple-800',
        in_progress: 'bg-blue-100 text-blue-800',
        resolved: 'bg-green-100 text-green-800',
        closed: 'bg-gray-100 text-gray-800',
        rejected: 'bg-red-100 text-red-800',
    };

    const statusLabels: Record<string, string> = {
        submitted: 'Submitted',
        under_review: 'Under Review',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
        rejected: 'Rejected',
    };

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
            {statusLabels[status] || status}
        </span>
    );
};

const FeedbackManagement = () => {
    const { toast } = useToast();
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        inProgress: 0,
        critical: 0,
    });

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_feedback' as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const feedbackData = ((data || []) as unknown) as FeedbackItem[];
            setFeedbackList(feedbackData);

            // Calculate stats
            setStats({
                total: feedbackData.length,
                pending: feedbackData.filter(f => f.status === 'submitted' || f.status === 'under_review').length,
                inProgress: feedbackData.filter(f => f.status === 'in_progress').length,
                critical: feedbackData.filter(f => f.priority === 'critical' && !['resolved', 'closed', 'rejected'].includes(f.status)).length,
            });
        } catch (error: any) {
            console.error('Error fetching feedback:', error);
            toast({
                title: 'Error loading feedback',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    // Filter feedback
    const filteredFeedback = feedbackList.filter(feedback => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                feedback.title.toLowerCase().includes(query) ||
                feedback.description.toLowerCase().includes(query) ||
                feedback.user_email?.toLowerCase().includes(query) ||
                feedback.user_name?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        // Type filter
        if (typeFilter !== 'all' && feedback.feedback_type !== typeFilter) return false;

        // Status filter
        if (statusFilter !== 'all' && feedback.status !== statusFilter) return false;

        // Priority filter
        if (priorityFilter !== 'all' && feedback.priority !== priorityFilter) return false;

        return true;
    });

    const handleRowClick = (feedback: FeedbackItem) => {
        setSelectedFeedback(feedback);
        setDetailOpen(true);
    };

    const bugCount = feedbackList.filter(f => f.feedback_type === 'bug_report').length;
    const featureCount = feedbackList.filter(f => f.feedback_type === 'feature_request').length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-6 w-6" />
                        Feedback Management
                    </h1>
                    <p className="text-muted-foreground">
                        View and manage bug reports and feature requests from users
                    </p>
                </div>
                <Button onClick={fetchFeedback} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Total Feedback
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {bugCount} bugs, {featureCount} features
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Pending Review
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Awaiting initial review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            In Progress
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                        <p className="text-xs text-muted-foreground">Being worked on</p>
                    </CardContent>
                </Card>

                <Card className="border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            Critical Issues
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                        <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by title, description, user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="bug_report">Bug Reports</SelectItem>
                        <SelectItem value="feature_request">Features</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Feedback List */}
            <Card>
                <CardHeader>
                    <CardTitle>Feedback List ({filteredFeedback.length})</CardTitle>
                    <CardDescription>Click on any item to view details and manage</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>
                    ) : filteredFeedback.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
                                ? 'No feedback matches your filters'
                                : 'No feedback submitted yet'}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">Type</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                    <TableHead className="w-12">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFeedback.map((feedback) => (
                                    <TableRow
                                        key={feedback.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(feedback)}
                                    >
                                        <TableCell>
                                            {feedback.feedback_type === 'bug_report' ? (
                                                <Bug className="h-5 w-5 text-red-500" />
                                            ) : (
                                                <Lightbulb className="h-5 w-5 text-yellow-500" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{feedback.title}</div>
                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {feedback.description.substring(0, 50)}...
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{feedback.user_name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{feedback.user_email}</div>
                                        </TableCell>
                                        <TableCell>{getPriorityBadge(feedback.priority)}</TableCell>
                                        <TableCell>{getStatusBadge(feedback.status)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Detail Dialog */}
            <FeedbackDetailDialog
                open={detailOpen}
                onOpenChange={setDetailOpen}
                feedback={selectedFeedback}
                onUpdate={fetchFeedback}
            />
        </div>
    );
};

export default FeedbackManagement;

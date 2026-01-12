import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
    Bug,
    Lightbulb,
    ExternalLink,
    FileText,
    FileImage,
    FileVideo,
    Loader2,
    Download
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Attachment {
    file_name: string;
    file_path: string;
    file_size: number;
    file_type: string;
    uploaded_at: string;
}

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
    attachments?: Attachment[];
    admin_notes?: string;
    created_at: string;
    updated_at: string;
}

interface FeedbackDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedback: FeedbackItem | null;
    onUpdate: () => void;
}

const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'rejected', label: 'Rejected' },
];

const getPriorityBadge = (priority: string) => {
    switch (priority) {
        case 'low':
            return <Badge variant="outline" className="bg-gray-100">Low</Badge>;
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

const getStatusColor = (status: string) => {
    switch (status) {
        case 'submitted':
            return 'bg-yellow-100 text-yellow-800';
        case 'under_review':
            return 'bg-purple-100 text-purple-800';
        case 'in_progress':
            return 'bg-blue-100 text-blue-800';
        case 'resolved':
            return 'bg-green-100 text-green-800';
        case 'closed':
            return 'bg-gray-100 text-gray-800';
        case 'rejected':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
};

export const FeedbackDetailDialog = ({
    open,
    onOpenChange,
    feedback,
    onUpdate
}: FeedbackDetailDialogProps) => {
    const { toast } = useToast();
    const [status, setStatus] = useState(feedback?.status || 'submitted');
    const [adminNotes, setAdminNotes] = useState(feedback?.admin_notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    useEffect(() => {
        if (feedback) {
            setStatus(feedback.status);
            setAdminNotes(feedback.admin_notes || '');
        }
    }, [feedback]);

    if (!feedback) return null;

    const handleStatusChange = async (newStatus: string) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('user_feedback' as any)
                .update({ status: newStatus })
                .eq('id', feedback.id);

            if (error) throw error;

            setStatus(newStatus as typeof status);
            toast({
                title: 'Status updated',
                description: `Feedback status changed to ${newStatus.replace('_', ' ')}`,
            });
            onUpdate();
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast({
                title: 'Update failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            const { error } = await supabase
                .from('user_feedback' as any)
                .update({ admin_notes: adminNotes })
                .eq('id', feedback.id);

            if (error) throw error;

            toast({
                title: 'Notes saved',
                description: 'Admin notes have been updated',
            });
            onUpdate();
        } catch (error: any) {
            console.error('Error saving notes:', error);
            toast({
                title: 'Save failed',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSavingNotes(false);
        }
    };

    const downloadAttachment = async (attachment: Attachment) => {
        try {
            const { data, error } = await supabase.storage
                .from('feedback-attachments')
                .download(attachment.file_path);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.file_name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error('Download error:', error);
            toast({
                title: 'Download failed',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {feedback.feedback_type === 'bug_report' ? (
                            <Bug className="h-5 w-5 text-red-500" />
                        ) : (
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                        )}
                        {feedback.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* User Info */}
                    <div className="text-sm text-muted-foreground">
                        Submitted by {feedback.user_name || 'Unknown'} ({feedback.user_email})
                    </div>

                    {/* Status, Priority, Type Row */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Status:</Label>
                            <Select
                                value={status}
                                onValueChange={handleStatusChange}
                                disabled={isSaving}
                            >
                                <SelectTrigger className="w-[140px] h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(option.value)}`}>
                                                {option.label}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Priority:</Label>
                            {getPriorityBadge(feedback.priority)}
                        </div>

                        <div className="flex items-center gap-2">
                            <Label className="text-sm">Type:</Label>
                            <Badge variant="outline">
                                {feedback.feedback_type === 'bug_report' ? 'Bug Report' : 'Feature Request'}
                            </Badge>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Description</Label>
                        <div className="p-3 bg-muted/50 rounded-lg whitespace-pre-wrap text-sm">
                            {feedback.description}
                        </div>
                    </div>

                    {/* Attachments */}
                    {feedback.attachments && feedback.attachments.length > 0 && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Attachments</Label>
                            <div className="space-y-2">
                                {feedback.attachments.map((attachment, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                                    >
                                        {getFileIcon(attachment.file_type)}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(attachment.file_size)}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => downloadAttachment(attachment)}
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submitted From URL */}
                    {feedback.current_page_url && (
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Submitted From</Label>
                            <a
                                href={feedback.current_page_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                                {feedback.current_page_url}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Admin Notes</Label>
                        <Textarea
                            placeholder="Add internal notes about this feedback..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                        <Button
                            size="sm"
                            onClick={handleSaveNotes}
                            disabled={isSavingNotes}
                        >
                            {isSavingNotes ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Notes'
                            )}
                        </Button>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                        <div>Created: {new Date(feedback.created_at).toLocaleString()}</div>
                        <div>Last Updated: {new Date(feedback.updated_at).toLocaleString()}</div>
                        {feedback.user_role && <div>User Role: {feedback.user_role}</div>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackDetailDialog;

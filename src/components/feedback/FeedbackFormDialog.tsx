import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
    Bug,
    Lightbulb,
    Upload,
    X,
    Loader2,
    FileImage,
    FileVideo,
    FileText,
    AlertCircle
} from 'lucide-react';

interface FeedbackFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'bug_report' | 'feature_request';
type Priority = 'low' | 'medium' | 'high' | 'critical';

interface AttachmentFile {
    file: File;
    preview?: string;
    id: string;
}

interface UserProfile {
    id: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    role?: string;
}

const FeedbackFormDialog = ({ open, onOpenChange }: FeedbackFormDialogProps) => {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug_report');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/webm'
    ];

    // Fetch user profile when dialog opens
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching profile:', error);
                    // Fallback to user email
                    setProfile({
                        id: user.id,
                        email: user.email,
                    });
                } else if (data) {
                    const profileData = data as any;
                    setProfile({
                        id: profileData.id,
                        email: profileData.email || user.email,
                        first_name: profileData.first_name,
                        last_name: profileData.last_name,
                        role: profileData.role,
                    });
                }
            } catch (err) {
                console.error('Error:', err);
                setProfile({ id: user.id, email: user.email });
            }
        };

        if (open) {
            fetchProfile();
        }
    }, [open, user?.id, user?.email]);

    const resetForm = () => {
        setFeedbackType('bug_report');
        setTitle('');
        setDescription('');
        setPriority('medium');
        setAttachments([]);
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newAttachments: AttachmentFile[] = [];

        Array.from(files).forEach((file) => {
            // Validate file type
            if (!allowedTypes.includes(file.type)) {
                toast({
                    title: 'Invalid file type',
                    description: `${file.name} is not a supported file type. Allowed: images, PDF, video`,
                    variant: 'destructive',
                });
                return;
            }

            // Validate file size
            if (file.size > maxFileSize) {
                toast({
                    title: 'File too large',
                    description: `${file.name} exceeds the 10MB limit`,
                    variant: 'destructive',
                });
                return;
            }

            // Create preview for images
            let preview: string | undefined;
            if (file.type.startsWith('image/')) {
                preview = URL.createObjectURL(file);
            }

            newAttachments.push({
                file,
                preview,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
        });

        setAttachments((prev) => [...prev, ...newAttachments]);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments((prev) => {
            const toRemove = prev.find((a) => a.id === id);
            if (toRemove?.preview) {
                URL.revokeObjectURL(toRemove.preview);
            }
            return prev.filter((a) => a.id !== id);
        });
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <FileImage className="h-4 w-4" />;
        if (type.startsWith('video/')) return <FileVideo className="h-4 w-4" />;
        return <FileText className="h-4 w-4" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getBrowserInfo = () => {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !description.trim()) {
            toast({
                title: 'Missing required fields',
                description: 'Please fill in the title and description',
                variant: 'destructive',
            });
            return;
        }

        if (!user?.id) {
            toast({
                title: 'Authentication required',
                description: 'Please log in to submit feedback',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Upload attachments first
            const uploadedAttachments: Array<{
                file_name: string;
                file_path: string;
                file_size: number;
                file_type: string;
                uploaded_at: string;
            }> = [];

            for (const attachment of attachments) {
                const timestamp = Date.now();
                const sanitizedName = attachment.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const filePath = `${user.id}/${timestamp}-${sanitizedName}`;

                const { error: uploadError } = await supabase.storage
                    .from('feedback-attachments')
                    .upload(filePath, attachment.file, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    toast({
                        title: 'Upload failed',
                        description: `Failed to upload ${attachment.file.name}: ${uploadError.message}`,
                        variant: 'destructive',
                    });
                    continue;
                }

                uploadedAttachments.push({
                    file_name: attachment.file.name,
                    file_path: filePath,
                    file_size: attachment.file.size,
                    file_type: attachment.file.type,
                    uploaded_at: new Date().toISOString(),
                });
            }

            // Get user name from profile
            const userName = profile
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email?.split('@')[0]
                : user.email?.split('@')[0];

            // Insert feedback record
            const { error: insertError } = await supabase
                .from('user_feedback' as any)
                .insert({
                    user_id: user.id,
                    feedback_type: feedbackType,
                    title: title.trim(),
                    description: description.trim(),
                    priority: priority,
                    user_email: profile?.email || user.email,
                    user_name: userName,
                    user_role: profile?.role || 'user',
                    browser_info: getBrowserInfo(),
                    current_page_url: window.location.href,
                    attachments: uploadedAttachments,
                });

            if (insertError) {
                throw insertError;
            }

            toast({
                title: 'Feedback submitted!',
                description: feedbackType === 'bug_report'
                    ? 'Thank you for reporting this bug. Our team will look into it.'
                    : 'Thank you for your feature suggestion. We appreciate your input!',
            });

            handleClose();
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            toast({
                title: 'Submission failed',
                description: error.message || 'An error occurred while submitting your feedback',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {feedbackType === 'bug_report' ? (
                            <Bug className="h-5 w-5 text-red-500" />
                        ) : (
                            <Lightbulb className="h-5 w-5 text-yellow-500" />
                        )}
                        Submit Feedback
                    </DialogTitle>
                    <DialogDescription>
                        Help us improve by reporting bugs or suggesting new features
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Feedback Type Toggle */}
                    <div className="space-y-2">
                        <Label>Feedback Type</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={feedbackType === 'bug_report' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => setFeedbackType('bug_report')}
                            >
                                <Bug className="mr-2 h-4 w-4" />
                                Bug Report
                            </Button>
                            <Button
                                type="button"
                                variant={feedbackType === 'feature_request' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() => setFeedbackType('feature_request')}
                            >
                                <Lightbulb className="mr-2 h-4 w-4" />
                                Feature Request
                            </Button>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">
                            Title <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="title"
                            placeholder={
                                feedbackType === 'bug_report'
                                    ? 'Brief description of the bug'
                                    : 'Brief description of the feature'
                            }
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={255}
                        />
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-gray-100">Low</Badge>
                                        <span className="text-muted-foreground text-xs">Minor issue / Nice to have</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="medium">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-blue-100 text-blue-800">Medium</Badge>
                                        <span className="text-muted-foreground text-xs">Affects workflow</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="high">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-orange-100 text-orange-800">High</Badge>
                                        <span className="text-muted-foreground text-xs">Significant impact</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="critical">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="destructive">Critical</Badge>
                                        <span className="text-muted-foreground text-xs">Blocking / Data loss</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">
                            Description <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                            id="description"
                            placeholder={
                                feedbackType === 'bug_report'
                                    ? 'Steps to reproduce:\n1. \n2. \n3. \n\nExpected behavior:\n\nActual behavior:'
                                    : 'Describe the feature you would like to see...\n\nUse case:\n\nBenefits:'
                            }
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <Label>Attachments</Label>
                        <div className="text-xs text-muted-foreground mb-2">
                            Supported: Images (JPEG, PNG, GIF, WebP), PDF, Video (MP4, WebM) • Max 10MB per file
                        </div>

                        {/* File Upload Area */}
                        <div
                            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Click to upload or drag and drop
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={allowedTypes.join(',')}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>

                        {/* Attachment List */}
                        {attachments.length > 0 && (
                            <div className="space-y-2 mt-3">
                                {attachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                                    >
                                        {attachment.preview ? (
                                            <img
                                                src={attachment.preview}
                                                alt={attachment.file.name}
                                                className="h-10 w-10 object-cover rounded"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                                                {getFileIcon(attachment.file.type)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFileSize(attachment.file.size)}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => removeAttachment(attachment.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Browser Info Note (for bug reports) */}
                    {feedbackType === 'bug_report' && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                            <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <p className="text-blue-700 dark:text-blue-300">
                                Browser and system information will be automatically included to help us debug the issue.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Feedback'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default FeedbackFormDialog;

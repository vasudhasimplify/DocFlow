import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Type, Hash, Calendar, ToggleLeft, List, Link, Mail, FileText, Search } from 'lucide-react';
import { FieldType, MetadataDefinition } from '@/hooks/useCustomMetadata';
import { supabase } from '@/integrations/supabase/client';

interface CreateMetadataFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: MetadataFieldFormData) => Promise<void>;
    editingField?: MetadataDefinition | null;
}

export interface MetadataFieldFormData {
    field_name: string;
    field_label: string;
    field_type: FieldType;
    description: string;
    is_required: boolean;
    default_value: string;
    options: string;
    validation_rules?: Record<string, any>;
    selected_document_ids?: string[];
}

interface DocumentItem {
    id: string;
    file_name: string;
}

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
    text: <Type className="h-4 w-4" />,
    number: <Hash className="h-4 w-4" />,
    date: <Calendar className="h-4 w-4" />,
    boolean: <ToggleLeft className="h-4 w-4" />,
    select: <List className="h-4 w-4" />,
    'multi-select': <List className="h-4 w-4" />,
    url: <Link className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
};

const fieldTypeLabels: Record<FieldType, string> = {
    text: 'Text',
    number: 'Number',
    date: 'Date',
    boolean: 'Yes/No',
    select: 'Single Select',
    'multi-select': 'Multi Select',
    url: 'URL',
    email: 'Email',
};

export function CreateMetadataFieldDialog({
    open,
    onOpenChange,
    onSubmit,
    editingField,
}: CreateMetadataFieldDialogProps) {
    const [formData, setFormData] = useState<MetadataFieldFormData>({
        field_name: '',
        field_label: '',
        field_type: 'text',
        description: '',
        is_required: false,
        default_value: '',
        options: '',
        validation_rules: {},
        selected_document_ids: [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docSearchQuery, setDocSearchQuery] = useState('');

    // Fetch documents when dialog opens
    useEffect(() => {
        if (open && !editingField) {
            fetchDocuments();
        }
    }, [open, editingField]);

    const fetchDocuments = async () => {
        setLoadingDocs(true);
        try {
            const { data: user } = await supabase.auth.getUser();
            if (!user.user) return;

            const { data, error } = await (supabase
                .from('documents')
                .select('id, file_name')
                .eq('user_id', user.user.id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(100) as any);

            if (error) throw error;
            setDocuments(data || []);
        } catch (err) {
            console.error('Error fetching documents:', err);
        } finally {
            setLoadingDocs(false);
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.file_name.toLowerCase().includes(docSearchQuery.toLowerCase())
    );

    const toggleDocumentSelection = (docId: string) => {
        setFormData(prev => {
            const current = prev.selected_document_ids || [];
            if (current.includes(docId)) {
                return { ...prev, selected_document_ids: current.filter(id => id !== docId) };
            } else {
                return { ...prev, selected_document_ids: [...current, docId] };
            }
        });
    };

    useEffect(() => {
        if (open) {
            if (editingField) {
                setFormData({
                    field_name: editingField.field_name,
                    field_label: editingField.field_label,
                    field_type: editingField.field_type,
                    description: editingField.description || '',
                    is_required: editingField.is_required,
                    default_value: editingField.default_value || '',
                    options: editingField.options?.join(', ') || '',
                    validation_rules: editingField.validation_rules || {},
                    selected_document_ids: [],
                });
            } else {
                setFormData({
                    field_name: '',
                    field_label: '',
                    field_type: 'text',
                    description: '',
                    is_required: false,
                    default_value: '',
                    options: '',
                    validation_rules: {},
                    selected_document_ids: [],
                });
            }
        }
    }, [open, editingField]);

    const handleValidationChange = (key: string, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            validation_rules: {
                ...prev.validation_rules,
                [key]: value === '' ? undefined : value
            } // Remove undefined/empty values
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.field_label.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onOpenChange(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {editingField ? 'Edit Field' : 'Create Custom Field'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingField
                            ? 'Update the field properties'
                            : 'Add a new metadata field for your documents'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="field_label">Field Label *</Label>
                            <Input
                                id="field_label"
                                placeholder="e.g., Client Name, Project Code, Status"
                                value={formData.field_label}
                                onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Optional description for this field"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="default_value">Default Value</Label>
                            <Input
                                id="default_value"
                                placeholder="Optional default value"
                                value={formData.default_value}
                                onChange={(e) => setFormData(prev => ({ ...prev, default_value: e.target.value }))}
                            />
                        </div>

                        {/* Document Picker Section - Only for new fields */}
                        {!editingField && (
                            <div className="border rounded-md p-4 space-y-3 bg-blue-50/30 dark:bg-blue-950/20">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-medium text-sm">Apply to Documents</h4>
                                    <span className="text-xs text-muted-foreground">(Optional)</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Select documents to immediately apply the default value to when this field is created.
                                </p>

                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search documents..."
                                        value={docSearchQuery}
                                        onChange={(e) => setDocSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>

                                {loadingDocs ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                ) : filteredDocuments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        No documents found
                                    </p>
                                ) : (
                                    <ScrollArea className="h-[150px] border rounded-md">
                                        <div className="p-2 space-y-1">
                                            {filteredDocuments.map(doc => (
                                                <label
                                                    key={doc.id}
                                                    className="flex items-center gap-2 p-2 rounded hover:bg-accent/50 cursor-pointer"
                                                >
                                                    <Checkbox
                                                        checked={formData.selected_document_ids?.includes(doc.id) || false}
                                                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                                                    />
                                                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <span className="text-sm truncate">{doc.file_name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}

                                {(formData.selected_document_ids?.length || 0) > 0 && (
                                    <p className="text-xs text-blue-600">
                                        {formData.selected_document_ids?.length} document(s) selected
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : editingField ? (
                                'Save Changes'
                            ) : (
                                'Create Field'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

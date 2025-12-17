import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Image, File } from 'lucide-react';

interface Document {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    created_at: string;
}

interface DocumentSelectorProps {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    maxHeight?: string;
}

export function DocumentSelector({ selectedIds, onSelectionChange, maxHeight = '300px' }: DocumentSelectorProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('documents')
                    .select('id, file_name, file_type, file_size, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) throw error;
                setDocuments(data || []);
            } catch (err) {
                console.error('Failed to fetch documents:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    const filteredDocs = useMemo(() => {
        if (!searchQuery.trim()) return documents;
        const q = searchQuery.toLowerCase();
        return documents.filter(d => d.file_name.toLowerCase().includes(q));
    }, [documents, searchQuery]);

    const toggleSelection = (docId: string) => {
        if (selectedIds.includes(docId)) {
            onSelectionChange(selectedIds.filter(id => id !== docId));
        } else {
            onSelectionChange([...selectedIds, docId]);
        }
    };

    const getFileIcon = (type: string) => {
        if (type?.includes('image')) return <Image className="h-4 w-4 text-green-500" />;
        if (type?.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
        return <File className="h-4 w-4 text-muted-foreground" />;
    };

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedIds.length} selected</Badge>
                </div>
            )}

            <ScrollArea style={{ maxHeight }} className="border rounded-md">
                <div className="p-2 space-y-1">
                    {filteredDocs.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">No documents found.</p>
                    ) : (
                        filteredDocs.map(doc => (
                            <div
                                key={doc.id}
                                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${selectedIds.includes(doc.id) ? 'bg-primary/10 border border-primary/30' : ''
                                    }`}
                                onClick={() => toggleSelection(doc.id)}
                            >
                                <Checkbox
                                    checked={selectedIds.includes(doc.id)}
                                    onCheckedChange={() => toggleSelection(doc.id)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                {getFileIcon(doc.file_type)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                    <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, FileText, File, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimplifyDriveDocument {
    id: string;
    file_name: string;
    file_type: string;
    file_size: number;
    storage_path: string | null;
    created_at: string;
    is_deleted?: boolean;
}

interface SingleDocumentSelectorProps {
    selectedDocument: SimplifyDriveDocument | null;
    onSelectionChange: (doc: SimplifyDriveDocument | null) => void;
    maxHeight?: string;
    acceptedTypes?: string[]; // e.g., ['pdf', 'doc', 'docx', 'txt']
}

export function SingleDocumentSelector({
    selectedDocument,
    onSelectionChange,
    maxHeight = '350px',
    acceptedTypes = ['pdf', 'doc', 'docx', 'txt']
}: SingleDocumentSelectorProps) {
    const [documents, setDocuments] = useState<SimplifyDriveDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('documents')
                    .select('id, file_name, file_type, file_size, storage_path, created_at, is_deleted')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (error) throw error;

                console.log('📄 Fetched documents for signature:', data?.length || 0);

                // Cast and filter out deleted documents
                const rawData = (data || []) as unknown as SimplifyDriveDocument[];
                const filteredData = rawData.filter(doc => {
                    // Exclude deleted documents
                    if (doc.is_deleted === true) {
                        return false;
                    }
                    return true;
                });

                console.log('📄 Filtered documents:', filteredData.length);
                setDocuments(filteredData);
            } catch (err) {
                console.error('Failed to fetch documents:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, []);

    const filteredDocs = useMemo(() => {
        let docs = documents;

        // Filter by accepted types
        if (acceptedTypes.length > 0) {
            docs = docs.filter(d => {
                const ext = d.file_name?.split('.').pop()?.toLowerCase() || '';
                const mimeType = d.file_type?.toLowerCase() || '';
                return acceptedTypes.some(type =>
                    ext === type.toLowerCase() ||
                    mimeType.includes(type.toLowerCase())
                );
            });
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(d => d.file_name.toLowerCase().includes(q));
        }

        return docs;
    }, [documents, searchQuery, acceptedTypes]);

    const handleSelect = (doc: SimplifyDriveDocument) => {
        if (selectedDocument?.id === doc.id) {
            onSelectionChange(null); // Deselect if clicking same document
        } else {
            onSelectionChange(doc);
        }
    };

    const getFileIcon = (fileName: string, type: string) => {
        const ext = fileName?.split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf' || type?.includes('pdf')) {
            return <FileText className="h-4 w-4 text-red-500" />;
        }
        if (ext === 'doc' || ext === 'docx' || type?.includes('word')) {
            return <FileText className="h-4 w-4 text-blue-500" />;
        }
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
                <span className="ml-2 text-sm text-muted-foreground">Loading documents...</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search your documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div
                className="border rounded-md overflow-y-auto"
                style={{ maxHeight, height: maxHeight }}
            >
                <div className="p-2 space-y-1">
                    {filteredDocs.length === 0 ? (
                        <div className="text-center py-8">
                            <File className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                {documents.length === 0
                                    ? "No documents in SimplifyDrive"
                                    : "No matching documents found"}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                                Supported: PDF, DOC, DOCX, TXT
                            </p>
                        </div>
                    ) : (
                        filteredDocs.map(doc => {
                            const isSelected = selectedDocument?.id === doc.id;
                            return (
                                <div
                                    key={doc.id}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-md cursor-pointer transition-all",
                                        "hover:bg-muted/50",
                                        isSelected && "bg-primary/10 border border-primary/30 ring-1 ring-primary/20"
                                    )}
                                    onClick={() => handleSelect(doc)}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground/30"
                                    )}>
                                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                    </div>
                                    {getFileIcon(doc.file_name, doc.file_type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {filteredDocs.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                    {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''} available
                </p>
            )}
        </div>
    );
}

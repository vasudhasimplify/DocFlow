import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tags,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Type,
  Hash,
  Calendar,
  ToggleLeft,
  List,
  Link,
  Mail,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { useCustomMetadata, FieldType, MetadataDefinition } from '@/hooks/useCustomMetadata';
import { CreateMetadataFieldDialog, MetadataFieldFormData } from './CreateMetadataFieldDialog';
import { supabase } from '@/integrations/supabase/client';

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

interface DocumentWithMetadata {
  id: string;
  file_name: string;
  field_value: string;
}

export function CustomMetadataManager() {
  const { definitions, isLoading, createDefinition, updateDefinition, deleteDefinition, setDocumentMetadata } = useCustomMetadata();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingField, setEditingField] = useState<MetadataDefinition | null>(null);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [fieldDocuments, setFieldDocuments] = useState<Record<string, DocumentWithMetadata[]>>({});
  const [loadingFieldDocs, setLoadingFieldDocs] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingField(null);
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (def: MetadataDefinition) => {
    setEditingField(def);
    setShowCreateDialog(true);
  };

  const handleToggleExpand = async (fieldId: string) => {
    if (expandedFieldId === fieldId) {
      setExpandedFieldId(null);
      return;
    }

    setExpandedFieldId(fieldId);

    // Fetch documents with this metadata field if not already loaded
    if (!fieldDocuments[fieldId]) {
      setLoadingFieldDocs(fieldId);
      try {
        const { data, error } = await (supabase
          .from('document_custom_metadata')
          .select(`
            id,
            field_value,
            documents!inner(id, file_name)
          `)
          .eq('definition_id', fieldId) as any);

        if (error) throw error;

        const docs: DocumentWithMetadata[] = (data || []).map((item: any) => ({
          id: item.documents.id,
          file_name: item.documents.file_name,
          field_value: item.field_value || '',
        }));

        setFieldDocuments(prev => ({ ...prev, [fieldId]: docs }));
      } catch (err) {
        console.error('Error fetching field documents:', err);
        setFieldDocuments(prev => ({ ...prev, [fieldId]: [] }));
      } finally {
        setLoadingFieldDocs(null);
      }
    }
  };

  const handleSubmit = async (formData: MetadataFieldFormData) => {
    const fieldName = formData.field_name || formData.field_label.toLowerCase().replace(/\s+/g, '_');
    const options = formData.options
      ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
      : null;

    if (editingField) {
      await updateDefinition(editingField.id, {
        field_name: fieldName,
        field_label: formData.field_label,
        field_type: formData.field_type,
        description: formData.description || null,
        is_required: formData.is_required,
        default_value: formData.default_value || null,
        options,
        validation_rules: formData.validation_rules || null,
      });
      // Clear cached documents for this field
      setFieldDocuments(prev => {
        const updated = { ...prev };
        delete updated[editingField.id];
        return updated;
      });
    } else {
      const newDefinition = await createDefinition({
        field_name: fieldName,
        field_label: formData.field_label,
        field_type: formData.field_type,
        description: formData.description || null,
        is_required: formData.is_required,
        default_value: formData.default_value || null,
        options,
        sort_order: definitions.length,
        is_active: true,
        validation_rules: formData.validation_rules || null,
      });

      // Apply default value to selected documents
      if (newDefinition && formData.selected_document_ids?.length && formData.default_value) {
        for (const docId of formData.selected_document_ids) {
          await setDocumentMetadata(docId, newDefinition.id, formData.default_value);
        }
      }
    }
    setShowCreateDialog(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" />
                Custom Metadata Fields
              </CardTitle>
              <CardDescription>
                Define custom fields to organize and categorize your documents
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {definitions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Tags className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No custom fields yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Create custom metadata fields to add structured information to your documents,
                like project names, client IDs, or document categories.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Field
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {definitions.map((def) => {
                  const isExpanded = expandedFieldId === def.id;
                  const docs = fieldDocuments[def.id] || [];
                  const isLoadingDocs = loadingFieldDocs === def.id;

                  return (
                    <Collapsible
                      key={def.id}
                      open={isExpanded}
                      onOpenChange={() => handleToggleExpand(def.id)}
                    >
                      <div className="rounded-lg border overflow-hidden">
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}

                            <div className="p-2 rounded-lg bg-primary/10">
                              {fieldTypeIcons[def.field_type]}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{def.field_label}</span>
                                {def.is_required && (
                                  <Badge variant="secondary" className="text-xs">Required</Badge>
                                )}
                                {docs.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    {docs.length} doc{docs.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {fieldTypeLabels[def.field_type]}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(def)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteDefinition(def.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-2 bg-muted/30 border-t space-y-3">
                            {def.description && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-1">Description</p>
                                <p className="text-sm">{def.description}</p>
                              </div>
                            )}

                            {def.default_value && (
                              <div>
                                <p className="text-xs text-muted-foreground font-medium mb-1">Default Value</p>
                                <p className="text-sm">{def.default_value}</p>
                              </div>
                            )}

                            <div>
                              <p className="text-xs text-muted-foreground font-medium mb-2">
                                Documents with this field ({docs.length})
                              </p>
                              {isLoadingDocs ? (
                                <div className="flex items-center gap-2 py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <span className="text-sm text-muted-foreground">Loading...</span>
                                </div>
                              ) : docs.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic">
                                  No documents have this field set yet.
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex items-center gap-2 text-sm p-2 rounded bg-background border"
                                    >
                                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <span className="truncate flex-1">{doc.file_name}</span>
                                      <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                        = {doc.field_value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <CreateMetadataFieldDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleSubmit}
        editingField={editingField}
      />
    </>
  );
}


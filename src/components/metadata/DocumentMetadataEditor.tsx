import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tags, Save, Loader2, Plus } from 'lucide-react';
import { useCustomMetadata, DocumentMetadata } from '@/hooks/useCustomMetadata';
import { CreateMetadataFieldDialog, MetadataFieldFormData } from './CreateMetadataFieldDialog';
import { format } from 'date-fns';

interface DocumentMetadataEditorProps {
  documentId: string;
  documentName: string;
}

export function DocumentMetadataEditor({
  documentId,
  documentName,
}: DocumentMetadataEditorProps) {
  const { definitions, getDocumentMetadata, setDocumentMetadata, createDefinition, isLoading } = useCustomMetadata();
  const [values, setValues] = useState<Record<string, string>>({});
  const [existingMetadata, setExistingMetadata] = useState<DocumentMetadata[]>([]);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isLoadingValues, setIsLoadingValues] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoadingValues(true);
      const metadata = await getDocumentMetadata(documentId);
      setExistingMetadata(metadata);

      const valueMap: Record<string, string> = {};
      metadata.forEach(m => {
        valueMap[m.definition_id] = m.field_value || '';
      });
      setValues(valueMap);
      setIsLoadingValues(false);
    };

    loadMetadata();
  }, [documentId, getDocumentMetadata]);

  const handleSave = async (definitionId: string) => {
    setIsSaving(definitionId);
    try {
      await setDocumentMetadata(documentId, definitionId, values[definitionId] || null);
    } finally {
      setIsSaving(null);
    }
  };

  const handleCreateField = async (formData: MetadataFieldFormData) => {
    const fieldName = formData.field_name || formData.field_label.toLowerCase().replace(/\s+/g, '_');
    const options = formData.options
      ? formData.options.split(',').map(o => o.trim()).filter(Boolean)
      : null;

    await createDefinition({
      field_name: fieldName,
      field_label: formData.field_label,
      field_type: formData.field_type,
      description: formData.description || null,
      is_required: formData.is_required,
      default_value: formData.default_value || null,
      options,
      sort_order: definitions.length,
      is_active: true,
      validation_rules: null,
    });

    setShowCreateDialog(false);
  };

  if (isLoading || isLoadingValues) {
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Tags className="h-4 w-4 text-primary" />
              Custom Metadata
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {definitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No fields defined</p>
              <Button variant="link" size="sm" onClick={() => setShowCreateDialog(true)}>
                Create first field
              </Button>
            </div>
          ) : (
            definitions.map((def) => {
              const value = values[def.id] || '';
              const hasChanged = value !== (existingMetadata.find(m => m.definition_id === def.id)?.field_value || '');

              return (
                <div key={def.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={def.id} className="flex items-center gap-2">
                      {def.field_label}
                      {def.is_required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </Label>
                    {hasChanged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(def.id)}
                        disabled={isSaving === def.id}
                      >
                        {isSaving === def.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>

                  {def.field_type === 'text' && (
                    <Input
                      id={def.id}
                      placeholder={def.description || `Enter ${def.field_label.toLowerCase()}`}
                      value={value}
                      onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      onBlur={() => hasChanged && handleSave(def.id)}
                    />
                  )}

                  {def.field_type === 'number' && (
                    <Input
                      id={def.id}
                      type="number"
                      placeholder="0"
                      value={value}
                      onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      onBlur={() => hasChanged && handleSave(def.id)}
                    />
                  )}

                  {def.field_type === 'date' && (
                    <Input
                      id={def.id}
                      type="date"
                      value={value}
                      onChange={(e) => {
                        setValues(prev => ({ ...prev, [def.id]: e.target.value }));
                        handleSave(def.id);
                      }}
                    />
                  )}

                  {def.field_type === 'boolean' && (
                    <Switch
                      checked={value === 'true'}
                      onCheckedChange={(checked) => {
                        setValues(prev => ({ ...prev, [def.id]: checked.toString() }));
                        setDocumentMetadata(documentId, def.id, checked.toString());
                      }}
                    />
                  )}

                  {(def.field_type === 'select' || def.field_type === 'multi-select') && def.options && (
                    <Select
                      value={value}
                      onValueChange={(v) => {
                        setValues(prev => ({ ...prev, [def.id]: v }));
                        setDocumentMetadata(documentId, def.id, v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${def.field_label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {def.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {def.field_type === 'url' && (
                    <Input
                      id={def.id}
                      type="url"
                      placeholder="https://..."
                      value={value}
                      onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      onBlur={() => hasChanged && handleSave(def.id)}
                    />
                  )}

                  {def.field_type === 'email' && (
                    <Input
                      id={def.id}
                      type="email"
                      placeholder="email@example.com"
                      value={value}
                      onChange={(e) => setValues(prev => ({ ...prev, [def.id]: e.target.value }))}
                      onBlur={() => hasChanged && handleSave(def.id)}
                    />
                  )}

                  {def.description && (
                    <p className="text-xs text-muted-foreground">{def.description}</p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <CreateMetadataFieldDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateField}
      />
    </>
  );
}

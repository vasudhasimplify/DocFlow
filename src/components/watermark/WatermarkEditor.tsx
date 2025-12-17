import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Droplets,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  Loader2,
  FileText,
  Search,
  Check,
  X,
} from 'lucide-react';
import { useWatermark, WatermarkSettings, WatermarkPosition, WatermarkType } from '@/hooks/useWatermark';
import { WatermarkPreview } from './WatermarkPreview';
import { supabase } from '@/integrations/supabase/client';

const positionOptions: { value: WatermarkPosition; label: string }[] = [
  { value: 'center', label: 'Center' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'tile', label: 'Tile (Repeat)' },
];

const fontOptions = [
  'Arial',
  'Times New Roman',
  'Helvetica',
  'Georgia',
  'Courier New',
  'Verdana',
];

interface DocumentItem {
  id: string;
  file_name: string;
}

export function WatermarkEditor() {
  const { watermarks, isLoading, createWatermark, updateWatermark, deleteWatermark } = useWatermark();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWatermark, setEditingWatermark] = useState<WatermarkSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    watermark_type: 'text' as WatermarkType,
    text_content: 'CONFIDENTIAL',
    font_family: 'Arial',
    font_size: 48,
    text_color: '#00000033',
    rotation: -45,
    opacity: 0.3,
    position: 'center' as WatermarkPosition,
    include_date: false,
    include_username: false,
    is_default: false,
    document_id: null as string | null,
    document_name: null as string | null, // For display only
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Document picker state
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [showDocResults, setShowDocResults] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      watermark_type: 'text',
      text_content: 'CONFIDENTIAL',
      font_family: 'Arial',
      font_size: 48,
      text_color: '#00000033',
      rotation: -45,
      opacity: 0.3,
      position: 'center',
      include_date: false,
      include_username: false,
      is_default: false,
      document_id: null,
      document_name: null,
    });
    setEditingWatermark(null);
    setDocSearchQuery('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (wm: WatermarkSettings) => {
    setFormData({
      name: wm.name,
      watermark_type: wm.watermark_type,
      text_content: wm.text_content || 'CONFIDENTIAL',
      font_family: wm.font_family,
      font_size: wm.font_size,
      text_color: wm.text_color,
      rotation: wm.rotation,
      opacity: wm.opacity,
      position: wm.position,
      include_date: wm.include_date,
      include_username: wm.include_username,
      is_default: wm.is_default,
      document_id: wm.document_id,
      document_name: wm.document?.file_name || null,
    });
    setEditingWatermark(wm);
    setShowCreateDialog(true);
  };

  // Fetch documents for picker
  useEffect(() => {
    if (showCreateDialog) {
      const fetchDocuments = async () => {
        setLoadingDocs(true);
        try {
          const { data: user } = await supabase.auth.getUser();
          if (!user.user) return;

          let query = supabase
            .from('documents')
            .select('id, file_name')
            .eq('user_id', user.user.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(20);

          if (docSearchQuery) {
            query = query.ilike('file_name', `%${docSearchQuery}%`);
          }

          const { data, error } = await query;
          if (error) throw error;
          setDocuments(data || []);
        } catch (err) {
          console.error('Error fetching documents:', err);
        } finally {
          setLoadingDocs(false);
        }
      };

      const timer = setTimeout(fetchDocuments, 300);
      return () => clearTimeout(timer);
    }
  }, [showCreateDialog, docSearchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        name: formData.name,
        watermark_type: formData.watermark_type,
        text_content: formData.text_content,
        font_family: formData.font_family,
        font_size: formData.font_size,
        text_color: formData.text_color,
        rotation: formData.rotation,
        opacity: formData.opacity,
        position: formData.position,
        include_date: formData.include_date,
        include_username: formData.include_username,
        is_default: formData.is_default,
        document_id: formData.document_id,
        image_url: null,
      };

      if (editingWatermark) {
        await updateWatermark(editingWatermark.id, submitData);
      } else {
        await createWatermark(submitData);
      }
      setShowCreateDialog(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
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
                <Droplets className="h-5 w-5 text-primary" />
                Document Watermarks
              </CardTitle>
              <CardDescription>
                Create and manage watermarks to protect your documents
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Watermark
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {watermarks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Droplets className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No watermarks created</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Create watermarks to add text or images to your documents for branding or security purposes.
              </p>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Watermark
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {watermarks.map((wm) => (
                  <Card key={wm.id} className="relative overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{wm.name}</h4>
                            {wm.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 space-y-1">
                            <p>
                              {wm.watermark_type === 'text' ? `"${wm.text_content}"` : 'Image watermark'}
                              {' • '}{wm.position}
                            </p>
                            {wm.document?.file_name && (
                              <div className="flex items-center gap-1 text-primary/80 font-medium">
                                <FileText className="h-3 w-3" />
                                <span>{wm.document.file_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(wm)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {!wm.is_default && (
                              <DropdownMenuItem onClick={() => updateWatermark(wm.id, { is_default: true })}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => deleteWatermark(wm.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <WatermarkPreview
                        settings={wm}
                        width={250}
                        height={180}
                        className="w-full"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingWatermark ? 'Edit Watermark' : 'Create Watermark'}
            </DialogTitle>
            <DialogDescription>
              Configure watermark settings and preview
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-6 py-4">
              {/* Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Confidential Draft"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                {/* Document Selection */}
                <div className="space-y-2">
                  <Label>Apply to Document (Optional)</Label>
                  {formData.document_id ? (
                    <div className="flex items-center justify-between p-2 rounded-md border bg-accent/20">
                      <div className="flex items-center gap-2 text-sm truncate">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium truncate">{formData.document_name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setFormData(prev => ({ ...prev, document_id: null, document_name: null }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search documents..."
                          className="pl-8"
                          value={docSearchQuery}
                          onChange={(e) => {
                            setDocSearchQuery(e.target.value);
                            setShowDocResults(true);
                          }}
                          onFocus={() => setShowDocResults(true)}
                        />
                      </div>

                      {showDocResults && (docSearchQuery || documents.length > 0) && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                          <ScrollArea className="max-h-[200px]">
                            <div className="p-1">
                              {loadingDocs ? (
                                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Loading...
                                </div>
                              ) : documents.length === 0 ? (
                                <div className="py-2 px-4 text-sm text-muted-foreground text-center">
                                  No documents found
                                </div>
                              ) : (
                                documents.map(doc => (
                                  <div
                                    key={doc.id}
                                    className="flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        document_id: doc.id,
                                        document_name: doc.file_name
                                      }));
                                      setShowDocResults(false);
                                      setDocSearchQuery('');
                                    }}
                                  >
                                    <FileText className="h-4 w-4 opacity-50" />
                                    <span className="truncate">{doc.file_name}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      {/* Simple overlay to close results when clicking outside */}
                      {showDocResults && (
                        <div
                          className="fixed inset-0 z-0"
                          onClick={() => setShowDocResults(false)}
                        />
                      )}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Leave empty to create a general watermark template
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_content">Watermark Text</Label>
                  <Input
                    id="text_content"
                    placeholder="CONFIDENTIAL"
                    value={formData.text_content}
                    onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font</Label>
                    <Select
                      value={formData.font_family}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, font_family: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fontOptions.map(font => (
                          <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, position: v as WatermarkPosition }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positionOptions.map(pos => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Size: {formData.font_size}px</Label>
                  <Slider
                    value={[formData.font_size]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, font_size: v }))}
                    min={12}
                    max={120}
                    step={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rotation: {formData.rotation}°</Label>
                  <Slider
                    value={[formData.rotation]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, rotation: v }))}
                    min={-90}
                    max={90}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Opacity: {Math.round(formData.opacity * 100)}%</Label>
                  <Slider
                    value={[formData.opacity]}
                    onValueChange={([v]) => setFormData(prev => ({ ...prev, opacity: v }))}
                    min={0.05}
                    max={1}
                    step={0.05}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text_color">Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="text_color"
                      type="color"
                      value={formData.text_color.slice(0, 7)}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        text_color: e.target.value + Math.round(formData.opacity * 255).toString(16).padStart(2, '0')
                      }))}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.text_color}
                      onChange={(e) => setFormData(prev => ({ ...prev, text_color: e.target.value }))}
                      placeholder="#00000033"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Include Date</Label>
                    <Switch
                      checked={formData.include_date}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_date: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Include Username</Label>
                    <Switch
                      checked={formData.include_username}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, include_username: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Set as Default</Label>
                    <Switch
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <WatermarkPreview
                  settings={formData}
                  width={300}
                  height={400}
                  className="w-full"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingWatermark ? (
                  'Save Changes'
                ) : (
                  'Create Watermark'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

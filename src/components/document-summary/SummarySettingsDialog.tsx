import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Globe,
  Check,
} from 'lucide-react';
import {
  getSummaryTypes,
  getLanguages,
  saveSummaryTypes,
  saveLanguages,
  resetToDefaults,
  type SummaryTypeConfig,
  type LanguageConfig,
} from '@/config/summaryConfig';
import { toast } from 'sonner';

export function SummarySettingsDialog() {
  const [open, setOpen] = useState(false);
  const [summaryTypes, setSummaryTypes] = useState<SummaryTypeConfig[]>([]);
  const [languages, setLanguages] = useState<LanguageConfig[]>([]);
  
  // Custom type form
  const [newTypeId, setNewTypeId] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');

  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  const loadConfigs = () => {
    setSummaryTypes(getSummaryTypes());
    setLanguages(getLanguages());
  };

  const handleToggleSummaryType = (id: string) => {
    const updated = summaryTypes.map(type =>
      type.id === id ? { ...type, enabled: !type.enabled } : type
    );
    setSummaryTypes(updated);
    saveSummaryTypes(updated);
    toast.success('Summary type updated');
  };

  const handleToggleLanguage = (code: string) => {
    const updated = languages.map(lang =>
      lang.code === code ? { ...lang, enabled: !lang.enabled } : lang
    );
    setLanguages(updated);
    saveLanguages(updated);
    toast.success('Language updated');
  };

  const handleAddCustomType = () => {
    if (!newTypeId || !newTypeLabel) {
      toast.error('Please fill in required fields');
      return;
    }

    // Check for duplicates
    if (summaryTypes.some(t => t.id === newTypeId)) {
      toast.error('Summary type ID already exists');
      return;
    }

    const newType: SummaryTypeConfig = {
      id: newTypeId,
      label: newTypeLabel,
      description: newTypeDesc || `Custom summary: ${newTypeLabel}`,
      icon: Sparkles,
      color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
      enabled: true,
      custom: true,
    };

    const updated = [...summaryTypes, newType];
    setSummaryTypes(updated);
    saveSummaryTypes(updated);

    // Reset form
    setNewTypeId('');
    setNewTypeLabel('');
    setNewTypeDesc('');

    toast.success(`${newTypeLabel} added. Note: AI quality may vary for custom summary types.`, {
      duration: 4000,
    });
  };

  const handleDeleteType = (id: string) => {
    const updated = summaryTypes.filter(t => t.id !== id);
    setSummaryTypes(updated);
    saveSummaryTypes(updated);
    toast.success('Summary type deleted');
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings? This will remove all custom types and languages.')) {
      resetToDefaults();
      loadConfigs();
      toast.success('Reset to default settings');
    }
  };

  const enabledTypesCount = summaryTypes.filter(t => t.enabled).length;
  const enabledLanguagesCount = languages.filter(l => l.enabled).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Summary Settings
          </DialogTitle>
          <DialogDescription>
            Manage summary types and languages. Add custom options or disable unused ones.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="types" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="types" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Summary Types ({enabledTypesCount}/{summaryTypes.length})
            </TabsTrigger>
            <TabsTrigger value="languages" className="gap-2">
              <Globe className="h-4 w-4" />
              Languages ({enabledLanguagesCount}/{languages.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="space-y-4 mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {summaryTypes.map(type => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{type.label}</span>
                        {type.custom && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={type.enabled}
                        onCheckedChange={() => handleToggleSummaryType(type.id)}
                      />
                      {type.custom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => handleDeleteType(type.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Summary Type
              </h4>
              <div className="p-3 mb-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Custom types work! The AI will generate summaries based on your custom type name. Be specific: "Legal Review", "Financial Analysis", "Technical Spec", etc.
                </p>
              </div>
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="type-id" className="text-xs">ID (unique)*</Label>
                    <Input
                      id="type-id"
                      placeholder="e.g., legal-review"
                      value={newTypeId}
                      onChange={(e) => setNewTypeId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type-label" className="text-xs">Label*</Label>
                    <Input
                      id="type-label"
                      placeholder="e.g., Legal Review"
                      value={newTypeLabel}
                      onChange={(e) => setNewTypeLabel(e.target.value)}
                      className="h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="type-desc" className="text-xs">Description</Label>
                  <Input
                    id="type-desc"
                    placeholder="What this summary type focuses on"
                    value={newTypeDesc}
                    onChange={(e) => setNewTypeDesc(e.target.value)}
                    className="h-8"
                  />
                </div>
                <Button onClick={handleAddCustomType} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Summary Type
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="languages" className="space-y-4 mt-4">
            <div className="p-3 mb-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                📌 These 12 languages have been tested and verified to work with AI summaries. You can enable or disable any of them.
              </p>
            </div>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-2">
                {languages.map(lang => (
                  <div
                    key={lang.code}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm truncate block">{lang.label}</span>
                      <p className="text-xs text-muted-foreground">{lang.code}</p>
                    </div>
                    <Switch
                      checked={lang.enabled}
                      onCheckedChange={() => handleToggleLanguage(lang.code)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between border-t pt-4">
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={() => setOpen(false)} className="gap-2">
            <Check className="h-4 w-4" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

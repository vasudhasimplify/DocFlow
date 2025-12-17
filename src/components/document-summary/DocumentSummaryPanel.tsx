import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  FileText,
  Clock,
  Hash,
  Copy,
  Download,
  RefreshCw,
  BookOpen,
  ListChecks,
  Briefcase,
  List,
  ClipboardList,
  CheckCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { generateDocumentSummary } from '@/services/documentSummary';
import type { SummaryType } from '@/services/documentSummary';

interface SummaryTypeOption {
  id: SummaryType;
  label: string;
  description: string;
  icon: React.ElementType;
  color?: string;
}

const summaryTypes: SummaryTypeOption[] = [
  {
    id: 'brief',
    label: 'Brief',
    description: '2-3 sentence overview',
    icon: BookOpen,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive analysis',
    icon: FileText,
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  {
    id: 'executive',
    label: 'Executive',
    description: 'For decision makers',
    icon: Briefcase,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  },
  {
    id: 'bullet',
    label: 'Bullet Points',
    description: 'Scannable format',
    icon: List,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    id: 'action-items',
    label: 'Action Items',
    description: 'Tasks & deadlines',
    icon: ClipboardList,
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
];

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
];

interface DocumentSummary {
  summary: string;
  summaryType: SummaryType;
  metadata: {
    documentName: string;
    wordCount: number;
    charCount: number;
    estimatedReadTime: number;
    generatedAt: string;
  };
}

interface DocumentSummaryPanelProps {
  documentName: string;
  documentId: string;
  documentText: string;
  onClose?: () => void;
  initialSummary?: DocumentSummary | null;
}

export function DocumentSummaryPanel({
  documentName,
  documentId,
  documentText,
  onClose,
  initialSummary,
}: DocumentSummaryPanelProps) {
  const [selectedType, setSelectedType] = useState<SummaryType>('brief');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [summaries, setSummaries] = useState<Record<SummaryType, DocumentSummary | null>>({
    brief: initialSummary?.summaryType === 'brief' ? initialSummary : null,
    detailed: initialSummary?.summaryType === 'detailed' ? initialSummary : null,
    executive: initialSummary?.summaryType === 'executive' ? initialSummary : null,
    bullet: initialSummary?.summaryType === 'bullet' ? initialSummary : null,
    'action-items': initialSummary?.summaryType === 'action-items' ? initialSummary : null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (type: SummaryType) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Generating summary for:', documentName, 'Type:', type, 'Document ID:', documentId);
      
      const result = await generateDocumentSummary(documentId, type, selectedLanguage);

      // Check if the result contains an error or warning
      if (result.summary.startsWith('⚠️')) {
        setError(result.summary);
        toast.error('Unable to generate summary', {
          description: result.metadata.error || 'Please check the document status',
        });
        return;
      }

      const newSummary: DocumentSummary = {
        summary: result.summary,
        summaryType: type,
        metadata: {
          documentName,
          wordCount: result.metadata.wordCount || 0,
          charCount: result.metadata.charCount || 0,
          estimatedReadTime: result.metadata.estimatedReadTime || 1,
          generatedAt: result.metadata.generatedAt || new Date().toISOString(),
        },
      };

      setSummaries(prev => ({
        ...prev,
        [type]: newSummary,
      }));

      toast.success('Summary generated successfully');
    } catch (err) {
      console.error('Summary generation error:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(message);
      toast.error('Failed to generate summary', {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [documentId, documentName, documentText, selectedLanguage]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const downloadSummary = useCallback((summary: DocumentSummary) => {
    const content = `# Document Summary: ${summary.metadata.documentName}

Generated: ${new Date(summary.metadata.generatedAt).toLocaleString()}
Summary Type: ${summary.summaryType}
Word Count: ${summary.metadata.wordCount}
Estimated Read Time: ${summary.metadata.estimatedReadTime} min

---

${summary.summary}
`;
    
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${documentName.replace(/\.[^/.]+$/, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Summary downloaded');
  }, [documentName]);

  const currentSummary = summaries[selectedType];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Document Summary</CardTitle>
              <CardDescription className="truncate max-w-[200px]">
                {documentName}
              </CardDescription>
            </div>
          </div>
          
          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                {languages.find(l => l.code === selectedLanguage)?.label || 'English'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {languages.map(lang => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={cn(selectedLanguage === lang.code && 'bg-accent')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Summary Type Tabs */}
        <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as SummaryType)}>
          <TabsList className="grid grid-cols-5 h-auto p-1">
            {summaryTypes.map((type) => {
              const Icon = type.icon;
              const hasSummary = !!summaries[type.id];
              return (
                <TooltipProvider key={type.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value={type.id}
                        className={cn(
                          "flex-col gap-1 py-2 px-1 relative transition-colors",
                          "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                          type.color && "data-[state=inactive]:" + type.color
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[10px] font-medium truncate max-w-full">
                          {type.label}
                        </span>
                        {hasSummary && (
                          <CheckCircle className="absolute top-1 right-1 h-3 w-3 text-emerald-500" />
                        )}
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">{type.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Generate Button */}
        <Button
          onClick={() => generateSummary(selectedType)}
          disabled={isLoading}
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : currentSummary ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerate {summaryTypes.find(t => t.id === selectedType)?.label}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate {summaryTypes.find(t => t.id === selectedType)?.label} Summary
            </>
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Summary Content */}
        <ScrollArea className="flex-1">
          {currentSummary ? (
            <div className="space-y-4">
              {/* Metadata */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {currentSummary.metadata.wordCount.toLocaleString()} words
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {currentSummary.metadata.estimatedReadTime} min read
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Generated
                </Badge>
              </div>

              {/* Summary Text */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="p-4 rounded-lg bg-muted/50 border text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentSummary.summary}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(currentSummary.summary)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy to clipboard</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSummary(currentSummary)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download as Markdown</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <span className="text-xs text-muted-foreground ml-auto">
                  Generated {new Date(currentSummary.metadata.generatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">No summary yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Click the button above to generate an AI-powered{' '}
                {summaryTypes.find(t => t.id === selectedType)?.label.toLowerCase()} summary
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

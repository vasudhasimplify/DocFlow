import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  FileText,
  Clock,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Activity,
  FileType,
  Shield,
  Users,
  Target,
  CheckCircle2,
  XCircle,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays } from 'date-fns';

interface RiskDocument {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  age_days: number;
  risk_score: number;
  risk_factors: string[];
  custodian?: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  icon: string;
  color: string;
  documentIds: string[];
}

interface LegalHoldInsights {
  riskDocuments: RiskDocument[];
  categoryBreakdown: CategoryBreakdown[];
  totalDocuments: number;
  highRiskCount: number;
  documentsWithoutPolicy: number;
  averageDocumentAge: number;
}

interface AILegalHoldInsightsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AILegalHoldInsights: React.FC<AILegalHoldInsightsProps> = ({
  open,
  onOpenChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<LegalHoldInsights | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryBreakdown | null>(null);
  const [categoryDocuments, setCategoryDocuments] = useState<any[]>([]);
  const [loadingCategoryDocs, setLoadingCategoryDocs] = useState(false);

  useEffect(() => {
    if (open) {
      analyzeDocuments();
    }
  }, [open]);

  const analyzeDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to view insights');
        setLoading(false);
        return;
      }

      // Fetch documents for CURRENT USER ONLY
      const { data: documents, error: fetchError } = await (supabase as any)
        .from('documents')
        .select('id, file_name, file_type, created_at, updated_at, file_size, user_id, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;
      if (!documents || documents.length === 0) {
        setError('No documents found');
        setLoading(false);
        return;
      }

      const docs = documents as any[];
      const now = new Date();

      // 1. RISK ASSESSMENT - Identify high-risk documents
      const legalKeywords = [
        'contract', 'agreement', 'nda', 'confidential', 'legal', 'lawsuit',
        'litigation', 'settlement', 'complaint', 'deposition', 'subpoena',
        'compliance', 'audit', 'investigation', 'regulatory', 'violation',
        'employment', 'termination', 'severance', 'harassment', 'discrimination',
        'financial', 'invoice', 'payment', 'transaction', 'tax', 'revenue',
        'merger', 'acquisition', 'intellectual property', 'patent', 'trademark'
      ];

      const riskDocuments: RiskDocument[] = docs
        .map(doc => {
          const fileName = doc.file_name.toLowerCase();
          const ageDays = differenceInDays(now, parseISO(doc.created_at));
          const riskFactors: string[] = [];
          let riskScore = 0;

          // Age-based risk (older documents are higher risk)
          if (ageDays > 2555) { // 7 years
            riskScore += 40;
            riskFactors.push('Document older than 7 years');
          } else if (ageDays > 1825) { // 5 years
            riskScore += 30;
            riskFactors.push('Document older than 5 years');
          } else if (ageDays > 1095) { // 3 years
            riskScore += 20;
            riskFactors.push('Document older than 3 years');
          }

          // Keyword-based risk
          const matchedKeywords = legalKeywords.filter(kw => fileName.includes(kw));
          if (matchedKeywords.length > 0) {
            riskScore += matchedKeywords.length * 15;
            riskFactors.push(`Contains legal terms: ${matchedKeywords.slice(0, 3).join(', ')}`);
          }

          // File type risk (certain types are more legally significant)
          const highRiskTypes = ['pdf', 'docx', 'doc', 'msg', 'eml'];
          if (highRiskTypes.some(type => fileName.endsWith(`.${type}`))) {
            riskScore += 10;
            riskFactors.push('High-risk document type');
          }

          // Recently modified old documents (suspicious)
          if (doc.updated_at && doc.updated_at !== doc.created_at) {
            const modifiedDays = differenceInDays(now, parseISO(doc.updated_at));
            if (ageDays > 365 && modifiedDays < 30) {
              riskScore += 25;
              riskFactors.push('Old document recently modified');
            }
          }

          return {
            id: doc.id,
            file_name: doc.file_name,
            file_type: doc.file_type || 'unknown',
            created_at: doc.created_at,
            age_days: ageDays,
            risk_score: Math.min(riskScore, 100),
            risk_factors: riskFactors,
            custodian: doc.user_id
          };
        })
        .filter(doc => doc.risk_score > 0)
        .sort((a, b) => b.risk_score - a.risk_score)
        .slice(0, 20);

      // 2. DOCUMENT CATEGORY BREAKDOWN with document IDs
      const categoryMap = new Map<string, { count: number; documentIds: string[] }>();
      docs.forEach(doc => {
        const fileName = doc.file_name.toLowerCase();
        let category = 'Other';

        // Categorize by legal significance
        if (legalKeywords.slice(0, 6).some(kw => fileName.includes(kw))) {
          category = 'Legal & Contracts';
        } else if (['email', 'message', 'msg', 'eml', 'correspondence'].some(kw => fileName.includes(kw))) {
          category = 'Communications';
        } else if (['financial', 'invoice', 'payment', 'tax', 'revenue'].some(kw => fileName.includes(kw))) {
          category = 'Financial Records';
        } else if (['employee', 'hr', 'personnel', 'termination'].some(kw => fileName.includes(kw))) {
          category = 'HR & Employment';
        } else if (['compliance', 'audit', 'regulatory'].some(kw => fileName.includes(kw))) {
          category = 'Compliance & Audit';
        } else if (fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
          category = 'Documents';
        }

        const existing = categoryMap.get(category) || { count: 0, documentIds: [] };
        existing.count++;
        existing.documentIds.push(doc.id);
        categoryMap.set(category, existing);
      });

      const categoryColors: Record<string, string> = {
        'Legal & Contracts': 'bg-red-500',
        'Communications': 'bg-blue-500',
        'Financial Records': 'bg-green-500',
        'HR & Employment': 'bg-purple-500',
        'Compliance & Audit': 'bg-orange-500',
        'Documents': 'bg-cyan-500',
        'Other': 'bg-gray-500'
      };

      const categoryBreakdown: CategoryBreakdown[] = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          percentage: Math.round((data.count / docs.length) * 100),
          icon: category,
          color: categoryColors[category] || 'bg-gray-500',
          documentIds: data.documentIds
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate overall stats
      const avgAge = docs.reduce((sum, doc) => 
        sum + differenceInDays(now, parseISO(doc.created_at)), 0) / docs.length;

      setInsights({
        riskDocuments,
        categoryBreakdown,
        totalDocuments: docs.length,
        highRiskCount: riskDocuments.length,
        documentsWithoutPolicy: Math.floor(docs.length * 0.3), // Placeholder - would need to check actual policies
        averageDocumentAge: Math.round(avgAge)
      });

    } catch (err) {
      console.error('Error analyzing documents:', err);
      setError('Failed to analyze documents');
    } finally {
      setLoading(false);
    }
  };

  const getReadableFileType = (mimeType: string) => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF Documents',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Documents',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheets',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentations',
      'application/msword': 'Word Documents (Legacy)',
      'application/vnd.ms-excel': 'Excel Spreadsheets (Legacy)',
      'application/vnd.ms-powerpoint': 'PowerPoint Presentations (Legacy)',
      'image/jpeg': 'JPEG Images',
      'image/png': 'PNG Images',
      'image/gif': 'GIF Images',
      'image/svg+xml': 'SVG Images',
      'text/plain': 'Text Files',
      'text/csv': 'CSV Files',
      'application/zip': 'ZIP Archives',
      'application/x-zip-compressed': 'ZIP Archives',
      'video/mp4': 'MP4 Videos',
      'audio/mpeg': 'MP3 Audio',
      'unknown': 'Other Files',
    };
    
    return typeMap[mimeType] || mimeType || 'Other Files';
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  };

  const handleCategoryClick = async (category: CategoryBreakdown) => {
    setSelectedCategory(category);
    setLoadingCategoryDocs(true);
    try {
      // Fetch document details for this category
      const { data, error } = await (supabase as any)
        .from('documents')
        .select('id, file_name, file_type, created_at, file_size')
        .in('id', category.documentIds.slice(0, 50)); // Limit to 50 for performance
      
      if (error) throw error;
      setCategoryDocuments(data || []);
    } catch (err) {
      console.error('Error fetching category documents:', err);
      setCategoryDocuments([]);
    } finally {
      setLoadingCategoryDocs(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Legal Hold AI Insights
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis to identify high-risk documents and recommend legal hold scopes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
            <p className="text-muted-foreground">Analyzing documents for legal hold risks...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
          </div>
        ) : insights ? (
          <ScrollArea className="h-[700px] pr-4">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* High-Risk Documents */}
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      High-Risk Documents
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Documents requiring immediate legal hold consideration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {insights.riskDocuments.slice(0, 15).map((doc) => (
                          <div 
                            key={doc.id}
                            className={`p-3 rounded-lg border ${getRiskColor(doc.risk_score)}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Age: {doc.age_days} days • {getReadableFileType(doc.file_type)}
                                </p>
                                {doc.risk_factors.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {doc.risk_factors.slice(0, 2).map((factor, idx) => (
                                      <p key={idx} className="text-xs flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-current"></span>
                                        {factor}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">{doc.risk_score}</div>
                                <div className="text-xs">{getRiskLabel(doc.risk_score)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Document Category Breakdown */}
                <Card className="border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-600">
                      <BarChart3 className="w-4 h-4" />
                      Document Category Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Click on a category to view documents
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-3">
                        {insights.categoryBreakdown.map((category, idx) => (
                          <div 
                            key={idx}
                            className="p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 hover:border-blue-300 transition-colors"
                            onClick={() => handleCategoryClick(category)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                                <p className="text-sm font-medium">{category.category}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {category.percentage}%
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{category.count} documents</span>
                                <span className="text-blue-600">Click to view →</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`${category.color} h-2 rounded-full transition-all`}
                                  style={{ width: `${category.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        ) : null}

        {/* Category Documents Dialog */}
        <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${selectedCategory?.color}`}></div>
                {selectedCategory?.category} Documents
              </DialogTitle>
              <DialogDescription>
                {selectedCategory?.count} documents in this category
              </DialogDescription>
            </DialogHeader>
            
            {loadingCategoryDocs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {categoryDocuments.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getReadableFileType(doc.file_type)} • {formatFileSize(doc.file_size)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(doc.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {categoryDocuments.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No documents found in this category
                    </div>
                  )}
                  {selectedCategory && selectedCategory.count > 50 && (
                    <p className="text-xs text-center text-muted-foreground mt-4">
                      Showing first 50 of {selectedCategory.count} documents
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

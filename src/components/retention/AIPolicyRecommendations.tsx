import React, { useState, useEffect } from 'react';
import {
  Sparkles, Globe, AlertTriangle, CheckCircle, ChevronRight,
  Shield, Clock, FileText, Loader2, RefreshCw, Info, Building2,
  Scale, BadgeCheck, X, Plus
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { RetentionPolicy, ComplianceFramework } from '@/types/retention';

// Country-specific regulatory frameworks
const COUNTRY_REGULATIONS: Record<string, {
  name: string;
  flag: string;
  frameworks: {
    name: string;
    code: string;
    description: string;
    defaultRetentionYears: number;
    categories: string[];
  }[];
}> = {
  US: {
    name: 'United States',
    flag: '🇺🇸',
    frameworks: [
      { name: 'SOX (Sarbanes-Oxley)', code: 'SOX', description: 'Financial records retention for public companies', defaultRetentionYears: 7, categories: ['Financial', 'Audit', 'Corporate'] },
      { name: 'HIPAA', code: 'HIPAA', description: 'Healthcare records retention requirements', defaultRetentionYears: 6, categories: ['Healthcare', 'Medical', 'Patient'] },
      { name: 'IRS Requirements', code: 'TAX', description: 'Tax records retention', defaultRetentionYears: 7, categories: ['Tax', 'Financial', 'Accounting'] },
      { name: 'OSHA', code: 'HR', description: 'Workplace safety and employee records', defaultRetentionYears: 5, categories: ['HR', 'Safety', 'Employee'] },
      { name: 'SEC Rule 17a-4', code: 'LEGAL', description: 'Securities and exchange records', defaultRetentionYears: 6, categories: ['Securities', 'Trading', 'Financial'] },
    ]
  },
  EU: {
    name: 'European Union',
    flag: '🇪🇺',
    frameworks: [
      { name: 'GDPR', code: 'GDPR', description: 'Personal data protection and retention', defaultRetentionYears: 3, categories: ['Personal Data', 'Customer', 'Employee'] },
      { name: 'eIDAS', code: 'LEGAL', description: 'Electronic identification and trust services', defaultRetentionYears: 10, categories: ['Digital Signatures', 'Identity', 'Authentication'] },
      { name: 'MiFID II', code: 'SOX', description: 'Financial markets and investment services', defaultRetentionYears: 5, categories: ['Trading', 'Investment', 'Financial'] },
    ]
  },
  UK: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    frameworks: [
      { name: 'UK GDPR', code: 'GDPR', description: 'UK data protection requirements', defaultRetentionYears: 3, categories: ['Personal Data', 'Customer'] },
      { name: 'Companies Act 2006', code: 'LEGAL', description: 'Corporate records retention', defaultRetentionYears: 6, categories: ['Corporate', 'Board', 'Shareholder'] },
      { name: 'HMRC Requirements', code: 'TAX', description: 'Tax and accounting records', defaultRetentionYears: 6, categories: ['Tax', 'VAT', 'Accounting'] },
    ]
  },
  IN: {
    name: 'India',
    flag: '🇮🇳',
    frameworks: [
      { name: 'Companies Act 2013', code: 'LEGAL', description: 'Corporate records retention', defaultRetentionYears: 8, categories: ['Corporate', 'Board', 'Financial'] },
      { name: 'IT Act 2000', code: 'BUSINESS', description: 'Electronic records retention', defaultRetentionYears: 8, categories: ['Electronic', 'Digital', 'IT'] },
      { name: 'Income Tax Act', code: 'TAX', description: 'Tax records retention', defaultRetentionYears: 8, categories: ['Tax', 'Financial', 'Audit'] },
      { name: 'GST Rules', code: 'TAX', description: 'Goods and services tax records', defaultRetentionYears: 6, categories: ['GST', 'Tax', 'Invoice'] },
      { name: 'SEBI Regulations', code: 'SOX', description: 'Securities market records', defaultRetentionYears: 5, categories: ['Securities', 'Trading', 'Compliance'] },
    ]
  },
  DE: {
    name: 'Germany',
    flag: '🇩🇪',
    frameworks: [
      { name: 'GoBD', code: 'TAX', description: 'Tax-relevant electronic documents', defaultRetentionYears: 10, categories: ['Tax', 'Accounting', 'Financial'] },
      { name: 'HGB (Commercial Code)', code: 'LEGAL', description: 'Commercial records retention', defaultRetentionYears: 10, categories: ['Business', 'Commercial', 'Contracts'] },
      { name: 'BDSG (Data Protection)', code: 'GDPR', description: 'Federal data protection', defaultRetentionYears: 3, categories: ['Personal Data', 'Employee'] },
    ]
  },
  AU: {
    name: 'Australia',
    flag: '🇦🇺',
    frameworks: [
      { name: 'Privacy Act 1988', code: 'GDPR', description: 'Australian privacy principles', defaultRetentionYears: 5, categories: ['Personal Data', 'Customer'] },
      { name: 'Corporations Act', code: 'LEGAL', description: 'Corporate records retention', defaultRetentionYears: 7, categories: ['Corporate', 'Financial', 'Director'] },
      { name: 'ATO Requirements', code: 'TAX', description: 'Tax records retention', defaultRetentionYears: 5, categories: ['Tax', 'BAS', 'Accounting'] },
    ]
  },
  SG: {
    name: 'Singapore',
    flag: '🇸🇬',
    frameworks: [
      { name: 'PDPA', code: 'GDPR', description: 'Personal Data Protection Act', defaultRetentionYears: 5, categories: ['Personal Data', 'Customer'] },
      { name: 'Companies Act', code: 'LEGAL', description: 'Corporate records', defaultRetentionYears: 5, categories: ['Corporate', 'Financial'] },
      { name: 'IRAS Requirements', code: 'TAX', description: 'Tax records retention', defaultRetentionYears: 5, categories: ['Tax', 'GST', 'Accounting'] },
    ]
  },
  CA: {
    name: 'Canada',
    flag: '🇨🇦',
    frameworks: [
      { name: 'PIPEDA', code: 'GDPR', description: 'Personal information protection', defaultRetentionYears: 5, categories: ['Personal Data', 'Customer', 'Employee'] },
      { name: 'CRA Requirements', code: 'TAX', description: 'Tax records retention', defaultRetentionYears: 6, categories: ['Tax', 'Financial', 'Accounting'] },
      { name: 'Provincial Health Acts', code: 'HIPAA', description: 'Health records retention', defaultRetentionYears: 10, categories: ['Healthcare', 'Medical'] },
    ]
  },
};

interface PolicyValidationResult {
  isCompliant: boolean;
  score: number;
  issues: {
    severity: 'error' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }[];
  suggestions: string[];
}

interface RecommendedPolicy {
  name: string;
  description: string;
  framework: string;
  frameworkCode: ComplianceFramework;
  retentionYears: number;
  categories: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

interface AIPolicyRecommendationsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingPolicies: RetentionPolicy[];
  onCreatePolicy: (policy: Partial<RetentionPolicy>) => void;
}

export const AIPolicyRecommendations: React.FC<AIPolicyRecommendationsProps> = ({
  open,
  onOpenChange,
  existingPolicies,
  onCreatePolicy,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedPolicy[]>([]);
  const [validationResults, setValidationResults] = useState<Map<string, PolicyValidationResult>>(new Map());
  const [overallComplianceScore, setOverallComplianceScore] = useState<number>(0);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const countryData = COUNTRY_REGULATIONS[selectedCountry];

  // Analyze policies and generate recommendations
  const analyzeAndRecommend = async () => {
    setIsAnalyzing(true);
    setHasAnalyzed(false);

    try {
      // Simulate AI analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newRecommendations: RecommendedPolicy[] = [];
      const newValidations = new Map<string, PolicyValidationResult>();
      let totalScore = 0;
      let policyCount = 0;

      // Check each framework in the selected country
      for (const framework of countryData.frameworks) {
        // Find existing policies that match this framework
        const matchingPolicies = existingPolicies.filter(
          p => p.compliance_framework === framework.code || 
               p.applies_to_categories?.some(cat => 
                 framework.categories.some(fc => 
                   cat.toLowerCase().includes(fc.toLowerCase()) || 
                   fc.toLowerCase().includes(cat.toLowerCase())
                 )
               )
        );

        if (matchingPolicies.length === 0) {
          // Recommend creating a new policy for this framework
          newRecommendations.push({
            name: `${framework.name} Compliance Policy`,
            description: `Automatically recommended policy for ${framework.name} compliance. ${framework.description}`,
            framework: framework.name,
            frameworkCode: framework.code as ComplianceFramework,
            retentionYears: framework.defaultRetentionYears,
            categories: framework.categories,
            reason: `No existing policy covers ${framework.name} requirements for ${countryData.name}`,
            priority: 'high',
          });
        } else {
          // Validate existing policies against framework requirements
          for (const policy of matchingPolicies) {
            const retentionYears = policy.retention_period_days / 365;
            const issues: PolicyValidationResult['issues'] = [];
            const suggestions: string[] = [];
            let score = 100;

            // Check retention period
            if (retentionYears < framework.defaultRetentionYears) {
              issues.push({
                severity: 'error',
                message: `Retention period (${retentionYears.toFixed(1)} years) is shorter than ${framework.name} requirement (${framework.defaultRetentionYears} years)`,
                recommendation: `Increase retention period to at least ${framework.defaultRetentionYears} years`,
              });
              score -= 30;
            } else if (retentionYears > framework.defaultRetentionYears * 2) {
              issues.push({
                severity: 'warning',
                message: `Retention period (${retentionYears.toFixed(1)} years) may be excessive for ${framework.name}`,
                recommendation: `Consider reducing retention to ${framework.defaultRetentionYears} years to minimize data liability`,
              });
              score -= 10;
            }

            // Check if policy has proper categorization
            const hasCategoryMatch = policy.applies_to_categories?.some(cat =>
              framework.categories.some(fc => 
                cat.toLowerCase().includes(fc.toLowerCase())
              )
            );
            if (!hasCategoryMatch && policy.applies_to_categories?.length === 0) {
              issues.push({
                severity: 'warning',
                message: 'No document categories specified',
                recommendation: `Add categories like: ${framework.categories.slice(0, 3).join(', ')}`,
              });
              score -= 15;
            }

            // Check approval workflow for compliance-critical documents
            if (!policy.requires_approval && framework.code === 'SOX') {
              issues.push({
                severity: 'warning',
                message: 'Financial compliance policy without approval workflow',
                recommendation: 'Enable approval requirement for SOX compliance',
              });
              score -= 10;
            }

            // Generate suggestions
            if (issues.length === 0) {
              suggestions.push('Policy meets all requirements for ' + framework.name);
            }

            newValidations.set(policy.id, {
              isCompliant: score >= 70,
              score: Math.max(0, score),
              issues,
              suggestions,
            });

            totalScore += Math.max(0, score);
            policyCount++;
          }
        }
      }

      // Calculate overall compliance score
      const avgScore = policyCount > 0 ? totalScore / policyCount : 0;
      
      // Adjust score based on missing policies
      const missingPolicyPenalty = newRecommendations.filter(r => r.priority === 'high').length * 10;
      const finalScore = Math.max(0, Math.min(100, avgScore - missingPolicyPenalty));

      setRecommendations(newRecommendations);
      setValidationResults(newValidations);
      setOverallComplianceScore(Math.round(finalScore));
      setHasAnalyzed(true);

    } catch (error) {
      console.error('Analysis failed:', error);
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze policies. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Create policy from recommendation
  const handleCreatePolicy = (rec: RecommendedPolicy) => {
    onCreatePolicy({
      name: rec.name,
      description: rec.description,
      retention_period_days: rec.retentionYears * 365,
      disposition_action: 'review',
      trigger_type: 'creation_date',
      is_active: true,
      compliance_framework: rec.frameworkCode,
      applies_to_categories: rec.categories,
      notification_days_before: 30,
      requires_approval: rec.frameworkCode === 'SOX' || rec.frameworkCode === 'HIPAA',
    });
    
    toast({
      title: 'Policy Created',
      description: `${rec.name} has been created successfully`,
    });

    // Remove from recommendations
    setRecommendations(prev => prev.filter(r => r.name !== rec.name));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Policy Recommendations
          </DialogTitle>
          <DialogDescription>
            Get country-specific compliance recommendations and validate your existing policies
          </DialogDescription>
        </DialogHeader>

        <TooltipProvider>
          <div className="space-y-4">
            {/* Country Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Country/Region</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {countryData && (
                        <span className="flex items-center gap-2">
                          <span>{countryData.flag}</span>
                          <span>{countryData.name}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_REGULATIONS).map(([code, country]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-6">
                <Button onClick={analyzeAndRecommend} disabled={isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze & Recommend
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Applicable Frameworks Info */}
            <Card className="bg-muted/30">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Regulatory Frameworks for {countryData?.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex flex-wrap gap-2">
                  {countryData?.frameworks.map((fw) => (
                    <Tooltip key={fw.code}>
                      <TooltipTrigger>
                        <Badge variant="outline" className="cursor-help">
                          {fw.name}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[250px]">
                        <p className="font-medium">{fw.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fw.description}</p>
                        <p className="text-xs mt-1">Default retention: {fw.defaultRetentionYears} years</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>

            {hasAnalyzed && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {/* Overall Compliance Score */}
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4" />
                          Overall Compliance Score
                        </CardTitle>
                        <span className={cn("text-2xl font-bold", getScoreColor(overallComplianceScore))}>
                          {overallComplianceScore}%
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2">
                      <Progress 
                        value={overallComplianceScore} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {overallComplianceScore >= 80 
                          ? 'Your policies are well-aligned with regional compliance requirements.'
                          : overallComplianceScore >= 60
                          ? 'Some improvements recommended to meet all compliance requirements.'
                          : 'Significant gaps identified. Review recommendations below.'}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  {recommendations.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          Recommended New Policies ({recommendations.length})
                        </CardTitle>
                        <CardDescription>
                          These policies are recommended based on {countryData?.name} regulations
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <div className="space-y-3">
                          {recommendations.map((rec, idx) => (
                            <div 
                              key={idx}
                              className={cn(
                                "p-3 border rounded-lg",
                                rec.priority === 'high' ? 'border-red-200 bg-red-50 dark:bg-red-950/20' :
                                rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' :
                                'border-muted'
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{rec.name}</span>
                                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                                      {rec.priority} priority
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {rec.retentionYears} years
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Scale className="h-3 w-3" />
                                      {rec.framework}
                                    </span>
                                  </div>
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                                    {rec.reason}
                                  </p>
                                </div>
                                <Button 
                                  size="sm"
                                  onClick={() => handleCreatePolicy(rec)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Create
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Policy Validation Results */}
                  {validationResults.size > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Existing Policy Validation
                        </CardTitle>
                        <CardDescription>
                          Validation of your current policies against {countryData?.name} requirements
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="py-2">
                        <Accordion type="single" collapsible className="w-full">
                          {existingPolicies
                            .filter(p => validationResults.has(p.id))
                            .map((policy) => {
                              const validation = validationResults.get(policy.id)!;
                              return (
                                <AccordionItem key={policy.id} value={policy.id}>
                                  <AccordionTrigger className="hover:no-underline">
                                    <div className="flex items-center gap-3 w-full pr-4">
                                      {validation.isCompliant ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                                      ) : (
                                        <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                                      )}
                                      <span className="flex-1 text-left font-medium">{policy.name}</span>
                                      <Badge 
                                        variant={validation.isCompliant ? 'default' : 'secondary'}
                                        className={validation.isCompliant ? 'bg-green-500' : ''}
                                      >
                                        {validation.score}%
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="space-y-3 pt-2">
                                      {validation.issues.map((issue, idx) => (
                                        <Alert key={idx} variant={issue.severity === 'error' ? 'destructive' : 'default'}>
                                          <AlertTriangle className="h-4 w-4" />
                                          <AlertTitle className="text-sm">{issue.message}</AlertTitle>
                                          <AlertDescription className="text-xs">
                                            {issue.recommendation}
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                      {validation.suggestions.map((suggestion, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-green-600">
                                          <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                          <span>{suggestion}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                        </Accordion>
                      </CardContent>
                    </Card>
                  )}

                  {recommendations.length === 0 && validationResults.size === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                      <p className="font-medium">Excellent Compliance!</p>
                      <p className="text-sm">All your policies meet {countryData?.name} requirements.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {!hasAnalyzed && !isAnalyzing && (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a country and click "Analyze & Recommend"</p>
                <p className="text-xs mt-1">to get AI-powered policy recommendations</p>
              </div>
            )}
          </div>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

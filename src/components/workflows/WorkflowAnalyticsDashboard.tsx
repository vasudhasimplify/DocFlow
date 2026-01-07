import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  GitBranch,
  Zap,
  Activity,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  FileText,
  Table as TableIcon
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { workflowApi } from '@/services/workflowApi';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface WorkflowMetrics {
  workflow_id: string;
  workflow_name: string;
  total_runs: number;
  completed: number;
  rejected: number;
  in_progress: number;
  avg_completion_hours: number;
  sla_compliance: number;
  escalation_rate: number;
  bottleneck_steps: string[];
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const WorkflowAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await workflowApi.getAnalytics(
        dateRange,
        selectedWorkflow === 'all' ? undefined : selectedWorkflow
      );
      console.log('📊 Analytics Data Received:', data);
      console.log('🔍 Condition Stats:', data.conditionStats);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedWorkflow]);

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('Workflow Analytics Report', 14, 20);
      
      // Date and filters
      doc.setFontSize(10);
      doc.text(`Date Range: ${dateRange}`, 14, 30);
      doc.text(`Workflow: ${selectedWorkflow === 'all' ? 'All Workflows' : selectedWorkflow}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 42);
      
      // Overview metrics
      doc.setFontSize(14);
      doc.text('Overview Metrics', 14, 54);
      autoTable(doc, {
        startY: 58,
        head: [['Metric', 'Value']],
        body: [
          ['Total Instances', overview.totalInstances],
          ['Completed', overview.completed],
          ['Active', overview.active],
          ['Rejected', overview.rejected],
          ['Completion Rate', `${overview.completionRate}%`],
          ['Avg Completion Time', `${overview.avgCompletionTime}h`],
          ['SLA Compliance', `${overview.slaCompliance}%`],
          ['Escalation Rate', `${overview.escalationRate}%`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Step Performance
      if (stepPerformance && stepPerformance.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Step Performance', 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [['Step Name', 'Avg Time (h)', 'Count', 'SLA %']],
          body: stepPerformance.map(s => [s.step, s.avgTime, s.count, `${s.sla}%`]),
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] }
        });
      }
      
      // Bottlenecks
      if (bottlenecks && bottlenecks.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Bottleneck Alerts', 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [['Workflow', 'Step', 'Severity', 'Avg Delay (h)', 'Instances']],
          body: bottlenecks.map(b => [b.workflow, b.step, b.severity, b.avgDelay, b.instances]),
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] }
        });
      }
      
      // Condition Evaluations
      if (conditionStats && conditionStats.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Condition Evaluations', 14, 20);
        autoTable(doc, {
          startY: 24,
          head: [['Condition', 'Triggered', 'True Path', 'False Path', 'True %']],
          body: conditionStats.map(c => [
            c.condition, 
            c.triggered, 
            c.truePath, 
            c.falsePath,
            `${Math.round((c.truePath / c.triggered) * 100)}%`
          ]),
          theme: 'grid',
          headStyles: { fillColor: [34, 197, 94] }
        });
      }
      
      // Save PDF
      doc.save(`workflow-analytics-${dateRange}-${Date.now()}.pdf`);
      toast.success('PDF report exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF report');
    }
  };

  // Export to Excel with enhanced formatting
  const exportToExcel = () => {
    try {
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Helper function to apply styling to sheets
      const applyHeaderStyle = (ws: any, headerRow: number, lastCol: string) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        
        // Set column widths
        const colWidths = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          let maxWidth = 10;
          for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddress];
            if (cell && cell.v) {
              const cellLength = cell.v.toString().length;
              maxWidth = Math.max(maxWidth, cellLength + 2);
            }
          }
          colWidths.push({ wch: Math.min(maxWidth, 50) });
        }
        ws['!cols'] = colWidths;
        
        // Apply header styling
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
              fill: { fgColor: { rgb: "3B82F6" } },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
              }
            };
          }
        }
      };
      
      // Overview sheet with enhanced formatting
      const overviewData = [
        ['WORKFLOW ANALYTICS REPORT'],
        [],
        ['Report Details', ''],
        ['Date Range:', dateRange],
        ['Workflow:', selectedWorkflow === 'all' ? 'All Workflows' : selectedWorkflow],
        ['Generated:', new Date().toLocaleString()],
        [],
        ['Key Metrics', ''],
        ['Metric', 'Value'],
        ['Total Instances', overview.totalInstances],
        ['Completed', overview.completed],
        ['Active', overview.active],
        ['Rejected', overview.rejected],
        ['Completion Rate', `${overview.completionRate}%`],
        ['Avg Completion Time', `${overview.avgCompletionTime} hours`],
        ['SLA Compliance', `${overview.slaCompliance}%`],
        ['Escalation Rate', `${overview.escalationRate}%`]
      ];
      const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
      
      // Merge cells for title
      overviewSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // Title
        { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Report Details
        { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } }  // Key Metrics
      ];
      
      // Style title and headers
      if (overviewSheet['A1']) {
        overviewSheet['A1'].s = {
          font: { bold: true, sz: 16, color: { rgb: "1F2937" } },
          alignment: { horizontal: "center", vertical: "center" },
          fill: { fgColor: { rgb: "DBEAFE" } }
        };
      }
      
      applyHeaderStyle(overviewSheet, 8, 'B');
      overviewSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, overviewSheet, '📊 Overview');
      
      // Step Performance sheet
      if (stepPerformance && stepPerformance.length > 0) {
        const stepData = [
          ['STEP PERFORMANCE ANALYSIS'],
          [],
          ['Step Name', 'Avg Time (h)', 'Count', 'SLA Compliance'],
          ...stepPerformance.map(s => [s.step, s.avgTime, s.count, `${s.sla}%`]),
          [],
          ['Summary', '', '', ''],
          ['Total Steps', stepPerformance.length, '', ''],
          ['Avg Steps per Instance', (stepPerformance.reduce((sum, s) => sum + s.count, 0) / stepPerformance.length).toFixed(1), '', '']
        ];
        const stepSheet = XLSX.utils.aoa_to_sheet(stepData);
        stepSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
        
        if (stepSheet['A1']) {
          stepSheet['A1'].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "3B82F6" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        applyHeaderStyle(stepSheet, 2, 'D');
        stepSheet['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, stepSheet, '⚡ Step Performance');
      }
      
      // Bottlenecks sheet with critical styling
      if (bottlenecks && bottlenecks.length > 0) {
        const bottleneckData = [
          ['BOTTLENECK ALERTS'],
          [],
          ['Workflow', 'Step', 'Severity', 'Avg Delay (h)', 'Affected Instances'],
          ...bottlenecks.map(b => [
            b.workflow,
            b.step,
            b.severity.toUpperCase(),
            b.avgDelay,
            b.instances
          ])
        ];
        const bottleneckSheet = XLSX.utils.aoa_to_sheet(bottleneckData);
        bottleneckSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        
        if (bottleneckSheet['A1']) {
          bottleneckSheet['A1'].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "EF4444" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        applyHeaderStyle(bottleneckSheet, 2, 'E');
        bottleneckSheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, bottleneckSheet, '⚠️ Bottlenecks');
      }
      
      // Condition Evaluations sheet
      if (conditionStats && conditionStats.length > 0) {
        const conditionData = [
          ['CONDITION EVALUATIONS'],
          [],
          ['Condition', 'Total Evaluations', 'True Path', 'False Path', 'True %'],
          ...conditionStats.map(c => [
            c.condition,
            c.triggered,
            c.truePath,
            c.falsePath,
            `${Math.round((c.truePath / c.triggered) * 100)}%`
          ]),
          [],
          ['Summary', '', '', '', ''],
          ['Total Conditions', conditionStats.length, '', '', ''],
          ['Total Evaluations', conditionStats.reduce((sum, c) => sum + c.triggered, 0), '', '', '']
        ];
        const conditionSheet = XLSX.utils.aoa_to_sheet(conditionData);
        conditionSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        
        if (conditionSheet['A1']) {
          conditionSheet['A1'].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "22C55E" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        applyHeaderStyle(conditionSheet, 2, 'E');
        conditionSheet['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, conditionSheet, '🔀 Conditions');
      }
      
      // Trend Data sheet with sparklines
      if (trendData && trendData.length > 0) {
        const trendDataArr = [
          ['WORKFLOW TRENDS'],
          [],
          ['Day', 'Started', 'Completed', 'Rejected', 'Completion %'],
          ...trendData.map(t => [
            t.date,
            t.started,
            t.completed,
            t.rejected,
            t.started > 0 ? `${Math.round((t.completed / t.started) * 100)}%` : '0%'
          ]),
          [],
          ['Totals', '', '', '', ''],
          [
            'Period Total',
            trendData.reduce((sum, t) => sum + t.started, 0),
            trendData.reduce((sum, t) => sum + t.completed, 0),
            trendData.reduce((sum, t) => sum + t.rejected, 0),
            ''
          ]
        ];
        const trendSheet = XLSX.utils.aoa_to_sheet(trendDataArr);
        trendSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
        
        if (trendSheet['A1']) {
          trendSheet['A1'].s = {
            font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "8B5CF6" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
        
        applyHeaderStyle(trendSheet, 2, 'E');
        trendSheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, trendSheet, '📈 Trends');
      }
      
      // Save Excel file
      XLSX.writeFile(wb, `workflow-analytics-${dateRange}-${Date.now()}.xlsx`);
      toast.success('✨ Excel report exported with professional formatting!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel report');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No analytics data available</p>
        <p className="text-muted-foreground">Start some workflows to see analytics</p>
      </div>
    );
  }

  const { overview, trendData, stepPerformance, bottlenecks, conditionStats, userPerformance, pathDistribution } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
            <SelectTrigger className="w-48">
              <GitBranch className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Workflows" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workflows</SelectItem>
              <SelectItem value="doc-approval">Document Approval</SelectItem>
              <SelectItem value="invoice">Invoice Processing</SelectItem>
              <SelectItem value="contract">Contract Review</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <TableIcon className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <MetricCard
          title="Active Instances"
          value={overview.active}
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Completed"
          value={overview.completed}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Avg. Time (hrs)"
          value={overview.avgCompletionTime}
          icon={Clock}
          color="purple"
        />
        <MetricCard
          title="SLA Compliance"
          value={`${overview.slaCompliance}%`}
          icon={Target}
          color="emerald"
        />
        <MetricCard
          title="Escalation Rate"
          value={`${overview.escalationRate}%`}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Completion Rate"
          value={`${overview.completionRate}%`}
          icon={CheckCircle}
          color="indigo"
        />
        <MetricCard
          title="Rejected"
          value={overview.rejected}
          icon={XCircle}
          color="red"
        />
        <MetricCard
          title="Total Runs"
          value={overview.totalInstances}
          icon={GitBranch}
          color="slate"
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Workflow Execution Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  stackId="1" 
                  stroke="hsl(var(--chart-2))" 
                  fill="hsl(var(--chart-2))" 
                  fillOpacity={0.6}
                  name="Completed"
                />
                <Area 
                  type="monotone" 
                  dataKey="started" 
                  stackId="2" 
                  stroke="hsl(var(--chart-1))" 
                  fill="hsl(var(--chart-1))" 
                  fillOpacity={0.6}
                  name="Started"
                />
                <Area 
                  type="monotone" 
                  dataKey="rejected" 
                  stackId="3" 
                  stroke="hsl(var(--chart-5))" 
                  fill="hsl(var(--chart-5))" 
                  fillOpacity={0.6}
                  name="Rejected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Distribution */}
        {pathDistribution && pathDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Path Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pathDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {pathDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step Performance & Bottlenecks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Step Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stepPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="step" type="category" width={120} className="text-xs" />
                <RechartsTooltip
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="avgTime" fill="hsl(var(--chart-1))" name="Avg Time (hrs)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottleneck Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Bottleneck Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-3">
                {bottlenecks.map((bottleneck, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg border ${
                      bottleneck.severity === 'critical' 
                        ? 'border-red-500/50 bg-red-500/5' 
                        : bottleneck.severity === 'warning'
                          ? 'border-orange-500/50 bg-orange-500/5'
                          : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{bottleneck.step}</p>
                        <p className="text-sm text-muted-foreground">{bottleneck.workflow}</p>
                      </div>
                      <Badge variant={
                        bottleneck.severity === 'critical' ? 'destructive' : 
                        bottleneck.severity === 'warning' ? 'secondary' : 'outline'
                      }>
                        {bottleneck.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        +{bottleneck.avgDelay}h delay
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {bottleneck.instances} affected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Conditional Logic & User Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Condition Evaluations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Condition Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {conditionStats && conditionStats.length > 0 ? (
              <div className="space-y-4">
                {conditionStats.map((condition, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{condition.condition}</span>
                      <span className="text-xs text-muted-foreground">{condition.triggered} evaluations</span>
                    </div>
                    <div className="flex gap-1 h-3">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="bg-green-500 rounded-l-full cursor-pointer"
                              style={{ width: `${(condition.truePath / condition.triggered) * 100}%` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>True: {condition.truePath}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className="bg-muted rounded-r-full cursor-pointer"
                              style={{ width: `${(condition.falsePath / condition.triggered) * 100}%` }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>False: {condition.falsePath}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No condition evaluations yet</p>
                <p className="text-xs mt-1">Create workflows with condition steps to see analytics</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        {userPerformance && userPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userPerformance.map((user, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.user}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.tasksCompleted} tasks • {user.avgTime}h avg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${user.onTime >= 95 ? 'text-green-600' : user.onTime >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {user.onTime}%
                      </p>
                      <p className="text-xs text-muted-foreground">on-time</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'emerald' | 'orange' | 'indigo' | 'amber' | 'slate' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-orange-500/10 text-orange-500',
    indigo: 'bg-indigo-500/10 text-indigo-500',
    amber: 'bg-amber-500/10 text-amber-500',
    slate: 'bg-slate-500/10 text-slate-500',
    red: 'bg-red-500/10 text-red-500'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className={`h-8 w-8 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-2`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{title}</p>
      </CardContent>
    </Card>
  );
};

export default WorkflowAnalyticsDashboard;

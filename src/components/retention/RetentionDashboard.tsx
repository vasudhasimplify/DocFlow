import React, { useState } from 'react';
import { 
  Shield, Clock, AlertTriangle, Archive, Trash2, FileText, 
  Scale, Plus, RefreshCw, Settings, Download, Filter,
  Calendar, CheckCircle, XCircle, Eye, Send, Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRetentionPolicies } from '@/hooks/useRetentionPolicies';
import { RetentionPolicyList } from './RetentionPolicyList';
import { LegalHoldsList } from './LegalHoldsList';
import { DocumentRetentionList } from './DocumentRetentionList';
import { DispositionQueue } from './DispositionQueue';
import { RetentionAuditLog } from './RetentionAuditLog';
import { CreatePolicyDialog } from './CreatePolicyDialog';
import { CreateLegalHoldDialog } from './CreateLegalHoldDialog';
import { ApplyPolicyDialog } from './ApplyPolicyDialog';
import { RetentionOverview } from './RetentionOverview';
import { RETENTION_STATUS_CONFIG } from '@/types/retention';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileSpreadsheet, FileText as FileTextIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';

export const RetentionDashboard: React.FC = () => {
  const {
    policies,
    legalHolds,
    documentStatuses,
    templates,
    auditLogs,
    stats,
    isLoading,
    refresh,
  } = useRetentionPolicies();

  const [activeTab, setActiveTab] = useState('overview');
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [showCreateHold, setShowCreateHold] = useState(false);
  const [showApplyPolicy, setShowApplyPolicy] = useState(false);
  const [editingHold, setEditingHold] = useState<typeof legalHolds[0] | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<typeof policies[0] | null>(null);

  const exportToPDF = async () => {
    try {
      toast({ title: 'Generating PDF...', description: 'Creating retention report' });
      
      const doc = new jsPDF();
      const date = new Date().toLocaleDateString();
      let yPos = 20;
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(26, 115, 232);
      doc.text('Retention Management Report', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
      yPos += 15;
      
      // Overview Statistics
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Overview Statistics', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const stats_data = [
        ['Total Policies', stats.total_policies],
        ['Active Policies', stats.active_policies],
        ['Documents Tracked', stats.total_documents_tracked],
        ['Pending Review', stats.documents_pending_review],
        ['Expiring Soon', stats.documents_expiring_soon],
        ['Active Legal Holds', stats.active_legal_holds],
        ['Disposed This Month', stats.documents_disposed_this_month]
      ];
      
      stats_data.forEach(([label, value]) => {
        doc.text(`${label}:`, 25, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(String(value), 100, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 6;
      });
      
      yPos += 10;
      
      // Active Policies
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Active Policies', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      policies.filter(p => p.is_active).forEach(policy => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFont(undefined, 'bold');
        doc.setTextColor(26, 115, 232);
        doc.text(policy.name, 25, yPos);
        yPos += 5;
        
        doc.setFont(undefined, 'normal');
        doc.setTextColor(60, 60, 60);
        doc.text(`Retention: ${Math.floor(policy.retention_period_days / 365)} years (${policy.retention_period_days} days)`, 25, yPos);
        yPos += 4;
        doc.text(`Action: ${policy.disposition_action} | Framework: ${policy.compliance_framework || 'N/A'}`, 25, yPos);
        yPos += 8;
      });
      
      // Legal Holds
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos += 5;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Legal Holds', 20, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      if (legalHolds.length > 0) {
        legalHolds.forEach(hold => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFont(undefined, 'bold');
          doc.setTextColor(139, 92, 246);
          doc.text(hold.name, 25, yPos);
          yPos += 5;
          
          doc.setFont(undefined, 'normal');
          doc.setTextColor(60, 60, 60);
          doc.text(`Reason: ${hold.hold_reason}`, 25, yPos);
          yPos += 4;
          doc.text(`Status: ${hold.status} | Started: ${new Date(hold.created_at).toLocaleDateString()}`, 25, yPos);
          yPos += 8;
        });
      } else {
        doc.setTextColor(100, 100, 100);
        doc.text('No active legal holds', 25, yPos);
      }
      
      // Save PDF
      doc.save(`retention-report-${date}.pdf`);
      
      toast({ title: 'Success', description: 'PDF report downloaded successfully' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
    }
  };

  const exportToExcel = async () => {
    try {
      toast({ title: 'Generating Excel...', description: 'Creating retention report' });
      
      // Import the supabase client to get document counts
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get document counts for each legal hold
      const holdDocCounts = new Map();
      for (const hold of legalHolds) {
        const { count } = await supabase
          .from('document_retention_status')
          .select('*', { count: 'exact', head: true })
          .contains('legal_hold_ids', [hold.id]);
        holdDocCounts.set(hold.id, count || 0);
      }
      
      // Create workbook using ExcelJS
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'DocFlow Retention System';
      workbook.created = new Date();
      
      // Overview Sheet
      const wsOverview = workbook.addWorksheet('Overview', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });
      
      wsOverview.columns = [
        { width: 30 },
        { width: 20 }
      ];
      
      // Title
      wsOverview.mergeCells('A1:B1');
      const titleCell = wsOverview.getCell('A1');
      titleCell.value = 'Retention Management Report';
      titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4788' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      wsOverview.getRow(1).height = 30;
      
      wsOverview.getCell('A2').value = `Generated: ${new Date().toLocaleString()}`;
      wsOverview.getCell('A2').font = { italic: true, size: 10 };
      
      // Headers
      wsOverview.getCell('A4').value = 'Metric';
      wsOverview.getCell('B4').value = 'Value';
      ['A4', 'B4'].forEach(cell => {
        const c = wsOverview.getCell(cell);
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // Data
      const overviewMetrics = [
        ['Total Policies', stats.total_policies],
        ['Active Policies', stats.active_policies],
        ['Documents Tracked', stats.total_documents_tracked],
        ['Pending Review', stats.documents_pending_review],
        ['Expiring Soon', stats.documents_expiring_soon],
        ['Active Legal Holds', stats.active_legal_holds],
        ['Disposed This Month', stats.documents_disposed_this_month]
      ];
      
      overviewMetrics.forEach((metric, idx) => {
        const row = wsOverview.getRow(5 + idx);
        row.getCell(1).value = metric[0];
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } };
        row.getCell(2).value = metric[1];
        row.getCell(2).alignment = { horizontal: 'center' };
      });
      
      // Policies Sheet
      const wsPolicies = workbook.addWorksheet('Active Policies');
      wsPolicies.columns = [
        { width: 25 }, { width: 40 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 20 }, { width: 12 }
      ];
      
      // Title
      wsPolicies.mergeCells('A1:G1');
      const policiesTitle = wsPolicies.getCell('A1');
      policiesTitle.value = 'Active Policies';
      policiesTitle.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      policiesTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      policiesTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      wsPolicies.getRow(1).height = 30;
      
      // Headers
      const policiesHeaders = ['Name', 'Description', 'Retention (Days)', 'Retention (Years)', 'Disposition Action', 'Framework', 'Status'];
      policiesHeaders.forEach((header, idx) => {
        const cell = wsPolicies.getCell(3, idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // Data
      policies.filter(p => p.is_active).forEach((policy, idx) => {
        const row = wsPolicies.getRow(4 + idx);
        row.values = [
          policy.name,
          policy.description || 'N/A',
          policy.retention_period_days,
          Math.floor(policy.retention_period_days / 365),
          policy.disposition_action,
          policy.compliance_framework || 'N/A',
          'Active'
        ];
      });
      
      // Legal Holds Sheet
      const wsHolds = workbook.addWorksheet('Legal Holds');
      wsHolds.columns = [
        { width: 25 }, { width: 40 }, { width: 15 }, { width: 12 }, { width: 12 }, { width: 20 }, { width: 25 }
      ];
      
      // Title
      wsHolds.mergeCells('A1:G1');
      const holdsTitle = wsHolds.getCell('A1');
      holdsTitle.value = 'Legal Holds';
      holdsTitle.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      holdsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
      holdsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      wsHolds.getRow(1).height = 30;
      
      // Headers
      const holdsHeaders = ['Name', 'Reason', 'Start Date', 'Status', 'Documents', 'Matter ID', 'Custodian'];
      holdsHeaders.forEach((header, idx) => {
        const cell = wsHolds.getCell(3, idx + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // Data
      legalHolds.forEach((hold, idx) => {
        const row = wsHolds.getRow(4 + idx);
        row.values = [
          hold.name,
          hold.hold_reason,
          new Date(hold.created_at).toLocaleDateString(),
          hold.status,
          holdDocCounts.get(hold.id) || 0,
          hold.matter_id || 'N/A',
          hold.custodian_name || 'N/A'
        ];
      });
      
      // Document Status Sheet
      const wsStatus = workbook.addWorksheet('Document Status');
      wsStatus.columns = [{ width: 30 }, { width: 15 }];
      
      // Title
      wsStatus.mergeCells('A1:B1');
      const statusTitle = wsStatus.getCell('A1');
      statusTitle.value = 'Document Status Distribution';
      statusTitle.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
      statusTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } };
      statusTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      wsStatus.getRow(1).height = 30;
      
      // Headers
      wsStatus.getCell('A3').value = 'Status';
      wsStatus.getCell('B3').value = 'Count';
      ['A3', 'B3'].forEach(cell => {
        const c = wsStatus.getCell(cell);
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      
      // Data
      const statusCounts = documentStatuses.reduce((acc, doc) => {
        acc[doc.current_status] = (acc[doc.current_status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(statusCounts).forEach(([status, count], idx) => {
        const row = wsStatus.getRow(4 + idx);
        row.getCell(1).value = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
        row.getCell(2).value = count;
        row.getCell(2).alignment = { horizontal: 'center' };
      });
      
      // Generate and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retention-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ 
        title: 'Success', 
        description: 'Excel report downloaded successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Error', description: 'Failed to export report', variant: 'destructive' });
    }
  };

  const statCards = [
    {
      title: 'Active Policies',
      value: stats.active_policies,
      total: stats.total_policies,
      icon: Shield,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Documents Tracked',
      value: stats.total_documents_tracked,
      icon: FileText,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Pending Review',
      value: stats.documents_pending_review,
      icon: Eye,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      alert: stats.documents_pending_review > 0,
    },
    {
      title: 'Expiring Soon',
      value: stats.documents_expiring_soon,
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      alert: stats.documents_expiring_soon > 0,
    },
    {
      title: 'Legal Holds',
      value: stats.active_legal_holds,
      icon: Scale,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Disposed This Month',
      value: stats.documents_disposed_this_month,
      icon: Archive,
      color: 'text-gray-500',
      bgColor: 'bg-gray-500/10',
    },
  ];

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Records Retention
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage document lifecycle, compliance policies, and legal holds
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF}>
                  <FileTextIcon className="h-4 w-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download as Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setShowApplyPolicy(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Apply to Documents
            </Button>
            <Button size="sm" onClick={() => setShowCreateHold(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Legal Hold
            </Button>
            <Button size="sm" onClick={() => setShowCreatePolicy(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Policy
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className={cn("relative overflow-hidden", stat.alert && "ring-2 ring-orange-500/50")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                  {stat.alert && (
                    <AlertTriangle className="h-4 w-4 text-orange-500 animate-pulse" />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  {stat.total !== undefined && (
                    <Progress 
                      value={(stat.value / stat.total) * 100} 
                      className="h-1 mt-2" 
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b px-6">
          <TabsList className="h-12">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="h-4 w-4" />
              Policies
              <Badge variant="secondary" className="ml-1">{stats.active_policies}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <Clock className="h-4 w-4" />
              Documents
              <Badge variant="secondary" className="ml-1">{stats.total_documents_tracked}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disposition" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Disposition Queue
              {stats.documents_pending_review > 0 && (
                <Badge variant="destructive" className="ml-1">{stats.documents_pending_review}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="holds" className="gap-2">
              <Scale className="h-4 w-4" />
              Legal Holds
              {stats.active_legal_holds > 0 && (
                <Badge className="ml-1 bg-purple-500">{stats.active_legal_holds}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <Settings className="h-4 w-4" />
              Audit Log
            </TabsTrigger>
          </TabsList>
        </div>

        <div>
          <TabsContent value="overview" className="m-0">
            <RetentionOverview
              policies={policies}
              documentStatuses={documentStatuses}
              legalHolds={legalHolds}
              auditLogs={auditLogs}
              stats={stats}
            />
          </TabsContent>

          <TabsContent value="policies" className="m-0">
            <RetentionPolicyList 
              policies={policies}
              templates={templates}
              onCreatePolicy={() => setShowCreatePolicy(true)}
              onEditPolicy={(policy) => setEditingPolicy(policy)}
              onDuplicatePolicy={(policy) => {
                const { id, created_at, updated_at, created_by, ...duplicateData } = policy;
                setEditingPolicy({ ...duplicateData, name: `${policy.name} (Copy)` } as typeof policy);
              }}
            />
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <DocumentRetentionList />
          </TabsContent>

          <TabsContent value="disposition" className="m-0">
            <DispositionQueue />
          </TabsContent>

          <TabsContent value="holds" className="m-0">
            <LegalHoldsList 
              holds={legalHolds}
              onCreateHold={() => setShowCreateHold(true)}
              onEditHold={(hold) => setEditingHold(hold)}
            />
          </TabsContent>

          <TabsContent value="audit" className="m-0">
            <RetentionAuditLog logs={auditLogs} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialogs */}
      <CreatePolicyDialog 
        open={showCreatePolicy} 
        onOpenChange={setShowCreatePolicy}
        templates={templates}
      />
      
      {/* Edit Policy Dialog */}
      {editingPolicy && (
        <CreatePolicyDialog 
          open={!!editingPolicy} 
          onOpenChange={(open) => {
            if (!open) setEditingPolicy(null);
          }}
          templates={templates}
          initialData={editingPolicy}
        />
      )}
      <CreateLegalHoldDialog 
        open={showCreateHold} 
        onOpenChange={setShowCreateHold}
      />
      
      {/* Edit Hold Dialog - Reusing Create Dialog */}
      {editingHold && (
        <CreateLegalHoldDialog 
          open={!!editingHold} 
          onOpenChange={(open) => {
            if (!open) setEditingHold(null);
          }}
          initialData={editingHold}
        />
      )}
      
      <ApplyPolicyDialog
        open={showApplyPolicy}
        onOpenChange={setShowApplyPolicy}
        onCreatePolicy={() => setShowCreatePolicy(true)}
      />
    </div>
  );
};

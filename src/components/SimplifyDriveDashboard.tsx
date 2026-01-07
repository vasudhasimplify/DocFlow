import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  FileText,
  Share2,
  GitBranch,
  Shield,
  Clock,
  Scale,
  PenTool,
  Users,
  Activity,
  Lock,
  Workflow,
  BarChart3,
  Scan,
  Settings,
  ChevronRight,
  Brain
} from 'lucide-react';

// Feature Dashboards
import { DocumentManager } from './DocumentManager';
import { ShareLinksDashboard } from './sharing/ShareLinksDashboard';
import { ComplianceDashboard } from './compliance/ComplianceDashboard';
import { RetentionDashboard } from './retention/RetentionDashboard';
import { LegalHoldDashboard } from './legal-hold/LegalHoldDashboard';
import { SignatureDashboard } from './signatures/SignatureDashboard';
import { CheckInOutDashboard } from './checkinout/CheckInOutDashboard';
import { WorkflowDashboard } from './workflows/WorkflowDashboard';
import { WorkflowAnalyticsDashboard } from './workflows/WorkflowAnalyticsDashboard';
import AuditDashboard from './audit/AuditDashboard';

interface FeatureTab {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const featureTabs: FeatureTab[] = [
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Manage all your documents' },
  { id: 'sharing', label: 'Share Links', icon: Share2, description: 'Manage shared links & permissions', badge: 'New' },
  { id: 'checkinout', label: 'Check In/Out', icon: Lock, description: 'Document locking & checkout' },
  { id: 'workflows', label: 'Workflows', icon: Workflow, description: 'Automate document processes', badge: 'New' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Workflow analytics & insights' },
  { id: 'signatures', label: 'E-Signatures', icon: PenTool, description: 'Electronic signature requests' },
  { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Compliance labels & policies' },
  { id: 'retention', label: 'Retention', icon: Clock, description: 'Retention policies & disposal' },
  { id: 'legalhold', label: 'Legal Hold', icon: Scale, description: 'Legal holds & preservation' },
  { id: 'audit', label: 'Audit Trail', icon: Activity, description: 'Activity logs & audit reports' },
];

export const SimplifyDriveDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('documents');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'documents':
        return <DocumentManager />;
      case 'sharing':
        return <ShareLinksDashboard />;
      case 'checkinout':
        return <CheckInOutDashboard />;
      case 'workflows':
        return <WorkflowDashboard />;
      case 'analytics':
        return <WorkflowAnalyticsDashboard />;
      case 'signatures':
        return <SignatureDashboard />;
      case 'compliance':
        return <ComplianceDashboard />;
      case 'retention':
        return <RetentionDashboard />;
      case 'legalhold':
        return <LegalHoldDashboard />;
      case 'audit':
        return <AuditDashboard title="SimplifyDrive Audit Trail" showStats={true} />;
      default:
        return <DocumentManager />;
    }
  };

  const activeFeature = featureTabs.find(t => t.id === activeTab);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Feature Navigation */}
      <div className="border-b bg-card/50 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SimplifyDrive</h1>
              <p className="text-sm text-muted-foreground">Enterprise Document Management</p>
            </div>
          </div>
          
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-1 pb-2">
              {featureTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 shrink-0 ${
                      isActive ? '' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                    {tab.badge && (
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {tab.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {/* Active Feature Description */}
      {activeFeature && activeTab !== 'documents' && (
        <div className="px-4 py-2 bg-muted/30 border-b">
          <div className="flex items-center gap-2 text-sm">
            <activeFeature.icon className="h-4 w-4 text-primary" />
            <span className="font-medium">{activeFeature.label}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{activeFeature.description}</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SimplifyDriveDashboard;

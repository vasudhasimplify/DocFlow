import {
  FileText,
  Star,
  Clock,
  Tag,
  Share2,
  Lock,
  Workflow,
  BarChart3,
  PenTool,
  Shield,
  Scale,
  Activity,
  GitCompare,
  Zap,
  Droplets,
  UserMinus,
  Sparkles,
  Upload,
  FolderOpen,
  Settings2
} from 'lucide-react';

export interface FeatureTab {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  category?: 'core' | 'ai' | 'sharing' | 'content' | 'workflows' | 'compliance' | 'admin';
}

export interface SidebarCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  defaultExpanded?: boolean;
}

// Sidebar categories for collapsible groups
export const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  { id: 'core', label: 'Core Document Operations', icon: FolderOpen, defaultExpanded: true },
  { id: 'ai', label: 'AI & Intelligence', icon: Sparkles },
  { id: 'sharing', label: 'Sharing & Collaboration', icon: Share2 },
  { id: 'content', label: 'Content Management', icon: Tag },
  { id: 'workflows', label: 'Workflows & Automation', icon: Workflow },
  { id: 'compliance', label: 'Compliance & Legal', icon: Shield },
  { id: 'admin', label: 'Admin & System', icon: Settings2 },
];

export const FEATURE_TABS: FeatureTab[] = [
  // Core Document Operations
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Manage all your documents', category: 'core' },
  { id: 'quickaccess', label: 'Quick Access', icon: Zap, description: 'Priority and frequently accessed documents', badge: 'AI', category: 'core' },
  { id: 'favorites', label: 'Starred', icon: Star, description: 'Quick access to starred documents', category: 'core' },

  // AI & Intelligence
  { id: 'summaries', label: 'AI Summaries', icon: Sparkles, description: 'Generate AI document summaries', category: 'ai' },
  { id: 'compare', label: 'Compare', icon: GitCompare, description: 'Compare document versions', category: 'ai' },

  // Sharing & Collaboration
  { id: 'externalsharing', label: 'Guest Sharing', icon: Share2, description: 'Share with external users', badge: 'New', category: 'sharing' },
  { id: 'signatures', label: 'E-Signatures', icon: PenTool, description: 'Electronic signature requests', category: 'sharing' },
  { id: 'sharing', label: 'Share Links', icon: Share2, description: 'Manage shared links & permissions', category: 'sharing' },
  { id: 'checkinout', label: 'Check In/Out', icon: Lock, description: 'Document locking & checkout', category: 'sharing' },
  { id: 'transfers', label: 'Transfers', icon: UserMinus, description: 'Ownership transfers', badge: 'New', category: 'sharing' },

  // Content Management
  { id: 'contentrules', label: 'Access Rules', icon: Shield, description: 'Content-based access control', badge: 'New', category: 'content' },
  { id: 'metadata', label: 'Metadata', icon: Tag, description: 'Custom metadata fields', badge: 'New', category: 'content' },
  { id: 'watermarks', label: 'Watermarks', icon: Droplets, description: 'Document watermark settings', badge: 'New', category: 'content' },

  // Workflows & Automation
  { id: 'workflows', label: 'Workflows', icon: Workflow, description: 'Automate document processes', category: 'workflows' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Workflow analytics & insights', category: 'workflows' },

  // Compliance & Legal
  { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Compliance labels & policies', category: 'compliance' },
  { id: 'legalhold', label: 'Legal Hold', icon: Scale, description: 'Legal holds & preservation', category: 'compliance' },
  { id: 'retention', label: 'Retention', icon: Clock, description: 'Retention policies & disposal', category: 'compliance' },
  { id: 'audit', label: 'Audit Trail', icon: Activity, description: 'Activity logs & audit reports', category: 'compliance' },

  // Admin & System
  { id: 'pipeline', label: 'Processing', icon: Zap, description: 'Document processing pipeline', badge: 'New', category: 'admin' },
  { id: 'migration', label: 'Migration', icon: Upload, description: 'Migrate docs from Google Drive, OneDrive, FileNet', badge: 'New', category: 'admin' },
];

export const getFeatureById = (id: string): FeatureTab | undefined =>
  FEATURE_TABS.find(tab => tab.id === id);

export const getFeaturesByCategory = (category: FeatureTab['category']): FeatureTab[] =>
  FEATURE_TABS.filter(tab => tab.category === category);

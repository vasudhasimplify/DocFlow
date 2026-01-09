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
  Upload
} from 'lucide-react';

export interface FeatureTab {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  category?: 'core' | 'ai' | 'collaboration' | 'compliance' | 'admin';
}

export const FEATURE_TABS: FeatureTab[] = [
  // Core Features
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Manage all your documents', category: 'core' },
  { id: 'quickaccess', label: 'Quick Access', icon: Zap, description: 'Priority and frequently accessed documents', badge: 'New', category: 'core' },
  { id: 'favorites', label: 'Starred', icon: Star, description: 'Quick access to starred documents', category: 'core' },

  // AI Features
  { id: 'summaries', label: 'AI Summaries', icon: Sparkles, description: 'Generate AI document summaries', category: 'ai' },
  { id: 'compare', label: 'Compare', icon: GitCompare, description: 'Compare document versions', category: 'ai' },

  // Collaboration
  { id: 'externalsharing', label: 'Guest Sharing', icon: Share2, description: 'Share with external users', badge: 'New', category: 'collaboration' },
  { id: 'sharing', label: 'Share Links', icon: Share2, description: 'Manage shared links & permissions', category: 'collaboration' },
  { id: 'checkinout', label: 'Check In/Out', icon: Lock, description: 'Document locking & checkout', category: 'collaboration' },
  { id: 'transfers', label: 'Transfers', icon: UserMinus, description: 'Ownership transfers', badge: 'New', category: 'collaboration' },

  // Content Management
  { id: 'contentrules', label: 'Access Rules', icon: Shield, description: 'Content-based access control', badge: 'New', category: 'compliance' },
  { id: 'metadata', label: 'Metadata', icon: Tag, description: 'Custom metadata fields', badge: 'New', category: 'compliance' },
  { id: 'watermarks', label: 'Watermarks', icon: Droplets, description: 'Document watermark settings', badge: 'New', category: 'compliance' },

  // Workflows
  { id: 'workflows', label: 'Workflows', icon: Workflow, description: 'Automate document processes', category: 'admin' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Workflow analytics & insights', category: 'admin' },
  { id: 'signatures', label: 'E-Signatures', icon: PenTool, description: 'Electronic signature requests', category: 'admin' },

  // Compliance & Legal
  { id: 'compliance', label: 'Compliance', icon: Shield, description: 'Compliance labels & policies', category: 'compliance' },
  { id: 'retention', label: 'Retention', icon: Clock, description: 'Retention policies & disposal', category: 'compliance' },
  { id: 'legalhold', label: 'Legal Hold', icon: Scale, description: 'Legal holds & preservation', category: 'compliance' },
  { id: 'audit', label: 'Audit Trail', icon: Activity, description: 'Activity logs & audit reports', category: 'compliance' },

  // Admin & System
  { id: 'pipeline', label: 'Processing', icon: Zap, description: 'Document processing pipeline', badge: 'New', category: 'admin' },
  { id: 'migration', label: 'Migration', icon: Upload, description: 'Migrate docs from Google Drive, OneDrive, FileNet', badge: 'New', category: 'admin' },
];

export const getFeatureById = (id: string): FeatureTab | undefined =>
  FEATURE_TABS.find(tab => tab.id === id);

export const getFeaturesByCategory = (category: FeatureTab['category']): FeatureTab[] =>
  FEATURE_TABS.filter(tab => tab.category === category);

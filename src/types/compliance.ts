// Compliance Labels Types - Best in Class Implementation

export type ComplianceFramework =
  | 'GDPR'
  | 'HIPAA'
  | 'SOX'
  | 'PCI_DSS'
  | 'CCPA'
  | 'FERPA'
  | 'ISO_27001'
  | 'NIST'
  | 'SOC2'
  | 'CUSTOM';

export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'highly_confidential'
  | 'restricted';

export type ComplianceLabelStatus = 'active' | 'pending_review' | 'expired' | 'revoked';

export type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical';

export type DataCategory =
  | 'pii'
  | 'phi'
  | 'pci'
  | 'financial'
  | 'legal'
  | 'hr'
  | 'intellectual_property'
  | 'customer_data'
  | 'employee_data'
  | 'other';

export interface ComplianceLabel {
  id: string;
  name: string;
  code: string;
  framework: ComplianceFramework;
  description: string;
  color: string;
  icon: string;
  data_classification: DataClassification;
  sensitivity_level: SensitivityLevel;
  data_categories: DataCategory[];
  retention_required: boolean;
  retention_period_days?: number;
  encryption_required: boolean;
  access_logging_required: boolean;
  download_restricted: boolean;
  sharing_restricted: boolean;
  export_restricted: boolean;
  deletion_requires_approval: boolean;
  geo_restrictions?: string[];
  allowed_regions?: string[];
  audit_frequency_days: number;
  auto_expire_days?: number;
  requires_acknowledgment: boolean;
  acknowledgment_text?: string;
  is_system_label: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface DocumentComplianceLabel {
  id: string;
  document_id: string;
  label_id: string;
  label: ComplianceLabel;
  applied_by: string;
  applied_at: string;
  status: ComplianceLabelStatus;
  justification?: string;
  review_date?: string;
  reviewed_by?: string;
  expires_at?: string;
  acknowledgments: ComplianceAcknowledgment[];
  metadata: Record<string, unknown>;
}

export interface ComplianceAcknowledgment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  acknowledged_at: string;
  ip_address?: string;
  acknowledgment_text: string;
}

export interface ComplianceAuditEntry {
  id: string;
  document_id: string;
  label_id: string;
  action: 'applied' | 'removed' | 'updated' | 'reviewed' | 'acknowledged' | 'violation' | 'expired';
  performed_by: string;
  performed_at: string;
  details: string;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface ComplianceViolation {
  id: string;
  document_id: string;
  label_id: string;
  violation_type: 'unauthorized_access' | 'unauthorized_share' | 'unauthorized_download' | 'retention_breach' | 'geo_violation' | 'policy_breach';
  severity: SensitivityLevel;
  detected_at: string;
  detected_by: string;
  description: string;
  user_involved?: string;
  action_taken?: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface ComplianceReport {
  id: string;
  report_type: 'summary' | 'detailed' | 'violations' | 'audit_trail' | 'data_mapping';
  framework?: ComplianceFramework;
  generated_at: string;
  generated_by: string;
  period_start: string;
  period_end: string;
  total_documents: number;
  labeled_documents: number;
  violations_count: number;
  pending_reviews: number;
  data: Record<string, unknown>;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  auto_apply_rules: AutoApplyRule[];
  notification_settings: NotificationSettings;
  escalation_settings: EscalationSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoApplyRule {
  id: string;
  condition_type: 'file_type' | 'folder' | 'keyword' | 'metadata' | 'ai_detected';
  condition_value: string;
  label_ids: string[];
  priority: number;
}

export interface NotificationSettings {
  on_label_applied: boolean;
  on_label_removed: boolean;
  on_violation: boolean;
  on_review_due: boolean;
  on_expiration: boolean;
  recipients: string[];
}

export interface EscalationSettings {
  violation_escalation_hours: number;
  review_overdue_escalation_hours: number;
  escalation_recipients: string[];
}

export interface ComplianceStats {
  total_labels: number;
  active_labels: number;
  labeled_documents: number;
  unlabeled_documents: number;
  pending_reviews: number;
  active_violations: number;
  resolved_violations: number;
  labels_by_framework: Record<ComplianceFramework, number>;
  labels_by_classification: Record<DataClassification, number>;
  recent_activity_count: number;
}

// Framework configurations
export const COMPLIANCE_FRAMEWORKS: Record<ComplianceFramework, {
  name: string;
  fullName: string;
  description: string;
  color: string;
  icon: string;
  region: string;
}> = {
  GDPR: {
    name: 'GDPR',
    fullName: 'General Data Protection Regulation',
    description: 'EU regulation on data protection and privacy',
    color: 'bg-blue-500',
    icon: 'Shield',
    region: 'EU/EEA'
  },
  HIPAA: {
    name: 'HIPAA',
    fullName: 'Health Insurance Portability and Accountability Act',
    description: 'US law protecting sensitive patient health information',
    color: 'bg-red-500',
    icon: 'Heart',
    region: 'USA'
  },
  SOX: {
    name: 'SOX',
    fullName: 'Sarbanes-Oxley Act',
    description: 'US law on corporate financial reporting',
    color: 'bg-purple-500',
    icon: 'Building2',
    region: 'USA'
  },
  PCI_DSS: {
    name: 'PCI-DSS',
    fullName: 'Payment Card Industry Data Security Standard',
    description: 'Security standard for payment card data',
    color: 'bg-green-500',
    icon: 'CreditCard',
    region: 'Global'
  },
  CCPA: {
    name: 'CCPA',
    fullName: 'California Consumer Privacy Act',
    description: 'California state privacy law',
    color: 'bg-yellow-500',
    icon: 'Sun',
    region: 'California, USA'
  },
  FERPA: {
    name: 'FERPA',
    fullName: 'Family Educational Rights and Privacy Act',
    description: 'US law protecting student education records',
    color: 'bg-orange-500',
    icon: 'GraduationCap',
    region: 'USA'
  },
  ISO_27001: {
    name: 'ISO 27001',
    fullName: 'ISO/IEC 27001 Information Security',
    description: 'International standard for information security management',
    color: 'bg-cyan-500',
    icon: 'Lock',
    region: 'Global'
  },
  NIST: {
    name: 'NIST',
    fullName: 'NIST Cybersecurity Framework',
    description: 'US framework for cybersecurity standards',
    color: 'bg-indigo-500',
    icon: 'ShieldCheck',
    region: 'USA'
  },
  SOC2: {
    name: 'SOC 2',
    fullName: 'Service Organization Control 2',
    description: 'Auditing procedure for service providers',
    color: 'bg-pink-500',
    icon: 'ClipboardCheck',
    region: 'Global'
  },
  CUSTOM: {
    name: 'Custom',
    fullName: 'Custom Compliance Framework',
    description: 'Organization-specific compliance requirements',
    color: 'bg-gray-500',
    icon: 'Settings',
    region: 'Custom'
  }
};

export const DATA_CLASSIFICATION_CONFIG: Record<DataClassification, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  public: {
    label: 'Public',
    description: 'Information that can be freely shared',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300'
  },
  internal: {
    label: 'Internal',
    description: 'For internal use only',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300'
  },
  confidential: {
    label: 'Confidential',
    description: 'Sensitive business information',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300'
  },
  highly_confidential: {
    label: 'Highly Confidential',
    description: 'Requires strict access controls',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300'
  },
  restricted: {
    label: 'Restricted',
    description: 'Highest level of protection required',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300'
  }
};

export const SENSITIVITY_LEVEL_CONFIG: Record<SensitivityLevel, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  low: {
    label: 'Low',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: 'Shield'
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: 'ShieldAlert'
  },
  high: {
    label: 'High',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: 'ShieldAlert'
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'ShieldOff'
  }
};

export const DATA_CATEGORY_CONFIG: Record<DataCategory, {
  label: string;
  description: string;
  frameworks: ComplianceFramework[];
}> = {
  pii: {
    label: 'PII',
    description: 'Personally Identifiable Information',
    frameworks: ['GDPR', 'CCPA', 'NIST']
  },
  phi: {
    label: 'PHI',
    description: 'Protected Health Information',
    frameworks: ['HIPAA']
  },
  pci: {
    label: 'PCI',
    description: 'Payment Card Information',
    frameworks: ['PCI_DSS']
  },
  financial: {
    label: 'Financial',
    description: 'Financial records and data',
    frameworks: ['SOX', 'SOC2']
  },
  legal: {
    label: 'Legal',
    description: 'Legal documents and contracts',
    frameworks: ['SOX', 'ISO_27001']
  },
  hr: {
    label: 'HR',
    description: 'Human resources data',
    frameworks: ['GDPR', 'CCPA']
  },
  intellectual_property: {
    label: 'IP',
    description: 'Intellectual property',
    frameworks: ['ISO_27001', 'SOC2']
  },
  customer_data: {
    label: 'Customer',
    description: 'Customer information',
    frameworks: ['GDPR', 'CCPA', 'SOC2']
  },
  employee_data: {
    label: 'Employee',
    description: 'Employee information',
    frameworks: ['GDPR', 'CCPA']
  },
  other: {
    label: 'Other',
    description: 'Other sensitive data',
    frameworks: ['CUSTOM']
  }
};

// Helper functions
export const getFrameworkConfig = (framework: ComplianceFramework) =>
  COMPLIANCE_FRAMEWORKS[framework];

export const getClassificationConfig = (classification: DataClassification) =>
  DATA_CLASSIFICATION_CONFIG[classification];

export const getSensitivityConfig = (level: SensitivityLevel) =>
  SENSITIVITY_LEVEL_CONFIG[level];

export const getRecommendedLabels = (framework: ComplianceFramework): Partial<ComplianceLabel>[] => {
  const recommendations: Record<ComplianceFramework, Partial<ComplianceLabel>[]> = {
    GDPR: [
      { name: 'Personal Data', code: 'GDPR-PD', data_classification: 'confidential', sensitivity_level: 'high' },
      { name: 'Special Category Data', code: 'GDPR-SCD', data_classification: 'restricted', sensitivity_level: 'critical' },
      { name: 'Data Subject Rights', code: 'GDPR-DSR', data_classification: 'highly_confidential', sensitivity_level: 'high' }
    ],
    HIPAA: [
      { name: 'PHI - Standard', code: 'HIPAA-PHI', data_classification: 'highly_confidential', sensitivity_level: 'high' },
      { name: 'PHI - Sensitive', code: 'HIPAA-SPHI', data_classification: 'restricted', sensitivity_level: 'critical' },
      { name: 'ePHI', code: 'HIPAA-EPHI', data_classification: 'restricted', sensitivity_level: 'critical' }
    ],
    SOX: [
      { name: 'Financial Records', code: 'SOX-FR', data_classification: 'highly_confidential', sensitivity_level: 'high' },
      { name: 'Audit Materials', code: 'SOX-AM', data_classification: 'restricted', sensitivity_level: 'critical' }
    ],
    PCI_DSS: [
      { name: 'Cardholder Data', code: 'PCI-CHD', data_classification: 'restricted', sensitivity_level: 'critical' },
      { name: 'Payment Records', code: 'PCI-PR', data_classification: 'highly_confidential', sensitivity_level: 'high' }
    ],
    CCPA: [
      { name: 'Consumer Data', code: 'CCPA-CD', data_classification: 'confidential', sensitivity_level: 'high' },
      { name: 'Sensitive Personal Info', code: 'CCPA-SPI', data_classification: 'highly_confidential', sensitivity_level: 'critical' }
    ],
    FERPA: [
      { name: 'Education Records', code: 'FERPA-ER', data_classification: 'highly_confidential', sensitivity_level: 'high' },
      { name: 'Directory Information', code: 'FERPA-DI', data_classification: 'internal', sensitivity_level: 'medium' }
    ],
    ISO_27001: [
      { name: 'Information Asset', code: 'ISO-IA', data_classification: 'confidential', sensitivity_level: 'medium' },
      { name: 'Critical Asset', code: 'ISO-CA', data_classification: 'restricted', sensitivity_level: 'critical' }
    ],
    NIST: [
      { name: 'CUI - Basic', code: 'NIST-CUI', data_classification: 'confidential', sensitivity_level: 'medium' },
      { name: 'CUI - Specified', code: 'NIST-CUIS', data_classification: 'highly_confidential', sensitivity_level: 'high' }
    ],
    SOC2: [
      { name: 'Service Data', code: 'SOC2-SD', data_classification: 'confidential', sensitivity_level: 'medium' },
      { name: 'Customer Trust Data', code: 'SOC2-CTD', data_classification: 'highly_confidential', sensitivity_level: 'high' }
    ],
    CUSTOM: [
      { name: 'Custom Label', code: 'CUSTOM-1', data_classification: 'internal', sensitivity_level: 'low' }
    ]
  };
  return recommendations[framework] || [];
};

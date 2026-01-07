/**
 * Configuration for AI Summary types and languages
 * Users can customize these settings
 */

import {
  BookOpen,
  FileText,
  Briefcase,
  List,
  ClipboardList,
  Zap,
  Target,
  TrendingUp,
  MessageSquare,
  FileQuestion,
  Brain,
  type LucideIcon,
} from 'lucide-react';

export interface SummaryTypeConfig {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  enabled: boolean;
  custom?: boolean; // User-added custom type
}

export interface LanguageConfig {
  code: string;
  label: string;
  enabled: boolean;
  custom?: boolean; // User-added custom language
}

// Default summary types
export const DEFAULT_SUMMARY_TYPES: SummaryTypeConfig[] = [
  {
    id: 'brief',
    label: 'Brief',
    description: '2-3 sentence overview',
    icon: BookOpen,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    enabled: true,
  },
  {
    id: 'detailed',
    label: 'Detailed',
    description: 'Comprehensive analysis',
    icon: FileText,
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    enabled: true,
  },
  {
    id: 'executive',
    label: 'Executive',
    description: 'For decision makers',
    icon: Briefcase,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    enabled: true,
  },
  {
    id: 'bullet',
    label: 'Bullet Points',
    description: 'Scannable format',
    icon: List,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    enabled: true,
  },
  {
    id: 'action-items',
    label: 'Action Items',
    description: 'Tasks & deadlines',
    icon: ClipboardList,
    color: 'bg-red-500/10 text-red-600 dark:text-red-400',
    enabled: true,
  },
  {
    id: 'key-insights',
    label: 'Key Insights',
    description: 'Main takeaways and findings',
    icon: Zap,
    color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    enabled: true,
  },
  {
    id: 'technical',
    label: 'Technical',
    description: 'Technical details and specifications',
    icon: Brain,
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
    enabled: true,
  },
  {
    id: 'qa',
    label: 'Q&A Format',
    description: 'Question and answer style',
    icon: FileQuestion,
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
    enabled: false,
  },
  {
    id: 'meeting-notes',
    label: 'Meeting Notes',
    description: 'Agenda, discussion, and decisions',
    icon: MessageSquare,
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    enabled: false,
  },
  {
    id: 'strategic',
    label: 'Strategic',
    description: 'Strategic implications and recommendations',
    icon: Target,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    enabled: false,
  },
  {
    id: 'financial',
    label: 'Financial',
    description: 'Financial metrics and analysis',
    icon: TrendingUp,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    enabled: false,
  },
];

// Default languages
export const DEFAULT_LANGUAGES: LanguageConfig[] = [
  { code: 'en', label: 'English', enabled: true },
  { code: 'es', label: 'Spanish (Español)', enabled: true },
  { code: 'fr', label: 'French (Français)', enabled: true },
  { code: 'de', label: 'German (Deutsch)', enabled: true },
  { code: 'pt', label: 'Portuguese (Português)', enabled: true },
  { code: 'it', label: 'Italian (Italiano)', enabled: true },
  { code: 'zh', label: 'Chinese (中文)', enabled: true },
  { code: 'ja', label: 'Japanese (日本語)', enabled: true },
  { code: 'ko', label: 'Korean (한국어)', enabled: true },
  { code: 'ar', label: 'Arabic (العربية)', enabled: true },
  { code: 'hi', label: 'Hindi (हिंदी)', enabled: true },
  { code: 'id', label: 'Indonesian (Bahasa Indonesia)', enabled: true },
  { code: 'ru', label: 'Russian (Русский)', enabled: false },
  { code: 'nl', label: 'Dutch (Nederlands)', enabled: false },
  { code: 'pl', label: 'Polish (Polski)', enabled: false },
  { code: 'tr', label: 'Turkish (Türkçe)', enabled: false },
  { code: 'vi', label: 'Vietnamese (Tiếng Việt)', enabled: false },
  { code: 'th', label: 'Thai (ไทย)', enabled: false },
  { code: 'sv', label: 'Swedish (Svenska)', enabled: false },
  { code: 'no', label: 'Norwegian (Norsk)', enabled: false },
  { code: 'da', label: 'Danish (Dansk)', enabled: false },
  { code: 'fi', label: 'Finnish (Suomi)', enabled: false },
  { code: 'cs', label: 'Czech (Čeština)', enabled: false },
  { code: 'el', label: 'Greek (Ελληνικά)', enabled: false },
  { code: 'he', label: 'Hebrew (עברית)', enabled: false },
  { code: 'uk', label: 'Ukrainian (Українська)', enabled: false },
  { code: 'ro', label: 'Romanian (Română)', enabled: false },
  { code: 'hu', label: 'Hungarian (Magyar)', enabled: false },
  { code: 'bn', label: 'Bengali (বাংলা)', enabled: false },
  { code: 'ta', label: 'Tamil (தமிழ்)', enabled: false },
  { code: 'te', label: 'Telugu (తెలుగు)', enabled: false },
  { code: 'mr', label: 'Marathi (मराठी)', enabled: false },
  { code: 'ur', label: 'Urdu (اردو)', enabled: false },
  { code: 'fa', label: 'Persian (فارسی)', enabled: false },
  { code: 'ms', label: 'Malay (Bahasa Melayu)', enabled: false },
  { code: 'sw', label: 'Swahili (Kiswahili)', enabled: false },
];

// LocalStorage keys
const SUMMARY_TYPES_KEY = 'ai_summary_types_config';
const LANGUAGES_KEY = 'ai_summary_languages_config';

/**
 * Get summary types from localStorage or defaults
 */
export function getSummaryTypes(): SummaryTypeConfig[] {
  try {
    const stored = localStorage.getItem(SUMMARY_TYPES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading summary types config:', error);
  }
  return DEFAULT_SUMMARY_TYPES;
}

/**
 * Save summary types to localStorage
 */
export function saveSummaryTypes(types: SummaryTypeConfig[]): void {
  try {
    localStorage.setItem(SUMMARY_TYPES_KEY, JSON.stringify(types));
  } catch (error) {
    console.error('Error saving summary types config:', error);
  }
}

/**
 * Get enabled summary types only
 */
export function getEnabledSummaryTypes(): SummaryTypeConfig[] {
  return getSummaryTypes().filter(type => type.enabled);
}

/**
 * Get languages from localStorage or defaults
 */
export function getLanguages(): LanguageConfig[] {
  try {
    const stored = localStorage.getItem(LANGUAGES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading languages config:', error);
  }
  return DEFAULT_LANGUAGES;
}

/**
 * Save languages to localStorage
 */
export function saveLanguages(languages: LanguageConfig[]): void {
  try {
    localStorage.setItem(LANGUAGES_KEY, JSON.stringify(languages));
  } catch (error) {
    console.error('Error saving languages config:', error);
  }
}

/**
 * Get enabled languages only
 */
export function getEnabledLanguages(): LanguageConfig[] {
  return getLanguages().filter(lang => lang.enabled);
}

/**
 * Add a custom summary type
 */
export function addCustomSummaryType(type: Omit<SummaryTypeConfig, 'custom'>): void {
  const types = getSummaryTypes();
  const newType: SummaryTypeConfig = {
    ...type,
    custom: true,
  };
  saveSummaryTypes([...types, newType]);
}

/**
 * Add a custom language
 */
export function addCustomLanguage(language: Omit<LanguageConfig, 'custom'>): void {
  const languages = getLanguages();
  const newLanguage: LanguageConfig = {
    ...language,
    custom: true,
  };
  saveLanguages([...languages, newLanguage]);
}

/**
 * Update summary type enabled status
 */
export function toggleSummaryType(id: string, enabled: boolean): void {
  const types = getSummaryTypes();
  const updated = types.map(type =>
    type.id === id ? { ...type, enabled } : type
  );
  saveSummaryTypes(updated);
}

/**
 * Update language enabled status
 */
export function toggleLanguage(code: string, enabled: boolean): void {
  const languages = getLanguages();
  const updated = languages.map(lang =>
    lang.code === code ? { ...lang, enabled } : lang
  );
  saveLanguages(updated);
}

/**
 * Delete a custom summary type
 */
export function deleteSummaryType(id: string): void {
  const types = getSummaryTypes();
  const filtered = types.filter(type => type.id !== id);
  saveSummaryTypes(filtered);
}

/**
 * Delete a custom language
 */
export function deleteLanguage(code: string): void {
  const languages = getLanguages();
  const filtered = languages.filter(lang => lang.code !== code);
  saveLanguages(filtered);
}

/**
 * Reset to defaults
 */
export function resetToDefaults(): void {
  localStorage.removeItem(SUMMARY_TYPES_KEY);
  localStorage.removeItem(LANGUAGES_KEY);
}

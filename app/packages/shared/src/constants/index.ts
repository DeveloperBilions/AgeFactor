import { OrganSystem, BiomarkerStatus, HealthConcernSeverity } from '../types/index.js';

// Biomarker Categories Mapping
export const BIOMARKER_CATEGORIES: Record<OrganSystem, string> = {
  liver: 'Liver Function',
  kidney: 'Kidney Function',
  thyroid: 'Thyroid Function',
  metabolic: 'Metabolic Panel',
  blood: 'Blood Cells',
  heart: 'Cardiac Markers',
  nutrients: 'Nutrients & Minerals',
};

// Status Colors for UI Visualization
export const STATUS_COLORS: Record<BiomarkerStatus, string> = {
  optimal: '#22C55E',    // Green
  borderline: '#F59E0B', // Amber
  low: '#EF4444',        // Red
  high: '#EF4444',       // Red
  critical: '#DC2626',   // Dark Red
};

// Severity Colors for Health Concerns
export const SEVERITY_COLORS: Record<HealthConcernSeverity, string> = {
  low: '#10B981',        // Green
  medium: '#F59E0B',     // Amber
  high: '#F97316',       // Orange
  critical: '#DC2626',   // Dark Red
};

// Organ Systems Configuration
export interface OrganSystemConfig {
  id: OrganSystem;
  name: string;
  label: string;
  icon: string;
  description: string;
}

export const ORGAN_SYSTEMS: OrganSystemConfig[] = [
  {
    id: 'liver',
    name: 'Liver',
    label: 'Liver Function',
    icon: '🫀',
    description: 'Hepatic function and detoxification',
  },
  {
    id: 'kidney',
    name: 'Kidney',
    label: 'Kidney Function',
    icon: '🫘',
    description: 'Renal function and filtration',
  },
  {
    id: 'thyroid',
    name: 'Thyroid',
    label: 'Thyroid Function',
    icon: '⚡',
    description: 'Thyroid hormones and metabolism',
  },
  {
    id: 'metabolic',
    name: 'Metabolic',
    label: 'Metabolic Panel',
    icon: '⚙️',
    description: 'Glucose, lipids, and metabolic markers',
  },
  {
    id: 'blood',
    name: 'Blood',
    label: 'Blood Cells',
    icon: '🩸',
    description: 'Red blood cells, white blood cells, platelets',
  },
  {
    id: 'heart',
    name: 'Heart',
    label: 'Cardiac Markers',
    icon: '❤️',
    description: 'Cardiac function and heart health',
  },
  {
    id: 'nutrients',
    name: 'Nutrients',
    label: 'Nutrients & Minerals',
    icon: '🥗',
    description: 'Vitamins, minerals, and nutritional status',
  },
];

// File Upload Configuration
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const SUPPORTED_FILE_TYPES = ['application/pdf'];
export const SUPPORTED_FILE_EXTENSIONS = ['.pdf'];

// Pagination Defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Language Codes
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  gu: 'Gujarati',
} as const;

// Gender Options
export const GENDER_OPTIONS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
} as const;

// Recommendation Types Labels
export const RECOMMENDATION_TYPE_LABELS: Record<string, string> = {
  diet: 'Dietary Recommendation',
  supplement: 'Supplement Recommendation',
  lifestyle: 'Lifestyle Change',
  retest: 'Follow-up Test',
};

// Priority Labels
export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very High',
  5: 'Critical',
};

// Report Status Labels
export const REPORT_STATUS_LABELS: Record<string, string> = {
  processing: 'Processing',
  analyzed: 'Analysis Complete',
  error: 'Error',
};

// API Routes
export const API_ROUTES = {
  AUTH: '/api/v1/auth',
  USERS: '/api/v1/users',
  REPORTS: '/api/v1/reports',
  BIOMARKERS: '/api/v1/biomarkers',
  HEALTH_CONCERNS: '/api/v1/health-concerns',
  RECOMMENDATIONS: '/api/v1/recommendations',
  ORGAN_SCORES: '/api/v1/organ-scores',
} as const;

// Error Codes
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_FILE: 'INVALID_FILE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

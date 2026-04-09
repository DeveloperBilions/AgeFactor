// User Types
export interface User {
  id: string;
  phone: string;
  name: string;
  dateOfBirth: string; // ISO 8601 format
  gender: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  language: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'gu';
  createdAt: string;
  updatedAt: string;
}

// Report Types
export type ReportStatus = 'processing' | 'analyzed' | 'error';

export interface Report {
  id: string;
  userId: string;
  labName: string;
  reportDate: string; // ISO 8601 format
  status: ReportStatus;
  pdfS3Key: string;
  createdAt: string;
  updatedAt: string;
}

// Biomarker Types
export type OrganSystem = 'liver' | 'kidney' | 'thyroid' | 'metabolic' | 'blood' | 'heart' | 'nutrients';
export type BiomarkerStatus = 'optimal' | 'borderline' | 'low' | 'high' | 'critical';

export interface Biomarker {
  id: string;
  reportId: string;
  name: string;
  value: number;
  unit: string;
  labRangeLow: number;
  labRangeHigh: number;
  optimalRangeLow: number;
  optimalRangeHigh: number;
  status: BiomarkerStatus;
  category: OrganSystem;
  aiExplanation: string;
  createdAt: string;
}

// Organ System Score Types
export interface OrganSystemScore {
  id: string;
  reportId: string;
  system: OrganSystem;
  score: number; // 0-100
  summary: string;
  createdAt: string;
}

// Health Concern Types
export type HealthConcernSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface HealthConcern {
  id: string;
  reportId: string;
  title: string;
  severity: HealthConcernSeverity;
  affectedBiomarkers: string[]; // Array of biomarker IDs
  explanation: string;
  recommendedAction: string;
  createdAt: string;
}

// Recommendation Types
export type RecommendationType = 'diet' | 'supplement' | 'lifestyle' | 'retest';

export interface Recommendation {
  id: string;
  reportId: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: number; // 1-5, where 5 is highest priority
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  phone: string;
  otp: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

// File Upload Types
export interface UploadedFile {
  filename: string;
  mimetype: string;
  size: number;
  s3Key: string;
  s3Url: string;
}

// Pagination Query Types
export interface PaginationParams {
  page: number;
  limit: number;
}

// Error Response Type
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, string>;
  timestamp: string;
  path: string;
}

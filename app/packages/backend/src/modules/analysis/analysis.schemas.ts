import { z } from 'zod';

// Extracted biomarker from OCR text
export const ExtractedBiomarkerSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  labRangeLow: z.number().optional(),
  labRangeHigh: z.number().optional(),
});

export type ExtractedBiomarker = z.infer<typeof ExtractedBiomarkerSchema>;

// Biomarker with analysis results
export const AnalyzedBiomarkerSchema = z.object({
  name: z.string(),
  value: z.number(),
  unit: z.string(),
  labRangeLow: z.number().optional(),
  labRangeHigh: z.number().optional(),
  optimalRangeLow: z.number().optional(),
  optimalRangeHigh: z.number().optional(),
  status: z.enum(['optimal', 'borderline', 'low', 'high', 'critical']),
  category: z.enum(['liver', 'kidney', 'thyroid', 'metabolic', 'blood', 'heart', 'nutrients']),
  displayName: z.string().optional(),
});

export type AnalyzedBiomarker = z.infer<typeof AnalyzedBiomarkerSchema>;

// Organ system score
export const OrganSystemScoreSchema = z.object({
  system: z.enum(['liver', 'kidney', 'thyroid', 'metabolic', 'blood', 'heart', 'nutrients']),
  score: z.number().min(0).max(100),
  summary: z.string(),
});

export type OrganSystemScore = z.infer<typeof OrganSystemScoreSchema>;

// Health concern
export const HealthConcernSchema = z.object({
  title: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affectedBiomarkers: z.array(z.string()),
  explanation: z.string(),
  recommendedAction: z.string(),
  priority: z.number().optional(),
});

export type HealthConcern = z.infer<typeof HealthConcernSchema>;

// Recommendation
export const RecommendationSchema = z.object({
  type: z.enum(['diet', 'supplement', 'lifestyle', 'retest']),
  title: z.string(),
  description: z.string(),
  priority: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// Complete analysis response
export const AnalysisResponseSchema = z.object({
  organSystemScores: z.array(OrganSystemScoreSchema),
  healthConcerns: z.array(HealthConcernSchema),
  recommendations: z.array(RecommendationSchema),
  overallSummary: z.string(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

// User profile for analysis
export const UserProfileSchema = z.object({
  id: z.string(),
  age: z.number().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable(),
  heightCm: z.number().nullable().optional(),
  weightKg: z.number().nullable().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;

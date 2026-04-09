import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { query, getPool } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import {
  ExtractedBiomarker,
  ExtractedBiomarkerSchema,
  AnalyzedBiomarker,
  AnalyzedBiomarkerSchema,
  AnalysisResponse,
  AnalysisResponseSchema,
  UserProfile,
} from './analysis.schemas';
import { buildExtractionPrompt, buildAnalysisPrompt } from './analysis.prompts';
import { calculateAge } from '../../utils/dateUtils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/**
 * Extract biomarkers from OCR text using Claude API
 */
export async function extractBiomarkers(ocrText: string): Promise<ExtractedBiomarker[]> {
  if (!ocrText || ocrText.trim().length === 0) {
    throw new AppError('OCR text is empty', 400);
  }

  try {
    const { system, user } = buildExtractionPrompt(ocrText);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: 'user',
          content: user,
        },
      ],
    });

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new AppError('Invalid response from Claude API', 500);
    }

    const content = response.content[0].text.trim();

    // Parse JSON response
    let biomarkers: unknown;
    try {
      biomarkers = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      throw new AppError('Failed to parse biomarker extraction response', 500);
    }

    // Validate with Zod
    const result = z.array(ExtractedBiomarkerSchema).safeParse(biomarkers);
    if (!result.success) {
      console.error('Validation error:', result.error);
      throw new AppError('Invalid biomarker data structure', 500);
    }

    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error extracting biomarkers:', error);
    throw new AppError('Failed to extract biomarkers from report', 500);
  }
}

/**
 * Analyze extracted biomarkers against reference ranges
 */
export async function analyzeBiomarkers(
  biomarkers: ExtractedBiomarker[],
  userProfile: { age?: number; gender?: string | null }
): Promise<AnalyzedBiomarker[]> {
  const analyzedBiomarkers: AnalyzedBiomarker[] = [];

  for (const biomarker of biomarkers) {
    // Look up reference ranges
    const refResult = await query<{
      category: string;
      display_name: string;
      optimal_range_low: number | null;
      optimal_range_high: number | null;
      lab_range_low: number | null;
      lab_range_high: number | null;
      gender_specific: boolean;
      male_optimal_low: number | null;
      male_optimal_high: number | null;
      female_optimal_low: number | null;
      female_optimal_high: number | null;
      age_min: number | null;
      age_max: number | null;
    }>(
      `SELECT category, display_name, optimal_range_low, optimal_range_high, lab_range_low, lab_range_high,
              gender_specific, male_optimal_low, male_optimal_high, female_optimal_low, female_optimal_high,
              age_min, age_max
       FROM biomarker_reference_ranges
       WHERE name = $1
       AND (age_min IS NULL OR age_min <= $2)
       AND (age_max IS NULL OR age_max >= $2)
       ORDER BY (age_max - age_min) DESC
       LIMIT 1`,
      [biomarker.name, userProfile.age || 30]
    );

    let status: 'optimal' | 'borderline' | 'low' | 'high' | 'critical' = 'borderline';
    let optimalRangeLow: number | undefined;
    let optimalRangeHigh: number | undefined;
    let labRangeLow = biomarker.labRangeLow;
    let labRangeHigh = biomarker.labRangeHigh;
    let category = 'blood';
    let displayName = biomarker.name;

    if (refResult.rows.length > 0) {
      const ref = refResult.rows[0];
      category = ref.category || category;
      displayName = ref.display_name || displayName;
      labRangeLow = ref.lab_range_low || labRangeLow;
      labRangeHigh = ref.lab_range_high || labRangeHigh;

      // Get optimal range based on gender
      if (ref.gender_specific && userProfile.gender) {
        if (userProfile.gender === 'male') {
          optimalRangeLow = ref.male_optimal_low || undefined;
          optimalRangeHigh = ref.male_optimal_high || undefined;
        } else if (userProfile.gender === 'female') {
          optimalRangeLow = ref.female_optimal_low || undefined;
          optimalRangeHigh = ref.female_optimal_high || undefined;
        }
      } else {
        optimalRangeLow = ref.optimal_range_low || undefined;
        optimalRangeHigh = ref.optimal_range_high || undefined;
      }

      // Determine status
      status = determineStatus(biomarker.value, optimalRangeLow, optimalRangeHigh, labRangeLow, labRangeHigh);
    }

    analyzedBiomarkers.push({
      name: biomarker.name,
      displayName,
      value: biomarker.value,
      unit: biomarker.unit,
      labRangeLow,
      labRangeHigh,
      optimalRangeLow,
      optimalRangeHigh,
      status,
      category: category as any,
    });
  }

  return analyzedBiomarkers;
}

/**
 * Generate comprehensive health analysis using Claude API
 */
export async function generateHealthAnalysis(
  analyzedBiomarkers: AnalyzedBiomarker[],
  userProfile: UserProfile
): Promise<AnalysisResponse> {
  try {
    const { system, user } = buildAnalysisPrompt(analyzedBiomarkers, userProfile);

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 8192,
      system,
      messages: [
        {
          role: 'user',
          content: user,
        },
      ],
    });

    if (response.content.length === 0 || response.content[0].type !== 'text') {
      throw new AppError('Invalid response from Claude API', 500);
    }

    const content = response.content[0].text.trim();

    // Parse JSON response
    let analysisData: unknown;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/({[\s\S]*})/);
      analysisData = JSON.parse(jsonMatch ? jsonMatch[1] : content);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      throw new AppError('Failed to parse analysis response', 500);
    }

    // Validate with Zod
    const result = AnalysisResponseSchema.safeParse(analysisData);
    if (!result.success) {
      console.error('Validation error:', result.error);
      throw new AppError('Invalid analysis response structure', 500);
    }

    return result.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('Error generating health analysis:', error);
    throw new AppError('Failed to generate health analysis', 500);
  }
}

/**
 * Process a report end-to-end
 */
export async function processReport(reportId: string): Promise<void> {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Fetch report
    const reportResult = await client.query(
      `SELECT id, user_id, ocr_raw_text, pdf_s3_key FROM reports WHERE id = $1`,
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      throw new AppError('Report not found', 404);
    }

    const report = reportResult.rows[0];
    const userId = report.user_id;

    // Get OCR text (fetch from PDF if not present)
    let ocrText = report.ocr_raw_text;
    if (!ocrText) {
      // TODO: Extract from PDF using pdf-parse from S3
      throw new AppError('OCR text not available and PDF extraction not yet implemented', 400);
    }

    // Fetch user profile for age calculation
    const userResult = await client.query(
      `SELECT id, gender, date_of_birth FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];
    const age = user.date_of_birth ? calculateAge(new Date(user.date_of_birth)) : undefined;
    const userProfile: UserProfile = {
      id: userId,
      age,
      gender: user.gender,
    };

    // Step 1: Extract biomarkers
    const extractedBiomarkers = await extractBiomarkers(ocrText);
    console.log(`Extracted ${extractedBiomarkers.length} biomarkers from report ${reportId}`);

    // Step 2: Analyze biomarkers
    const analyzedBiomarkers = await analyzeBiomarkers(extractedBiomarkers, {
      age,
      gender: user.gender,
    });
    console.log(`Analyzed ${analyzedBiomarkers.length} biomarkers for report ${reportId}`);

    // Step 3: Generate health analysis
    const analysis = await generateHealthAnalysis(analyzedBiomarkers, userProfile);
    console.log(`Generated health analysis for report ${reportId}`);

    // Step 4: Store results in database
    // Insert biomarkers
    for (const biomarker of analyzedBiomarkers) {
      await client.query(
        `INSERT INTO biomarkers (report_id, name, display_name, value, unit, lab_range_low, lab_range_high,
         optimal_range_low, optimal_range_high, status, category, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          reportId,
          biomarker.name,
          biomarker.displayName,
          biomarker.value,
          biomarker.unit,
          biomarker.labRangeLow || null,
          biomarker.labRangeHigh || null,
          biomarker.optimalRangeLow || null,
          biomarker.optimalRangeHigh || null,
          biomarker.status,
          biomarker.category,
        ]
      );
    }

    // Insert organ system scores
    for (const score of analysis.organSystemScores) {
      await client.query(
        `INSERT INTO organ_system_scores (report_id, system, score, summary, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [reportId, score.system, score.score, score.summary]
      );
    }

    // Insert health concerns (limit to 5, ranked by severity)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sortedConcerns = analysis.healthConcerns.slice(0, 5);

    for (let i = 0; i < sortedConcerns.length; i++) {
      const concern = sortedConcerns[i];
      await client.query(
        `INSERT INTO health_concerns (report_id, title, severity, affected_biomarkers, explanation,
         recommended_action, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [
          reportId,
          concern.title,
          concern.severity,
          concern.affectedBiomarkers,
          concern.explanation,
          concern.recommendedAction,
          i,
        ]
      );
    }

    // Insert recommendations
    for (let i = 0; i < analysis.recommendations.length; i++) {
      const rec = analysis.recommendations[i];
      await client.query(
        `INSERT INTO recommendations (report_id, type, title, description, priority, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [reportId, rec.type, rec.title, rec.description, rec.priority || i]
      );
    }

    // Update report status
    await client.query(
      `UPDATE reports SET status = 'analyzed', analysis_summary = $2, updated_at = NOW() WHERE id = $1`,
      [reportId, JSON.stringify(analysis)]
    );

    // Commit transaction
    await client.query('COMMIT');
    console.log(`Successfully processed report ${reportId}`);
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error processing report ${reportId}:`, errorMessage);

    // Update report with error status
    await query(
      `UPDATE reports SET status = 'error', error_message = $2, updated_at = NOW() WHERE id = $1`,
      [reportId, errorMessage]
    );

    throw error;
  } finally {
    client.release();
  }
}

/**
 * Determine biomarker status based on ranges
 */
function determineStatus(
  value: number,
  optimalLow?: number,
  optimalHigh?: number,
  labLow?: number,
  labHigh?: number
): 'optimal' | 'borderline' | 'low' | 'high' | 'critical' {
  // If optimal range exists, use it
  if (optimalLow !== undefined && optimalHigh !== undefined) {
    if (value >= optimalLow && value <= optimalHigh) {
      return 'optimal';
    }
  }

  // If lab range exists
  if (labLow !== undefined && labHigh !== undefined) {
    if (value >= labLow && value <= labHigh) {
      // Within lab range but outside optimal
      if ((optimalLow !== undefined && value < optimalLow) || (optimalHigh !== undefined && value > optimalHigh)) {
        return 'borderline';
      }
      return 'optimal';
    }

    // Outside lab range
    const deviation = value < labLow ? labLow - value : value - labHigh;
    const threshold = Math.abs(labHigh - labLow) * 0.2; // 20% of range

    if (value < labLow) {
      return deviation > threshold ? 'critical' : 'low';
    } else {
      return deviation > threshold ? 'critical' : 'high';
    }
  }

  return 'borderline';
}

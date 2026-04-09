import { query } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

/**
 * Dashboard summary - get latest report analysis
 */
export async function getSummary(userId: string) {
  // Get latest analyzed report
  const reportResult = await query<{
    id: string;
    report_date: string;
    lab_name: string | null;
    status: string;
    analysis_summary: any;
    created_at: string;
  }>(
    `SELECT id, report_date, lab_name, status, analysis_summary, created_at
     FROM reports
     WHERE user_id = $1 AND status = 'analyzed'
     ORDER BY report_date DESC, created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (reportResult.rows.length === 0) {
    return {
      hasReports: false,
      latestReport: null,
      organSystemScores: [],
      biomarkerSummary: {
        total: 0,
        optimal: 0,
        borderline: 0,
        outOfRange: 0,
      },
      overallSummary: null,
    };
  }

  const report = reportResult.rows[0];

  // Get organ system scores for latest report
  const scoresResult = await query<{
    system: string;
    score: number;
    summary: string;
  }>(
    `SELECT system, score, summary
     FROM organ_system_scores
     WHERE report_id = $1`,
    [report.id]
  );

  // Get biomarker counts
  const biomarkerResult = await query<{
    status: string;
    count: number;
  }>(
    `SELECT status, COUNT(*) as count
     FROM biomarkers
     WHERE report_id = $1
     GROUP BY status`,
    [report.id]
  );

  const biomarkerCounts: { [key: string]: number } = {};
  let totalBiomarkers = 0;
  for (const row of biomarkerResult.rows) {
    biomarkerCounts[row.status] = row.count;
    totalBiomarkers += row.count;
  }

  return {
    hasReports: true,
    latestReport: {
      id: report.id,
      date: report.report_date,
      labName: report.lab_name,
      status: report.status,
      createdAt: report.created_at,
    },
    organSystemScores: scoresResult.rows,
    biomarkerSummary: {
      total: totalBiomarkers,
      optimal: biomarkerCounts['optimal'] || 0,
      borderline: biomarkerCounts['borderline'] || 0,
      outOfRange:
        (biomarkerCounts['low'] || 0) +
        (biomarkerCounts['high'] || 0) +
        (biomarkerCounts['critical'] || 0),
    },
    overallSummary: report.analysis_summary?.overallSummary || null,
  };
}

/**
 * Get health concerns for latest report
 */
export async function getConcerns(userId: string) {
  // Get latest analyzed report
  const reportResult = await query<{ id: string }>(
    `SELECT id FROM reports
     WHERE user_id = $1 AND status = 'analyzed'
     ORDER BY report_date DESC, created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (reportResult.rows.length === 0) {
    return [];
  }

  const reportId = reportResult.rows[0].id;

  // Get health concerns
  const concernsResult = await query<{
    id: string;
    title: string;
    severity: string;
    affected_biomarkers: string[];
    explanation: string;
    recommended_action: string;
    priority: number;
  }>(
    `SELECT id, title, severity, affected_biomarkers, explanation, recommended_action, priority
     FROM health_concerns
     WHERE report_id = $1
     ORDER BY priority ASC`,
    [reportId]
  );

  return concernsResult.rows.map((row) => ({
    id: row.id,
    title: row.title,
    severity: row.severity,
    affectedBiomarkers: row.affected_biomarkers,
    explanation: row.explanation,
    recommendedAction: row.recommended_action,
    priority: row.priority,
  }));
}

/**
 * Get recommendations grouped by type
 */
export async function getRecommendations(userId: string) {
  // Get latest analyzed report
  const reportResult = await query<{ id: string }>(
    `SELECT id FROM reports
     WHERE user_id = $1 AND status = 'analyzed'
     ORDER BY report_date DESC, created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (reportResult.rows.length === 0) {
    return {
      diet: [],
      supplement: [],
      lifestyle: [],
      retest: [],
    };
  }

  const reportId = reportResult.rows[0].id;

  // Get recommendations grouped by type
  const recsResult = await query<{
    type: string;
    id: string;
    title: string;
    description: string;
    priority: number;
  }>(
    `SELECT type, id, title, description, priority
     FROM recommendations
     WHERE report_id = $1
     ORDER BY type ASC, priority ASC`,
    [reportId]
  );

  const grouped: { [key: string]: any[] } = {
    diet: [],
    supplement: [],
    lifestyle: [],
    retest: [],
  };

  for (const row of recsResult.rows) {
    if (grouped[row.type]) {
      grouped[row.type].push({
        id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority,
      });
    }
  }

  return grouped;
}

/**
 * Get biomarker trend across all reports
 */
export async function getBiomarkerTrend(
  userId: string,
  biomarkerName: string
): Promise<
  Array<{
    date: string;
    value: number;
    status: string;
    reportId: string;
  }>
> {
  // Get reference ranges for the biomarker (use latest)
  const refResult = await query<{
    optimal_range_low: number | null;
    optimal_range_high: number | null;
  }>(
    `SELECT optimal_range_low, optimal_range_high
     FROM biomarker_reference_ranges
     WHERE name = $1
     LIMIT 1`,
    [biomarkerName]
  );

  // Get biomarker values across all reports for this user
  const trendResult = await query<{
    report_id: string;
    report_date: string;
    value: number;
    status: string;
  }>(
    `SELECT b.report_id, r.report_date, b.value, b.status
     FROM biomarkers b
     JOIN reports r ON b.report_id = r.id
     WHERE r.user_id = $1 AND b.name = $2 AND r.status = 'analyzed'
     ORDER BY r.report_date ASC`,
    [userId, biomarkerName]
  );

  return trendResult.rows.map((row) => ({
    date: row.report_date,
    value: row.value,
    status: row.status,
    reportId: row.report_id,
  }));
}

/**
 * Get all available biomarker names for a user
 */
export async function getAvailableBiomarkers(userId: string): Promise<Array<{ name: string; displayName: string }>> {
  const result = await query<{
    name: string;
    display_name: string;
  }>(
    `SELECT DISTINCT b.name, MAX(b.display_name) as display_name
     FROM biomarkers b
     JOIN reports r ON b.report_id = r.id
     WHERE r.user_id = $1 AND r.status = 'analyzed'
     GROUP BY b.name
     ORDER BY b.name ASC`,
    [userId]
  );

  return result.rows.map((row) => ({
    name: row.name,
    displayName: row.display_name || row.name,
  }));
}

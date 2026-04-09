import { v4 as uuid } from 'uuid';
import { query } from '../../config/database';
import { uploadFile } from '../../config/s3';
import redis from '../../config/redis';
import { Queue } from 'bullmq';
import { CorrectBiomarkerInput } from './reports.schemas';

// Initialize BullMQ queue
const reportQueue = new Queue('report-processing', {
  connection: redis,
});

const PDF_MAGIC_BYTES = Buffer.from('%PDF');

interface ReportRecord {
  id: string;
  user_id: string;
  pdf_s3_key: string;
  status: string;
  created_at: string;
  report_date?: string;
}

interface ListReportsResult {
  reports: ReportRecord[];
  total: number;
  page: number;
  limit: number;
}

interface Biomarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: string;
  reference_range_min?: number;
  reference_range_max?: number;
  status: string;
  manually_corrected: boolean;
}

interface GroupedBiomarkers {
  [category: string]: Biomarker[];
}

export async function uploadReport(
  userId: string,
  file: Express.Multer.File
): Promise<ReportRecord> {
  // Validate file is PDF (mimetype AND magic bytes)
  if (file.mimetype !== 'application/pdf') {
    throw new Error('Invalid file type. Only PDF files are allowed.');
  }

  // Check PDF magic bytes
  if (
    !file.buffer ||
    file.buffer.length < 4 ||
    !file.buffer.subarray(0, 4).equals(PDF_MAGIC_BYTES)
  ) {
    throw new Error('Invalid PDF file. File does not start with PDF magic bytes.');
  }

  // Generate S3 key
  const reportId = uuid();
  const s3Key = `reports/${userId}/${reportId}.pdf`;

  // Upload file to S3
  await uploadFile(file.buffer, s3Key, 'application/pdf');

  // Insert report record
  const insertQuery = `
    INSERT INTO reports (id, user_id, pdf_s3_key, status, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id, user_id, pdf_s3_key, status, created_at;
  `;

  const result = await query<ReportRecord>(insertQuery, [
    reportId,
    userId,
    s3Key,
    'processing',
  ]);

  const report = result.rows[0];

  // Add job to BullMQ queue
  await reportQueue.add('process-report', {
    reportId: report.id,
    userId,
    s3Key,
  });

  return report;
}

export async function listReports(
  userId: string,
  page: number,
  limit: number,
  sort: string
): Promise<ListReportsResult> {
  const offset = (page - 1) * limit;
  const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM reports
    WHERE user_id = $1 AND deleted_at IS NULL;
  `;

  const countResult = await query<{ total: string }>(countQuery, [userId]);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated reports
  const selectQuery = `
    SELECT
      r.id,
      r.user_id,
      r.pdf_s3_key,
      r.status,
      r.created_at,
      r.report_date,
      COUNT(b.id) as biomarker_count
    FROM reports r
    LEFT JOIN biomarkers b ON r.id = b.report_id AND b.deleted_at IS NULL
    WHERE r.user_id = $1 AND r.deleted_at IS NULL
    GROUP BY r.id
    ORDER BY r.report_date ${sortOrder}
    LIMIT $2 OFFSET $3;
  `;

  const result = await query<ReportRecord>(selectQuery, [userId, limit, offset]);

  return {
    reports: result.rows,
    total,
    page,
    limit,
  };
}

export async function getReportById(userId: string, reportId: string): Promise<any> {
  const query_str = `
    SELECT
      r.id,
      r.user_id,
      r.pdf_s3_key,
      r.status,
      r.created_at,
      r.report_date,
      COALESCE(
        json_agg(
          json_build_object(
            'id', b.id,
            'name', b.name,
            'value', b.value,
            'unit', b.unit,
            'category', b.category,
            'reference_range_min', b.reference_range_min,
            'reference_range_max', b.reference_range_max,
            'status', b.status,
            'manually_corrected', b.manually_corrected
          )
        ) FILTER (WHERE b.id IS NOT NULL),
        '[]'::json
      ) as biomarkers
    FROM reports r
    LEFT JOIN biomarkers b ON r.id = b.report_id AND b.deleted_at IS NULL
    WHERE r.id = $1 AND r.user_id = $2 AND r.deleted_at IS NULL
    GROUP BY r.id, r.user_id, r.pdf_s3_key, r.status, r.created_at, r.report_date;
  `;

  const result = await query<any>(query_str, [reportId, userId]);

  if (result.rows.length === 0) {
    throw new Error('Report not found');
  }

  return result.rows[0];
}

export async function getBiomarkers(
  userId: string,
  reportId: string
): Promise<GroupedBiomarkers> {
  // Verify report belongs to user
  const verifyQuery = `
    SELECT id FROM reports
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
  `;

  const verifyResult = await query(verifyQuery, [reportId, userId]);

  if (verifyResult.rows.length === 0) {
    throw new Error('Report not found');
  }

  // Get all biomarkers
  const selectQuery = `
    SELECT
      id,
      name,
      value,
      unit,
      category,
      reference_range_min,
      reference_range_max,
      status,
      manually_corrected
    FROM biomarkers
    WHERE report_id = $1 AND deleted_at IS NULL
    ORDER BY category ASC, name ASC;
  `;

  const result = await query<Biomarker>(selectQuery, [reportId]);

  // Group by category
  const grouped: GroupedBiomarkers = {};

  for (const biomarker of result.rows) {
    if (!grouped[biomarker.category]) {
      grouped[biomarker.category] = [];
    }
    grouped[biomarker.category].push(biomarker);
  }

  return grouped;
}

export async function correctBiomarker(
  userId: string,
  reportId: string,
  biomarkerId: string,
  input: CorrectBiomarkerInput
): Promise<Biomarker> {
  // Verify report belongs to user
  const verifyQuery = `
    SELECT id FROM reports
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
  `;

  const verifyResult = await query(verifyQuery, [reportId, userId]);

  if (verifyResult.rows.length === 0) {
    throw new Error('Report not found');
  }

  // Get biomarker to check reference ranges
  const getBiomarkerQuery = `
    SELECT
      id,
      reference_range_min,
      reference_range_max,
      unit
    FROM biomarkers
    WHERE id = $1 AND report_id = $2 AND deleted_at IS NULL;
  `;

  const biomarkerResult = await query<any>(getBiomarkerQuery, [
    biomarkerId,
    reportId,
  ]);

  if (biomarkerResult.rows.length === 0) {
    throw new Error('Biomarker not found');
  }

  const biomarker = biomarkerResult.rows[0];

  // Determine status based on reference ranges
  let status = 'normal';
  if (
    biomarker.reference_range_min !== null &&
    input.value < biomarker.reference_range_min
  ) {
    status = 'low';
  } else if (
    biomarker.reference_range_max !== null &&
    input.value > biomarker.reference_range_max
  ) {
    status = 'high';
  }

  // Update biomarker
  const updateQuery = `
    UPDATE biomarkers
    SET
      value = $1,
      unit = COALESCE($2, unit),
      status = $3,
      manually_corrected = true,
      updated_at = NOW()
    WHERE id = $4 AND report_id = $5
    RETURNING
      id,
      name,
      value,
      unit,
      category,
      reference_range_min,
      reference_range_max,
      status,
      manually_corrected;
  `;

  const result = await query<Biomarker>(updateQuery, [
    input.value,
    input.unit || null,
    status,
    biomarkerId,
    reportId,
  ]);

  return result.rows[0];
}

export async function deleteReport(userId: string, reportId: string): Promise<void> {
  // Verify report belongs to user
  const verifyQuery = `
    SELECT id FROM reports
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL;
  `;

  const verifyResult = await query(verifyQuery, [reportId, userId]);

  if (verifyResult.rows.length === 0) {
    throw new Error('Report not found');
  }

  // Soft delete
  const deleteQuery = `
    UPDATE reports
    SET deleted_at = NOW()
    WHERE id = $1 AND user_id = $2;
  `;

  await query(deleteQuery, [reportId, userId]);
}

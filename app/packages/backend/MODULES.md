# Long Health Backend Modules

This document describes the Analysis and Dashboard modules for the Long Health backend.

## Overview

The Long Health backend consists of several modules:

1. **Analysis Module** - AI-powered health report analysis using Claude API
2. **Dashboard Module** - User-facing API for health insights and trends
3. **Job Processing** - Background job queue for async report processing

## Analysis Module

Location: `src/modules/analysis/`

### Purpose

Extracts biomarkers from lab reports, analyzes them against reference ranges, and generates AI-powered health insights.

### Files

#### `analysis.schemas.ts`

Zod validation schemas for all data structures:

- **ExtractedBiomarker** - Raw biomarker data extracted from OCR text
- **AnalyzedBiomarker** - Biomarker with status and optimal/lab ranges
- **OrganSystemScore** - Health score (0-100) for each organ system
- **HealthConcern** - Health issue with severity and affected biomarkers
- **Recommendation** - Actionable health recommendation (diet/supplement/lifestyle/retest)
- **AnalysisResponse** - Complete analysis output
- **UserProfile** - User context for analysis

#### `analysis.prompts.ts`

Claude API prompt templates:

- **buildExtractionPrompt()** - Instructs Claude to extract biomarkers from lab report text
  - Returns structured JSON with name, value, unit, ranges
  - Handles Indian lab formats (Thyrocare, SRL, Dr Lal PathLabs, Metropolis)

- **buildAnalysisPrompt()** - Instructs Claude to generate health analysis
  - Produces organ system scores, health concerns, and India-specific recommendations
  - Uses functional/optimal ranges vs. lab ranges
  - Emphasizes preventive wellness

#### `analysis.service.ts`

Core analysis engine with the following functions:

- **extractBiomarkers(ocrText)** 
  - Calls Claude API to extract biomarkers from OCR text
  - Returns array of ExtractedBiomarker
  - Uses claude-sonnet-4-20250514 model

- **analyzeBiomarkers(biomarkers, userProfile)**
  - Looks up reference ranges from database
  - Determines biomarker status: optimal, borderline, low, high, critical
  - Status logic:
    - Within optimal range → 'optimal'
    - Within lab range but outside optimal → 'borderline'
    - Outside lab range by <20% → 'low' or 'high'
    - Outside lab range by >20% → 'critical'
  - Returns array of AnalyzedBiomarker with status and ranges

- **generateHealthAnalysis(analyzedBiomarkers, userProfile)**
  - Calls Claude API with all biomarker data
  - Generates structured analysis including:
    - Organ system scores (0-100 per system)
    - Health concerns (max 5, ranked by severity)
    - Recommendations (India-specific: dal, sabzi, yoga, local supplements)
    - Overall summary with medical disclaimer
  - Uses claude-sonnet-4-20250514 model

- **processReport(reportId)** ⭐ Main entry point
  - End-to-end report processing in a transaction
  - Steps:
    1. Fetch report and user profile
    2. Extract biomarkers from OCR text
    3. Analyze biomarkers against reference ranges
    4. Generate health analysis via Claude
    5. Store all results in database
    6. Update report status to 'analyzed' or 'error'
  - Transaction ensures atomicity

### Usage Example

```typescript
import { processReport } from './modules/analysis';

// Queue the report for processing
const jobId = await enqueueReportProcessing(reportId, userId, s3Key);

// The job worker will:
// 1. Extract biomarkers from the OCR text
// 2. Analyze them against reference ranges
// 3. Generate health analysis
// 4. Store results in database
```

## Dashboard Module

Location: `src/modules/dashboard/`

### Purpose

Provides user-facing API endpoints for viewing health analysis results, trends, and recommendations.

### Files

#### `dashboard.routes.ts`

Express Router with authenticated endpoints:

- `GET /` - Get dashboard summary
- `GET /concerns` - Get health concerns
- `GET /recommendations` - Get recommendations
- `GET /biomarkers` - Get available biomarkers
- `GET /trends/:biomarkerName` - Get trend data for charting

All routes require authentication middleware.

#### `dashboard.service.ts`

Business logic for dashboard queries:

- **getSummary(userId)**
  - Returns latest analyzed report with:
    - Report metadata (date, lab name, status)
    - Organ system scores
    - Biomarker summary counts (optimal, borderline, out-of-range)
    - Overall summary text

- **getConcerns(userId)**
  - Returns health concerns from latest report
  - Sorted by severity (critical → low)

- **getRecommendations(userId)**
  - Returns recommendations grouped by type:
    - diet, supplement, lifestyle, retest
  - Sorted by priority within each type

- **getBiomarkerTrend(userId, biomarkerName)**
  - Returns historical values across all user's reports
  - Format: [{ date, value, status, reportId }]
  - Suitable for trend charting (Chart.js)

- **getAvailableBiomarkers(userId)**
  - Returns list of all biomarkers the user has had tested
  - Used to populate dropdown for trend selection

#### `dashboard.controller.ts`

HTTP request handlers:

- Validates user authentication
- Calls service functions
- Formats and returns API responses

### Usage Example

```typescript
// User requests dashboard summary
GET /api/v1/dashboard/
Authorization: Bearer <token>

// Response:
{
  "success": true,
  "data": {
    "hasReports": true,
    "latestReport": {
      "id": "uuid",
      "date": "2026-04-08",
      "labName": "Thyrocare",
      "status": "analyzed",
      "createdAt": "2026-04-08T..."
    },
    "organSystemScores": [
      { "system": "blood", "score": 85, "summary": "Good..." },
      ...
    ],
    "biomarkerSummary": {
      "total": 24,
      "optimal": 18,
      "borderline": 4,
      "outOfRange": 2
    },
    "overallSummary": "Your report shows good overall health..."
  }
}

// Get trend for a biomarker
GET /api/v1/dashboard/trends/Hemoglobin
Authorization: Bearer <token>

// Response:
{
  "success": true,
  "data": {
    "biomarkerName": "Hemoglobin",
    "trend": [
      { "date": "2025-01-15", "value": 13.8, "status": "optimal", "reportId": "uuid1" },
      { "date": "2026-01-20", "value": 14.2, "status": "optimal", "reportId": "uuid2" },
      { "date": "2026-04-08", "value": 14.5, "status": "optimal", "reportId": "uuid3" }
    ]
  }
}
```

## Job Processing

Location: `src/jobs/reportProcessor.ts`

### Overview

Uses BullMQ for asynchronous report processing with rate limiting and retry logic.

### Features

- **Concurrency: 1** - Process one report at a time
- **Rate Limiter: 5 jobs/minute** - Controls Claude API costs
- **Automatic Retries: 3 attempts** - With exponential backoff
- **Job Cleanup**: Completed jobs after 1 hour, failed jobs kept 24 hours
- **Job Priority: 10** - Higher priority for faster processing

### Functions

- **enqueueReportProcessing(reportId, userId, s3Key)**
  - Adds a report to the processing queue
  - Returns job ID for status tracking

- **getJobStatus(jobId)**
  - Returns job state, progress, and any errors

- **closeWorker()**
  - Gracefully shutdown worker and queue (call on app shutdown)

### Usage Example

```typescript
import { enqueueReportProcessing, reportProcessor } from './jobs/reportProcessor';

// When a report is uploaded:
const jobId = await enqueueReportProcessing(reportId, userId, s3Key);

// Track job status:
const status = await getJobStatus(jobId);
console.log(status.state); // 'waiting', 'active', 'completed', 'failed'

// On app shutdown:
await closeWorker();
```

## Database Schema

Key tables used by these modules:

### reports
- id, user_id, lab_name, report_date
- ocr_raw_text (extracted text from PDF)
- status: uploading → processing → analyzed → error
- analysis_summary: JSON with full analysis output

### biomarkers
- report_id, name, value, unit
- lab_range_low/high, optimal_range_low/high
- status: optimal, borderline, low, high, critical
- category: liver, kidney, thyroid, metabolic, blood, heart, nutrients

### biomarker_reference_ranges
- name (e.g., "Hemoglobin")
- unit, category, lab ranges, optimal ranges
- Gender-specific: male_optimal_low/high, female_optimal_low/high
- Age range: age_min, age_max

### organ_system_scores
- report_id, system, score (0-100), summary

### health_concerns
- report_id, title, severity, affected_biomarkers[]
- explanation, recommended_action, priority

### recommendations
- report_id, type (diet/supplement/lifestyle/retest)
- title, description, priority

## Integration with Express App

To integrate these modules into the main Express app:

```typescript
// src/app.ts
import dashboardRouter from './modules/dashboard/dashboard.routes';
import { reportProcessor } from './jobs/reportProcessor';

// Mount dashboard routes
app.use('/api/v1/dashboard', dashboardRouter);

// Start the job processor worker
console.log('Report processor worker started');

// On graceful shutdown:
process.on('SIGTERM', async () => {
  await closeWorker();
  process.exit(0);
});
```

## Configuration

Required environment variables:

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=...
```

## Error Handling

All modules use the AppError class for consistent error handling:

```typescript
throw new AppError('User not found', 404);
```

Errors are automatically caught and formatted as JSON responses by the global error handler.

## Performance Considerations

1. **Rate Limiting**: Job queue limits to 5 reports/minute to control Claude API costs
2. **Transactions**: `processReport()` uses database transactions for atomicity
3. **Indexing**: Biomarkers indexed by report_id and name for fast lookups
4. **Caching**: Dashboard queries are fast (single report, no joins needed)

## Testing

The modules can be tested by:

1. Uploading a lab report (triggers job queue)
2. Checking job status via BullMQ admin (optional UI)
3. Querying dashboard endpoints once analysis completes
4. Verifying database records were created

## Future Enhancements

1. Add PDF extraction from S3 in `processReport()` when OCR text is empty
2. Add webhook support to notify users when analysis completes
3. Add caching layer for dashboard queries
4. Add analytics tracking for which recommendations users follow
5. Add multi-language support for recommendations

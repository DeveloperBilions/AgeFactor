# Integration Guide: Analysis & Dashboard Modules

This guide shows how to integrate the Analysis and Dashboard modules into the main Express application.

## 1. Mount Routes in app.ts

Update `src/app.ts` to include the dashboard routes:

```typescript
import express, { Express } from 'express';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import { reportProcessor } from './jobs/reportProcessor';

const app: Express = express();

// ... existing middleware setup ...

// Mount dashboard routes (requires authentication)
app.use('/api/v1/dashboard', dashboardRouter);

// ... existing routes ...

// Start the job processor worker
console.log('[App] Report processor worker started');

export default app;
```

## 2. Initialize Job Processor on Startup

Update `src/index.ts` to start the job processor:

```typescript
import app from './app';
import { testConnection as testDatabase } from './config/database';
import { testConnection as testRedis } from './config/redis';
import { reportProcessor } from './jobs/reportProcessor';
import { env } from './config/env';

const PORT = env.PORT;

async function main() {
  try {
    // Test database connection
    const dbConnected = await testDatabase();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Test Redis connection
    const redisConnected = await testRedis();
    if (!redisConnected) {
      throw new Error('Redis connection failed');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        // Close job processor
        await reportProcessor.close();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
```

## 3. Trigger Report Processing on Upload

When a report is uploaded, enqueue it for processing. Update your reports controller:

```typescript
import { enqueueReportProcessing } from '../jobs/reportProcessor';

export async function uploadReport(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    const reportId = /* generate UUID */;
    const s3Key = /* get S3 key from upload */;

    // Update report status to 'uploading'
    await query(
      'UPDATE reports SET status = $1, updated_at = NOW() WHERE id = $2',
      ['uploading', reportId]
    );

    // Enqueue for analysis
    const jobId = await enqueueReportProcessing(reportId, userId, s3Key);

    success(res, {
      reportId,
      jobId,
      status: 'uploading',
      message: 'Report queued for analysis'
    }, 202);
  } catch (error) {
    // Handle error
  }
}
```

## 4. Provide Job Status Endpoint (Optional)

Add an endpoint to check job processing status:

```typescript
import { getJobStatus } from '../jobs/reportProcessor';

export async function getReportStatus(req: AuthRequest, res: Response) {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(jobId);

    if (!status) {
      return error(res, 'Job not found', 404);
    }

    success(res, status);
  } catch (err) {
    error(res, 'Failed to fetch job status', 500);
  }
}
```

## 5. Dashboard Endpoints

The dashboard module provides these authenticated endpoints:

### Get Summary
```bash
GET /api/v1/dashboard
Authorization: Bearer <token>
```

Returns latest report analysis, organ system scores, and biomarker summary.

### Get Health Concerns
```bash
GET /api/v1/dashboard/concerns
Authorization: Bearer <token>
```

Returns health concerns ranked by severity.

### Get Recommendations
```bash
GET /api/v1/dashboard/recommendations
Authorization: Bearer <token>
```

Returns recommendations grouped by type (diet, supplement, lifestyle, retest).

### Get Available Biomarkers
```bash
GET /api/v1/dashboard/biomarkers
Authorization: Bearer <token>
```

Returns list of all biomarkers tested for this user.

### Get Biomarker Trend
```bash
GET /api/v1/dashboard/trends/:biomarkerName
Authorization: Bearer <token>
```

Returns historical values for charting trends.

## 6. Frontend Integration Example

Using Chart.js to display biomarker trends:

```javascript
// Fetch biomarker trend
const response = await fetch('/api/v1/dashboard/trends/Hemoglobin', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
const { trend } = data;

// Create Chart.js chart
const ctx = document.getElementById('trendChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: trend.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [{
      label: 'Hemoglobin (g/dL)',
      data: trend.map(t => t.value),
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Hemoglobin Trend Over Time'
      }
    }
  }
});
```

## 7. Environment Setup

Create a `.env` file with required variables:

```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/long_health
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-secret-key-min-32-characters-long
ANTHROPIC_API_KEY=sk-ant-...
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=long-health-reports
```

## 8. Database Migration

The database schema is already defined in `src/db/migrations/001_initial-schema.ts`.

Run migrations:
```bash
npm run migrate:up
```

Seed biomarker references:
```bash
npm run seed
```

## 9. Error Handling

The modules use consistent error handling with AppError:

```typescript
// Automatic error responses
throw new AppError('User not found', 404);
// Returns:
{
  "success": false,
  "error": {
    "code": "ERROR_404",
    "message": "User not found"
  }
}
```

## 10. Monitoring & Debugging

### View Job Queue Status

To monitor the job queue, you can use the BullMQ admin UI or query programmatically:

```typescript
import { reportProcessingQueue } from './jobs/reportProcessor';

// Get queue stats
const counts = await reportProcessingQueue.getJobCounts();
console.log('Job counts:', counts);
// { waiting: 0, active: 1, completed: 100, failed: 2, delayed: 0, paused: 0 }

// Get active jobs
const active = await reportProcessingQueue.getActiveJobs();
console.log('Active jobs:', active);

// Get failed jobs
const failed = await reportProcessingQueue.getFailedJobs(0, 10);
console.log('Failed jobs:', failed);
```

### Check Redis Connection

```bash
redis-cli ping
# PONG
```

### Check Database Connection

```bash
psql $DATABASE_URL -c "SELECT NOW();"
```

## 11. Performance Tuning

- **Concurrency**: Currently set to 1 (process one report at a time)
  - Adjust in `reportProcessor.ts` line with `concurrency: 1`
  
- **Rate Limit**: Currently 5 jobs per minute to control Claude API costs
  - Adjust in `reportProcessor.ts` limiter configuration

- **Model**: Using `claude-sonnet-4-20250514`
  - Change in `analysis.service.ts` if needed

- **Max Tokens**: 
  - Extraction: 4096 tokens
  - Analysis: 8192 tokens
  - Adjust if needed for more detailed responses

## 12. Testing

### Test Report Processing Flow

```bash
# 1. Upload a report (POST /reports)
# 2. Check job status (GET /reports/:reportId/status)
# 3. Wait for analysis to complete
# 4. View dashboard (GET /dashboard)
# 5. Check specific concern (GET /dashboard/concerns)
# 6. View recommendation (GET /dashboard/recommendations)
# 7. View trend (GET /dashboard/trends/Hemoglobin)
```

### Manual Testing with curl

```bash
# Get dashboard summary
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/dashboard

# Get recommendations
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/dashboard/recommendations

# Get biomarker trend
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/dashboard/trends/Hemoglobin
```

## Next Steps

1. Mount routes in main app
2. Configure environment variables
3. Test with a sample lab report
4. Monitor job processing and API responses
5. Integrate frontend dashboard component
6. Add web hooks for analysis completion notifications

import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import * as analysisService from '../modules/analysis/analysis.service';

/**
 * Create a Redis connection for BullMQ
 * BullMQ requires a separate redis instance from the default one
 */
const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * BullMQ queue for report processing
 */
export const reportProcessingQueue = new Queue('report-processing', {
  connection: redisConnection,
});

/**
 * BullMQ worker for report processing
 * Processes one report at a time with a rate limit of 5 jobs per minute
 * to control Claude API costs
 */
export const reportProcessor = new Worker(
  'report-processing',
  async (job) => {
    const { reportId } = job.data;

    console.log(`[Report Processor] Starting processing for report ${reportId}`);

    try {
      // Call the analysis service to process the report
      await analysisService.processReport(reportId);

      console.log(`[Report Processor] Successfully processed report ${reportId}`);
      return { success: true, reportId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Report Processor] Failed to process report ${reportId}:`, errorMessage);
      throw error;
    }
  },
  {
    connection: redisConnection,
    // Process only one job at a time
    concurrency: 1,
    // Rate limiter: max 5 jobs per minute to control API costs
    limiter: {
      max: 5,
      duration: 60000, // 1 minute
    },
    // Automatically remove completed jobs after 1 hour
    removeOnComplete: {
      age: 3600,
    },
    // Keep failed jobs for 24 hours for debugging
    removeOnFail: {
      age: 86400,
    },
  }
);

/**
 * Event handlers for the worker
 */
reportProcessor.on('completed', (job) => {
  console.log(`[Report Processor] Completed job ${job.id} for report ${job.data.reportId}`);
});

reportProcessor.on('failed', (job, error) => {
  if (job) {
    console.error(`[Report Processor] Failed job ${job.id} for report ${job.data.reportId}:`, error.message);
  }
});

reportProcessor.on('error', (error) => {
  console.error('[Report Processor] Worker error:', error);
});

/**
 * Queue event handlers
 */
reportProcessingQueue.on('waiting', (job) => {
  console.log(`[Report Queue] Job ${job.id} is waiting`);
});

/**
 * Add a report to the processing queue
 */
export async function enqueueReportProcessing(
  reportId: string,
  userId: string,
  s3Key: string
): Promise<string> {
  const job = await reportProcessingQueue.add(
    'process-report',
    {
      reportId,
      userId,
      s3Key,
    },
    {
      // Set job priority - higher number = higher priority
      priority: 10,
      // Automatically retry failed jobs up to 3 times
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 second delay
      },
      // Remove job if it hasn't started after 30 minutes
      removeOnComplete: true,
    }
  );

  console.log(`[Report Queue] Enqueued report ${reportId} with job ID ${job.id}`);
  return job.id || '';
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await reportProcessingQueue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    returnvalue: job.returnvalue,
  };
}

/**
 * Clean up queue and worker on shutdown
 */
export async function closeWorker(): Promise<void> {
  await reportProcessor.close();
  await reportProcessingQueue.close();
  console.log('[Report Processor] Worker and queue closed');
}

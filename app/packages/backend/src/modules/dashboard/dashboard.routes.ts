import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as dashboardController from './dashboard.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET / - Get dashboard summary
 * Returns: latestReport, organSystemScores, biomarkerSummary, overallSummary
 */
router.get('/', dashboardController.getSummary);

/**
 * GET /concerns - Get health concerns from latest report
 * Returns: array of concerns with severity and priority
 */
router.get('/concerns', dashboardController.getConcerns);

/**
 * GET /recommendations - Get recommendations grouped by type
 * Returns: { diet: [], supplement: [], lifestyle: [], retest: [] }
 */
router.get('/recommendations', dashboardController.getRecommendations);

/**
 * GET /biomarkers - Get available biomarkers for this user
 * Returns: array of biomarkers with name and displayName
 */
router.get('/biomarkers', dashboardController.getAvailableBiomarkers);

/**
 * GET /trends/:biomarkerName - Get trend for a specific biomarker
 * Returns: array of { date, value, status, reportId } for trend charting
 */
router.get('/trends/:biomarkerName', dashboardController.getBiomarkerTrend);

export default router;

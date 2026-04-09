import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { success, error } from '../../utils/apiResponse';
import { AppError } from '../../middleware/errorHandler';
import * as dashboardService from './dashboard.service';

/**
 * GET /dashboard - Get dashboard summary
 */
export async function getSummary(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    const summary = await dashboardService.getSummary(userId);
    success(res, summary, 200);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError('Failed to fetch dashboard summary', 500);
    error(res, appError.message, appError.statusCode);
  }
}

/**
 * GET /dashboard/concerns - Get health concerns
 */
export async function getConcerns(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    const concerns = await dashboardService.getConcerns(userId);
    success(res, { concerns }, 200);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError('Failed to fetch health concerns', 500);
    error(res, appError.message, appError.statusCode);
  }
}

/**
 * GET /dashboard/recommendations - Get recommendations
 */
export async function getRecommendations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    const recommendations = await dashboardService.getRecommendations(userId);
    success(res, { recommendations }, 200);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError('Failed to fetch recommendations', 500);
    error(res, appError.message, appError.statusCode);
  }
}

/**
 * GET /dashboard/trends/:biomarkerName - Get biomarker trend
 */
export async function getBiomarkerTrend(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    const { biomarkerName } = req.params;
    if (!biomarkerName) {
      error(res, 'Biomarker name is required', 400, 'INVALID_REQUEST');
      return;
    }

    const trend = await dashboardService.getBiomarkerTrend(userId, decodeURIComponent(biomarkerName));
    success(res, { biomarkerName, trend }, 200);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError('Failed to fetch biomarker trend', 500);
    error(res, appError.message, appError.statusCode);
  }
}

/**
 * GET /dashboard/biomarkers - Get available biomarkers
 */
export async function getAvailableBiomarkers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      error(res, 'User not authenticated', 401, 'UNAUTHORIZED');
      return;
    }

    const biomarkers = await dashboardService.getAvailableBiomarkers(userId);
    success(res, { biomarkers }, 200);
  } catch (err) {
    const appError = err instanceof AppError ? err : new AppError('Failed to fetch available biomarkers', 500);
    error(res, appError.message, appError.statusCode);
  }
}

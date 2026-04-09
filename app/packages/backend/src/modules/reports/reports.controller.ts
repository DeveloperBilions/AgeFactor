import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import * as reportsService from './reports.service';
import { ListReportsInput, CorrectBiomarkerInput } from './reports.schemas';

export async function upload(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No file uploaded',
        },
      });
      return;
    }

    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const report = await reportsService.uploadReport(req.user.userId, req.file);

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: errorMessage,
      },
    });
  }
}

export async function list(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { page, limit, sort } = req.query as unknown as ListReportsInput;

    const result = await reportsService.listReports(
      req.user.userId,
      page || 1,
      limit || 10,
      sort || 'newest'
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({
      success: false,
      error: {
        code: 'LIST_FAILED',
        message: errorMessage,
      },
    });
  }
}

export async function getById(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { id } = req.params;

    const report = await reportsService.getReportById(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Report not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: errorMessage,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: errorMessage,
      },
    });
  }
}

export async function getBiomarkers(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { id } = req.params;

    const biomarkers = await reportsService.getBiomarkers(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: biomarkers,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Report not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: errorMessage,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'GET_BIOMARKERS_FAILED',
        message: errorMessage,
      },
    });
  }
}

export async function correctBiomarker(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { id, biomarkerId } = req.params;
    const input = req.body as CorrectBiomarkerInput;

    const updatedBiomarker = await reportsService.correctBiomarker(
      req.user.userId,
      id,
      biomarkerId,
      input
    );

    res.status(200).json({
      success: true,
      data: updatedBiomarker,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (
      errorMessage === 'Report not found' ||
      errorMessage === 'Biomarker not found'
    ) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: errorMessage,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'CORRECT_FAILED',
        message: errorMessage,
      },
    });
  }
}

export async function deleteReport(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user?.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const { id } = req.params;

    await reportsService.deleteReport(req.user.userId, id);

    res.status(200).json({
      success: true,
      data: {
        message: 'Report deleted successfully',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Report not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: errorMessage,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: errorMessage,
      },
    });
  }
}

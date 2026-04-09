import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as reportsController from './reports.controller';
import { listReportsSchema, correctBiomarkerSchema } from './reports.schemas';
import upload from './reports.upload';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /upload - Upload a PDF report
router.post('/upload', upload.single('report'), reportsController.upload);

// GET / - List all reports for the authenticated user
router.get(
  '/',
  validate(listReportsSchema, 'query'),
  reportsController.list
);

// GET /:id - Get a specific report by ID
router.get('/:id', reportsController.getById);

// GET /:id/biomarkers - Get all biomarkers for a report
router.get('/:id/biomarkers', reportsController.getBiomarkers);

// POST /:id/biomarkers/:biomarkerId/correct - Correct a biomarker value
router.post(
  '/:id/biomarkers/:biomarkerId/correct',
  validate(correctBiomarkerSchema, 'body'),
  reportsController.correctBiomarker
);

// DELETE /:id - Soft delete a report
router.delete('/:id', reportsController.deleteReport);

export default router;

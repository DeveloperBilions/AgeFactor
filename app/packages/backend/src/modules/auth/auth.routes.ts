import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import * as authController from './auth.controller';
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
  updateProfileSchema,
} from './auth.schemas';

const router = Router();

router.post(
  '/send-otp',
  (req, res, next) => validate(sendOtpSchema, 'body')(req, res, next),
  authController.sendOtp
);

router.post(
  '/verify-otp',
  (req, res, next) => validate(verifyOtpSchema, 'body')(req, res, next),
  authController.verifyOtp
);

router.post(
  '/refresh-token',
  (req, res, next) => validate(refreshTokenSchema, 'body')(req, res, next),
  authController.refreshToken
);

router.post('/logout', authenticate, authController.logout);

router.get('/me', authenticate, authController.getMe);

router.put(
  '/profile',
  authenticate,
  (req, res, next) => validate(updateProfileSchema, 'body')(req, res, next),
  authController.updateProfile
);

export default router;

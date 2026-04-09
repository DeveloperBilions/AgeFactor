import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { SendOtpInput, VerifyOtpInput, RefreshTokenInput, UpdateProfileInput } from './auth.schemas';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    phone: string;
    iat: number;
    exp: number;
  };
}

export async function sendOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone } = req.body as SendOtpInput;
    const result = await authService.sendOtp(phone);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { phone, otp } = req.body as VerifyOtpInput;
    const result = await authService.verifyOtp(phone, otp);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshTokenInput;
    const result = await authService.refreshAccessToken(refreshToken);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const refreshToken = (req.body as { refreshToken?: string }).refreshToken;
    await authService.logout(userId, refreshToken);

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const user = await authService.getMe(userId);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      });
      return;
    }

    const data = req.body as UpdateProfileInput;
    const user = await authService.updateProfile(userId, data);

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
}

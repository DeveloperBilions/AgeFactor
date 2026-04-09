import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDev = env.NODE_ENV === 'development';

  if (error instanceof AppError) {
    const { statusCode, message, isOperational } = error;

    if (isDev) {
      console.error(`[${new Date().toISOString()}] Error:`, {
        statusCode,
        message,
        stack: error.stack,
      });
    } else {
      console.error(`[${new Date().toISOString()}] Error: ${message} (${statusCode})`);
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: `ERROR_${statusCode}`,
        message,
        ...(isDev && { stack: error.stack }),
      },
    });
    return;
  }

  // Unknown error
  const statusCode = 500;
  const message = isDev ? error.message : 'Internal server error';

  if (isDev) {
    console.error(`[${new Date().toISOString()}] Unknown Error:`, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    console.error(`[${new Date().toISOString()}] Unknown Error: ${error.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message,
      ...(isDev && { stack: error.stack }),
    },
  });
}

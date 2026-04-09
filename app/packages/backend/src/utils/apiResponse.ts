import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function success<T>(
  res: Response,
  data: T,
  statusCode: number = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  } as ApiSuccessResponse<T>);
}

export function error(
  res: Response,
  message: string,
  statusCode: number = 400,
  code: string = 'ERROR'
): Response {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  } as ApiErrorResponse);
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  statusCode: number = 200
): Response {
  const pages = Math.ceil(total / limit);
  return res.status(statusCode).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  } as ApiPaginatedResponse<T>);
}

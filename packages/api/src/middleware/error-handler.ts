import type { ErrorRequestHandler } from 'express';
import type { ApiResponse } from '@vft/shared';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public field?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiResponse<null> = {
      data: null,
      error: {
        code: err.code,
        message: err.message,
        field: err.field,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  console.error('[api] Unhandled error:', err);

  const body: ApiResponse<null> = {
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  };
  res.status(500).json(body);
};

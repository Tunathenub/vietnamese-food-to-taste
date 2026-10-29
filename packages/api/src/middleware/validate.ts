import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error-handler.js';

type RequestField = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, field: RequestField = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[field]);
      (req as Record<string, unknown>)[field] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          firstIssue?.message ?? 'Invalid request data.',
          firstIssue?.path.join('.'),
          { issues: err.issues },
        );
      }
      next(err);
    }
  };
}

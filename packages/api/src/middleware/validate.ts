import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error-handler.js';

type RequestField = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, field: RequestField = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[field] ?? {};
      const parsed = schema.parse(dataToValidate);
      (req as unknown as Record<string, unknown>)[field] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstIssue = err.issues[0];
        let message = firstIssue?.message;
        if (!message || message === 'Required') {
          const fieldName = firstIssue?.path?.join('.') || 'thông tin';
          message = `Vui lòng nhập đầy đủ ${fieldName}`;
        }
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          message,
          firstIssue?.path?.join('.'),
          { issues: err.issues },
        );
      }
      next(err);
    }
  };
}

import type { Request, Response, NextFunction } from 'express';

export type AuthRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  role?: AuthRole;
}

/**
 * Requires a valid authenticated session (via HTTP-only cookie or Bearer JWT populated on req.user).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthenticatedUser | undefined;
  if (!user?.id) {
    res.status(401).json({
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to continue.',
      },
    });
    return;
  }
  next();
}

/**
 * Requires an authenticated user whose role is in the allowed list.
 */
export function requireRole(...allowedRoles: AuthRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user?.id) {
      res.status(401).json({
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to continue.',
        },
      });
      return;
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      res.status(403).json({
        data: null,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource.',
        },
      });
      return;
    }

    next();
  };
}

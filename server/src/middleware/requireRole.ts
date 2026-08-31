import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { Role } from '../types';

/**
 * Route-level role gate. Runs after `authenticate`.
 */
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));
    if (!allowed.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    next();
  };

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserModel } from '../models/User';
import { Role } from '../types';

// Augment Express's Request with the authenticated user.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

/**
 * Verifies the bearer token and confirms the user still exists — a valid token
 * for a since-deleted user must not authenticate.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }

    const payload = verifyToken(header.slice('Bearer '.length));

    const exists = await UserModel.exists({ _id: payload.sub });
    if (!exists) {
      throw new AppError(401, 'User no longer exists');
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    // jwt throws its own error types for malformed/expired tokens; all are 401.
    next(err instanceof AppError ? err : new AppError(401, 'Invalid or expired token'));
  }
}

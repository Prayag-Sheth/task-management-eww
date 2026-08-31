import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async handler so a rejected promise reaches errorHandler instead of
 * hanging the request. Lets controllers throw rather than try/catch.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

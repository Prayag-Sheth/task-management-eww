import { RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Validates req.body against a Zod schema, replacing it with the parsed result
 * so controllers receive typed, stripped input.
 */
export const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of err.errors) {
          const key = issue.path.join('.') || '_';
          (errors[key] ??= []).push(issue.message);
        }
        return next(new AppError(400, 'Validation failed', errors));
      }
      next(err);
    }
  };

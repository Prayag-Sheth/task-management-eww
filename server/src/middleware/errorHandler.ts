import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import { ApiError } from '../types';
import { env } from '../config/env';

export function notFound(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  };
  res.status(404).json(body);
}

/**
 * Single place that turns any thrown error into an ApiError response.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // Express identifies the error handler by arity — `next` must stay.
  _next: NextFunction
): void {
  let status = 500;
  let message = 'Internal server error';
  let errors: Record<string, string[]> | undefined;

  if (err instanceof AppError) {
    status = err.status;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof mongoose.Error.CastError) {
    // A malformed ObjectId in the URL is a client error, not a crash.
    status = 400;
    message = `Invalid ${err.path}: ${String(err.value)}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([key, val]) => [key, [val.message]])
    );
  } else if (isDuplicateKeyError(err)) {
    status = 409;
    message = 'A record with that value already exists';
  } else if (isBodyParseError(err)) {
    // Malformed JSON in the request body is a client error.
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) {
    console.error(err);
  }

  const body: ApiError = { success: false, message, ...(errors && { errors }) };

  if (status >= 500 && env.nodeEnv !== 'production' && err instanceof Error) {
    (body as ApiError & { stack?: string }).stack = err.stack;
  }

  res.status(status).json(body);
}

/** body-parser tags its own failures with `type: 'entity.parse.failed'`. */
function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    (err as { type?: string }).type === 'entity.parse.failed'
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: number }).code === 11000
  );
}

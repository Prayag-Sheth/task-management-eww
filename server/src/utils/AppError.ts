/**
 * Error carrying an HTTP status. Throw from anywhere; errorHandler formats it.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, AppError);
  }
}

/**
 * Typed application errors with an HTTP status, so route handlers and server
 * actions can map failures to responses consistently.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code: string = 'bad_request',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const validationError = (msg: string) => new AppError(msg, 422, 'validation_error');
export const authError = (msg = 'Invalid email or password') => new AppError(msg, 401, 'unauthorized');
export const forbiddenError = (msg = 'Not permitted') => new AppError(msg, 403, 'forbidden');
export const notFoundError = (msg = 'Not found') => new AppError(msg, 404, 'not_found');
export const conflictError = (msg: string) => new AppError(msg, 409, 'conflict');

export function toErrorPayload(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof AppError) {
    return { status: err.status, code: err.code, message: err.message };
  }
  return { status: 500, code: 'internal_error', message: 'Something went wrong' };
}

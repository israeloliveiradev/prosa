export class AppError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const SENSITIVE = /api[_-]?key|password_hash|secret=|stack|ECONN|postgres:\/\/|gsk_|sk-or-v1|AIza[A-Za-z0-9]|AQ\.[A-Za-z0-9]|Bearer /i;

export function publicErrorMessage(error: Error, statusCode: number): string {
  if (statusCode < 500) {
    return error.message;
  }
  if (error instanceof AppError && !SENSITIVE.test(error.message)) {
    return error.message;
  }
  return "Internal server error";
}

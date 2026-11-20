export class AppError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

const PUBLIC_5XX = new Set([
  "Mail is not configured",
  "Lesson generation is already in progress",
  "Lesson generation is paused",
  "Lesson generation is unavailable",
  "Unit test questions are not ready yet",
  "Checkpoint questions are not ready yet",
  "News adaptation failed",
  "Payments are not configured",
]);

export function publicErrorMessage(error: Error, statusCode: number): string {
  if (statusCode < 500) {
    return error.message;
  }
  if (error instanceof AppError && PUBLIC_5XX.has(error.message)) {
    return error.message;
  }
  return "Internal server error";
}

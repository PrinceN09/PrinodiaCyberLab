/**
 * Typed service errors. Services throw these; routes map them to
 * user-safe HTTP responses. Prisma errors are never leaked outward.
 */
export type ApplicationErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "TRANSITION";

const STATUS: Record<ApplicationErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  VALIDATION: 400,
  CONFLICT: 409,
  TRANSITION: 422,
};

export class ApplicationError extends Error {
  code: ApplicationErrorCode;
  status: number;
  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = STATUS[code];
  }
}

export const notFound = (m = "Application not found") =>
  new ApplicationError("NOT_FOUND", m);
export const forbidden = (m = "You don't have access to this resource") =>
  new ApplicationError("FORBIDDEN", m);
export const validation = (m: string) =>
  new ApplicationError("VALIDATION", m);
export const conflict = (m: string) => new ApplicationError("CONFLICT", m);
export const transitionError = (m: string) =>
  new ApplicationError("TRANSITION", m);

export function isApplicationError(e: unknown): e is ApplicationError {
  return e instanceof ApplicationError;
}

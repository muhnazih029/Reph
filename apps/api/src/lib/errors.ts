import type { ApiErrorCode } from "@reph/contracts";

// Typed domain errors rendered into the error envelope by app.onError
// (docs/specs/PRD-API.md §2, docs/specs/contracts.md §4).

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    status: number,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError("bad_request", 400, message, details);
  }

  static unauthorized(message = "Missing or invalid bearer token"): ApiError {
    return new ApiError("unauthorized", 401, message);
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError("not_found", 404, message);
  }

  static conflict(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError("conflict", 409, message, details);
  }
}

export function errorPayload(error: ApiError): {
  error: { code: ApiErrorCode; message: string; details?: Record<string, unknown> };
} {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

// Foreign keys on this DB are never silently rewritten (docs/data/db-schema.md §4):
// 23001 restrict_violation / 23503 foreign_key_violation.
export function isForeignKeyRefusal(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } } | null)?.cause;
  const code = (error as { code?: string } | undefined)?.code ?? cause?.code;
  return code === "23001" || code === "23503";
}

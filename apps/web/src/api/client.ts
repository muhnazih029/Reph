import { apiErrorSchema, type ApiErrorCode } from "@reph/contracts";
import type { ZodType } from "zod";
import { sessionToken } from "../stores/session";

// Typed fetch wrapper — docs/plans/phase-1-mvp.md (Core Interfaces) and
// docs/specs/PRD-FE.md §2. Responses are validated against the contracts
// schemas; failures throw the typed ApiError the screens render.

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
}

const BASE = "/api/v1";

export { clearSessionToken, sessionToken, setSessionToken } from "../stores/session";

/** True when the app can talk to the API without a login (dev token). */
export function hasDevToken(): boolean {
  return Boolean(import.meta.env.VITE_REPH_TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = sessionToken() ?? import.meta.env.VITE_REPH_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function toApiError(res: Response): Promise<ApiError> {
  const payload = apiErrorSchema.safeParse(await res.json().catch(() => null));
  if (payload.success) {
    return new ApiError(
      payload.data.error.code,
      res.status,
      payload.data.error.message,
      payload.data.error.details,
    );
  }
  return new ApiError("internal", res.status, `Request failed (${res.status})`);
}

// A request that never answers (a dev proxy pointing at a restarting
// server) must surface as an error, not as a spinner that never stops.
const REQUEST_TIMEOUT_MS = 15_000;

export async function apiGet<T>(path: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw await toApiError(res);
  return schema.parse(await res.json());
}

export async function apiSend<T>(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body: unknown,
  schema: ZodType<T>,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return schema.parse(await res.json());
}

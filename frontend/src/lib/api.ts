export const API_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

export function getApiBaseUrl(): string {
  return API_URL;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface RegisterRequest {
  email: string;
  password: string;
  gym_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  gym_name: string;
  is_active: boolean;
  created_at: string;
}

export interface PredictionRecord {
  id?: string;
  client_index: number;
  churn_probability: number;
  uncertainty_low: number | null;
  uncertainty_high: number | null;
  predicted_days_to_churn: number | null;
  raw_features: Record<string, unknown>;
}

export interface UploadAnalysisResponse {
  job_id: string;
  filename: string;
  rows: number;
  high_risk_count: number;
  avg_churn_probability: number;
  columns?: string[];
  status: string;
  top_10_risk: Array<Record<string, unknown>>;
}

export interface AnalysisSummaryItem {
  id: string;
  filename: string;
  status: string;
  rows_count: number;
  high_risk_count: number;
  avg_churn_probability: number;
  created_at: string;
}

export interface AnalysisDetailResponse extends AnalysisSummaryItem {
  predictions: PredictionRecord[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Could not connect to the backend server. Please try again shortly.");
    this.name = "ApiUnavailableError";
    this.cause = cause;
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

export function extractApiErrorMessage(
  payload: unknown,
  fallback = "An error occurred while communicating with the server.",
): string {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload.trim() || fallback;

  if (typeof payload === "object") {
    const { detail, error, message } = payload as Record<string, unknown>;
    if (typeof detail === "string" && detail.trim()) return detail.trim();
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as FastApiValidationItem | undefined;
      if (first?.msg) return first.msg;
    }
    if (typeof error === "string" && error.trim()) return error.trim();
    if (typeof message === "string" && message.trim()) return message.trim();
  }

  return fallback;
}

/** Normalizes FastAPI error payloads (`detail` string, 422 validation list, or `error` field). */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Non-JSON error response
  }

  const fieldErrors: Record<string, string> = {};
  if (body && typeof body === "object") {
    const { detail } = body as Record<string, unknown>;
    if (Array.isArray(detail)) {
      for (const item of detail as FastApiValidationItem[]) {
        const field = item.loc?.[item.loc.length - 1];
        if (typeof field === "string" && item.msg && !fieldErrors[field]) {
          fieldErrors[field] = item.msg;
        }
      }
    }
  }

  const message = extractApiErrorMessage(
    body,
    `Server returned an error (${response.status}).`,
  );

  return new ApiError(response.status, message, fieldErrors);
}

interface ApiFetchOptions extends RequestInit {
  token?: string;
  timeoutMs?: number;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { token, timeoutMs = 15_000, headers, body, ...init } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: requestHeaders,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ApiUnavailableError(error);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

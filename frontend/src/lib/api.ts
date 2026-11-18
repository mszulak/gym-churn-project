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

export type AnalysisJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "STARTED"
  | "SUCCESS"
  | "COMPLETED"
  | "FAILED"
  | "FAILURE"
  | (string & {});

export type SegmentId =
  | "behavioral_alarm"
  | "hot_window"
  | "zombie_zone"
  | "strong_base"
  | (string & {});

export interface SummaryKpis {
  total_active_members: number;
  total_revenue_at_risk_pln: number;
  actionable_revenue_at_risk_pln: number;
  avg_club_lambda_base: number;
  avg_club_tau_weeks: number;
  vacation_prob: number;
  model_roc_auc: number;
  model_brier_score: number;
}

export type ClubPhysicsEffectType = "anchor" | "friction" | (string & {});

export interface ClubPhysicsItem {
  feature: string;
  label: string;
  effect_type: ClubPhysicsEffectType;
  tau_multiplier: number;
  description: string;
}

export interface SegmentSummaryItem {
  segment_id: SegmentId;
  segment_name: string;
  client_amount: number;
  average_lambda: number;
  average_drop_ratio: number;
  average_churn_risk: number;
  revenue_at_risk: number;
  recommended_action: string;
}

export interface WeeklyHistoryPoint {
  t: number;
  visits: number;
}

export interface ActiveMemberPrediction {
  episode_id: number;
  member_id: number | string;
  segment_id: SegmentId;
  segment_name: string;
  is_fresh_drop: boolean;
  observed_weeks: number;
  weeks_to_contract_end: number;
  lambda_base_est: number;
  tau_est: number;
  gamma_est: number;
  lambda_today: number;
  drop_ratio_today: number;
  prob_churn_current: number;
  monthly_price: number;
  revenue_at_risk_pln: number;
  weekly_history: WeeklyHistoryPoint[];
}

export interface HierarchicalAnalysisPayload {
  summary_kpis: SummaryKpis;
  club_physics: ClubPhysicsItem[];
  segments_summary: SegmentSummaryItem[];
  active_members: ActiveMemberPrediction[];
}

export interface AnalysisSummaryItem {
  id: string;
  task_id?: string;
  job_id?: string;
  filename: string;
  status: AnalysisJobStatus;
  rows_count: number;
  high_risk_count: number;
  avg_churn_probability: number;
  created_at: string;
  summary_kpis?: Partial<SummaryKpis>;
}

/**
 * Response returned by `POST /api/upload` (202 Accepted),
 * preserving `id` / `task_id` / `job_id` and `status`.
 */
export interface UploadAnalysisResponse extends Partial<AnalysisSummaryItem> {
  id?: string;
  task_id?: string;
  job_id?: string;
  filename?: string;
  status?: AnalysisJobStatus;
  result?: HierarchicalAnalysisPayload | Record<string, unknown>;
  predictions?: HierarchicalAnalysisPayload | unknown;
  summary_kpis?: SummaryKpis;
  club_physics?: ClubPhysicsItem[];
  segments_summary?: SegmentSummaryItem[];
  active_members?: ActiveMemberPrediction[];
}

export interface AnalysisDetailResponse extends Partial<AnalysisSummaryItem> {
  id?: string;
  task_id?: string;
  job_id?: string;
  filename?: string;
  status: AnalysisJobStatus;
  result?: HierarchicalAnalysisPayload | Record<string, unknown>;
  results?: HierarchicalAnalysisPayload | Record<string, unknown>;
  data?: HierarchicalAnalysisPayload | Record<string, unknown>;
  predictions?: HierarchicalAnalysisPayload | unknown;
  summary_kpis?: SummaryKpis;
  club_physics?: ClubPhysicsItem[];
  segments_summary?: SegmentSummaryItem[];
  active_members?: ActiveMemberPrediction[];
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
  if (
    body !== undefined &&
    !(body instanceof FormData) &&
    !requestHeaders.has("Content-Type")
  ) {
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

import { SIGNOUT_PATH } from "@/lib/auth/constants";

/** Element listy z `GET /api/analyses`. */
export interface AnalysisJobSummary {
  id: string;
  filename: string;
  status: string;
  rows_count: number;
  high_risk_count: number;
  avg_churn_probability: number;
  created_at: string;
}

/** Pojedyncza predykcja klienta z `GET /api/analyses/{job_id}`. */
export interface ClientPredictionItem {
  id?: string;
  client_index: number;
  churn_probability: number;
  uncertainty_low: number | null;
  uncertainty_high: number | null;
  predicted_days_to_churn: number | null;
  raw_features: Record<string, unknown>;
}

/** Pełna odpowiedź z `GET /api/analyses/{job_id}`. */
export interface AnalysisJobDetailResponse extends AnalysisJobSummary {
  predictions: ClientPredictionItem[];
}

/** Odpowiedź z `POST /api/upload`. */
export interface UploadAnalysisResponse {
  job_id: string;
  filename: string;
  rows: number;
  high_risk_count: number;
  avg_churn_probability: number;
  columns?: string[];
  status: string;
  top_10_risk: Record<string, unknown>[];
}

/**
 * Ujednolicony model aktywnej analizy używany przez środkową sekcję widoku
 * (zarówno zaraz po wgraniu pliku z `POST /api/upload`, jak i po kliknięciu
 * pozycji w historii z `GET /api/analyses/{job_id}`).
 */
export interface ActiveAnalysis {
  id: string;
  filename: string;
  status: string;
  rowsCount: number;
  highRiskCount: number;
  avgChurnProbability: number;
  createdAt?: string;
  predictions: ClientPredictionItem[];
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sesja wygasła. Zaloguj się ponownie.");
    this.name = "SessionExpiredError";
  }
}

const DERIVED_KEYS = new Set([
  "id",
  "job_id",
  "client_index",
  "churn_probability",
  "uncertainty_low",
  "uncertainty_high",
  "predicted_days_to_churn",
  "raw_features",
]);

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

/**
 * Zamienia rekord z `top_10_risk` (lub `predictions`) na spójny `ClientPredictionItem`.
 */
export function normalizePrediction(
  record: Record<string, unknown>,
  fallbackIndex: number,
): ClientPredictionItem {
  const nestedRaw =
    record.raw_features && typeof record.raw_features === "object"
      ? (record.raw_features as Record<string, unknown>)
      : null;

  const rawFeatures: Record<string, unknown> = {};
  const source = nestedRaw ?? record;
  for (const [key, val] of Object.entries(source)) {
    if (!DERIVED_KEYS.has(key)) {
      rawFeatures[key] = val;
    }
  }

  return {
    id: typeof record.id === "string" ? record.id : undefined,
    client_index: toNumberOrNull(record.client_index) ?? fallbackIndex,
    churn_probability: toNumberOrNull(record.churn_probability) ?? 0,
    uncertainty_low: toNumberOrNull(record.uncertainty_low),
    uncertainty_high: toNumberOrNull(record.uncertainty_high),
    predicted_days_to_churn: toNumberOrNull(record.predicted_days_to_churn),
    raw_features: rawFeatures,
  };
}

/** Konwertuje odpowiedź `POST /api/upload` na `ActiveAnalysis`. */
export function normalizeUploadResponse(
  res: UploadAnalysisResponse,
  createdAtIso?: string,
): ActiveAnalysis {
  const rawList = Array.isArray(res.top_10_risk) ? res.top_10_risk.slice(0, 10) : [];
  return {
    id: res.job_id,
    filename: res.filename,
    status: res.status,
    rowsCount: res.rows,
    highRiskCount: res.high_risk_count ?? 0,
    avgChurnProbability: res.avg_churn_probability ?? 0,
    createdAt: createdAtIso,
    predictions: rawList.map((item, idx) => normalizePrediction(item, idx)),
  };
}

/** Konwertuje odpowiedź `GET /api/analyses/{job_id}` na `ActiveAnalysis`. */
export function normalizeDetailResponse(res: AnalysisJobDetailResponse): ActiveAnalysis {
  const rawList = Array.isArray(res.predictions) ? res.predictions.slice(0, 10) : [];
  return {
    id: res.id,
    filename: res.filename,
    status: res.status,
    rowsCount: res.rows_count,
    highRiskCount: res.high_risk_count,
    avgChurnProbability: res.avg_churn_probability,
    createdAt: res.created_at,
    predictions: rawList.map((item, idx) =>
      normalizePrediction(item as unknown as Record<string, unknown>, idx),
    ),
  };
}

function extractError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const { error, detail } = body as Record<string, unknown>;
  if (typeof error === "string") return error;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
  return null;
}

/**
 * Wysyła plik do analizy przez Route Handler `/api/upload` (ten sam origin).
 * Ciasteczko HttpOnly dołącza przeglądarka, a serwer Next.js zamienia je na
 * nagłówek `Authorization: Bearer` przed przekazaniem do FastAPI.
 */
export async function uploadForAnalysis(
  file: File,
  signal?: AbortSignal,
): Promise<UploadAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  let response: Response;
  try {
    response = await fetch("/api/upload", { method: "POST", body: formData, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
  }

  if (response.status === 401) throw new SessionExpiredError();

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // odpowiedź bez JSON
  }

  const message = extractError(body);
  if (!response.ok || message) {
    throw new Error(message ?? `Analiza nie powiodła się (błąd ${response.status}).`);
  }

  return body as UploadAnalysisResponse;
}

/** Pobiera listę wcześniejszych analiz (`GET /api/analyses`). */
export async function fetchAnalysesList(signal?: AbortSignal): Promise<AnalysisJobSummary[]> {
  let response: Response;
  try {
    response = await fetch("/api/analyses", {
      method: "GET",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Brak połączenia z serwerem. Nie udało się pobrać historii analiz.");
  }

  if (response.status === 401) throw new SessionExpiredError();

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // odpowiedź bez JSON
  }

  const message = extractError(body);
  if (!response.ok || message) {
    throw new Error(message ?? `Nie udało się pobrać historii analiz (błąd ${response.status}).`);
  }

  return Array.isArray(body) ? (body as AnalysisJobSummary[]) : [];
}

/** Pobiera szczegóły wybranej analizy (`GET /api/analyses/{job_id}`). */
export async function fetchAnalysisDetail(
  jobId: string,
  signal?: AbortSignal,
): Promise<AnalysisJobDetailResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/analyses/${encodeURIComponent(jobId)}`, {
      method: "GET",
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Brak połączenia z serwerem. Nie udało się pobrać szczegółów analizy.");
  }

  if (response.status === 401) throw new SessionExpiredError();

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // odpowiedź bez JSON
  }

  const message = extractError(body);
  if (!response.ok || message) {
    throw new Error(
      message ?? `Nie udało się pobrać szczegółów analizy (błąd ${response.status}).`,
    );
  }

  return body as AnalysisJobDetailResponse;
}

/** Pełne przeładowanie przez Route Handler czyszczący ciasteczko. */
export function redirectToSignout() {
  window.location.assign(SIGNOUT_PATH);
}

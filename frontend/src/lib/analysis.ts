import type {
  AnalysisDetailResponse,
  AnalysisJobStatus,
  PredictionRecord,
  UploadAnalysisResponse,
} from "./api";

export interface ActiveAnalysisView {
  id: string;
  filename: string;
  status: AnalysisJobStatus;
  rowsCount: number;
  highRiskCount: number;
  avgChurnProbability: number;
  createdAt?: string;
  top10: PredictionRecord[];
}

export function isAnalysisInProgress(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "PENDING" || normalized === "PROCESSING";
}

export function isAnalysisFailed(status: string | null | undefined): boolean {
  return (status ?? "").toUpperCase() === "FAILED";
}

export function isAnalysisCompleted(status: string | null | undefined): boolean {
  return (status ?? "").toUpperCase() === "COMPLETED";
}

const DERIVED_PREDICTION_KEYS = new Set([
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
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Normalizes a single prediction record from either `POST /api/upload` (`top_10_risk`)
 * or `GET /api/analyses/{job_id}` (`predictions`) into a consistent `PredictionRecord`.
 */
export function normalizePredictionRecord(
  raw: Record<string, unknown>,
  fallbackIndex: number,
): PredictionRecord {
  const clientIndex = toNumberOrNull(raw.client_index) ?? fallbackIndex;
  const churnProbability = toNumberOrNull(raw.churn_probability) ?? 0;
  const uncertaintyLow = toNumberOrNull(raw.uncertainty_low);
  const uncertaintyHigh = toNumberOrNull(raw.uncertainty_high);
  const predictedDaysToChurn = toNumberOrNull(raw.predicted_days_to_churn);

  let rawFeatures: Record<string, unknown> = {};

  if (
    raw.raw_features &&
    typeof raw.raw_features === "object" &&
    !Array.isArray(raw.raw_features)
  ) {
    rawFeatures = raw.raw_features as Record<string, unknown>;
  } else {
    for (const [key, value] of Object.entries(raw)) {
      if (!DERIVED_PREDICTION_KEYS.has(key)) {
        rawFeatures[key] = value;
      }
    }
  }

  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    client_index: clientIndex,
    churn_probability: churnProbability,
    uncertainty_low: uncertaintyLow,
    uncertainty_high: uncertaintyHigh,
    predicted_days_to_churn: predictedDaysToChurn,
    raw_features: rawFeatures,
  };
}

export function fromUploadResponse(
  response: UploadAnalysisResponse,
  fallbackCreatedAtIso?: string,
): ActiveAnalysisView {
  const top10Raw = Array.isArray(response.top_10_risk)
    ? response.top_10_risk.slice(0, 10)
    : [];

  return {
    id: response.id ?? response.job_id ?? "",
    filename: response.filename,
    status: response.status ?? "PENDING",
    rowsCount:
      toNumberOrNull(response.rows_count) ??
      toNumberOrNull(response.rows) ??
      0,
    highRiskCount: toNumberOrNull(response.high_risk_count) ?? 0,
    avgChurnProbability: toNumberOrNull(response.avg_churn_probability) ?? 0,
    createdAt: response.created_at || fallbackCreatedAtIso,
    top10: top10Raw.map((item, idx) => normalizePredictionRecord(item, idx)),
  };
}

export function fromAnalysisDetail(
  detail: AnalysisDetailResponse,
): ActiveAnalysisView {
  const predictionsRaw = Array.isArray(detail.predictions)
    ? detail.predictions.slice(0, 10)
    : [];

  return {
    id: detail.id,
    filename: detail.filename,
    status: detail.status,
    rowsCount: toNumberOrNull(detail.rows_count) ?? 0,
    highRiskCount: toNumberOrNull(detail.high_risk_count) ?? 0,
    avgChurnProbability: toNumberOrNull(detail.avg_churn_probability) ?? 0,
    createdAt: detail.created_at,
    top10: predictionsRaw.map((item, idx) =>
      normalizePredictionRecord(
        item as unknown as Record<string, unknown>,
        idx,
      ),
    ),
  };
}

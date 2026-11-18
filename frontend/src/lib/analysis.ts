import type {
  ActiveMemberPrediction,
  AnalysisDetailResponse,
  AnalysisJobStatus,
  AnalysisSummaryItem,
  ClubPhysicsItem,
  HierarchicalAnalysisPayload,
  SegmentId,
  SegmentSummaryItem,
  SummaryKpis,
  UploadAnalysisResponse,
  WeeklyHistoryPoint,
} from "./api";

export interface ActiveAnalysisView {
  id: string;
  filename: string;
  status: AnalysisJobStatus;
  rowsCount: number;
  highRiskCount: number;
  avgChurnProbability: number;
  createdAt?: string;
  payload: HierarchicalAnalysisPayload | null;
}

export function isAnalysisInProgress(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return (
    normalized === "PENDING" ||
    normalized === "PROCESSING" ||
    normalized === "STARTED" ||
    normalized === "RUNNING" ||
    normalized === "RETRY"
  );
}

export function isAnalysisFailed(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return (
    normalized === "FAILED" ||
    normalized === "FAILURE" ||
    normalized === "ERROR" ||
    normalized === "REVOKED"
  );
}

export function isAnalysisCompleted(status: string | null | undefined): boolean {
  const normalized = (status ?? "").toUpperCase();
  return normalized === "COMPLETED" || normalized === "SUCCESS";
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  return fallback;
}

const SEGMENT_DEFAULTS: Record<
  string,
  { name: string; action: string }
> = {
  behavioral_alarm: {
    name: "1. Behavioral Alarm (Fading Habit)",
    action:
      "Urgent trainer contact / group class invitation – habit is breaking down, but still recoverable.",
  },
  hot_window: {
    name: "2. Hot Window (Contract End <= 4 wks)",
    action:
      "Healthy habit, expiring contract – send a membership renewal offer.",
  },
  zombie_zone: {
    name: "3. Zombie Zone (Lost Habit > 75%)",
    action:
      "Member physically abandoned the gym while on an active contract. Reactivation campaign only for fresh drops.",
  },
  strong_base: {
    name: "4. Strong Base (Healthy Habit)",
    action:
      "Do not disturb – enroll in the refer-a-friend ambassador program.",
  },
};

const POLISH_TO_ENGLISH_STRINGS: Record<string, string> = {
  "1. Alarm Behawioralny (Gasnący nawyk)": "1. Behavioral Alarm (Fading Habit)",
  "2. Gorące Okienko (Koniec umowy <= 4 tyg.)": "2. Hot Window (Contract End <= 4 wks)",
  "3. Strefa Zombie (Utracony nawyk > 75%)": "3. Zombie Zone (Lost Habit > 75%)",
  "4. Żelazna Baza (Zdrowy nawyk)": "4. Strong Base (Healthy Habit)",
  "Pilny kontakt trenera / zaproszenie na zajęcia grupowe – nawyk jest w trakcie załamania, ale wciąż do uratowania.":
    "Urgent trainer contact / group class invitation – habit is breaking down, but still recoverable.",
  "Zdrowy nawyk, wygasa kontrakt – wyślij ofertę przedłużenia umowy.":
    "Healthy habit, expiring contract – send a membership renewal offer.",
  "Klient porzucił klub fizycznie przy trwającej umowie. Kampania reaktywacyjna tylko dla świeżych spadkowiczów.":
    "Member physically abandoned the gym while on an active contract. Reactivation campaign only for fresh drops.",
  "Nie przeszkadzać, włączyć do programu poleceń znajomych.":
    "Do not disturb – enroll in the refer-a-friend ambassador program.",
  "Zajęcia grupowe (Group Affinity)": "Group Classes (Group Affinity)",
  "Wydłuża czas utrzymania nawyku o ~54% i spowalnia tempo wygasania.":
    "Extends habit retention time by ~54% and slows down the decay rate.",
  "Zapis ze znajomym (Promo Friends)": "Joined with a Friend (Promo Friends)",
  "Opóźnia moment kryzysu motywacyjnego o ~41%.":
    "Delays the motivational crisis point by ~41%.",
  "Dystans od klubu (+1 odch. std.)": "Distance from Club (+1 SD)",
  "Skraca żywotność nawyku o ~29% i obniża bazową częstość treningów.":
    "Shortens habit lifespan by ~29% and lowers baseline workout frequency.",
};

const PHYSICS_DEFAULTS: Record<
  string,
  { label: string; description: (mult: number) => string }
> = {
  group_affinity: {
    label: "Group Classes (Group Affinity)",
    description: (mult) =>
      `Extends habit retention time by ~${Math.round(Math.abs(mult - 1) * 100)}% and slows down the decay rate.`,
  },
  promo_friends: {
    label: "Joined with a Friend (Promo Friends)",
    description: (mult) =>
      `Delays the motivational crisis point by ~${Math.round(Math.abs(mult - 1) * 100)}%.`,
  },
  partners_company: {
    label: "Corporate Partner (Partners Company)",
    description: (mult) =>
      mult >= 1
        ? `Extends habit stability by ~${Math.round(Math.abs(mult - 1) * 100)}%.`
        : `Reduces habit lifespan by ~${Math.round(Math.abs(1 - mult) * 100)}%.`,
  },
  distance_km: {
    label: "Distance from Club (+1 SD)",
    description: (mult) =>
      `Shortens habit lifespan by ~${Math.round(Math.abs(1 - mult) * 100)}% and lowers baseline workout frequency.`,
  },
};

function translateText(text: unknown, fallback: string): string {
  if (typeof text !== "string" || !text.trim()) {
    return fallback;
  }
  const trimmed = text.trim();
  if (POLISH_TO_ENGLISH_STRINGS[trimmed]) {
    return POLISH_TO_ENGLISH_STRINGS[trimmed];
  }
  return trimmed;
}

function inferSegmentId(rawId: unknown, rawName: unknown): SegmentId {
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }
  const nameLower = typeof rawName === "string" ? rawName.toLowerCase() : "";
  if (nameLower.includes("alarm") || nameLower.startsWith("1.")) {
    return "behavioral_alarm";
  }
  if (nameLower.includes("hot") || nameLower.includes("okienko") || nameLower.startsWith("2.")) {
    return "hot_window";
  }
  if (nameLower.includes("zombie") || nameLower.startsWith("3.")) {
    return "zombie_zone";
  }
  if (nameLower.includes("strong") || nameLower.includes("baza") || nameLower.startsWith("4.")) {
    return "strong_base";
  }
  return "behavioral_alarm";
}

function normalizeWeeklyHistory(raw: unknown): WeeklyHistoryPoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item, idx) => {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return {
          t: toNumber(obj.t ?? obj.week, idx + 1),
          visits: toNumber(obj.visits ?? obj.count ?? obj.y, 0),
        };
      }
      if (typeof item === "number") {
        return { t: idx + 1, visits: item };
      }
      return null;
    })
    .filter((pt): pt is WeeklyHistoryPoint => pt !== null)
    .sort((a, b) => a.t - b.t);
}

function normalizeActiveMember(
  raw: Record<string, unknown>,
  fallbackIndex: number,
): ActiveMemberPrediction {
  const segmentId = inferSegmentId(raw.segment_id, raw.segment_name ?? raw.segment);
  const segDefaults = SEGMENT_DEFAULTS[segmentId] ?? SEGMENT_DEFAULTS.behavioral_alarm;

  return {
    episode_id: toNumber(raw.episode_id, fallbackIndex + 1),
    member_id:
      typeof raw.member_id === "number" || typeof raw.member_id === "string"
        ? raw.member_id
        : fallbackIndex + 1,
    segment_id: segmentId,
    segment_name: translateText(raw.segment_name ?? raw.segment, segDefaults.name),
    is_fresh_drop: toBoolean(raw.is_fresh_drop, false),
    observed_weeks: toNumber(raw.observed_weeks, 1),
    weeks_to_contract_end: toNumber(raw.weeks_to_contract_end, 0),
    lambda_base_est: toNumber(raw.lambda_base_est, 0),
    tau_est: toNumber(raw.tau_est, 0),
    gamma_est: toNumber(raw.gamma_est, 0.35),
    lambda_today: toNumber(raw.lambda_today, 0),
    drop_ratio_today: toNumber(raw.drop_ratio_today, 0),
    prob_churn_current: toNumber(raw.prob_churn_current, 0),
    monthly_price: toNumber(raw.monthly_price ?? raw.avg_monthly_price, 0),
    revenue_at_risk_pln: toNumber(raw.revenue_at_risk_pln, 0),
    weekly_history: normalizeWeeklyHistory(raw.weekly_history),
  };
}

function normalizeSegmentSummary(
  raw: Record<string, unknown>,
): SegmentSummaryItem {
  const segmentId = inferSegmentId(raw.segment_id, raw.segment_name ?? raw.segment);
  const defaults = SEGMENT_DEFAULTS[segmentId] ?? {
    name: String(raw.segment_name ?? segmentId),
    action: "Review member segment and schedule targeted follow-up.",
  };

  // If Polish characters/words appear in segment_name or recommended_action, use English translation or defaults
  const rawName = translateText(raw.segment_name ?? raw.segment, defaults.name);
  const rawAction = translateText(raw.recommended_action, defaults.action);

  return {
    segment_id: segmentId,
    segment_name: rawName,
    client_amount: toNumber(raw.client_amount, 0),
    average_lambda: toNumber(raw.average_lambda, 0),
    average_drop_ratio: toNumber(raw.average_drop_ratio, 0),
    average_churn_risk: toNumber(raw.average_churn_risk, 0),
    revenue_at_risk: toNumber(raw.revenue_at_risk, 0),
    recommended_action: rawAction,
  };
}

function normalizeClubPhysicsItem(
  raw: Record<string, unknown>,
  idx: number,
): ClubPhysicsItem {
  const feature = typeof raw.feature === "string" && raw.feature.trim()
    ? raw.feature.trim()
    : `feature_${idx + 1}`;
  const tauMultiplier = toNumber(raw.tau_multiplier, 1);
  const effectType =
    typeof raw.effect_type === "string" && raw.effect_type.trim()
      ? raw.effect_type.trim().toLowerCase()
      : tauMultiplier >= 1
        ? "anchor"
        : "friction";

  const defaults = PHYSICS_DEFAULTS[feature];
  const defaultLabel = defaults?.label ?? feature;
  const defaultDesc = defaults
    ? defaults.description(tauMultiplier)
    : effectType === "anchor"
      ? `Extends habit retention time by x${tauMultiplier.toFixed(2)}.`
      : `Shortens habit retention time by x${tauMultiplier.toFixed(2)}.`;

  return {
    feature,
    label: translateText(raw.label, defaultLabel),
    effect_type: effectType,
    tau_multiplier: tauMultiplier,
    description: translateText(raw.description, defaultDesc),
  };
}

function extractRawPayloadCandidate(
  envelope: Record<string, unknown>,
): Record<string, unknown> | null {
  if (
    envelope.summary_kpis ||
    envelope.segments_summary ||
    envelope.active_members ||
    envelope.club_physics
  ) {
    return envelope;
  }

  const candidateKeys = [
    "result",
    "results",
    "predictions",
    "data",
    "payload",
    "analysis_result",
  ];

  for (const key of candidateKeys) {
    const val = envelope[key];
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const obj = parsed as Record<string, unknown>;
          if (
            obj.summary_kpis ||
            obj.segments_summary ||
            obj.active_members ||
            obj.club_physics
          ) {
            return obj;
          }
        }
      } catch {
        // Ignore non-JSON strings
      }
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      const obj = val as Record<string, unknown>;
      if (
        obj.summary_kpis ||
        obj.segments_summary ||
        obj.active_members ||
        obj.club_physics
      ) {
        return obj;
      }
    }
  }

  return null;
}

export function extractHierarchicalPayload(
  rawEnvelope: unknown,
): HierarchicalAnalysisPayload | null {
  if (!rawEnvelope || typeof rawEnvelope !== "object") {
    return null;
  }

  const candidate = extractRawPayloadCandidate(
    rawEnvelope as Record<string, unknown>,
  );
  if (!candidate) {
    return null;
  }

  const activeMembersRaw = Array.isArray(candidate.active_members)
    ? candidate.active_members
    : [];
  const activeMembers = activeMembersRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => normalizeActiveMember(item, idx));

  const segmentsSummaryRaw = Array.isArray(candidate.segments_summary)
    ? candidate.segments_summary
    : [];
  const segmentsSummary = segmentsSummaryRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => normalizeSegmentSummary(item));

  const clubPhysicsRaw = Array.isArray(candidate.club_physics)
    ? candidate.club_physics
    : [];
  const clubPhysics = clubPhysicsRaw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, idx) => normalizeClubPhysicsItem(item, idx));

  const kpisRaw =
    candidate.summary_kpis && typeof candidate.summary_kpis === "object"
      ? (candidate.summary_kpis as Record<string, unknown>)
      : {};

  const computedTotalRevenue = segmentsSummary.reduce(
    (sum, s) => sum + s.revenue_at_risk,
    0,
  );
  const computedActionableRevenue = segmentsSummary
    .filter(
      (s) => s.segment_id === "behavioral_alarm" || s.segment_id === "hot_window",
    )
    .reduce((sum, s) => sum + s.revenue_at_risk, 0);

  const summaryKpis: SummaryKpis = {
    total_active_members: toNumber(
      kpisRaw.total_active_members,
      activeMembers.length,
    ),
    total_revenue_at_risk_pln: toNumber(
      kpisRaw.total_revenue_at_risk_pln,
      computedTotalRevenue,
    ),
    actionable_revenue_at_risk_pln: toNumber(
      kpisRaw.actionable_revenue_at_risk_pln,
      computedActionableRevenue,
    ),
    avg_club_lambda_base: toNumber(kpisRaw.avg_club_lambda_base, 0),
    avg_club_tau_weeks: toNumber(kpisRaw.avg_club_tau_weeks, 0),
    vacation_prob: toNumber(kpisRaw.vacation_prob, 0),
    model_roc_auc: toNumber(kpisRaw.model_roc_auc, 0),
    model_brier_score: toNumber(kpisRaw.model_brier_score, 0),
  };

  return {
    summary_kpis: summaryKpis,
    club_physics: clubPhysics,
    segments_summary: segmentsSummary,
    active_members: activeMembers,
  };
}

function resolveJobId(raw: {
  id?: string;
  task_id?: string;
  job_id?: string;
}): string {
  return raw.id ?? raw.task_id ?? raw.job_id ?? "";
}

export function fromUploadResponse(
  response: UploadAnalysisResponse,
  fallbackCreatedAtIso?: string,
): ActiveAnalysisView {
  const payload = extractHierarchicalPayload(response);
  const urgentCount =
    payload?.segments_summary
      .filter(
        (s) =>
          s.segment_id === "behavioral_alarm" || s.segment_id === "hot_window",
      )
      .reduce((acc, s) => acc + s.client_amount, 0) ?? 0;

  return {
    id: resolveJobId(response),
    filename:
      response.filename || "3-File Cohort Dataset (Members, Contracts, Gate Logs)",
    status: response.status ?? "PENDING",
    rowsCount:
      payload?.summary_kpis.total_active_members ??
      toNumber(response.rows_count, 0),
    highRiskCount:
      urgentCount > 0 ? urgentCount : toNumber(response.high_risk_count, 0),
    avgChurnProbability: toNumber(response.avg_churn_probability, 0),
    createdAt: response.created_at || fallbackCreatedAtIso,
    payload,
  };
}

export function fromAnalysisDetail(
  detail: AnalysisDetailResponse,
): ActiveAnalysisView {
  const payload = extractHierarchicalPayload(detail);
  const urgentCount =
    payload?.segments_summary
      .filter(
        (s) =>
          s.segment_id === "behavioral_alarm" || s.segment_id === "hot_window",
      )
      .reduce((acc, s) => acc + s.client_amount, 0) ?? 0;

  const avgRiskFromPayload =
    payload && payload.active_members.length > 0
      ? payload.active_members.reduce((acc, m) => acc + m.prob_churn_current, 0) /
        payload.active_members.length
      : 0;

  return {
    id: resolveJobId(detail),
    filename:
      detail.filename || "3-File Cohort Dataset (Members, Contracts, Gate Logs)",
    status: detail.status ?? "PENDING",
    rowsCount:
      payload?.summary_kpis.total_active_members ??
      toNumber(detail.rows_count, 0),
    highRiskCount:
      urgentCount > 0 ? urgentCount : toNumber(detail.high_risk_count, 0),
    avgChurnProbability:
      toNumber(detail.avg_churn_probability, 0) || avgRiskFromPayload,
    createdAt: detail.created_at,
    payload,
  };
}

export function normalizeHistoryList(rawList: unknown): AnalysisSummaryItem[] {
  if (!Array.isArray(rawList)) {
    return [];
  }
  return rawList
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const payload = extractHierarchicalPayload(item);
      const id = String(item.id ?? item.task_id ?? item.job_id ?? "");
      const urgentCount =
        payload?.segments_summary
          .filter(
            (s) =>
              s.segment_id === "behavioral_alarm" ||
              s.segment_id === "hot_window",
          )
          .reduce((acc, s) => acc + s.client_amount, 0) ?? 0;

      return {
        id,
        task_id: typeof item.task_id === "string" ? item.task_id : undefined,
        job_id: typeof item.job_id === "string" ? item.job_id : undefined,
        filename:
          typeof item.filename === "string" && item.filename.trim()
            ? item.filename
            : "3-File Cohort Dataset",
        status: String(item.status ?? "COMPLETED"),
        rows_count:
          payload?.summary_kpis.total_active_members ??
          toNumber(item.rows_count, 0),
        high_risk_count:
          urgentCount > 0 ? urgentCount : toNumber(item.high_risk_count, 0),
        avg_churn_probability: toNumber(item.avg_churn_probability, 0),
        created_at:
          typeof item.created_at === "string" ? item.created_at : "",
        summary_kpis: payload?.summary_kpis,
      };
    });
}

/**
 * Computes the individual "Plateau & Slide" habit curve value lambda(t) for week `t`:
 *   lambda(t) = lambda_base_est / (1 + Math.exp(gamma_est * (t - tau_est)))
 */
export function calculateHabitLambda(
  t: number,
  lambdaBaseEst: number,
  tauEst: number,
  gammaEst: number,
): number {
  const exponent = Math.max(-25, Math.min(25, gammaEst * (t - tauEst)));
  return lambdaBaseEst / (1 + Math.exp(exponent));
}

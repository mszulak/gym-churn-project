"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Anchor,
  ArrowDownWideNarrow,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileSpreadsheet,
  Filter,
  Flame,
  Layers,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatCurrencyPln,
  formatDateTime,
  formatDecimal,
  formatInteger,
  formatProbabilityPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  isAnalysisFailed,
  isAnalysisInProgress,
  type ActiveAnalysisView,
} from "@/lib/analysis";
import type {
  ActiveMemberPrediction,
  SegmentId,
  SegmentSummaryItem,
} from "@/lib/api";
import { HabitCurveDrawer } from "./habit-curve-drawer";

interface AnalysisResultCardProps {
  analysis: ActiveAnalysisView;
  isLoading?: boolean;
}

type SortField = "drop_ratio_today" | "revenue_at_risk_pln" | "prob_churn_current";

interface SegmentTheme {
  priorityLabel: string;
  cardBorder: string;
  cardActiveBorder: string;
  cardBg: string;
  badgeClass: string;
  accentText: string;
  barClass: string;
  dotClass: string;
}

function getSegmentTheme(segmentId: SegmentId): SegmentTheme {
  switch (segmentId) {
    case "behavioral_alarm":
      return {
        priorityLabel: "Trainer Priority #1",
        cardBorder: "border-amber-500/35 hover:border-amber-500/65",
        cardActiveBorder:
          "border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10",
        cardBg: "bg-amber-500/[0.06]",
        badgeClass: "border-amber-500/45 bg-amber-500/20 text-amber-300",
        accentText: "text-amber-300",
        barClass: "bg-amber-400",
        dotClass: "bg-amber-400",
      };
    case "hot_window":
      return {
        priorityLabel: "Sales / Front Desk Priority",
        cardBorder: "border-sky-500/35 hover:border-sky-500/65",
        cardActiveBorder:
          "border-sky-400 bg-sky-500/15 ring-2 ring-sky-400/40 shadow-lg shadow-sky-500/10",
        cardBg: "bg-sky-500/[0.06]",
        badgeClass: "border-sky-500/45 bg-sky-500/20 text-sky-300",
        accentText: "text-sky-300",
        barClass: "bg-sky-400",
        dotClass: "bg-sky-400",
      };
    case "zombie_zone":
      return {
        priorityLabel: "Frozen Churn (Long Contracts)",
        cardBorder: "border-rose-500/30 hover:border-rose-500/60",
        cardActiveBorder:
          "border-rose-400 bg-rose-500/15 ring-2 ring-rose-400/40 shadow-lg shadow-rose-500/10",
        cardBg: "bg-rose-500/[0.05]",
        badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-300",
        accentText: "text-rose-300",
        barClass: "bg-rose-500",
        dotClass: "bg-rose-500",
      };
    case "strong_base":
    default:
      return {
        priorityLabel: "Stable Club Core",
        cardBorder: "border-emerald-500/35 hover:border-emerald-500/65",
        cardActiveBorder:
          "border-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10",
        cardBg: "bg-emerald-500/[0.06]",
        badgeClass: "border-emerald-500/45 bg-emerald-500/20 text-emerald-300",
        accentText: "text-emerald-300",
        barClass: "bg-emerald-400",
        dotClass: "bg-emerald-400",
      };
  }
}

function getDropBarColor(dropRatio: number): string {
  const pct = dropRatio <= 1 ? dropRatio * 100 : dropRatio;
  if (pct > 75) return "bg-rose-500";
  if (pct >= 25) return "bg-amber-400";
  return "bg-emerald-400";
}

function getRiskBadgeStyle(prob: number): string {
  const pct = prob <= 1 ? prob * 100 : prob;
  if (pct >= 70) {
    return "border-rose-500/40 bg-rose-500/15 text-rose-300";
  }
  if (pct >= 35) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  }
  return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
}

function StatusBadge({ status }: { status: string }) {
  if (isAnalysisInProgress(status)) {
    return (
      <Badge className="border-amber-500/40 bg-amber-500/15 font-mono text-[11px] text-amber-300 hover:bg-amber-500/15">
        <Loader2 className="mr-1 size-3 animate-spin" aria-hidden="true" />
        {status}
      </Badge>
    );
  }

  if (isAnalysisFailed(status)) {
    return (
      <Badge className="border-destructive/40 bg-destructive/15 font-mono text-[11px] text-destructive hover:bg-destructive/15">
        <AlertCircle className="mr-1 size-3" aria-hidden="true" />
        {status}
      </Badge>
    );
  }

  return (
    <Badge className="bg-primary/20 font-mono text-[11px] text-primary hover:bg-primary/20">
      <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
      {status}
    </Badge>
  );
}

export function AnalysisResultCard({
  analysis,
  isLoading = false,
}: AnalysisResultCardProps) {
  const inProgress = isAnalysisInProgress(analysis.status);
  const failed = isAnalysisFailed(analysis.status);
  const payload = analysis.payload;

  // Default segment filter set to "1. Behavioral Alarm" ("behavioral_alarm")
  const [selectedSegment, setSelectedSegment] = useState<string>(
    "behavioral_alarm",
  );
  const [sortBy, setSortBy] = useState<SortField>("drop_ratio_today");
  const [selectedMember, setSelectedMember] =
    useState<ActiveMemberPrediction | null>(null);

  const segmentsMap = useMemo(() => {
    const map = new Map<string, SegmentSummaryItem>();
    for (const seg of payload?.segments_summary ?? []) {
      map.set(seg.segment_id, seg);
    }
    return map;
  }, [payload]);

  // If the default "behavioral_alarm" has 0 members and doesn't exist in segments_summary,
  // allow fallback to "ALL" only if behavioral_alarm isn't present in segments_summary at all.
  const effectiveSegment = useMemo(() => {
    if (selectedSegment === "ALL") return "ALL";
    if (!payload) return selectedSegment;
    const existsInSummary = payload.segments_summary.some(
      (s) => s.segment_id === selectedSegment,
    );
    const existsInMembers = payload.active_members.some(
      (m) => m.segment_id === selectedSegment,
    );
    if (!existsInSummary && !existsInMembers && payload.active_members.length > 0) {
      return "ALL";
    }
    return selectedSegment;
  }, [payload, selectedSegment]);

  const filteredAndSortedMembers = useMemo(() => {
    const list = payload?.active_members ?? [];
    const filtered =
      effectiveSegment === "ALL"
        ? list
        : list.filter((m) => m.segment_id === effectiveSegment);

    return [...filtered].sort((a, b) => {
      if (sortBy === "revenue_at_risk_pln") {
        return (
          b.revenue_at_risk_pln - a.revenue_at_risk_pln ||
          b.drop_ratio_today - a.drop_ratio_today
        );
      }
      if (sortBy === "prob_churn_current") {
        return (
          b.prob_churn_current - a.prob_churn_current ||
          b.drop_ratio_today - a.drop_ratio_today
        );
      }
      return (
        b.drop_ratio_today - a.drop_ratio_today ||
        b.revenue_at_risk_pln - a.revenue_at_risk_pln
      );
    });
  }, [payload, effectiveSegment, sortBy]);

  const zombieSegment = segmentsMap.get("zombie_zone");
  const zombieFrozenRevenue =
    zombieSegment?.revenue_at_risk ??
    Math.max(
      0,
      (payload?.summary_kpis.total_revenue_at_risk_pln ?? 0) -
        (payload?.summary_kpis.actionable_revenue_at_risk_pln ?? 0),
    );

  const totalMembersCount =
    payload?.summary_kpis.total_active_members ??
    payload?.active_members.length ??
    analysis.rowsCount;

  const actionableSharePct =
    payload && payload.summary_kpis.total_revenue_at_risk_pln > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (payload.summary_kpis.actionable_revenue_at_risk_pln /
              payload.summary_kpis.total_revenue_at_risk_pln) *
              100,
          ),
        )
      : 0;

  return (
    <>
      <Card
        className={cn(
          "relative border-border/80 bg-card/85 shadow-xl backdrop-blur-sm transition-opacity",
          isLoading && "opacity-75",
        )}
      >
        <CardContent className="space-y-8 p-5 sm:p-6">
          {/* Analysis Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <FileSpreadsheet className="size-5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-heading text-base font-bold text-foreground sm:text-lg">
                    {analysis.filename}
                  </h3>
                  <StatusBadge status={analysis.status} />
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {analysis.createdAt
                    ? `Uploaded: ${formatDateTime(analysis.createdAt)} • `
                    : null}
                  Task ID: {analysis.id || "—"}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading dashboard...
              </div>
            ) : inProgress ? (
              <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
                <Loader2
                  className="size-3.5 animate-spin text-amber-400"
                  aria-hidden="true"
                />
                NumPyro SVI in progress...
              </div>
            ) : null}
          </div>

          {/* Async Polling State */}
          {inProgress ? (
            <div
              role="status"
              aria-live="polite"
              className="space-y-5 rounded-2xl border border-amber-500/35 bg-background/70 p-6 sm:p-8"
            >
              <div className="flex flex-col items-center justify-center gap-3 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-400 shadow-lg shadow-amber-500/10">
                  <Loader2 className="size-6 animate-spin" aria-hidden="true" />
                </span>
                <h4 className="font-heading text-base font-bold text-foreground sm:text-lg">
                  Filtering gate noise (&lt;45 min), reconstructing episodes, and
                  estimating SVI habit curves...
                </h4>
                <p className="max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  The Celery worker is executing 5,000 steps of Stochastic
                  Variational Inference (NumPyro) and calibrating the churn
                  decision engine on historical contract windows. Typical runtime
                  is <strong className="text-foreground">25–35 seconds</strong>{" "}
                  (status:{" "}
                  <span className="font-mono font-semibold text-amber-300">
                    {analysis.status}
                  </span>
                  ).
                </p>
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-3">
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-xs">
                  <p className="font-mono text-[10px] font-semibold text-amber-300 uppercase">
                    Stage 1 • Gate Log Cleaning
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    Filtering duplicate swipes (&lt;45 min) &amp; building weekly
                    attendance grid
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-xs">
                  <p className="font-mono text-[10px] font-semibold text-amber-300 uppercase">
                    Stage 2 • Bayesian SVI (5,000 steps)
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    Estimating individual habit curves (λ_base, τ, γ) &amp; club
                    anchors/frictions
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 text-xs">
                  <p className="font-mono text-[10px] font-semibold text-amber-300 uppercase">
                    Stage 3 • Operational Segmentation
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    Separating Behavioral Alarms &amp; Hot Windows from the
                    Zombie Zone
                  </p>
                </div>
              </div>
            </div>
          ) : failed ? (
            <div
              role="alert"
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center"
            >
              <AlertCircle
                className="size-6 text-destructive"
                aria-hidden="true"
              />
              <p className="font-heading text-sm font-semibold text-destructive">
                Analysis failed
              </p>
              <p className="max-w-md text-xs text-destructive/90">
                The background worker encountered an error while running the
                hierarchical model on the uploaded CSV files. Please verify the
                data columns and try uploading again.
              </p>
            </div>
          ) : payload ? (
            <div className="space-y-8">
              {/* =========================================================
                  SECTION A: TOP SUMMARY KPIs BAR
                 ========================================================= */}
              <section aria-label="Club Summary KPIs" className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                  <span>Section A • Executive Club &amp; Model KPIs</span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* KPI 1: Monthly Revenue at Risk */}
                  <div className="flex flex-col justify-between rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.10] via-background/80 to-background/80 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-amber-200/90">
                        <span className="font-medium">
                          Monthly Revenue at Risk
                        </span>
                        <Wallet
                          className="size-4 text-amber-400"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
                        {formatCurrencyPln(
                          payload.summary_kpis.total_revenue_at_risk_pln,
                        )}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 border-t border-border/60 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-300">
                          Recoverable Now:
                        </span>
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono font-bold text-emerald-300">
                          {formatCurrencyPln(
                            payload.summary_kpis.actionable_revenue_at_risk_pln,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Frozen in Zombie Zone:</span>
                        <span className="font-mono text-rose-300/90">
                          {formatCurrencyPln(zombieFrozenRevenue)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-500/30">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${actionableSharePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Active Members in Analysis */}
                  <div className="flex flex-col justify-between rounded-xl border border-border/75 bg-background/60 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          Active Members in Analysis
                        </span>
                        <Users
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
                        {formatInteger(
                          payload.summary_kpis.total_active_members,
                        )}
                      </p>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Avg. baseline pace (λ_base):
                        </span>
                        <span className="font-mono font-semibold text-primary">
                          {formatDecimal(
                            payload.summary_kpis.avg_club_lambda_base,
                            2,
                          )}{" "}
                          visits/wk
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Initial plateau attendance rate across active episodes
                      </p>
                    </div>
                  </div>

                  {/* KPI 3: Average Club Crisis Point (tau) */}
                  <div className="flex flex-col justify-between rounded-xl border border-border/75 bg-background/60 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          Avg. Club Crisis Point (τ)
                        </span>
                        <CalendarClock
                          className="size-4 text-amber-400"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-foreground">
                        {formatDecimal(
                          payload.summary_kpis.avg_club_tau_weeks,
                          1,
                        )}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          weeks
                        </span>
                      </p>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Filtered vacation noise:
                        </span>
                        <span className="font-mono font-semibold text-sky-300">
                          {formatProbabilityPercent(
                            payload.summary_kpis.vacation_prob,
                            1,
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Zero-inflated temporary absence probability (ZIP)
                      </p>
                    </div>
                  </div>

                  {/* KPI 4: Model Calibration Quality */}
                  <div className="flex flex-col justify-between rounded-xl border border-border/75 bg-background/60 p-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          Model Calibration Quality
                        </span>
                        <ShieldCheck
                          className="size-4 text-emerald-400"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-mono text-2xl font-bold tracking-tight text-emerald-300">
                          {formatDecimal(payload.summary_kpis.model_roc_auc, 3)}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          ROC AUC
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 border-t border-border/60 pt-2.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Brier Score (calibration):
                        </span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatDecimal(
                            payload.summary_kpis.model_brier_score,
                            3,
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Validated on historical contract renewal windows
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================================================
                  SECTION B: 4 OPERATIONAL SEGMENT CARDS (INTERACTIVE FILTERS)
                 ========================================================= */}
              <section
                aria-label="Operational Segments"
                className="space-y-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Layers
                      className="size-3.5 text-primary"
                      aria-hidden="true"
                    />
                    <span>
                      Section B • Operational Retention Segments (Click to
                      Filter)
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant={effectiveSegment === "ALL" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSegment("ALL")}
                    className="h-8 cursor-pointer font-mono text-xs"
                  >
                    <Filter className="mr-1.5 size-3.5" aria-hidden="true" />
                    All ({formatInteger(totalMembersCount)})
                  </Button>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  {payload.segments_summary.map((seg) => {
                    const theme = getSegmentTheme(seg.segment_id);
                    const isSelected = effectiveSegment === seg.segment_id;

                    return (
                      <button
                        key={seg.segment_id}
                        type="button"
                        onClick={() => setSelectedSegment(seg.segment_id)}
                        className={cn(
                          "group flex flex-col justify-between rounded-xl border p-4 text-left transition-all",
                          isSelected
                            ? theme.cardActiveBorder
                            : cn(theme.cardBorder, theme.cardBg),
                        )}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold",
                                theme.badgeClass,
                              )}
                            >
                              <span
                                className={cn(
                                  "size-1.5 rounded-full",
                                  theme.dotClass,
                                )}
                              />
                              {theme.priorityLabel}
                            </span>

                            <span className="font-mono text-lg font-bold text-foreground">
                              {formatInteger(seg.client_amount)}{" "}
                              <span className="text-[11px] font-normal text-muted-foreground">
                                members
                              </span>
                            </span>
                          </div>

                          <h4 className="font-heading text-sm font-bold text-foreground">
                            {seg.segment_name}
                          </h4>

                          {/* Key Segment Metrics Grid */}
                          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5 font-mono text-[11px]">
                            <div>
                              <span className="block text-[10px] text-muted-foreground">
                                Avg. Pace Today
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatDecimal(seg.average_lambda, 2)} /wk
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-muted-foreground">
                                Avg. Habit Drop
                              </span>
                              <span className={cn("font-semibold", theme.accentText)}>
                                {formatProbabilityPercent(
                                  seg.average_drop_ratio,
                                  0,
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-muted-foreground">
                                Avg. Churn Risk
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatProbabilityPercent(
                                  seg.average_churn_risk,
                                  0,
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-muted-foreground">
                                Revenue at Risk
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatCurrencyPln(seg.revenue_at_risk, 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 border-t border-border/50 pt-2.5">
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            <strong className="text-foreground/90">
                              Action:
                            </strong>{" "}
                            {seg.recommended_action}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* =========================================================
                  SECTION C: OPERATIONAL CLIENT TABLE + DRAWER TRIGGER
                 ========================================================= */}
              <section
                aria-label="Operational Member Table"
                className="space-y-3.5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert
                        className="size-4 text-amber-400"
                        aria-hidden="true"
                      />
                      <h4 className="font-heading text-sm font-bold text-foreground sm:text-base">
                        Section C • Operational Member Action Queue
                      </h4>
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] text-foreground"
                      >
                        {filteredAndSortedMembers.length} shown
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Click any member row to open their individual{" "}
                      <strong className="text-foreground">
                        &ldquo;Plateau &amp; Slide&rdquo;
                      </strong>{" "}
                      SVI habit curve and gate visit history.
                    </p>
                  </div>

                  {/* Sort Controls */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <ArrowDownWideNarrow
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Sort by:
                    </span>
                    <Button
                      type="button"
                      variant={
                        sortBy === "drop_ratio_today" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSortBy("drop_ratio_today")}
                      className="h-7 cursor-pointer px-2.5 font-mono text-[11px]"
                    >
                      Habit Loss %
                    </Button>
                    <Button
                      type="button"
                      variant={
                        sortBy === "revenue_at_risk_pln" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSortBy("revenue_at_risk_pln")}
                      className="h-7 cursor-pointer px-2.5 font-mono text-[11px]"
                    >
                      Revenue at Risk
                    </Button>
                    <Button
                      type="button"
                      variant={
                        sortBy === "prob_churn_current" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setSortBy("prob_churn_current")}
                      className="h-7 cursor-pointer px-2.5 font-mono text-[11px]"
                    >
                      Churn Risk %
                    </Button>
                  </div>
                </div>

                {filteredAndSortedMembers.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/60">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/80 bg-secondary/60 text-[11px] text-muted-foreground uppercase">
                          <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            Member ID
                          </th>
                          <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            Tenure / Contract End
                          </th>
                          <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            Habit (Start → Today)
                          </th>
                          <th className="min-w-44 px-3.5 py-3 font-mono font-semibold text-foreground">
                            Habit Loss
                          </th>
                          <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            Churn Risk
                          </th>
                          <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                            Revenue at Risk
                          </th>
                          <th className="w-10 px-3 py-3 text-right font-mono font-semibold text-foreground">
                            Curve
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {filteredAndSortedMembers.map((member) => {
                          const dropPct =
                            member.drop_ratio_today <= 1
                              ? Math.min(
                                  100,
                                  Math.max(0, member.drop_ratio_today * 100),
                                )
                              : Math.min(
                                  100,
                                  Math.max(0, member.drop_ratio_today),
                                );
                          const segTheme = getSegmentTheme(member.segment_id);

                          return (
                            <tr
                              key={`${member.episode_id}-${member.member_id}`}
                              onClick={() => setSelectedMember(member)}
                              className="group cursor-pointer transition-colors hover:bg-primary/[0.08]"
                            >
                              {/* Member ID + Fresh Crisis Badge */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      "size-2 shrink-0 rounded-full",
                                      segTheme.dotClass,
                                    )}
                                    title={member.segment_name}
                                  />
                                  <span className="font-mono font-bold text-foreground">
                                    #{member.member_id}
                                  </span>
                                  {member.is_fresh_drop ? (
                                    <Badge className="border-amber-500/50 bg-amber-500/20 px-1.5 py-0 font-mono text-[10px] font-semibold text-amber-300 hover:bg-amber-500/25">
                                      <Flame
                                        className="mr-1 size-3 text-amber-400"
                                        aria-hidden="true"
                                      />
                                      Fresh Crisis!
                                    </Badge>
                                  ) : null}
                                </div>
                              </td>

                              {/* Tenure / Contract End */}
                              <td className="px-3.5 py-3 font-mono whitespace-nowrap text-foreground/90">
                                <span>
                                  {formatInteger(member.observed_weeks)} wks
                                </span>
                                <span className="mx-1.5 text-muted-foreground">
                                  /
                                </span>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    member.weeks_to_contract_end <= 4
                                      ? "text-sky-300"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  in{" "}
                                  {formatInteger(member.weeks_to_contract_end)}{" "}
                                  wks
                                </span>
                              </td>

                              {/* Habit (Start -> Today) */}
                              <td className="px-3.5 py-3 font-mono whitespace-nowrap">
                                <span className="text-muted-foreground">
                                  {formatDecimal(member.lambda_base_est, 2)}
                                </span>
                                <span className="mx-1.5 text-muted-foreground">
                                  →
                                </span>
                                <span className="font-bold text-foreground">
                                  {formatDecimal(member.lambda_today, 2)}
                                </span>{" "}
                                <span className="text-[11px] text-muted-foreground">
                                  visits/wk
                                </span>
                              </td>

                              {/* Habit Loss Progress Bar */}
                              <td className="min-w-44 px-3.5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-12 font-mono text-xs font-bold text-foreground">
                                    {formatProbabilityPercent(
                                      member.drop_ratio_today,
                                      0,
                                    )}
                                  </span>
                                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        getDropBarColor(member.drop_ratio_today),
                                      )}
                                      style={{ width: `${dropPct}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Churn Risk */}
                              <td className="px-3.5 py-3 whitespace-nowrap">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold",
                                    getRiskBadgeStyle(member.prob_churn_current),
                                  )}
                                >
                                  {formatProbabilityPercent(
                                    member.prob_churn_current,
                                    0,
                                  )}
                                </span>
                              </td>

                              {/* Revenue at Risk */}
                              <td className="px-3.5 py-3 font-mono whitespace-nowrap">
                                <div className="font-bold text-foreground">
                                  {formatCurrencyPln(member.revenue_at_risk_pln)}
                                  /mo
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  from {formatCurrencyPln(member.monthly_price)}{" "}
                                  plan
                                </div>
                              </td>

                              {/* Drawer Action Indicator */}
                              <td className="px-3 py-3 text-right">
                                <span className="inline-flex size-7 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:bg-primary/15 group-hover:text-primary">
                                  <ChevronRight
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-background/40 p-6 text-center text-xs text-muted-foreground">
                    No active members found in this segment filter. Click{" "}
                    <button
                      type="button"
                      onClick={() => setSelectedSegment("ALL")}
                      className="font-semibold text-primary underline underline-offset-2"
                    >
                      All ({formatInteger(totalMembersCount)})
                    </button>{" "}
                    to view the entire club cohort.
                  </div>
                )}
              </section>

              {/* =========================================================
                  SECTION D: CLUB PHYSICS – HABIT ANCHORS & FRICTIONS
                 ========================================================= */}
              {payload.club_physics.length > 0 ? (
                <section
                  aria-label="Club Physics – Anchors and Frictions"
                  className="space-y-3.5 pt-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                      <Compass
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                      <span>
                        Section D • Club Physics — Learned Habit Anchors &amp;
                        Frictions
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Global behavioral multipliers learned directly from your
                      gym&apos;s historical gate logs and member attributes.
                    </p>
                  </div>

                  <div className="grid gap-3.5 sm:grid-cols-3">
                    {payload.club_physics.map((item) => {
                      const isAnchor = item.effect_type === "anchor";
                      const multiplierBadge = isAnchor
                        ? `x${formatDecimal(item.tau_multiplier, 2)} longer habit`
                        : `x${formatDecimal(item.tau_multiplier, 2)} shorter habit`;

                      return (
                        <div
                          key={item.feature}
                          className={cn(
                            "flex flex-col justify-between rounded-xl border p-4",
                            isAnchor
                              ? "border-emerald-500/35 bg-emerald-500/[0.06]"
                              : "border-rose-500/35 bg-rose-500/[0.06]",
                          )}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase",
                                  isAnchor
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                    : "border-rose-500/40 bg-rose-500/15 text-rose-300",
                                )}
                              >
                                {isAnchor ? (
                                  <>
                                    <Anchor
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                    Habit Anchor
                                  </>
                                ) : (
                                  <>
                                    <Zap
                                      className="size-3"
                                      aria-hidden="true"
                                    />
                                    Habit Friction
                                  </>
                                )}
                              </span>

                              <span
                                className={cn(
                                  "rounded-lg px-2.5 py-1 font-mono text-xs font-bold",
                                  isAnchor
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : "bg-rose-500/20 text-rose-300",
                                )}
                              >
                                {multiplierBadge}
                              </span>
                            </div>

                            <h5 className="font-heading text-sm font-bold text-foreground">
                              {item.label}
                            </h5>

                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {item.description}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 font-mono text-[10px] text-muted-foreground">
                            <span>Feature key: {item.feature}</span>
                            <span>
                              τ multiplier: x
                              {formatDecimal(item.tau_multiplier, 2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/40 p-6 text-center text-xs text-muted-foreground">
              No hierarchical model predictions available for this analysis job.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Habit Curve Detail Drawer */}
      <HabitCurveDrawer
        member={selectedMember}
        recommendedAction={
          selectedMember
            ? segmentsMap.get(selectedMember.segment_id)?.recommended_action
            : undefined
        }
        onClose={() => setSelectedMember(null)}
      />
    </>
  );
}

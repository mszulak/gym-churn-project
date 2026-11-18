"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Flame,
  Gauge,
  TrendingDown,
  User,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateHabitLambda } from "@/lib/analysis";
import type { ActiveMemberPrediction } from "@/lib/api";
import {
  formatCurrencyPln,
  formatDecimal,
  formatInteger,
  formatProbabilityPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface HabitCurveDrawerProps {
  member: ActiveMemberPrediction | null;
  recommendedAction?: string;
  onClose: () => void;
}

interface ChartWeekPoint {
  t: number;
  actualVisits: number | null;
  lambdaEst: number;
  isForecast: boolean;
}

export function HabitCurveDrawer({
  member,
  recommendedAction,
  onClose,
}: HabitCurveDrawerProps) {
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);

  useEffect(() => {
    if (!member) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [member, onClose]);

  const chartData = useMemo<ChartWeekPoint[]>(() => {
    if (!member) return [];

    const observedWeeks = Math.max(1, Math.round(member.observed_weeks));
    const contractEndWeeks = Math.max(0, Math.round(member.weeks_to_contract_end));
    const totalWeeks = Math.max(observedWeeks + contractEndWeeks, observedWeeks, 2);

    const historyMap = new Map<number, number>();
    for (const item of member.weekly_history ?? []) {
      historyMap.set(Math.round(item.t), item.visits);
    }

    const points: ChartWeekPoint[] = [];
    for (let t = 1; t <= totalWeeks; t++) {
      const isForecast = t > observedWeeks;
      const actualVisits = isForecast ? null : (historyMap.get(t) ?? 0);
      const lambdaEst = calculateHabitLambda(
        t,
        member.lambda_base_est,
        member.tau_est,
        member.gamma_est,
      );

      points.push({
        t,
        actualVisits,
        lambdaEst,
        isForecast,
      });
    }

    return points;
  }, [member]);

  if (!member) {
    return null;
  }

  const observedWeeks = Math.max(1, Math.round(member.observed_weeks));
  const totalWeeks = chartData.length;

  const maxVisits = Math.max(
    ...chartData.map((d) => d.actualVisits ?? 0),
    member.lambda_base_est,
    ...chartData.map((d) => d.lambdaEst),
    4,
  );
  const yMax = Math.ceil(maxVisits * 1.15);

  // SVG Chart coordinate system
  const svgWidth = 720;
  const svgHeight = 320;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 28;
  const padBottom = 42;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  function xForWeek(t: number): number {
    if (totalWeeks <= 1) return padLeft + plotWidth / 2;
    return padLeft + ((t - 1) / (totalWeeks - 1)) * plotWidth;
  }

  function yForValue(v: number): number {
    const clamped = Math.max(0, Math.min(yMax, v));
    return padTop + plotHeight - (clamped / yMax) * plotHeight;
  }

  const barStep = totalWeeks > 1 ? plotWidth / totalWeeks : 24;
  const barWidth = Math.max(2.5, Math.min(18, barStep * 0.62));

  // Build SVG polyline path for the continuous SVI habit curve lambda(t)
  const linePath = chartData
    .map((pt, index) => {
      const x = xForWeek(pt.t);
      const y = yForValue(pt.lambdaEst);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  // Area under the curve
  const areaPath =
    chartData.length > 0
      ? `${linePath} L ${xForWeek(chartData[chartData.length - 1].t).toFixed(2)} ${(padTop + plotHeight).toFixed(2)} L ${xForWeek(chartData[0].t).toFixed(2)} ${(padTop + plotHeight).toFixed(2)} Z`
      : "";

  const tauX = xForWeek(member.tau_est);
  const isTauInPlot = member.tau_est >= 1 && member.tau_est <= totalWeeks;
  const todayX = xForWeek(observedWeeks);

  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Number(((yMax / 4) * i).toFixed(1)),
  );

  const xTickStep =
    totalWeeks <= 15
      ? 1
      : totalWeeks <= 35
        ? 5
        : totalWeeks <= 70
          ? 10
          : 15;
  const xTicks = chartData
    .map((d) => d.t)
    .filter((t) => t === 1 || t % xTickStep === 0 || t === totalWeeks);

  const activePoint =
    chartData.find((d) => d.t === hoveredWeek) ??
    chartData.find((d) => d.t === observedWeeks) ??
    chartData[chartData.length - 1];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-drawer-title"
    >
      <div
        className="flex h-full w-full max-w-3xl flex-col overflow-y-auto border-l border-border bg-card p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border/70 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                <User className="size-4" aria-hidden="true" />
              </span>
              <h2
                id="habit-drawer-title"
                className="font-heading text-lg font-bold text-foreground sm:text-xl"
              >
                Member #{member.member_id} — &ldquo;Plateau &amp; Slide&rdquo;
                Habit Curve
              </h2>
              {member.is_fresh_drop ? (
                <Badge className="border-amber-500/50 bg-amber-500/20 font-mono text-[11px] font-semibold text-amber-300">
                  <Flame className="mr-1 size-3 text-amber-400" aria-hidden="true" />
                  Fresh Crisis!
                </Badge>
              ) : null}
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              Episode #{member.episode_id} • Segment:{" "}
              <span className="font-semibold text-foreground">
                {member.segment_name}
              </span>
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="size-8 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground"
            aria-label="Close member habit drawer"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {/* Drawer Body */}
        <div className="mt-5 space-y-6">
          {/* Top Member Metrics Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Habit (Start → Today)</span>
                <Activity className="size-3.5 text-primary" aria-hidden="true" />
              </div>
              <p className="mt-1.5 font-mono text-base font-bold text-foreground">
                {formatDecimal(member.lambda_base_est, 2)} →{" "}
                <span className="text-amber-300">
                  {formatDecimal(member.lambda_today, 2)}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                visits / week
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Habit Drop Today</span>
                <TrendingDown
                  className="size-3.5 text-amber-400"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-1.5 font-mono text-base font-bold text-amber-300">
                {formatProbabilityPercent(member.drop_ratio_today, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Crisis point τ = {formatDecimal(member.tau_est, 1)} wks
              </p>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <div className="flex items-center justify-between text-[11px] text-rose-300">
                <span>Churn Probability</span>
                <Gauge className="size-3.5 text-rose-400" aria-hidden="true" />
              </div>
              <p className="mt-1.5 font-mono text-base font-bold text-rose-300">
                {formatProbabilityPercent(member.prob_churn_current, 1)}
              </p>
              <p className="text-[10px] text-rose-200/80">
                Contract ends in {formatInteger(member.weeks_to_contract_end)} wks
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-background/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Revenue at Risk</span>
                <Wallet className="size-3.5 text-emerald-400" aria-hidden="true" />
              </div>
              <p className="mt-1.5 font-mono text-base font-bold text-foreground">
                {formatCurrencyPln(member.revenue_at_risk_pln)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Plan: {formatCurrencyPln(member.monthly_price)}/mo
              </p>
            </div>
          </div>

          {/* Chart Card */}
          <div className="rounded-2xl border border-border/80 bg-background/70 p-4 sm:p-5">
            <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-heading text-sm font-bold text-foreground">
                  Individual SVI Habit Trajectory &amp; Gate Visits
                </h3>
                <p className="font-mono text-[11px] text-muted-foreground">
                  λ(t) = {formatDecimal(member.lambda_base_est, 2)} / (1 + exp(
                  {formatDecimal(member.gamma_est, 2)} · (t −{" "}
                  {formatDecimal(member.tau_est, 1)})))
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-2.5 rounded-xs bg-sky-500/65" />
                  Actual gate visits
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 bg-emerald-400" />
                  SVI habit curve λ(t)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-amber-400" />
                  Crisis point τ ({formatDecimal(member.tau_est, 1)}w)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-4 border-t-2 border-dotted border-foreground" />
                  Today ({observedWeeks}w)
                </span>
              </div>
            </div>

            {/* Interactive Hover Readout Bar */}
            {activePoint ? (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-secondary/50 px-3 py-2 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    Week t = {activePoint.t}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      activePoint.isForecast
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-sky-500/40 bg-sky-500/10 text-sky-300",
                    )}
                  >
                    {activePoint.isForecast
                      ? "Contract Forecast Window"
                      : "Observed Gate History"}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <span>
                    Actual visits:{" "}
                    <strong className="text-sky-300">
                      {activePoint.actualVisits !== null
                        ? `${activePoint.actualVisits} visits`
                        : "Forecast"}
                    </strong>
                  </span>
                  <span>
                    Estimated λ({activePoint.t}):{" "}
                    <strong className="text-emerald-300">
                      {formatDecimal(activePoint.lambdaEst, 2)} visits/wk
                    </strong>
                  </span>
                </div>
              </div>
            ) : null}

            {/* SVG Combo Chart: Bars + Line + Reference Lines */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-auto w-full min-w-[540px] select-none"
                role="img"
                aria-label={`Habit curve chart for Member ${member.member_id}`}
              >
                {/* Forecast shaded zone (t > observed_weeks) */}
                {totalWeeks > observedWeeks ? (
                  <rect
                    x={todayX}
                    y={padTop}
                    width={Math.max(0, padLeft + plotWidth - todayX)}
                    height={plotHeight}
                    className="fill-amber-500/[0.05]"
                  />
                ) : null}

                {/* Horizontal Y grid lines & labels */}
                {yTicks.map((tickVal) => {
                  const y = yForValue(tickVal);
                  return (
                    <g key={`y-${tickVal}`}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={padLeft + plotWidth}
                        y2={y}
                        stroke="currentColor"
                        className="text-border/60"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-muted-foreground font-mono text-[10px]"
                      >
                        {tickVal}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis ticks & labels */}
                {xTicks.map((tVal) => {
                  const x = xForWeek(tVal);
                  return (
                    <g key={`x-${tVal}`}>
                      <line
                        x1={x}
                        y1={padTop + plotHeight}
                        x2={x}
                        y2={padTop + plotHeight + 5}
                        stroke="currentColor"
                        className="text-border"
                      />
                      <text
                        x={x}
                        y={padTop + plotHeight + 18}
                        textAnchor="middle"
                        className="fill-muted-foreground font-mono text-[10px]"
                      >
                        w{tVal}
                      </text>
                    </g>
                  );
                })}

                {/* Axis Titles */}
                <text
                  x={padLeft + plotWidth / 2}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground font-mono text-[10px]"
                >
                  Week of Club Presence (t = 1 … {totalWeeks})
                </text>

                {/* Actual Weekly Visits Bars (for t <= observed_weeks) */}
                {chartData.map((pt) => {
                  if (pt.actualVisits === null) return null;
                  const xCenter = xForWeek(pt.t);
                  const barTop = yForValue(pt.actualVisits);
                  const barH = Math.max(0, padTop + plotHeight - barTop);
                  const isHovered = hoveredWeek === pt.t;

                  return (
                    <rect
                      key={`bar-${pt.t}`}
                      x={xCenter - barWidth / 2}
                      y={barTop}
                      width={barWidth}
                      height={barH}
                      rx={2}
                      className={cn(
                        "transition-colors",
                        isHovered
                          ? "fill-sky-400"
                          : "fill-sky-500/55 hover:fill-sky-400/80",
                      )}
                    />
                  );
                })}

                {/* Shaded area under SVI habit curve */}
                {areaPath ? (
                  <path d={areaPath} className="fill-emerald-500/10" />
                ) : null}

                {/* Continuous SVI Habit Curve Line lambda(t) */}
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke="oklch(0.78 0.165 162)"
                    strokeWidth={2.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}

                {/* Vertical Reference Line 1: Crisis Week tau_est (Orange Dashed) */}
                {isTauInPlot ? (
                  <g>
                    <line
                      x1={tauX}
                      y1={padTop}
                      x2={tauX}
                      y2={padTop + plotHeight}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                    />
                    <rect
                      x={Math.min(
                        padLeft + plotWidth - 82,
                        Math.max(padLeft, tauX - 41),
                      )}
                      y={padTop - 20}
                      width={82}
                      height={16}
                      rx={4}
                      fill="#f59e0b"
                      fillOpacity={0.2}
                    />
                    <text
                      x={Math.min(
                        padLeft + plotWidth - 41,
                        Math.max(padLeft + 41, tauX),
                      )}
                      y={padTop - 9}
                      textAnchor="middle"
                      fill="#fbbf24"
                      className="font-mono text-[10px] font-semibold"
                    >
                      τ = {formatDecimal(member.tau_est, 1)}w
                    </text>
                  </g>
                ) : null}

                {/* Vertical Reference Line 2: Current Week observed_weeks (Black/High-Contrast Dotted) */}
                <g>
                  <line
                    x1={todayX}
                    y1={padTop}
                    x2={todayX}
                    y2={padTop + plotHeight}
                    stroke="#0f172a"
                    strokeWidth={3.5}
                    strokeDasharray="2 4"
                  />
                  <line
                    x1={todayX}
                    y1={padTop}
                    x2={todayX}
                    y2={padTop + plotHeight}
                    stroke="#f8fafc"
                    strokeWidth={1.75}
                    strokeDasharray="2 4"
                  />
                  <text
                    x={Math.min(
                      padLeft + plotWidth - 36,
                      Math.max(padLeft + 36, todayX),
                    )}
                    y={padTop + 12}
                    textAnchor="middle"
                    className="fill-foreground font-mono text-[10px] font-bold"
                  >
                    Today (w{observedWeeks})
                  </text>
                </g>

                {/* Active/Hovered Point Marker on the Curve */}
                {activePoint ? (
                  <circle
                    cx={xForWeek(activePoint.t)}
                    cy={yForValue(activePoint.lambdaEst)}
                    r={4.5}
                    className="fill-emerald-400 stroke-background"
                    strokeWidth={2}
                  />
                ) : null}

                {/* Invisible Interactive Hover Columns */}
                {chartData.map((pt) => {
                  const xCenter = xForWeek(pt.t);
                  return (
                    <rect
                      key={`hit-${pt.t}`}
                      x={xCenter - barStep / 2}
                      y={padTop}
                      width={Math.max(4, barStep)}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-crosshair"
                      onMouseEnter={() => setHoveredWeek(pt.t)}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Model Parameters & Recommended Action */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/50 p-4">
              <h4 className="font-heading text-xs font-bold tracking-wider text-muted-foreground uppercase">
                NumPyro SVI Posterior Parameters
              </h4>
              <dl className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Baseline Pace (λ_base):
                  </dt>
                  <dd className="font-semibold text-foreground">
                    {formatDecimal(member.lambda_base_est, 2)} visits/wk
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Crisis Inflection Point (τ_est):
                  </dt>
                  <dd className="font-semibold text-amber-300">
                    Week {formatDecimal(member.tau_est, 1)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Slide Steepness (γ_est):
                  </dt>
                  <dd className="font-semibold text-foreground">
                    {formatDecimal(member.gamma_est, 2)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Tenure / Contract Remaining:
                  </dt>
                  <dd className="font-semibold text-foreground">
                    {formatInteger(member.observed_weeks)} wks /{" "}
                    {formatInteger(member.weeks_to_contract_end)} wks left
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-primary/30 bg-primary/10 p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase">
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  <span>Recommended Operational Action</span>
                </div>
                <p className="text-xs leading-relaxed text-foreground/95">
                  {recommendedAction ||
                    "Review member's attendance trajectory and initiate targeted retention outreach before contract expiration."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-primary/20 pt-2.5 font-mono text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                  Decision window: {formatInteger(member.weeks_to_contract_end)}{" "}
                  wks
                </span>
                <span className="font-semibold text-primary">
                  At-Risk: {formatCurrencyPln(member.revenue_at_risk_pln)}/mo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

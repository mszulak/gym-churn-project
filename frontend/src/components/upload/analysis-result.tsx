import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  FileSpreadsheet,
  Gauge,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDateTime,
  formatDaysToChurn,
  formatInteger,
  formatProbabilityPercent,
  formatUncertaintyRange,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  isAnalysisFailed,
  isAnalysisInProgress,
  type ActiveAnalysisView,
} from "@/lib/analysis";

interface AnalysisResultCardProps {
  analysis: ActiveAnalysisView;
  isLoading?: boolean;
}

function getRiskTier(probability: number): {
  label: string;
  badgeClass: string;
  barClass: string;
} {
  const normalized = probability <= 1 ? probability * 100 : probability;

  if (normalized >= 70) {
    return {
      label: "High",
      badgeClass: "border-rose-500/40 bg-rose-500/15 text-rose-300",
      barClass: "bg-rose-500",
    };
  }

  if (normalized >= 40) {
    return {
      label: "Medium",
      badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-300",
      barClass: "bg-amber-400",
    };
  }

  return {
    label: "Low",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    barClass: "bg-emerald-400",
  };
}

function summarizeRawFeatures(
  rawFeatures: Record<string, unknown>,
): Array<[string, string]> {
  return Object.entries(rawFeatures)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 4)
    .map(([key, value]) => {
      if (typeof value === "number") {
        const formatted = Number.isInteger(value)
          ? String(value)
          : value.toFixed(2);
        return [key, formatted];
      }
      return [key, String(value)];
    });
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

  return (
    <Card
      className={cn(
        "relative border-border/80 bg-card/85 shadow-xl backdrop-blur-sm transition-opacity",
        isLoading && "opacity-75",
      )}
    >
      <CardContent className="space-y-6 p-5 sm:p-6">
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
                ID: {analysis.id || "—"}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Loading analysis...
            </div>
          ) : inProgress ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200">
              <Loader2
                className="size-3.5 animate-spin text-amber-400"
                aria-hidden="true"
              />
              Processing in background...
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Analyzed members</span>
              <Users className="size-4 text-primary" aria-hidden="true" />
            </div>
            {inProgress && analysis.rowsCount === 0 ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-8 w-24 animate-pulse rounded-md bg-secondary/80" />
              </div>
            ) : (
              <p className="mt-2 font-heading text-2xl font-bold text-foreground">
                {failed && analysis.rowsCount === 0
                  ? "—"
                  : formatInteger(analysis.rowsCount)}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Total records in CSV file
            </p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 p-4">
            <div className="flex items-center justify-between text-xs text-rose-300">
              <span>High-risk members</span>
              <AlertTriangle className="size-4 text-rose-400" aria-hidden="true" />
            </div>
            {inProgress ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-8 w-20 animate-pulse rounded-md bg-rose-500/20" />
              </div>
            ) : (
              <p className="mt-2 font-heading text-2xl font-bold text-rose-300">
                {failed ? "—" : formatInteger(analysis.highRiskCount)}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-rose-200/80">
              Require immediate retention action
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Average churn risk</span>
              <Gauge className="size-4 text-amber-400" aria-hidden="true" />
            </div>
            {inProgress ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-8 w-24 animate-pulse rounded-md bg-secondary/80" />
              </div>
            ) : (
              <p className="mt-2 font-heading text-2xl font-bold text-foreground">
                {failed
                  ? "—"
                  : formatProbabilityPercent(analysis.avgChurnProbability)}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Average probability across the club
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-400" aria-hidden="true" />
              <h4 className="font-heading text-sm font-semibold text-foreground sm:text-base">
                Top 10 Most At-Risk Members
              </h4>
            </div>
            {!inProgress && !failed ? (
              <span className="font-mono text-xs text-muted-foreground">
                Showing {analysis.top10.length} of{" "}
                {formatInteger(analysis.rowsCount)} members
              </span>
            ) : null}
          </div>

          {inProgress ? (
            <div
              role="status"
              aria-live="polite"
              className="space-y-4 rounded-xl border border-amber-500/30 bg-background/60 p-6"
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/10 text-amber-400">
                  <Loader2 className="size-5 animate-spin" aria-hidden="true" />
                </span>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Calculating member churn predictions...
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  The Celery worker is analyzing your CSV file in the background
                  (current status:{" "}
                  <span className="font-mono font-semibold text-amber-300">
                    {analysis.status}
                  </span>
                  ). Results will appear here automatically as soon as the job
                  completes.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 w-full animate-pulse rounded-lg bg-secondary/50"
                  />
                ))}
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
                The background worker encountered an error while processing this
                CSV file. Please verify the file format and required columns,
                then try uploading again.
              </p>
            </div>
          ) : analysis.top10.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-background/60">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/60 text-[11px] text-muted-foreground uppercase">
                    <th className="w-12 px-3.5 py-3 font-mono font-medium">
                      #
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Client index
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Churn probability
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Uncertainty interval
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Estimated time to churn
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Risk level
                    </th>
                    <th className="px-3.5 py-3 font-mono font-semibold text-foreground">
                      Client features
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analysis.top10.map((item, idx) => {
                    const tier = getRiskTier(item.churn_probability);
                    const pct =
                      item.churn_probability <= 1
                        ? Math.min(100, Math.max(0, item.churn_probability * 100))
                        : Math.min(100, Math.max(0, item.churn_probability));
                    const featurePairs = summarizeRawFeatures(
                      item.raw_features ?? {},
                    );

                    return (
                      <tr
                        key={item.id ?? `${item.client_index}-${idx}`}
                        className="transition-colors hover:bg-secondary/35"
                      >
                        <td className="px-3.5 py-3 font-mono text-muted-foreground">
                          {idx + 1}
                        </td>

                        <td className="px-3.5 py-3 font-mono font-semibold whitespace-nowrap text-foreground">
                          Client #{item.client_index}
                        </td>

                        <td className="min-w-44 px-3.5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-14 font-mono text-xs font-bold text-foreground">
                              {formatProbabilityPercent(item.churn_probability)}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn("h-full rounded-full", tier.barClass)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-3.5 py-3 font-mono whitespace-nowrap text-foreground/90">
                          {formatUncertaintyRange(
                            item.uncertainty_low,
                            item.uncertainty_high,
                          )}
                        </td>

                        <td className="px-3.5 py-3 font-mono whitespace-nowrap text-foreground/90">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarClock
                              className="size-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            {formatDaysToChurn(item.predicted_days_to_churn)}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium",
                              tier.badgeClass,
                            )}
                          >
                            {tier.label}
                          </span>
                        </td>

                        <td className="px-3.5 py-3">
                          {featurePairs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {featurePairs.map(([key, val]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 rounded bg-secondary/80 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                                >
                                  <span className="text-foreground/75">{key}:</span>
                                  <span className="font-medium text-foreground">
                                    {val}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-background/40 p-6 text-center text-xs text-muted-foreground">
              No client predictions available for this analysis.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

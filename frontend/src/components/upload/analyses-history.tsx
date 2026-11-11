"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FolderClock,
  Gauge,
  Loader2,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatDateTime,
  formatInteger,
  formatProbabilityPercent,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalysisSummaryItem } from "@/lib/api";
import { isAnalysisFailed, isAnalysisInProgress } from "@/lib/analysis";

interface AnalysesHistoryListProps {
  items: AnalysisSummaryItem[];
  selectedId: string | null;
  loadingId: string | null;
  onSelect: (jobId: string) => void;
}

export function AnalysesHistoryList({
  items,
  selectedId,
  loadingId,
  onSelect,
}: AnalysesHistoryListProps) {
  if (items.length === 0) {
    return (
      <Card className="border-border/70 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
            <FolderClock className="size-5" aria-hidden="true" />
          </span>
          <p className="font-heading text-sm font-semibold text-foreground">
            No previous analyses
          </p>
          <p className="max-w-md text-xs text-muted-foreground">
            Once you upload your first CSV file above, it will automatically be
            saved to your gym&apos;s history and appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const isLoadingThis = item.id === loadingId;
        const inProgress = isAnalysisInProgress(item.status);
        const failed = isAnalysisFailed(item.status);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            disabled={isLoadingThis}
            className={cn(
              "group flex w-full cursor-pointer flex-col justify-between gap-4 rounded-xl border p-4 text-left transition-all sm:flex-row sm:items-center",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isSelected
                ? "border-primary/60 bg-primary/10 shadow-md shadow-primary/5"
                : "border-border/70 bg-card/70 hover:border-primary/35 hover:bg-card",
            )}
          >
            <div className="flex items-start gap-3.5">
              <span
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
                  isSelected
                    ? "bg-primary/20 text-primary ring-primary/40"
                    : "bg-secondary/70 text-muted-foreground ring-border group-hover:text-foreground",
                )}
              >
                {isLoadingThis || inProgress ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                )}
              </span>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-sm font-semibold text-foreground">
                    {item.filename}
                  </span>

                  {isSelected ? (
                    <Badge className="bg-primary/20 text-[11px] text-primary hover:bg-primary/20">
                      Currently viewing
                    </Badge>
                  ) : null}

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px]",
                      inProgress
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : failed
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-border/70 bg-background/60 text-muted-foreground",
                    )}
                  >
                    {inProgress ? (
                      <Loader2
                        className="size-3 animate-spin text-amber-400"
                        aria-hidden="true"
                      />
                    ) : failed ? (
                      <AlertCircle
                        className="size-3 text-destructive"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="size-3 text-primary"
                        aria-hidden="true"
                      />
                    )}
                    {item.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden="true" />
                    {formatDateTime(item.created_at)}
                  </span>
                  <span>•</span>
                  <span>ID: {item.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs">
                <Users
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">Members:</span>
                <span className="font-mono font-semibold text-foreground">
                  {inProgress && item.rows_count === 0
                    ? "—"
                    : formatInteger(item.rows_count)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs">
                <AlertTriangle
                  className="size-3.5 text-rose-400"
                  aria-hidden="true"
                />
                <span className="text-rose-200/80">At-risk:</span>
                <span className="font-mono font-semibold text-rose-300">
                  {inProgress || failed
                    ? "—"
                    : formatInteger(item.high_risk_count)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 text-xs">
                <Gauge
                  className="size-3.5 text-amber-400"
                  aria-hidden="true"
                />
                <span className="text-muted-foreground">Avg. risk:</span>
                <span className="font-mono font-semibold text-foreground">
                  {inProgress || failed
                    ? "—"
                    : formatProbabilityPercent(item.avg_churn_probability)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

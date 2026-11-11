import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisJobSummary } from "@/lib/analysis";
import { formatDateTime, formatNumber, formatPercent } from "@/lib/format";

interface AnalysesHistoryProps {
  analyses: AnalysisJobSummary[];
  selectedId: string | null;
  loadingId: string | null;
  isLoadingList: boolean;
  onSelect: (jobId: string) => void;
}

export function AnalysesHistory({
  analyses,
  selectedId,
  loadingId,
  isLoadingList,
  onSelect,
}: AnalysesHistoryProps) {
  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          Lista wcześniejszych analiz
        </CardTitle>
        <CardDescription>
          Kliknij dowolną pozycję, aby wczytać jej podsumowanie oraz tabelę Top 10 klientów powyżej.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingList && analyses.length === 0 ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-18 w-full rounded-xl" />
            ))}
          </div>
        ) : analyses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nie masz jeszcze zapisanych analiz. Wgraj pierwszy plik CSV powyżej, aby rozpocząć.
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {analyses.map((item) => {
              const isSelected = item.id === selectedId;
              const isRowLoading = item.id === loadingId;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    disabled={isRowLoading}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "group flex w-full flex-col gap-3 rounded-xl border px-4 py-3.5 text-left transition-all outline-none sm:flex-row sm:items-center sm:justify-between",
                      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                      isSelected
                        ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/70 bg-background/40 hover:border-primary/40 hover:bg-background/80",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground ring-primary"
                            : "bg-primary/10 text-primary ring-primary/25",
                        )}
                      >
                        {isRowLoading ? (
                          <Loader2 className="size-4.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="size-4.5" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium" title={item.filename}>
                            {item.filename}
                          </span>
                          {isSelected && (
                            <Badge variant="default" className="h-4.5 px-1.5 text-[10px]">
                              <CheckCircle2 className="size-3" />
                              Wybrana
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {formatDateTime(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs sm:justify-end">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="size-3.5" />
                        <span>Klienci:</span>
                        <span className="font-medium text-foreground tabular-nums">
                          {formatNumber(item.rows_count)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <AlertTriangle className="size-3.5 text-risk-high" />
                        <span>Zagrożeni:</span>
                        <span className="font-semibold text-risk-high tabular-nums">
                          {formatNumber(item.high_risk_count)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span>Średnie ryzyko:</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {formatPercent(item.avg_churn_probability)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

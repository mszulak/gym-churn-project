import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  FileSpreadsheet,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ActiveAnalysis } from "@/lib/analysis";
import {
  formatDateTime,
  formatDaysToChurn,
  formatNumber,
  formatPercent,
  formatUncertaintyRange,
} from "@/lib/format";

function riskOf(probability: number) {
  if (probability > 0.7) {
    return {
      label: "Wysokie",
      icon: ShieldAlert,
      className: "text-risk-high bg-risk-high/10 ring-risk-high/25",
    };
  }
  if (probability >= 0.3) {
    return {
      label: "Średnie",
      icon: ShieldQuestion,
      className: "text-risk-medium bg-risk-medium/10 ring-risk-medium/25",
    };
  }
  return {
    label: "Niskie",
    icon: ShieldCheck,
    className: "text-risk-low bg-risk-low/10 ring-risk-low/25",
  };
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? formatNumber(value)
      : value.toLocaleString("pl-PL", { maximumFractionDigits: 3 });
  }
  return String(value);
}

export function AnalysisResultCard({
  analysis,
  isLoading = false,
}: {
  analysis: ActiveAnalysis;
  isLoading?: boolean;
}) {
  const rows = analysis.predictions.slice(0, 10);

  // Zbierz nazwy dodatkowych cech z raw_features (pomijając pola już widoczne w głównych kolumnach)
  const featureColumns = Array.from(
    rows.reduce((set, item) => {
      for (const key of Object.keys(item.raw_features ?? {})) {
        set.add(key);
      }
      return set;
    }, new Set<string>()),
  );

  return (
    <Card
      className={cn(
        "bg-card/70 backdrop-blur-sm transition-opacity",
        isLoading && "opacity-60",
      )}
    >
      <CardHeader className="gap-4 border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <FileSpreadsheet className="size-5 text-primary" />
              <span>{analysis.filename}</span>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {analysis.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Wgrano: {formatDateTime(analysis.createdAt)}
                </span>
              )}
              <span>
                Top {formatNumber(rows.length)} najbardziej zagrożonych klientów
              </span>
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {analysis.status}
          </Badge>
        </div>

        {/* Podsumowanie analizy */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-background/50 p-3.5 ring-1 ring-border/70">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Liczba klientów</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatNumber(analysis.rowsCount)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-background/50 p-3.5 ring-1 ring-border/70">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-risk-high/10 text-risk-high">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Zagrożeni odejściem</p>
              <p className="text-lg font-semibold tabular-nums text-risk-high">
                {formatNumber(analysis.highRiskCount)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-background/50 p-3.5 ring-1 ring-border/70">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-risk-medium/10 text-risk-medium">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Średnie ryzyko</p>
              <p className="text-lg font-semibold tabular-nums">
                {formatPercent(analysis.avgChurnProbability)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            Brak predykcji klientów dla tej analizy.
          </p>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-4 text-muted-foreground">#</TableHead>
                  <TableHead>Indeks klienta</TableHead>
                  <TableHead>Prawdopodobieństwo odejścia</TableHead>
                  <TableHead>Przedział niepewności</TableHead>
                  <TableHead>Przewidywany czas do rezygnacji</TableHead>
                  {featureColumns.map((column) => (
                    <TableHead key={column} className="font-mono text-xs text-muted-foreground">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item, index) => {
                  const risk = riskOf(item.churn_probability);
                  return (
                    <TableRow key={item.id ?? `${item.client_index}-${index}`}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono font-medium tabular-nums">
                        #{formatNumber(item.client_index)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium ring-1",
                            risk.className,
                          )}
                        >
                          <risk.icon className="size-3.5" />
                          <span className="tabular-nums">
                            {formatPercent(item.churn_probability)}
                          </span>
                          <span className="opacity-80">· {risk.label}</span>
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground tabular-nums">
                        {formatUncertaintyRange(item.uncertainty_low, item.uncertainty_high)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {formatDaysToChurn(item.predicted_days_to_churn)}
                        </span>
                      </TableCell>
                      {featureColumns.map((column) => (
                        <TableCell
                          key={column}
                          className="max-w-[200px] truncate text-muted-foreground tabular-nums"
                        >
                          {formatCell(item.raw_features?.[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

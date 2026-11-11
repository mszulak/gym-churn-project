import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AnalysisResult } from "@/lib/analysis";
import { formatNumber } from "@/lib/format";

const PROBABILITY_KEY = "churn_probability";

/** Progi poglądowe — do uzgodnienia z modelem. */
function riskOf(probability: number) {
  if (probability > 0.7)
    return { label: "Wysokie", icon: ShieldAlert, className: "text-risk-high bg-risk-high/10 ring-risk-high/25" };
  if (probability >= 0.3)
    return { label: "Średnie", icon: ShieldQuestion, className: "text-risk-medium bg-risk-medium/10 ring-risk-medium/25" };
  return { label: "Niskie", icon: ShieldCheck, className: "text-risk-low bg-risk-low/10 ring-risk-low/25" };
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

export function AnalysisResultCard({ result }: { result: AnalysisResult }) {
  const rows = result.top_10_risk ?? [];
  const columns = result.columns.filter((c) => c !== PROBABILITY_KEY);

  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-primary" />
          Wyniki analizy
        </CardTitle>
        <CardDescription>
          Przeanalizowano {formatNumber(result.rows)} klientów z pliku{" "}
          <span className="font-medium text-foreground">{result.filename}</span>. Poniżej{" "}
          {formatNumber(rows.length)} osób z najwyższym ryzykiem rezygnacji.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="border-t px-4 pt-4 text-sm text-muted-foreground">Brak wyników do wyświetlenia.</p>
        ) : (
          <div className="max-h-[480px] overflow-auto border-t">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 pl-4 text-muted-foreground">#</TableHead>
                  <TableHead>Ryzyko rezygnacji</TableHead>
                  {columns.map((column) => (
                    <TableHead key={column} className="font-mono text-xs">
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const probability = Number(row[PROBABILITY_KEY] ?? 0);
                  const risk = riskOf(probability);
                  return (
                    <TableRow key={index}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">{index + 1}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1",
                            risk.className,
                          )}
                        >
                          <risk.icon className="size-3.5" />
                          <span className="tabular-nums">
                            {(probability * 100).toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%
                          </span>
                          <span className="opacity-80">· {risk.label}</span>
                        </span>
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column} className="max-w-[200px] truncate tabular-nums">
                          {formatCell(row[column])}
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

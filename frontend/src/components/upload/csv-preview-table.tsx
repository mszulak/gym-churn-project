import { Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CsvPreview } from "@/lib/csv";
import { formatNumber } from "@/lib/format";

export function CsvPreviewTable({ preview }: { preview: CsvPreview }) {
  const { columns, rows, totalRows } = preview;

  return (
    <Card className="bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          Podgląd danych
        </CardTitle>
        <CardDescription>
          Pierwsze {formatNumber(rows.length)} z {formatNumber(totalRows)} wierszy
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[420px] overflow-auto border-t">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12 pl-4 text-muted-foreground">#</TableHead>
                {columns.map((column) => (
                  <TableHead key={column} className="font-mono text-xs">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-4 text-muted-foreground tabular-nums">
                    {index + 1}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column}
                      className="max-w-[240px] truncate tabular-nums"
                      title={row[column] ?? ""}
                    >
                      {row[column] || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

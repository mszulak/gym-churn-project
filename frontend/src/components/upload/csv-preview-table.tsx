import { TableIcon } from "lucide-react";
import type { CsvPreviewData } from "@/lib/csv";
import { formatInteger } from "@/lib/format";

interface CsvPreviewTableProps {
  preview: CsvPreviewData;
}

export function CsvPreviewTable({ preview }: CsvPreviewTableProps) {
  const { headers, previewRows, totalRows } = preview;

  if (headers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <TableIcon className="size-4 text-primary" aria-hidden="true" />
          <span>Local file preview (first {previewRows.length} rows)</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          Showing {previewRows.length} of {formatInteger(totalRows)} records
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/60">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/80 bg-secondary/60">
              <th className="w-10 px-3 py-2.5 font-mono text-[11px] font-medium text-muted-foreground">
                #
              </th>
              {headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className="px-3 py-2.5 font-mono text-[11px] font-semibold whitespace-nowrap text-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {previewRows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-secondary/30"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {rowIndex + 1}
                </td>
                {headers.map((_, colIndex) => {
                  const cellValue = row[colIndex] ?? "";
                  return (
                    <td
                      key={colIndex}
                      className="max-w-48 truncate px-3 py-2 font-mono text-xs whitespace-nowrap text-foreground/90"
                      title={cellValue}
                    >
                      {cellValue || (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const integerFormatter = new Intl.NumberFormat("en-US");

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

/**
 * Formats a probability value (either `0.0–1.0` or `0–100`) as a percentage string.
 */
export function formatProbabilityPercent(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const pct = value <= 1 && value >= 0 ? value * 100 : value;
  return `${pct.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatUncertaintyRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (
    low === null ||
    low === undefined ||
    high === null ||
    high === undefined ||
    Number.isNaN(low) ||
    Number.isNaN(high)
  ) {
    return "—";
  }

  return `${formatProbabilityPercent(low, 1)} – ${formatProbabilityPercent(high, 1)}`;
}

export function formatDaysToChurn(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return "—";
  }

  const rounded = Math.round(days);
  return `${formatInteger(rounded)} ${rounded === 1 ? "day" : "days"}`;
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) {
    return "—";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return dateTimeFormatter.format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

export function formatDelimiterLabel(delimiter: string): string {
  switch (delimiter) {
    case ",":
      return "Delimiter: comma (,)";
    case ";":
      return "Delimiter: semicolon (;)";
    case "\t":
      return "Delimiter: tab (TAB)";
    case "|":
      return "Delimiter: pipe (|)";
    default:
      return `Delimiter: "${delimiter}"`;
  }
}

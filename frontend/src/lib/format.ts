const numberFormatter = new Intl.NumberFormat("pl-PL");

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Formatuje wartość ułamkową (0.0 – 1.0) jako procent, np. `0.742` -> `"74,2%"`. */
export function formatPercent(probability: number | null | undefined, digits = 1): string {
  if (probability === null || probability === undefined || Number.isNaN(probability)) {
    return "—";
  }
  return `${(probability * 100).toLocaleString("pl-PL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Formatuje przedział niepewności (`uncertainty_low` – `uncertainty_high`) jako procenty. */
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
  const lowStr = (low * 100).toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const highStr = (high * 100).toLocaleString("pl-PL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${lowStr}% – ${highStr}%`;
}

/** Formatuje liczbę dni z poprawną polską odmianą ("1 dzień" / "14 dni"). */
export function formatDaysToChurn(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) {
    return "—";
  }
  const rounded = Math.round(days);
  return `${formatNumber(rounded)} ${rounded === 1 ? "dzień" : "dni"}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return dateTimeFormatter.format(date);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function describeDelimiter(delimiter: string): string {
  switch (delimiter) {
    case ",":
      return "przecinek ( , )";
    case ";":
      return "średnik ( ; )";
    case "\t":
      return "tabulator";
    case "|":
      return "kreska ( | )";
    default:
      return `„${delimiter}”`;
  }
}

const numberFormatter = new Intl.NumberFormat("pl-PL");

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
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

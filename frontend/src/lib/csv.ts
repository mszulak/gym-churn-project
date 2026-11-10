import Papa from "papaparse";
import { uploadConfig } from "@/config/site";

export type CsvRow = Record<string, string>;

export interface CsvPreview {
  columns: string[];
  rows: CsvRow[];
  totalRows: number;
  delimiter: string;
  /** Liczba wierszy z błędami parsowania (np. zła liczba kolumn). */
  errorCount: number;
}

/**
 * Walidacja pliku przed parsowaniem. Zwraca komunikat błędu albo null.
 */
export function validateCsvFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidExtension = uploadConfig.acceptedExtensions.some((ext) =>
    name.endsWith(ext),
  );

  if (!hasValidExtension) {
    return "Nieobsługiwany format pliku. Wgraj plik z rozszerzeniem .csv.";
  }
  if (file.size === 0) {
    return "Plik jest pusty.";
  }
  if (file.size > uploadConfig.maxFileSizeBytes) {
    const limitMb = uploadConfig.maxFileSizeBytes / 1024 / 1024;
    return `Plik jest za duży. Maksymalny rozmiar to ${limitMb} MB.`;
  }
  return null;
}

/**
 * Parsuje plik CSV lokalnie w przeglądarce (nic nie jest wysyłane na serwer).
 * Czyta plik strumieniowo: zbiera kilka pierwszych wierszy do podglądu
 * i liczy wszystkie wiersze.
 */
export function parseCsvPreview(file: File): Promise<CsvPreview> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    let columns: string[] = [];
    let delimiter = ",";
    let totalRows = 0;
    let errorCount = 0;

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      chunk: (results) => {
        if (columns.length === 0 && results.meta.fields) {
          columns = results.meta.fields.filter((field) => field !== "");
          delimiter = results.meta.delimiter;
        }
        totalRows += results.data.length;
        errorCount += results.errors.length;

        const missing = uploadConfig.previewRows - rows.length;
        if (missing > 0) {
          rows.push(...results.data.slice(0, missing));
        }
      },
      complete: () => {
        if (columns.length === 0) {
          reject(new Error("Nie udało się odczytać nagłówków kolumn z pliku."));
          return;
        }
        resolve({ columns, rows, totalRows, delimiter, errorCount });
      },
      error: (error) => {
        reject(new Error(`Błąd odczytu pliku: ${error.message}`));
      },
    });
  });
}

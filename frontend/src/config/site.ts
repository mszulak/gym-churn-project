/**
 * Centralna konfiguracja aplikacji — nazwa, opis i limity w jednym miejscu.
 */
export const siteConfig = {
  name: "Gym Churn Analysis",
  shortName: "GCA",
  version: "0.1",
  description:
    "Wykrywaj klientów siłowni z wysokim ryzykiem rezygnacji z karnetu i reaguj, zanim odejdą.",
} as const;

export const uploadConfig = {
  /** Maksymalny rozmiar pliku CSV w bajtach (50 MB). */
  maxFileSizeBytes: 50 * 1024 * 1024,
  /** Liczba wierszy pokazywanych w podglądzie. */
  previewRows: 10,
  acceptedExtensions: [".csv"],
  acceptedMimeTypes: ["text/csv", "application/vnd.ms-excel", "text/plain", ""],
} as const;

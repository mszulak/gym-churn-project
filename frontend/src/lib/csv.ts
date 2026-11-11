import Papa from "papaparse";
import { uploadConfig } from "@/config/site";

export const MAX_CSV_SIZE_BYTES = uploadConfig.maxFileSizeBytes;

export interface CsvPreviewData {
  headers: string[];
  previewRows: string[][];
  totalRows: number;
  delimiter: string;
}

export function validateCsvFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasValidExt = uploadConfig.acceptedExtensions.some((ext) =>
    lowerName.endsWith(ext),
  );

  if (!hasValidExt) {
    return "Unsupported file format. Please select a .csv file.";
  }

  if (file.size === 0) {
    return "The selected CSV file is empty.";
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    const maxMb = Math.round(MAX_CSV_SIZE_BYTES / (1024 * 1024));
    return `File exceeds the maximum allowed size (${maxMb} MB).`;
  }

  return null;
}

/**
 * Streams the CSV file in the browser to extract headers, the first N preview rows,
 * and the total record count without loading the entire file into memory.
 */
export function parseCsvPreview(
  file: File,
  maxPreviewRows = uploadConfig.previewRows,
): Promise<CsvPreviewData> {
  return new Promise((resolve, reject) => {
    let headers: string[] = [];
    const previewRows: string[][] = [];
    let totalRows = 0;
    let detectedDelimiter = ",";

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: "greedy",
      chunk: (results) => {
        if (results.meta.delimiter) {
          detectedDelimiter = results.meta.delimiter;
        }

        for (const row of results.data) {
          if (!Array.isArray(row) || row.length === 0) {
            continue;
          }

          if (headers.length === 0) {
            headers = row.map((cell, idx) => {
              const trimmed = String(cell ?? "").trim();
              return trimmed || `Column_${idx + 1}`;
            });
            continue;
          }

          totalRows += 1;

          if (previewRows.length < maxPreviewRows) {
            previewRows.push(row.map((cell) => String(cell ?? "").trim()));
          }
        }
      },
      complete: () => {
        if (headers.length === 0) {
          reject(
            new Error("Could not find column headers in the selected CSV file."),
          );
          return;
        }

        if (totalRows === 0) {
          reject(
            new Error(
              "The CSV file contains column headers only and has no client records.",
            ),
          );
          return;
        }

        resolve({
          headers,
          previewRows,
          totalRows,
          delimiter: detectedDelimiter,
        });
      },
      error: (error) => {
        reject(new Error(`Error reading CSV file: ${error.message}`));
      },
    });
  });
}

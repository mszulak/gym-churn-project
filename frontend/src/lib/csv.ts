import Papa from "papaparse";
import { uploadConfig } from "@/config/site";

export const MAX_CSV_SIZE_BYTES = uploadConfig.maxFileSizeBytes;

export type CsvSlotKey = "members_file" | "contracts_file" | "check_ins_file";

export interface CsvSlotDefinition {
  key: CsvSlotKey;
  stepNumber: number;
  title: string;
  shortLabel: string;
  subtitle: string;
  expectedFilenameHint: string;
  requiredColumns: readonly string[];
}

export const CSV_SLOTS: readonly CsvSlotDefinition[] = [
  {
    key: "members_file",
    stepNumber: 1,
    title: "1. Members Database",
    shortLabel: "member list",
    subtitle: "Demographic features and initial habit anchors / frictions.",
    expectedFilenameHint: "members.csv",
    requiredColumns: [
      "member_id",
      "age",
      "distance_km",
      "promo_friends",
      "partners_company",
    ],
  },
  {
    key: "contracts_file",
    stepNumber: 2,
    title: "2. Contracts History",
    shortLabel: "contracts history",
    subtitle: "All historical and currently active membership contracts.",
    expectedFilenameHint: "contracts.csv",
    requiredColumns: [
      "contract_id",
      "member_id",
      "start_date",
      "end_date",
      "duration_months",
      "monthly_price",
      "status",
    ],
  },
  {
    key: "check_ins_file",
    stepNumber: 3,
    title: "3. Gate Check-in Logs",
    shortLabel: "gate check-in logs",
    subtitle: "Raw member card swipes and activity timestamps at the club gate.",
    expectedFilenameHint: "check_ins.csv",
    requiredColumns: [
      "member_id",
      "timestamp",
      "is_group_class",
      "additional_spend",
    ],
  },
] as const;

export interface CsvPreviewData {
  headers: string[];
  previewRows: string[][];
  totalRows: number;
  delimiter: string;
}

export interface CsvSlotValidationResult {
  valid: boolean;
  headers: string[];
  missingColumns: string[];
  delimiter: string;
  errorMessage: string | null;
}

export function validateCsvFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasValidExt = uploadConfig.acceptedExtensions.some((ext) =>
    lowerName.endsWith(ext),
  );

  if (!hasValidExt) {
    return "Unsupported file format. Please select a .csv file.";
  }

  if (file.size <= 0) {
    return "The selected CSV file is empty (0 bytes).";
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    const maxMb = Math.round(MAX_CSV_SIZE_BYTES / (1024 * 1024));
    return `File exceeds the maximum allowed size (${maxMb} MB).`;
  }

  return null;
}

/**
 * Asynchronously reads the first 2 KB of the CSV file (`file.slice(0, 2048).text()`),
 * extracts the header line (removing BOM and surrounding whitespace/quotes),
 * splits by comma or semicolon, and verifies all required columns for the given slot.
 */
export async function sniffAndValidateCsvSlot(
  file: File,
  slotKey: CsvSlotKey,
): Promise<CsvSlotValidationResult> {
  const slotDef = CSV_SLOTS.find((s) => s.key === slotKey);
  if (!slotDef) {
    return {
      valid: false,
      headers: [],
      missingColumns: [],
      delimiter: ",",
      errorMessage: "Unknown upload slot configuration.",
    };
  }

  const baseError = validateCsvFile(file);
  if (baseError) {
    return {
      valid: false,
      headers: [],
      missingColumns: [...slotDef.requiredColumns],
      delimiter: ",",
      errorMessage: baseError,
    };
  }

  let chunkText = "";
  try {
    chunkText = await file.slice(0, 2048).text();
  } catch {
    return {
      valid: false,
      headers: [],
      missingColumns: [...slotDef.requiredColumns],
      delimiter: ",",
      errorMessage: "Failed to read the CSV file header. Please try selecting the file again.",
    };
  }

  // Strip UTF-8 BOM if present and extract the first non-empty line
  const cleaned = chunkText.replace(/^\uFEFF/, "").trim();
  const firstLine = cleaned.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";

  if (!firstLine) {
    return {
      valid: false,
      headers: [],
      missingColumns: [...slotDef.requiredColumns],
      delimiter: ",",
      errorMessage: "Could not find a header line in the selected CSV file.",
    };
  }

  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  const rawHeaders = firstLine
    .split(delimiter)
    .map((col) => col.trim().replace(/^["']|["']$/g, "").trim())
    .filter((col) => col.length > 0);

  const normalizedSet = new Set(rawHeaders.map((h) => h.toLowerCase()));

  const missingColumns = slotDef.requiredColumns.filter(
    (reqCol) => !normalizedSet.has(reqCol.toLowerCase()),
  );

  if (missingColumns.length > 0) {
    // Check if the user accidentally dropped a file meant for one of the other slots
    const matchedOtherSlot = CSV_SLOTS.find(
      (other) =>
        other.key !== slotKey &&
        other.requiredColumns.every((col) => normalizedSet.has(col.toLowerCase())),
    );

    const mismatchHint = matchedOtherSlot
      ? ` This file matches "${matchedOtherSlot.title}" — did you upload it to the wrong slot?`
      : "";

    return {
      valid: false,
      headers: rawHeaders,
      missingColumns,
      delimiter,
      errorMessage: `Missing columns: ${missingColumns.join(", ")}. Are you sure you uploaded the ${slotDef.shortLabel} file?${mismatchHint}`,
    };
  }

  return {
    valid: true,
    headers: rawHeaders,
    missingColumns: [],
    delimiter,
    errorMessage: null,
  };
}

/**
 * Streams the CSV file in the browser to extract headers, the first N preview rows,
 * and the total record count without loading the entire file into memory.
 */
export function parseCsvPreview(
  file: File,
  maxPreviewRows: number = uploadConfig.previewRows,
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
              const trimmed = String(cell ?? "")
                .replace(/^\uFEFF/, "")
                .trim();
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
              "The CSV file contains column headers only and has no data rows.",
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

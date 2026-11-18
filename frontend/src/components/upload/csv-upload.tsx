"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  CSV_SLOTS,
  MAX_CSV_SIZE_BYTES,
  parseCsvPreview,
  sniffAndValidateCsvSlot,
  type CsvPreviewData,
  type CsvSlotDefinition,
  type CsvSlotKey,
} from "@/lib/csv";
import { formatBytes, formatDelimiterLabel } from "@/lib/format";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import type { UploadAnalysisResponse } from "@/lib/api";
import {
  isAnalysisFailed,
  isAnalysisInProgress,
} from "@/lib/analysis";
import { CsvPreviewTable } from "./csv-preview-table";

interface CsvUploadProps {
  onUploadSuccess?: (result: UploadAnalysisResponse) => void;
  activeJobId?: string | null;
  activeStatus?: string | null;
}

interface SlotState {
  file: File | null;
  valid: boolean;
  isSniffing: boolean;
  headers: string[];
  missingColumns: string[];
  delimiter: string;
  errorMessage: string | null;
  preview: CsvPreviewData | null;
  isPreviewOpen: boolean;
  isPreviewLoading: boolean;
}

const INITIAL_SLOT_STATE: SlotState = {
  file: null,
  valid: false,
  isSniffing: false,
  headers: [],
  missingColumns: [],
  delimiter: ",",
  errorMessage: null,
  preview: null,
  isPreviewOpen: false,
  isPreviewLoading: false,
};

function getSlotIcon(key: CsvSlotKey) {
  switch (key) {
    case "members_file":
      return Users;
    case "contracts_file":
      return FileText;
    case "check_ins_file":
      return Activity;
  }
}

export function CsvUpload({
  onUploadSuccess,
  activeJobId,
  activeStatus,
}: CsvUploadProps) {
  const router = useRouter();
  const baseId = useId();

  const fileInputRefs = useRef<Record<CsvSlotKey, HTMLInputElement | null>>({
    members_file: null,
    contracts_file: null,
    check_ins_file: null,
  });

  const [slots, setSlots] = useState<Record<CsvSlotKey, SlotState>>({
    members_file: { ...INITIAL_SLOT_STATE },
    contracts_file: { ...INITIAL_SLOT_STATE },
    check_ins_file: { ...INITIAL_SLOT_STATE },
  });

  const [draggingSlot, setDraggingSlot] = useState<CsvSlotKey | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastUploadedJob, setLastUploadedJob] = useState<{
    id: string;
    filename: string;
    initialStatus: string;
  } | null>(null);

  function updateSlot(
    key: CsvSlotKey,
    updater: (prev: SlotState) => SlotState,
  ) {
    setSlots((prev) => ({
      ...prev,
      [key]: updater(prev[key]),
    }));
  }

  async function processSlotFile(slotKey: CsvSlotKey, file: File) {
    setGlobalError(null);
    setLastUploadedJob(null);

    updateSlot(slotKey, () => ({
      ...INITIAL_SLOT_STATE,
      file,
      isSniffing: true,
    }));

    const result = await sniffAndValidateCsvSlot(file, slotKey);

    updateSlot(slotKey, (prev) => ({
      ...prev,
      file,
      isSniffing: false,
      valid: result.valid,
      headers: result.headers,
      missingColumns: result.missingColumns,
      delimiter: result.delimiter,
      errorMessage: result.errorMessage,
      preview: null,
      isPreviewOpen: false,
      isPreviewLoading: false,
    }));
  }

  function handleSlotFileChange(
    slotKey: CsvSlotKey,
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (file) {
      void processSlotFile(slotKey, file);
    }
    event.target.value = "";
  }

  function handleSlotDrop(
    slotKey: CsvSlotKey,
    event: React.DragEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setDraggingSlot(null);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processSlotFile(slotKey, file);
    }
  }

  function handleClearSlot(slotKey: CsvSlotKey) {
    updateSlot(slotKey, () => ({ ...INITIAL_SLOT_STATE }));
    const input = fileInputRefs.current[slotKey];
    if (input) {
      input.value = "";
    }
  }

  function handleClearAll() {
    setSlots({
      members_file: { ...INITIAL_SLOT_STATE },
      contracts_file: { ...INITIAL_SLOT_STATE },
      check_ins_file: { ...INITIAL_SLOT_STATE },
    });
    setGlobalError(null);
    for (const slot of CSV_SLOTS) {
      const input = fileInputRefs.current[slot.key];
      if (input) {
        input.value = "";
      }
    }
  }

  async function handleTogglePreview(slotKey: CsvSlotKey) {
    const current = slots[slotKey];
    if (!current.file || !current.valid) return;

    if (current.isPreviewOpen) {
      updateSlot(slotKey, (prev) => ({ ...prev, isPreviewOpen: false }));
      return;
    }

    if (current.preview) {
      updateSlot(slotKey, (prev) => ({ ...prev, isPreviewOpen: true }));
      return;
    }

    updateSlot(slotKey, (prev) => ({ ...prev, isPreviewLoading: true }));
    try {
      const parsed = await parseCsvPreview(current.file, 5);
      updateSlot(slotKey, (prev) => ({
        ...prev,
        preview: parsed,
        isPreviewOpen: true,
        isPreviewLoading: false,
      }));
    } catch (error) {
      updateSlot(slotKey, (prev) => ({
        ...prev,
        isPreviewLoading: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to parse preview rows from this CSV file.",
      }));
    }
  }

  const validSlotsCount = CSV_SLOTS.filter((s) => slots[s.key].valid).length;
  const allSlotsValid = validSlotsCount === CSV_SLOTS.length;
  const anySlotSelected = CSV_SLOTS.some((s) => slots[s.key].file !== null);

  async function handleSubmitToBackend() {
    if (!allSlotsValid || isUploading) {
      return;
    }

    const membersFile = slots.members_file.file;
    const contractsFile = slots.contracts_file.file;
    const checkInsFile = slots.check_ins_file.file;

    if (!membersFile || !contractsFile || !checkInsFile) {
      return;
    }

    setIsUploading(true);
    setGlobalError(null);

    try {
      const formData = new FormData();
      formData.append("members_file", membersFile, membersFile.name);
      formData.append("contracts_file", contractsFile, contractsFile.name);
      formData.append("check_ins_file", checkInsFile, checkInsFile.name);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (response.status === 401) {
        router.push(`${AUTH_ROUTES.login}?expired=1`);
        router.refresh();
        return;
      }

      if (!response.ok) {
        const detail =
          payload && typeof payload.detail === "string"
            ? payload.detail
            : `Upload error (${response.status}).`;
        setGlobalError(detail);
        return;
      }

      const uploadedResult = (payload ?? {}) as UploadAnalysisResponse;
      const resolvedId =
        uploadedResult.id ??
        uploadedResult.task_id ??
        uploadedResult.job_id ??
        "";
      const combinedFilename =
        uploadedResult.filename ||
        `${membersFile.name}, ${contractsFile.name}, ${checkInsFile.name}`;

      setLastUploadedJob({
        id: resolvedId,
        filename: combinedFilename,
        initialStatus: uploadedResult.status ?? "PENDING",
      });

      handleClearAll();
      onUploadSuccess?.({
        ...uploadedResult,
        filename: combinedFilename,
      });
    } catch {
      setGlobalError(
        "An error occurred while sending the 3 CSV files to the server. Check your connection and try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  const effectiveUploadStatus =
    lastUploadedJob &&
    activeJobId === lastUploadedJob.id &&
    activeStatus
      ? activeStatus
      : lastUploadedJob?.initialStatus;

  const isUploadProcessing = isAnalysisInProgress(effectiveUploadStatus);
  const isUploadFailed = isAnalysisFailed(effectiveUploadStatus);

  function renderSlotCard(slotDef: CsvSlotDefinition) {
    const slotState = slots[slotDef.key];
    const SlotIcon = getSlotIcon(slotDef.key);
    const inputId = `${baseId}-${slotDef.key}`;
    const isDragging = draggingSlot === slotDef.key;
    const hasFile = slotState.file !== null;
    const hasError = Boolean(slotState.errorMessage);
    const isValid = slotState.valid && hasFile && !hasError;

    const detectedLower = new Set(
      slotState.headers.map((h) => h.toLowerCase()),
    );

    return (
      <div
        key={slotDef.key}
        className={cn(
          "flex flex-col justify-between rounded-xl border p-4 transition-all",
          isValid
            ? "border-emerald-500/45 bg-emerald-500/[0.06] shadow-sm"
            : hasError
              ? "border-destructive/55 bg-destructive/[0.06]"
              : isDragging
                ? "border-primary bg-primary/10"
                : "border-border/80 bg-background/50 hover:border-primary/40",
        )}
      >
        <input
          ref={(el) => {
            fileInputRefs.current[slotDef.key] = el;
          }}
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleSlotFileChange(slotDef.key, e)}
          className="sr-only"
        />

        <div className="space-y-3">
          {/* Slot Header */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <span
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors",
                  isValid
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : hasError
                      ? "border-destructive/40 bg-destructive/15 text-destructive"
                      : "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                <SlotIcon className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    {slotDef.title}
                  </h3>
                  <span className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {slotDef.key}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {slotDef.subtitle}
                </p>
              </div>
            </div>

            {isValid ? (
              <Badge className="shrink-0 border-emerald-500/40 bg-emerald-500/15 text-[11px] text-emerald-300 hover:bg-emerald-500/15">
                <CheckCircle2 className="mr-1 size-3" aria-hidden="true" />
                Verified
              </Badge>
            ) : hasError ? (
              <Badge className="shrink-0 border-destructive/40 bg-destructive/15 text-[11px] text-destructive hover:bg-destructive/15">
                <AlertCircle className="mr-1 size-3" aria-hidden="true" />
                Invalid
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 font-mono text-[10px] text-muted-foreground"
              >
                Required
              </Badge>
            )}
          </div>

          {/* Required Columns Checklist */}
          <div className="rounded-lg border border-border/60 bg-card/60 p-2.5">
            <p className="mb-1.5 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              Required CSV Columns ({slotDef.requiredColumns.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {slotDef.requiredColumns.map((colName) => {
                const isPresent = detectedLower.has(colName.toLowerCase());
                const isMissing =
                  hasFile &&
                  !slotState.isSniffing &&
                  slotState.missingColumns.includes(colName);

                return (
                  <span
                    key={colName}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors",
                      isPresent
                        ? "border border-emerald-500/35 bg-emerald-500/15 font-medium text-emerald-300"
                        : isMissing
                          ? "border border-destructive/45 bg-destructive/15 font-semibold text-destructive"
                          : "bg-secondary/70 text-muted-foreground",
                    )}
                  >
                    {colName}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Dropzone or Selected File Summary */}
          {!hasFile || !isValid ? (
            <label
              htmlFor={inputId}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggingSlot !== slotDef.key) {
                  setDraggingSlot(slotDef.key);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDraggingSlot(null);
              }}
              onDrop={(e) => handleSlotDrop(slotDef.key, e)}
              className={cn(
                "group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all",
                isDragging
                  ? "border-primary bg-primary/15"
                  : hasError
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive/75"
                    : "border-border/80 bg-background/40 hover:border-primary/50 hover:bg-secondary/30",
              )}
            >
              {slotState.isSniffing ? (
                <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Loader2
                    className="size-4 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <span>Inspecting CSV headers (first 2 KB)...</span>
                </div>
              ) : (
                <>
                  <Upload
                    className={cn(
                      "mb-2 size-5 transition-transform group-hover:scale-105",
                      hasError ? "text-destructive" : "text-primary",
                    )}
                    aria-hidden="true"
                  />
                  <p className="font-heading text-xs font-semibold text-foreground sm:text-sm">
                    {isDragging
                      ? `Drop ${slotDef.expectedFilenameHint} here`
                      : hasFile
                        ? `Replace ${slotState.file?.name}`
                        : `Drop ${slotDef.expectedFilenameHint} or click to browse`}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    .csv up to {formatBytes(MAX_CSV_SIZE_BYTES)}
                  </p>
                </>
              )}
            </label>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2.5">
                  <FileSpreadsheet
                    className="mt-0.5 size-4 shrink-0 text-emerald-400"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate font-mono text-xs font-semibold text-foreground"
                      title={slotState.file?.name}
                    >
                      {slotState.file?.name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatBytes(slotState.file?.size ?? 0)} •{" "}
                      {slotState.headers.length} cols •{" "}
                      {formatDelimiterLabel(slotState.delimiter)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleTogglePreview(slotDef.key)}
                    disabled={isUploading || slotState.isPreviewLoading}
                    className="h-7 px-2 text-[11px]"
                    title="Preview first rows"
                  >
                    {slotState.isPreviewLoading ? (
                      <Loader2
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : slotState.isPreviewOpen ? (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRefs.current[slotDef.key]?.click()}
                    disabled={isUploading}
                    className="h-7 px-2 text-[11px]"
                    title="Change CSV file"
                  >
                    <RefreshCw className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearSlot(slotDef.key)}
                    disabled={isUploading}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                    title="Remove file"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Slot-Specific Validation Error */}
          {slotState.errorMessage ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/45 bg-destructive/15 p-2.5 text-xs text-destructive"
            >
              <AlertCircle
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <div className="space-y-0.5">
                {slotState.file ? (
                  <p className="font-mono text-[11px] font-semibold">
                    {slotState.file.name}
                  </p>
                ) : null}
                <p className="leading-relaxed text-[11px] text-destructive/95">
                  {slotState.errorMessage}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const openPreviews = CSV_SLOTS.filter(
    (s) => slots[s.key].isPreviewOpen && slots[s.key].preview,
  );

  return (
    <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        {/* 3-Slot Grid */}
        <div className="grid gap-4 lg:grid-cols-3">
          {CSV_SLOTS.map((slotDef) => renderSlotCard(slotDef))}
        </div>

        {/* Optional Local CSV Previews */}
        {openPreviews.length > 0 ? (
          <div className="space-y-4">
            {openPreviews.map((slotDef) => {
              const preview = slots[slotDef.key].preview;
              if (!preview) return null;
              return (
                <div
                  key={slotDef.key}
                  className="rounded-xl border border-border/70 bg-background/40 p-3.5"
                >
                  <p className="mb-2 font-heading text-xs font-semibold text-primary">
                    {slotDef.title} — {slots[slotDef.key].file?.name}
                  </p>
                  <CsvPreviewTable preview={preview} />
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Submission Footer Bar */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-border/80 bg-secondary/40 p-4 sm:flex-row sm:items-center">
          <div className="space-y-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-heading text-sm font-semibold text-foreground">
                Hierarchical Habit &amp; Churn Model (NumPyro SVI + Decision Engine)
              </p>
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[11px]",
                  allSlotsValid
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-border text-muted-foreground",
                )}
              >
                {validSlotsCount} / 3 files verified
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {allSlotsValid
                ? "All 3 CSV files passed header validation and are ready for multipart upload."
                : "Upload and verify all 3 CSV files (members_file, contracts_file, check_ins_file) to unlock model execution."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {anySlotSelected ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isUploading}
                className="cursor-pointer text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
                Reset all slots
              </Button>
            ) : null}

            <Button
              type="button"
              size="lg"
              onClick={() => void handleSubmitToBackend()}
              disabled={!allSlotsValid || isUploading}
              className="shrink-0 cursor-pointer font-semibold shadow-md shadow-primary/20"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Uploading 3 CSV files...
                </>
              ) : (
                <>
                  <Send className="size-4" aria-hidden="true" />
                  Run Hierarchical Churn Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Async Polling Pipeline Status Message */}
        {lastUploadedJob ? (
          isUploadProcessing ? (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-200 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <Loader2
                  className="mt-0.5 size-4.5 shrink-0 animate-spin text-amber-400"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-heading text-xs font-semibold text-amber-100 sm:text-sm">
                    Filtering gate noise (&lt;45 min), reconstructing episodes, and
                    estimating SVI habit curves...
                  </p>
                  <p className="text-[11px] text-amber-200/85">
                    Training the hierarchical Bayesian model in NumPyro (SVI, 5,000
                    steps) and building the weekly attendance grid (~25–35 seconds).
                    Task status:{" "}
                    <strong className="font-mono text-amber-100">
                      {effectiveUploadStatus}
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          ) : isUploadFailed ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  Background analysis for{" "}
                  <strong className="font-mono font-semibold">
                    {lastUploadedJob.filename}
                  </strong>{" "}
                  failed. Please verify the CSV data integrity and try again.
                </span>
              </div>
            </div>
          ) : (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-primary/35 bg-primary/10 p-3.5 text-xs text-primary"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  Hierarchical model analysis for{" "}
                  <strong className="font-mono font-semibold">
                    {lastUploadedJob.filename}
                  </strong>{" "}
                  completed ({effectiveUploadStatus}) and loaded into the
                  Operational Dashboard below.
                </span>
              </div>
            </div>
          )
        ) : null}

        {globalError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">Upload error</p>
              <p className="text-xs text-destructive/90">{globalError}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

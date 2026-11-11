"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MAX_CSV_SIZE_BYTES,
  parseCsvPreview,
  validateCsvFile,
  type CsvPreviewData,
} from "@/lib/csv";
import { formatBytes, formatDelimiterLabel, formatInteger } from "@/lib/format";
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

export function CsvUpload({
  onUploadSuccess,
  activeJobId,
  activeStatus,
}: CsvUploadProps) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUploadedJob, setLastUploadedJob] = useState<{
    id: string;
    filename: string;
    initialStatus: string;
  } | null>(null);

  async function processFile(file: File) {
    setErrorMessage(null);
    setLastUploadedJob(null);

    const validationError = validateCsvFile(file);
    if (validationError) {
      setSelectedFile(null);
      setPreview(null);
      setErrorMessage(validationError);
      return;
    }

    setIsParsing(true);
    try {
      const parsedPreview = await parseCsvPreview(file);
      setSelectedFile(file);
      setPreview(parsedPreview);
    } catch (error) {
      setSelectedFile(null);
      setPreview(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to read the selected CSV file.",
      );
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  }

  function handleClear() {
    setSelectedFile(null);
    setPreview(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  async function handleSubmitToBackend() {
    if (!selectedFile || isUploading) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

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
        setErrorMessage(detail);
        return;
      }

      const uploadedResult = payload as UploadAnalysisResponse;
      const resolvedId = uploadedResult.id ?? uploadedResult.job_id ?? "";
      const resolvedFilename = uploadedResult.filename || selectedFile.name;

      setLastUploadedJob({
        id: resolvedId,
        filename: resolvedFilename,
        initialStatus: uploadedResult.status ?? "PENDING",
      });
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadSuccess?.(uploadedResult);
    } catch {
      setErrorMessage(
        "An error occurred while sending the file to the server. Check your connection and try again.",
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

  return (
    <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur-sm">
      <CardContent className="p-5 sm:p-6">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="sr-only"
        />

        {!selectedFile || !preview ? (
          <div className="space-y-4">
            <label
              htmlFor={inputId}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all sm:px-10 sm:py-10",
                "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border/80 bg-background/40 hover:border-primary/50 hover:bg-secondary/30",
              )}
            >
              <div
                className={cn(
                  "mb-3 flex size-12 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105",
                  isDragging
                    ? "border-primary/50 bg-primary/20 text-primary"
                    : "border-primary/25 bg-primary/10 text-primary",
                )}
              >
                <Upload className="size-6" aria-hidden="true" />
              </div>

              <p className="font-heading text-base font-bold text-foreground sm:text-lg">
                {isParsing
                  ? "Processing CSV file..."
                  : isDragging
                    ? "Drop CSV file here"
                    : "Select or drag & drop a member CSV file"}
              </p>

              <p className="mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
                Supports <span className="font-mono text-foreground">.csv</span>{" "}
                files up to {formatBytes(MAX_CSV_SIZE_BYTES)}. After selecting a
                file, you can preview its structure and run the churn prediction.
              </p>

              <div className="mt-5">
                <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all group-hover:bg-primary/90">
                  <Upload className="size-4" aria-hidden="true" />
                  Choose CSV file
                </span>
              </div>
            </label>

            {lastUploadedJob ? (
              isUploadProcessing ? (
                <div
                  role="status"
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-amber-400"
                      aria-hidden="true"
                    />
                    <span>
                      Analysis for{" "}
                      <strong className="font-mono font-semibold text-amber-100">
                        {lastUploadedJob.filename}
                      </strong>{" "}
                      has been queued ({effectiveUploadStatus}). Background
                      worker is processing the file...
                    </span>
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
                      failed. Please check the CSV file structure and try again.
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
                      Analysis for{" "}
                      <strong className="font-mono font-semibold">
                        {lastUploadedJob.filename}
                      </strong>{" "}
                      completed and saved to your history.
                    </span>
                  </div>
                </div>
              )
            ) : null}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/30 bg-primary/8 p-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                  <FileSpreadsheet className="size-5" aria-hidden="true" />
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {selectedFile.name}
                    </p>
                    <Badge className="bg-primary/20 text-primary hover:bg-primary/20">
                      Ready to analyze
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatBytes(selectedFile.size)} •{" "}
                    {formatInteger(preview.totalRows)} clients •{" "}
                    {preview.headers.length} columns •{" "}
                    {formatDelimiterLabel(preview.delimiter)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openFileDialog}
                  disabled={isUploading}
                  className="cursor-pointer"
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                  Change file
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={isUploading}
                  className="cursor-pointer text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove
                </Button>
              </div>
            </div>

            <CsvPreviewTable preview={preview} />

            <div className="flex flex-col justify-between gap-3 rounded-xl border border-border/80 bg-secondary/40 p-4 sm:flex-row sm:items-center">
              <div className="space-y-0.5 text-xs">
                <p className="font-medium text-foreground">
                  Run churn prediction in FastAPI
                </p>
                <p className="text-muted-foreground">
                  The file will be queued for background processing by the Celery
                  worker, and results will appear automatically once completed.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleSubmitToBackend}
                disabled={isUploading}
                className="shrink-0 cursor-pointer font-semibold shadow-md shadow-primary/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Uploading CSV...
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    Analyze CSV file
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {errorMessage ? (
          <div
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-medium">File error</p>
              <p className="text-xs text-destructive/90">{errorMessage}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

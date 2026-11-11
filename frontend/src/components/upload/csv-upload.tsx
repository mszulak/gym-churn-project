"use client";

import { useCallback, useId, useRef, useState } from "react";
import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Lock,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { uploadConfig } from "@/config/site";
import { parseCsvPreview, validateCsvFile, type CsvPreview } from "@/lib/csv";
import { describeDelimiter, formatFileSize, formatNumber } from "@/lib/format";
import {
  SessionExpiredError,
  redirectToSignout,
  uploadForAnalysis,
  type UploadAnalysisResponse,
} from "@/lib/analysis";
import { CsvPreviewTable } from "./csv-preview-table";

type UploadState =
  | { status: "idle" }
  | { status: "parsing"; file: File }
  | { status: "ready"; file: File; preview: CsvPreview }
  | { status: "error"; message: string; file?: File };

type SendingState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "done" }
  | { status: "error"; message: string };

interface CsvUploadProps {
  onAnalysisCompleted?: (result: UploadAnalysisResponse) => void;
}

export function CsvUpload({ onAnalysisCompleted }: CsvUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const parseToken = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [sending, setSending] = useState<SendingState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);

  const cancelSending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setSending({ status: "idle" });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const token = ++parseToken.current;
      cancelSending();

      const validationError = validateCsvFile(file);
      if (validationError) {
        setState({ status: "error", message: validationError, file });
        return;
      }

      setState({ status: "parsing", file });
      try {
        const preview = await parseCsvPreview(file);
        if (token !== parseToken.current) return;
        setState({ status: "ready", file, preview });
      } catch (err) {
        if (token !== parseToken.current) return;
        const message = err instanceof Error ? err.message : "Nieznany błąd.";
        setState({ status: "error", message, file });
      }
    },
    [cancelSending],
  );

  const reset = useCallback(() => {
    parseToken.current++;
    cancelSending();
    setState({ status: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }, [cancelSending]);

  const analyze = useCallback(async () => {
    if (state.status !== "ready") return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSending({ status: "sending" });
    try {
      const result = await uploadForAnalysis(state.file, controller.signal);
      if (controller.signal.aborted) return;
      setSending({ status: "done" });
      onAnalysisCompleted?.(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof SessionExpiredError) {
        redirectToSignout();
        return;
      }
      const message = err instanceof Error ? err.message : "Nieznany błąd.";
      setSending({ status: "error", message });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [state, onAnalysisCompleted]);

  const openFilePicker = () => inputRef.current?.click();

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  };

  const hasFile = state.status === "ready" || state.status === "parsing";

  return (
    <div className="flex w-full flex-col gap-5">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={uploadConfig.acceptedExtensions.join(",") + ",text/csv"}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = "";
        }}
      />

      {!hasFile && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Wgraj plik CSV z danymi klientów"
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "group relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all outline-none sm:py-12",
            "bg-card/40 backdrop-blur-sm hover:border-primary/60 hover:bg-card/70",
            "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20",
            isDragging
              ? "scale-[1.01] border-primary bg-primary/5"
              : "border-border",
          )}
        >
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/30 transition-transform",
              "group-hover:scale-105",
              isDragging && "scale-110",
            )}
          >
            <Upload className="size-8" strokeWidth={1.75} />
          </div>

          <div className="space-y-1.5">
            <p className="text-lg font-semibold tracking-tight sm:text-xl">
              {isDragging ? "Upuść plik tutaj" : "Przeciągnij i upuść plik CSV"}
            </p>
            <p className="text-sm text-muted-foreground">
              lub skorzystaj z przycisku poniżej · maks.{" "}
              {formatFileSize(uploadConfig.maxFileSizeBytes)}
            </p>
          </div>

          <span
            aria-hidden="true"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-11 gap-2 rounded-xl px-7 text-base font-semibold shadow-lg shadow-primary/20 group-hover:bg-primary/90",
            )}
          >
            <Upload className="size-5" />
            Wgraj plik
          </span>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" />
            Podgląd powstaje lokalnie — plik wysyłamy po kliknięciu „Analizuj”
          </p>
        </div>
      )}

      {state.status === "error" && (
        <Alert variant="destructive" className="border-destructive/40">
          <AlertCircle />
          <AlertTitle>Nie można wczytać pliku</AlertTitle>
          <AlertDescription>
            {state.file && (
              <span className="font-medium text-foreground">{state.file.name}: </span>
            )}
            {state.message}
          </AlertDescription>
        </Alert>
      )}

      {hasFile && (
        <Card className="bg-card/70 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/30">
                {state.status === "parsing" ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <FileSpreadsheet className="size-6" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium" title={state.file.name}>
                  {state.file.name}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(state.file.size)}</span>
                  {state.status === "parsing" && <span>Wczytywanie…</span>}
                  {state.status === "ready" && (
                    <>
                      <span>{formatNumber(state.preview.totalRows)} wierszy</span>
                      <span>{state.preview.columns.length} kolumn</span>
                      <span>separator: {describeDelimiter(state.preview.delimiter)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button variant="outline" size="lg" onClick={reset}>
                <X />
                Usuń
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={openFilePicker}
                disabled={sending.status === "sending"}
              >
                <Upload />
                Zmień plik
              </Button>
              <Button
                size="lg"
                onClick={analyze}
                disabled={state.status !== "ready" || sending.status === "sending"}
                aria-busy={sending.status === "sending"}
                className="gap-2"
              >
                {sending.status === "sending" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Analizowanie…
                  </>
                ) : (
                  <>
                    <Sparkles />
                    {sending.status === "done" ? "Analizuj ponownie" : "Analizuj"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {state.status === "ready" && state.preview.errorCount > 0 && (
        <Alert className="border-risk-medium/40 text-risk-medium">
          <AlertCircle />
          <AlertTitle>Plik zawiera nieprawidłowe wiersze</AlertTitle>
          <AlertDescription>
            Wykryto {formatNumber(state.preview.errorCount)} problem(ów) podczas
            odczytu (np. niezgodna liczba kolumn). Sprawdź plik przed analizą.
          </AlertDescription>
        </Alert>
      )}

      {sending.status === "error" && (
        <Alert variant="destructive" className="border-destructive/40" aria-live="polite">
          <AlertCircle />
          <AlertTitle>Analiza nie powiodła się</AlertTitle>
          <AlertDescription>{sending.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "ready" && sending.status !== "done" && (
        <CsvPreviewTable preview={state.preview} />
      )}
    </div>
  );
}

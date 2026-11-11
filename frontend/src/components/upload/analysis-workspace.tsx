"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  History,
  Loader2,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import type {
  AnalysisDetailResponse,
  AnalysisSummaryItem,
  UploadAnalysisResponse,
} from "@/lib/api";
import {
  fromAnalysisDetail,
  fromUploadResponse,
  type ActiveAnalysisView,
} from "@/lib/analysis";
import { Card, CardContent } from "@/components/ui/card";
import { CsvUpload } from "./csv-upload";
import { AnalysisResultCard } from "./analysis-result";
import { AnalysesHistoryList } from "./analyses-history";

export function AnalysisWorkspace() {
  const router = useRouter();

  const [history, setHistory] = useState<AnalysisSummaryItem[]>([]);
  const [activeAnalysis, setActiveAnalysis] =
    useState<ActiveAnalysisView | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadingAnalysisId, setLoadingAnalysisId] = useState<string | null>(
    null,
  );
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchAnalysisDetail = useCallback(
    async (jobId: string) => {
      setLoadingAnalysisId(jobId);
      setHistoryError(null);

      try {
        const response = await fetch(
          `/api/analyses/${encodeURIComponent(jobId)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          router.push(`${AUTH_ROUTES.login}?expired=1`);
          router.refresh();
          return;
        }

        const payload = await response.json();

        if (!response.ok) {
          const message =
            payload && typeof payload.detail === "string"
              ? payload.detail
              : `Failed to fetch analysis details (${response.status}).`;
          setHistoryError(message);
          return;
        }

        const detail = payload as AnalysisDetailResponse;
        setActiveAnalysis(fromAnalysisDetail(detail));
      } catch {
        setHistoryError(
          "An error occurred while fetching analysis details from the server.",
        );
      } finally {
        setLoadingAnalysisId(null);
      }
    },
    [router],
  );

  const refreshHistoryList = useCallback(async () => {
    try {
      const response = await fetch("/api/analyses", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push(`${AUTH_ROUTES.login}?expired=1`);
        router.refresh();
        return;
      }

      const payload = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload.detail === "string"
            ? payload.detail
            : `Failed to fetch analyses list (${response.status}).`;
        setHistoryError(message);
        return;
      }

      const list = Array.isArray(payload)
        ? (payload as AnalysisSummaryItem[])
        : [];
      setHistoryError(null);
      setHistory(list);
    } catch {
      setHistoryError(
        "Failed to connect to the server while fetching analyses history.",
      );
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialWorkspace() {
      try {
        const listResponse = await fetch("/api/analyses", {
          method: "GET",
          cache: "no-store",
        });

        if (cancelled) return;

        if (listResponse.status === 401) {
          router.push(`${AUTH_ROUTES.login}?expired=1`);
          router.refresh();
          return;
        }

        const listPayload = await listResponse.json();
        if (cancelled) return;

        if (!listResponse.ok) {
          const message =
            listPayload && typeof listPayload.detail === "string"
              ? listPayload.detail
              : `Failed to fetch analyses list (${listResponse.status}).`;
          setHistoryError(message);
          return;
        }

        const list = Array.isArray(listPayload)
          ? (listPayload as AnalysisSummaryItem[])
          : [];
        setHistory(list);

        if (list.length > 0) {
          const latestId = list[0].id;
          const detailResponse = await fetch(
            `/api/analyses/${encodeURIComponent(latestId)}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

          if (cancelled) return;

          if (detailResponse.ok) {
            const detailPayload =
              (await detailResponse.json()) as AnalysisDetailResponse;
            if (!cancelled) {
              setActiveAnalysis(fromAnalysisDetail(detailPayload));
            }
          }
        }
      } catch {
        if (!cancelled) {
          setHistoryError(
            "Failed to connect to the server while fetching analyses history.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    }

    void loadInitialWorkspace();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleUploadSuccess(uploaded: UploadAnalysisResponse) {
    const nowIso = new Date().toISOString();
    setActiveAnalysis(fromUploadResponse(uploaded, nowIso));
    void refreshHistoryList();
  }

  function handleSelectFromHistory(jobId: string) {
    void fetchAnalysisDetail(jobId);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section aria-labelledby="upload-heading" className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Upload className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h1
              id="upload-heading"
              className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              Upload CSV File
            </h1>
            <p className="text-xs text-muted-foreground">
              Upload a CSV export with your gym members to calculate churn
              predictions and save the result to the database.
            </p>
          </div>
        </div>

        <CsvUpload onUploadSuccess={handleUploadSuccess} />
      </section>

      <section aria-labelledby="active-analysis-heading" className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
            <ShieldAlert className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="active-analysis-heading"
              className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl"
            >
              Selected Analysis — Top 10 At-Risk Members
            </h2>
            <p className="text-xs text-muted-foreground">
              Summary of the selected analysis along with churn probability,
              uncertainty intervals, and estimated days to churn.
            </p>
          </div>
        </div>

        {isInitialLoading && !activeAnalysis ? (
          <Card className="border-border/70 bg-card/60">
            <CardContent className="flex items-center justify-center gap-2.5 py-12 text-xs text-muted-foreground">
              <Loader2
                className="size-4 animate-spin text-primary"
                aria-hidden="true"
              />
              <span>Loading latest analysis...</span>
            </CardContent>
          </Card>
        ) : activeAnalysis ? (
          <AnalysisResultCard
            analysis={activeAnalysis}
            isLoading={
              loadingAnalysisId !== null &&
              loadingAnalysisId !== activeAnalysis.id
            }
          />
        ) : (
          <Card className="border-border/70 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="font-heading text-sm font-semibold text-foreground">
                No analysis selected
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                Upload a CSV file above or select one of your previous analyses
                from the list below to see the Top 10 most at-risk members.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="history-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-foreground ring-1 ring-border">
              <History className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="history-heading"
                className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl"
              >
                Previous Analyses
              </h2>
              <p className="text-xs text-muted-foreground">
                Click any analysis from the history to load its Top 10 table
                above.
              </p>
            </div>
          </div>

          <span className="font-mono text-xs text-muted-foreground">
            {history.length} {history.length === 1 ? "analysis" : "analyses"}
          </span>
        </div>

        {historyError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{historyError}</span>
          </div>
        ) : null}

        {isInitialLoading ? (
          <Card className="border-border/70 bg-card/60">
            <CardContent className="flex items-center justify-center gap-2.5 py-10 text-xs text-muted-foreground">
              <Loader2
                className="size-4 animate-spin text-primary"
                aria-hidden="true"
              />
              <span>Loading analyses history...</span>
            </CardContent>
          </Card>
        ) : (
          <AnalysesHistoryList
            items={history}
            selectedId={activeAnalysis?.id ?? null}
            loadingId={loadingAnalysisId}
            onSelect={handleSelectFromHistory}
          />
        )}
      </section>
    </div>
  );
}

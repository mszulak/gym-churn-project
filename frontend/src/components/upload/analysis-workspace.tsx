"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, BarChart3, History, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SessionExpiredError,
  fetchAnalysesList,
  fetchAnalysisDetail,
  normalizeDetailResponse,
  normalizeUploadResponse,
  redirectToSignout,
  type ActiveAnalysis,
  type AnalysisJobSummary,
  type UploadAnalysisResponse,
} from "@/lib/analysis";
import { CsvUpload } from "./csv-upload";
import { AnalysisResultCard } from "./analysis-result";
import { AnalysesHistory } from "./analyses-history";

/**
 * Główny widok roboczy z trzema sekcjami:
 * 1. Góra: Dodaj plik CSV
 * 2. Środek: Aktualnie wybrana analiza – Top 10 klientów
 * 3. Dół: Poprzednie analizy (pobierane z GET /api/analyses przy starcie oraz po każdym uploadzie)
 */
export function AnalysisWorkspace() {
  const [analyses, setAnalyses] = useState<AnalysisJobSummary[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [loadingJobId, setLoadingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const selectAnalysis = useCallback(async (jobId: string) => {
    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    setLoadingJobId(jobId);
    setErrorMessage(null);
    try {
      const detail = await fetchAnalysisDetail(jobId, controller.signal);
      if (controller.signal.aborted) return;
      setActiveAnalysis(normalizeDetailResponse(detail));
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof SessionExpiredError) {
        redirectToSignout();
        return;
      }
      setErrorMessage(
        err instanceof Error ? err.message : "Nie udało się pobrać szczegółów analizy.",
      );
    } finally {
      if (detailAbortRef.current === controller) {
        detailAbortRef.current = null;
        setLoadingJobId(null);
      }
    }
  }, []);

  // Pobierz historię przy załadowaniu strony i automatycznie wczytaj najnowszą analizę
  useEffect(() => {
    const controller = new AbortController();

    async function loadInitial() {
      setIsLoadingList(true);
      setErrorMessage(null);
      try {
        const list = await fetchAnalysesList(controller.signal);
        if (controller.signal.aborted) return;
        setAnalyses(list);
        if (list.length > 0) {
          await selectAnalysis(list[0].id);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof SessionExpiredError) {
          redirectToSignout();
          return;
        }
        setErrorMessage(
          err instanceof Error ? err.message : "Nie udało się pobrać historii analiz.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingList(false);
        }
      }
    }

    void loadInitial();
    return () => {
      controller.abort();
      detailAbortRef.current?.abort();
    };
  }, [selectAnalysis]);

  // Po udanym wgraniu nowego pliku CSV: pokaż wynik od razu i odśwież listę historii na dole
  const handleAnalysisCompleted = useCallback(async (result: UploadAnalysisResponse) => {
    detailAbortRef.current?.abort();
    setLoadingJobId(null);
    setErrorMessage(null);

    const nowIso = new Date().toISOString();
    setActiveAnalysis(normalizeUploadResponse(result, nowIso));

    try {
      const freshList = await fetchAnalysesList();
      setAnalyses(freshList);
      // Uzupełnij dokładny znacznik czasu z bazy danych
      const matching = freshList.find((item) => item.id === result.job_id);
      if (matching) {
        setActiveAnalysis((prev) =>
          prev && prev.id === matching.id
            ? { ...prev, createdAt: matching.created_at }
            : prev,
        );
      }
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        redirectToSignout();
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-14">
      {/* 1. Góra strony: Dodaj plik CSV */}
      <section aria-labelledby="section-upload" className="space-y-4">
        <div className="space-y-1">
          <h1
            id="section-upload"
            className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            <Upload className="size-6 text-primary" />
            Dodaj plik CSV
          </h1>
          <p className="text-sm text-muted-foreground">
            Wgraj dane klientów siłowni, aby obliczyć prawdopodobieństwo rezygnacji, przedział
            niepewności oraz przewidywany czas do odejścia.
          </p>
        </div>

        <CsvUpload onAnalysisCompleted={handleAnalysisCompleted} />
      </section>

      {/* 2. Środek strony: Aktualnie wybrana analiza – Top 10 klientów */}
      <section aria-labelledby="section-active-analysis" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="section-active-analysis"
            className="flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl"
          >
            <BarChart3 className="size-5 text-primary" />
            Aktualnie wybrana analiza – Top 10 klientów
          </h2>
          <p className="text-sm text-muted-foreground">
            Podsumowanie wybranej analizy oraz 10 klientów z najwyższym ryzykiem rezygnacji z
            karnetu.
          </p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertCircle />
            <AlertTitle>Wystąpił problem</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {activeAnalysis ? (
          <AnalysisResultCard
            analysis={activeAnalysis}
            isLoading={loadingJobId !== null}
          />
        ) : isLoadingList || loadingJobId !== null ? (
          <Card className="bg-card/70 backdrop-blur-sm">
            <CardContent className="space-y-4 py-6">
              <Skeleton className="h-6 w-56" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Skeleton className="h-18 rounded-xl" />
                <Skeleton className="h-18 rounded-xl" />
                <Skeleton className="h-18 rounded-xl" />
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Brak wybranej analizy. Wgraj plik CSV powyżej lub wybierz analizę z historii poniżej.
            </CardContent>
          </Card>
        )}
      </section>

      {/* 3. Dół strony: Poprzednie analizy / Historia */}
      <section aria-labelledby="section-history" className="space-y-4">
        <div className="space-y-1">
          <h2
            id="section-history"
            className="flex items-center gap-2.5 text-xl font-semibold tracking-tight sm:text-2xl"
          >
            <History className="size-5 text-primary" />
            Poprzednie analizy
          </h2>
          <p className="text-sm text-muted-foreground">
            Historia wszystkich analiz wykonanych na Twoim koncie.
          </p>
        </div>

        <AnalysesHistory
          analyses={analyses}
          selectedId={activeAnalysis?.id ?? null}
          loadingId={loadingJobId}
          isLoadingList={isLoadingList}
          onSelect={selectAnalysis}
        />
      </section>
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { ApiError, ApiUnavailableError, apiRequest } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import type { AnalysisJobDetailResponse } from "@/lib/analysis";

/**
 * Proxy `GET /api/analyses/{job_id}` → FastAPI `GET /api/analyses/{job_id}`.
 * Przekazuje token z ciasteczka `HttpOnly` w nagłówku `Authorization: Bearer`.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sesja wygasła. Zaloguj się ponownie." },
      { status: 401 },
    );
  }

  const { jobId } = await context.params;
  if (!jobId) {
    return NextResponse.json({ error: "Brak identyfikatora analizy." }, { status: 400 });
  }

  try {
    const detail = await apiRequest<AnalysisJobDetailResponse>(
      `/api/analyses/${encodeURIComponent(jobId)}`,
      { token },
    );
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || "Nie udało się pobrać szczegółów analizy." },
        { status: error.status },
      );
    }
    if (error instanceof ApiUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[analyses/detail] Nieoczekiwany błąd:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania szczegółów analizy." },
      { status: 500 },
    );
  }
}

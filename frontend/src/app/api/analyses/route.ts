import { NextResponse } from "next/server";
import { ApiError, ApiUnavailableError, apiRequest } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import type { AnalysisJobSummary } from "@/lib/analysis";

/**
 * Proxy `GET /api/analyses` → FastAPI `GET /api/analyses`.
 * Przekazuje token z ciasteczka `HttpOnly` w nagłówku `Authorization: Bearer`.
 */
export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sesja wygasła. Zaloguj się ponownie." },
      { status: 401 },
    );
  }

  try {
    const analyses = await apiRequest<AnalysisJobSummary[]>("/api/analyses", {
      token,
    });
    return NextResponse.json(analyses, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message || "Nie udało się pobrać historii analiz." },
        { status: error.status },
      );
    }
    if (error instanceof ApiUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("[analyses] Nieoczekiwany błąd:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania historii analiz." },
      { status: 500 },
    );
  }
}

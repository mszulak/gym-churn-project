import { SIGNOUT_PATH } from "@/lib/auth/constants";

/** Odpowiedź FastAPI `POST /api/upload` (sukces). */
export interface AnalysisResult {
  filename: string;
  rows: number;
  columns: string[];
  status: string;
  top_10_risk: Record<string, unknown>[];
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sesja wygasła. Zaloguj się ponownie.");
    this.name = "SessionExpiredError";
  }
}

function extractError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const { error, detail } = body as Record<string, unknown>;
  if (typeof error === "string") return error;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
  return null;
}

/**
 * Wysyła plik do analizy przez Route Handler `/api/upload` (ten sam origin).
 * Ciasteczko HttpOnly dołącza przeglądarka, a serwer Next.js zamienia je na
 * nagłówek `Authorization: Bearer` przed przekazaniem do FastAPI.
 */
export async function uploadForAnalysis(file: File, signal?: AbortSignal): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append("file", file, file.name);

  let response: Response;
  try {
    response = await fetch("/api/upload", { method: "POST", body: formData, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
  }

  if (response.status === 401) throw new SessionExpiredError();

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // odpowiedź bez JSON
  }

  // Uwaga: backend zgłasza część błędów jako 200 z polem `error`
  const message = extractError(body);
  if (!response.ok || message) {
    throw new Error(message ?? `Analiza nie powiodła się (błąd ${response.status}).`);
  }

  return body as AnalysisResult;
}

/** Pełne przeładowanie przez Route Handler czyszczący ciasteczko. */
export function redirectToSignout() {
  window.location.assign(SIGNOUT_PATH);
}

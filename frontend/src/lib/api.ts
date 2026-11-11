import "server-only";

/**
 * Klient HTTP do backendu FastAPI. Używany WYŁĄCZNIE po stronie serwera
 * (Server Actions, Route Handlers, Server Components) — token nigdy nie trafia do przeglądarki.
 */

export const API_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Błąd zwrócony przez API (status HTTP != 2xx). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** Błędy walidacji pól z odpowiedzi 422 FastAPI: { nazwa_pola: komunikat }. */
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Backend nieosiągalny (błąd sieci, timeout). */
export class ApiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.");
    this.name = "ApiUnavailableError";
    this.cause = cause;
  }
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

/**
 * Wyciąga czytelny komunikat z odpowiedzi błędu FastAPI.
 * Obsługuje `{ detail: "..." }`, `{ detail: [{ loc, msg }] }` (422) oraz `{ error: "..." }`.
 */
async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // brak JSON — zostaje komunikat domyślny
  }

  const fieldErrors: Record<string, string> = {};
  let message = "";

  if (body && typeof body === "object") {
    const { detail, error, message: msg } = body as Record<string, unknown>;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      for (const item of detail as FastApiValidationItem[]) {
        const field = item.loc?.[item.loc.length - 1];
        if (typeof field === "string" && item.msg && !fieldErrors[field]) {
          fieldErrors[field] = item.msg;
        }
      }
      message = (detail as FastApiValidationItem[])[0]?.msg ?? "";
    } else if (typeof error === "string") {
      message = error;
    } else if (typeof msg === "string") {
      message = msg;
    }
  }

  return new ApiError(response.status, message, fieldErrors);
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  token?: string;
  json?: unknown;
  /** Domyślnie 15 s. */
  timeoutMs?: number;
}

/**
 * Wykonuje żądanie do FastAPI i zwraca sparsowany JSON.
 * Rzuca `ApiError` dla statusów != 2xx i `ApiUnavailableError` przy błędach sieci.
 */
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, json, timeoutMs = 15_000, headers, ...init } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  if (json !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: requestHeaders,
      body: json !== undefined ? JSON.stringify(json) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ApiUnavailableError(error);
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

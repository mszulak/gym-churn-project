import { NextResponse, type NextRequest } from "next/server";
import { apiUrl } from "@/lib/api";
import { getSessionToken } from "@/lib/auth/session";
import { uploadConfig } from "@/config/site";

/**
 * Proxy uploadu CSV → FastAPI `POST /api/upload`.
 *
 * Przeglądarka wysyła multipart/form-data na ten endpoint (ten sam origin, ciasteczko
 * HttpOnly dołączane automatycznie). Tu odczytujemy token z ciasteczka i przekazujemy
 * żądanie dalej z nagłówkiem `Authorization: Bearer <token>`. Body jest strumieniowane
 * bez buforowania w pamięci.
 */

/** Zapas na nagłówki multipart ponad sam plik. */
const MAX_BODY_BYTES = uploadConfig.maxFileSizeBytes + 1024 * 1024;

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return jsonError(401, "Sesja wygasła. Zaloguj się ponownie.");
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return jsonError(415, "Oczekiwano danych typu multipart/form-data.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonError(413, "Plik jest za duży.");
  }

  if (!request.body) {
    return jsonError(400, "Brak pliku w żądaniu.");
  }

  let upstream: Response;
  try {
    upstream = await fetch(apiUrl("/api/upload"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType, // zawiera boundary multipart
        Accept: "application/json",
        ...(contentLength ? { "Content-Length": String(contentLength) } : {}),
      },
      body: request.body,
      cache: "no-store",
      signal: AbortSignal.timeout(5 * 60_000),
      // wymagane przez fetch w Node.js przy strumieniowym body
      duplex: "half",
    } as RequestInit & { duplex: "half" });
  } catch (error) {
    console.error("[upload] Backend nieosiągalny:", error);
    return jsonError(502, "Nie udało się połączyć z serwerem analizy. Spróbuj ponownie.");
  }

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

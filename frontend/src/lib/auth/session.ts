import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./constants";

/**
 * Ciasteczko `Secure` wysyłane jest tylko po HTTPS (wyjątek: localhost).
 * Domyślnie włączone w produkcji; można wyłączyć `SESSION_COOKIE_SECURE=false`,
 * np. przy testach produkcyjnego obrazu po HTTP w sieci lokalnej.
 */
const secure =
  process.env.SESSION_COOKIE_SECURE !== undefined
    ? process.env.SESSION_COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

/** Zapisuje token w ciasteczku HttpOnly. Tylko Server Action / Route Handler. */
export async function setSessionToken(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value || undefined;
}

/** Usuwa ciasteczko sesji. Tylko Server Action / Route Handler. */
export async function deleteSessionToken(): Promise<void> {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: "/" });
}

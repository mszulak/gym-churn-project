import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ApiError, apiRequest } from "@/lib/api";
import { SIGNOUT_PATH, type User } from "./constants";
import { getSessionToken } from "./session";

/**
 * Data Access Layer — jedyne miejsce, które zamienia ciasteczko sesji na użytkownika.
 *
 * Zwraca:
 * - `User` — sesja ważna,
 * - `null` — brak ciasteczka albo token odrzucony przez backend (401/403).
 * Rzuca `ApiUnavailableError` / `ApiError`, gdy backend nie działa — nie traktujemy
 * awarii serwera jak wylogowania.
 *
 * `cache()` deduplikuje wywołania w obrębie jednego żądania.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    return await apiRequest<User>("/api/auth/me", { token });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
});

/**
 * Jak `getCurrentUser`, ale przy braku ważnej sesji przekierowuje do Route Handlera,
 * który usuwa ciasteczko i kieruje na /login (bez tego proxy odbijałoby /login → /).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(SIGNOUT_PATH);
  return user;
}

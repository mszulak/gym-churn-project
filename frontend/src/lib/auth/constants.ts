/**
 * Stałe i typy autoryzacji współdzielone przez serwer, proxy i komponenty.
 * Ten plik NIE może importować kodu serwerowego (używa go też `proxy.ts`).
 */

export const SESSION_COOKIE = "session_token";

/** 7 dni — zgodnie z kontraktem. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Trasy wymagające zalogowania. */
export const PROTECTED_ROUTES = ["/", "/dashboard"] as const;

/** Trasy dostępne tylko dla niezalogowanych. */
export const AUTH_ROUTES = ["/login", "/register"] as const;

export const DEFAULT_LOGIN_REDIRECT = "/";
export const LOGIN_PATH = "/login";
/** Route Handler czyszczący nieważną sesję (nie da się usunąć ciasteczka w trakcie renderu). */
export const SIGNOUT_PATH = "/auth/signout";

export interface User {
  id: string;
  email: string;
  gym_name: string;
  is_active: boolean;
  created_at: string;
}

export type AuthField = "email" | "password" | "gym_name";

export interface AuthFormState {
  /** Ogólny komunikat błędu (np. z FastAPI). */
  error?: string;
  /** Błędy konkretnych pól. */
  fieldErrors?: Partial<Record<AuthField, string>>;
  /** Wartości do ponownego wypełnienia formularza po błędzie (bez hasła). */
  values?: Partial<Record<Exclude<AuthField, "password">, string>>;
}

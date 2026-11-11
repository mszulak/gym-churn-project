"use server";

import { redirect } from "next/navigation";
import { ApiError, ApiUnavailableError, apiRequest } from "@/lib/api";
import {
  DEFAULT_LOGIN_REDIRECT,
  LOGIN_PATH,
  type AuthField,
  type AuthFormState,
  type User,
} from "./constants";
import { deleteSessionToken, setSessionToken } from "./session";

interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Hasła nie przycinamy — spacje mogą być jego częścią. */
function readPassword(formData: FormData): string {
  const value = formData.get("password");
  return typeof value === "string" ? value : "";
}

function pickFieldErrors(fieldErrors: Record<string, string>): AuthFormState["fieldErrors"] {
  const known: AuthField[] = ["email", "password", "gym_name"];
  const result: AuthFormState["fieldErrors"] = {};
  for (const field of known) {
    if (fieldErrors[field]) result[field] = fieldErrors[field];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/** Zamienia błąd API na stan formularza; `fallbacks` to komunikaty domyślne per status HTTP. */
function toFormError(
  error: unknown,
  fallbacks: Record<number, string>,
  values: AuthFormState["values"],
): AuthFormState {
  if (error instanceof ApiUnavailableError) {
    return { error: error.message, values };
  }
  if (error instanceof ApiError) {
    const fieldErrors = pickFieldErrors(error.fieldErrors);
    const message =
      fallbacks[error.status] ??
      (error.message || `Wystąpił błąd serwera (${error.status}). Spróbuj ponownie.`);
    return {
      // przy błędach walidacji pól komunikat ogólny jest zbędny
      error: fieldErrors && error.status === 422 ? undefined : message,
      fieldErrors,
      values,
    };
  }
  console.error("[auth] Nieoczekiwany błąd:", error);
  return { error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.", values };
}

async function authenticate(email: string, password: string): Promise<void> {
  const { access_token } = await apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    json: { email, password },
  });
  if (!access_token) {
    throw new ApiError(500, "Serwer nie zwrócił tokenu dostępu.");
  }
  await setSessionToken(access_token);
}

// ---------------------------------------------------------------------------

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email").toLowerCase();
  const password = readPassword(formData);
  const values = { email };

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!email) fieldErrors.email = "Podaj adres email.";
  else if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Nieprawidłowy adres email.";
  if (!password) fieldErrors.password = "Podaj hasło.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  try {
    await authenticate(email, password);
  } catch (error) {
    return toFormError(
      error,
      {
        400: "Nieprawidłowy email lub hasło.",
        401: "Nieprawidłowy email lub hasło.",
        403: "To konto jest nieaktywne.",
      },
      values,
    );
  }

  // redirect() rzuca wyjątek sterujący — musi być poza try/catch
  redirect(DEFAULT_LOGIN_REDIRECT);
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readField(formData, "email").toLowerCase();
  const password = readPassword(formData);
  const gymName = readField(formData, "gym_name");
  const values = { email, gym_name: gymName };

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!gymName) fieldErrors.gym_name = "Podaj nazwę siłowni.";
  if (!email) fieldErrors.email = "Podaj adres email.";
  else if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Nieprawidłowy adres email.";
  if (!password) fieldErrors.password = "Podaj hasło.";
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors, values };

  try {
    await apiRequest<User>("/api/auth/register", {
      method: "POST",
      json: { email, password, gym_name: gymName },
    });
  } catch (error) {
    return toFormError(
      error,
      {
        400: "Użytkownik o tym adresie email już istnieje.",
        409: "Użytkownik o tym adresie email już istnieje.",
      },
      values,
    );
  }

  // Konto utworzone — logujemy od razu. Jeśli się nie uda, odsyłamy na /login.
  let loggedIn = true;
  try {
    await authenticate(email, password);
  } catch (error) {
    console.error("[auth] Automatyczne logowanie po rejestracji nie powiodło się:", error);
    loggedIn = false;
  }

  redirect(loggedIn ? DEFAULT_LOGIN_REDIRECT : `${LOGIN_PATH}?registered=1`);
}

export async function logoutAction(): Promise<void> {
  await deleteSessionToken();
  redirect(LOGIN_PATH);
}

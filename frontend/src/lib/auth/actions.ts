"use server";

import { redirect } from "next/navigation";
import {
  apiFetch,
  ApiError,
  ApiUnavailableError,
  type LoginRequest,
  type RegisterRequest,
  type TokenResponse,
  type UserResponse,
} from "@/lib/api";
import { AUTH_ROUTES } from "./constants";
import { deleteSessionToken, setSessionToken } from "./session";

export interface AuthActionState {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    gym_name?: string;
  };
  values?: {
    email?: string;
    gym_name?: string;
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPathRaw = String(formData.get("next") ?? "").trim();

  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (!email) {
    fieldErrors.email = "Enter your email address.";
  } else if (!EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter your password.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      values: { email },
    };
  }

  try {
    const payload: LoginRequest = { email, password };
    const tokenResponse = await apiFetch<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    await setSessionToken(tokenResponse.access_token);
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return {
        error: error.message,
        values: { email },
      };
    }

    if (error instanceof ApiError) {
      const message =
        error.status === 401 || error.status === 400
          ? error.message || "Invalid email or password."
          : error.message;

      return {
        error: message,
        values: { email },
      };
    }

    console.error("[auth:loginAction] Unexpected error:", error);
    return {
      error: "An unexpected error occurred during sign in. Please try again.",
      values: { email },
    };
  }

  // Prevent open redirects by only allowing internal relative paths.
  const safeRedirect =
    nextPathRaw.startsWith("/") && !nextPathRaw.startsWith("//")
      ? nextPathRaw
      : AUTH_ROUTES.home;

  redirect(safeRedirect);
}

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const gymName = String(formData.get("gym_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const fieldErrors: NonNullable<AuthActionState["fieldErrors"]> = {};

  if (!gymName) {
    fieldErrors.gym_name = "Enter your gym or fitness club name.";
  } else if (gymName.length < 2) {
    fieldErrors.gym_name = "Gym name must be at least 2 characters long.";
  }

  if (!email) {
    fieldErrors.email = "Enter your email address.";
  } else if (!EMAIL_REGEX.test(email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  if (!password) {
    fieldErrors.password = "Enter a password.";
  } else if (password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters long.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      fieldErrors,
      values: { email, gym_name: gymName },
    };
  }

  let autoLoggedIn = false;

  try {
    const registerPayload: RegisterRequest = {
      email,
      password,
      gym_name: gymName,
    };

    await apiFetch<UserResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registerPayload),
    });

    try {
      const loginPayload: LoginRequest = { email, password };
      const tokenResponse = await apiFetch<TokenResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginPayload),
      });
      await setSessionToken(tokenResponse.access_token);
      autoLoggedIn = true;
    } catch {
      autoLoggedIn = false;
    }
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return {
        error: error.message,
        values: { email, gym_name: gymName },
      };
    }

    if (error instanceof ApiError) {
      const message =
        error.status === 409 || error.status === 400
          ? error.message || "A user with this email address already exists."
          : error.message;

      return {
        error: message,
        values: { email, gym_name: gymName },
      };
    }

    console.error("[auth:registerAction] Unexpected error:", error);
    return {
      error: "An unexpected error occurred during registration. Please try again.",
      values: { email, gym_name: gymName },
    };
  }

  if (autoLoggedIn) {
    redirect(AUTH_ROUTES.home);
  }

  redirect(`${AUTH_ROUTES.login}?registered=1`);
}

export async function logoutAction(): Promise<void> {
  await deleteSessionToken();
  redirect(AUTH_ROUTES.login);
}

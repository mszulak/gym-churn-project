import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { apiFetch, ApiError, type UserResponse } from "@/lib/api";
import { AUTH_ROUTES } from "./constants";
import { getSessionToken } from "./session";

/**
 * Fetches the authenticated user using the HttpOnly `session_token` cookie.
 * Wrapped in React `cache()` to deduplicate requests within a single render pass.
 */
export const getCurrentUser = cache(async (): Promise<UserResponse | null> => {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  try {
    return await apiFetch<UserResponse>("/api/auth/me", {
      method: "GET",
      token,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
});

/**
 * Ensures the user is authenticated and has a valid session on the backend.
 * If the token is missing or expired, redirects to `/auth/signout` to clear the stale cookie.
 */
export async function requireUser(): Promise<UserResponse> {
  const token = await getSessionToken();

  if (!token) {
    redirect(AUTH_ROUTES.login);
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(AUTH_ROUTES.signout);
  }

  return user;
}

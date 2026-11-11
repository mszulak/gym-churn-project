import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * Clears an invalid or expired `session_token` cookie and redirects to `/login`.
 */
export async function GET(request: NextRequest) {
  const loginUrl = new URL(AUTH_ROUTES.login, request.url);
  loginUrl.searchParams.set("expired", "1");

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}

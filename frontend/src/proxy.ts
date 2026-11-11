import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_ROUTES,
  DEFAULT_LOGIN_REDIRECT,
  LOGIN_PATH,
  SESSION_COOKIE,
} from "@/lib/auth/constants";

/**
 * Proxy (w Next.js 16 następca `middleware.ts`) — szybkie, optymistyczne przekierowania
 * na podstawie samej obecności ciasteczka. Ważność tokenu weryfikuje serwer
 * (`requireUser()` → GET /api/auth/me) oraz backend przy każdym żądaniu API.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected =
    pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname);

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Celowo tylko strony. `/api/*` (upload CSV) jest pominięte: proxy buforuje body
  // żądania z limitem 10 MB i po cichu ucinałoby większe pliki.
  matcher: ["/", "/dashboard/:path*", "/login", "/register"],
};

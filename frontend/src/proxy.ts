import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ROUTES, SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PROTECTED_PATHS = new Set<string>([
  AUTH_ROUTES.home,
  AUTH_ROUTES.dashboard,
]);

const GUEST_ONLY_PATHS = new Set<string>([
  AUTH_ROUTES.login,
  AUTH_ROUTES.register,
]);

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PATHS.has(pathname)) {
    return true;
  }
  return pathname.startsWith(`${AUTH_ROUTES.dashboard}/`);
}

function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PATHS.has(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(sessionToken && sessionToken.trim().length > 0);

  if (isProtectedPath(pathname) && !isAuthenticated) {
    const loginUrl = new URL(AUTH_ROUTES.login, request.url);
    if (pathname !== AUTH_ROUTES.home) {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isGuestOnlyPath(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL(AUTH_ROUTES.home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Exclude `/api/*` so multipart CSV uploads are not truncated by the 10 MB proxy buffer limit.
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

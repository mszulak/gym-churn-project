import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH } from "@/lib/auth/constants";
import { deleteSessionToken } from "@/lib/auth/session";

/**
 * Czyści nieważną/wygasłą sesję i przekierowuje na /login.
 * Server Component nie może usunąć ciasteczka w trakcie renderu, więc `requireUser()`
 * przekierowuje tutaj, gdy backend odrzuci token.
 */
export async function GET(request: NextRequest) {
  await deleteSessionToken();
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}

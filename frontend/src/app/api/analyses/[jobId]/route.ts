import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl, extractApiErrorMessage } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

interface RouteContext {
  params: Promise<{
    jobId: string;
  }>;
}

/**
 * Proxies `GET /api/analyses/{job_id}` to FastAPI using the HttpOnly `session_token` cookie.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const { jobId } = await context.params;
  const backendUrl = `${getApiBaseUrl()}/api/analyses/${encodeURIComponent(jobId)}`;

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await backendResponse.json()
      : await backendResponse.text();

    if (!backendResponse.ok) {
      const message = extractApiErrorMessage(
        payload,
        `Failed to fetch analysis details (${backendResponse.status}).`,
      );
      const response = NextResponse.json(
        { detail: message },
        { status: backendResponse.status },
      );

      if (backendResponse.status === 401) {
        response.cookies.delete(SESSION_COOKIE_NAME);
      }

      return response;
    }

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error(`[api/analyses/${jobId}] Failed to connect to ${backendUrl}:`, error);
    return NextResponse.json(
      {
        detail: `Cannot connect to the FastAPI server (${getApiBaseUrl()}).`,
      },
      { status: 503 },
    );
  }
}

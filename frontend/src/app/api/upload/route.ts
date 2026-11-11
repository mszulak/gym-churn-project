import { NextResponse, type NextRequest } from "next/server";
import { getApiBaseUrl, extractApiErrorMessage } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

/**
 * Proxies CSV file uploads to FastAPI (`POST /api/upload`), attaching the
 * `Authorization: Bearer <session_token>` header from the HttpOnly cookie.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  let incomingFormData: FormData;
  try {
    incomingFormData = await request.formData();
  } catch (error) {
    console.error("[api/upload] Failed to parse multipart/form-data:", error);
    return NextResponse.json(
      {
        detail:
          "Failed to read the uploaded file (it may exceed the size limit or have an invalid format).",
      },
      { status: 400 },
    );
  }

  const file = incomingFormData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { detail: "No CSV file was attached in the 'file' field." },
      { status: 400 },
    );
  }

  const outboundFormData = new FormData();
  const fileName = file instanceof File && file.name ? file.name : "clients.csv";
  outboundFormData.append("file", file, fileName);

  const backendUrl = `${getApiBaseUrl()}/api/upload`;

  try {
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: outboundFormData,
      cache: "no-store",
    });

    const contentType = backendResponse.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await backendResponse.json()
      : await backendResponse.text();

    if (!backendResponse.ok) {
      const message = extractApiErrorMessage(
        payload,
        `FastAPI server returned an error (${backendResponse.status}).`,
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

    return NextResponse.json(payload, { status: backendResponse.status });
  } catch (error) {
    console.error(`[api/upload] Failed to connect to ${backendUrl}:`, error);
    return NextResponse.json(
      {
        detail: `Cannot connect to the FastAPI server (${getApiBaseUrl()}). Make sure the backend is running.`,
      },
      { status: 503 },
    );
  }
}

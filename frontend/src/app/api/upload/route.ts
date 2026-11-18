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

  const requiredFileKeys = [
    { key: "members_file", fallbackName: "members.csv", label: "Members Database" },
    { key: "contracts_file", fallbackName: "contracts.csv", label: "Contracts History" },
    { key: "check_ins_file", fallbackName: "check_ins.csv", label: "Gate Check-in Logs" },
  ] as const;

  const outboundFormData = new FormData();

  for (const { key, fallbackName, label } of requiredFileKeys) {
    const uploaded = incomingFormData.get(key);
    if (!(uploaded instanceof Blob) || uploaded.size === 0) {
      return NextResponse.json(
        {
          detail: `Missing or empty CSV file for '${key}' (${label}). Please upload all 3 required CSV files.`,
        },
        { status: 400 },
      );
    }

    const fileName =
      uploaded instanceof File && uploaded.name ? uploaded.name : fallbackName;
    outboundFormData.append(key, uploaded, fileName);
  }

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

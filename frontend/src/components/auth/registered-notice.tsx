"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, Info } from "lucide-react";

export function RegisteredNotice() {
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "1";
  const isExpired = searchParams.get("expired") === "1";

  if (isRegistered) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-xl border border-primary/35 bg-primary/10 p-3.5 text-xs text-primary"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Your gym account has been created. You can now sign in with your
          credentials.
        </p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs text-amber-300"
      >
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>Your session has expired. Please sign in again to continue.</p>
      </div>
    );
  }

  return null;
}

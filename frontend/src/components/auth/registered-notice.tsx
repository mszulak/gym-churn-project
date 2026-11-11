"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Komunikat po rejestracji, gdy automatyczne logowanie się nie powiodło (?registered=1). */
export function RegisteredNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("registered") !== "1") return null;

  return (
    <Alert className="border-primary/40 text-primary">
      <CheckCircle2 />
      <AlertDescription className="text-primary/90">
        Konto zostało utworzone. Zaloguj się, aby kontynuować.
      </AlertDescription>
    </Alert>
  );
}

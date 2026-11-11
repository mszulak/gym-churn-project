"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, LogIn, Lock, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/constants";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

const initialState: AuthFormState = {};

export function LoginForm({ notice }: { notice?: React.ReactNode }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {notice}

      {state.error && (
        <Alert variant="destructive" className="border-destructive/40" aria-live="polite">
          <AlertCircle />
          <AlertDescription className="text-destructive">{state.error}</AlertDescription>
        </Alert>
      )}

      <fieldset disabled={pending} className="grid gap-4">
        <FormField
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="wlasciciel@silownia.pl"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <FormField
          name="password"
          type="password"
          label="Hasło"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
        />
      </fieldset>

      <SubmitButton
        size="lg"
        pendingText="Logowanie…"
        className="h-11 rounded-xl text-base font-semibold"
      >
        <LogIn />
        Zaloguj się
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Zarejestruj siłownię
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Dumbbell, Lock, Mail, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { registerAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/constants";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} noValidate className="grid gap-5">
      {state.error && (
        <Alert variant="destructive" className="border-destructive/40" aria-live="polite">
          <AlertCircle />
          <AlertDescription className="text-destructive">{state.error}</AlertDescription>
        </Alert>
      )}

      <fieldset disabled={pending} className="grid gap-4">
        <FormField
          name="gym_name"
          label="Nazwa siłowni"
          icon={Dumbbell}
          placeholder="np. Power Gym Kraków"
          autoComplete="organization"
          required
          autoFocus
          defaultValue={state.values?.gym_name}
          error={state.fieldErrors?.gym_name}
        />
        <FormField
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="wlasciciel@silownia.pl"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          error={state.fieldErrors?.email}
        />
        <FormField
          name="password"
          type="password"
          label="Hasło"
          icon={Lock}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          error={state.fieldErrors?.password}
        />
      </fieldset>

      <SubmitButton
        size="lg"
        pendingText="Tworzenie konta…"
        className="h-11 rounded-xl text-base font-semibold"
      >
        <UserPlus />
        Utwórz konto
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Masz już konto?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}

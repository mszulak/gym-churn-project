"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, LogIn, Lock, Mail } from "lucide-react";
import { loginAction, type AuthActionState } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

const INITIAL_STATE: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "";
  const [state, formAction, isPending] = useActionState(
    loginAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} noValidate className="space-y-5">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">Sign in failed</p>
            <p className="text-destructive/90">{state.error}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <FormField
          key={`email-${state.values?.email ?? ""}`}
          name="email"
          label="Email address"
          type="email"
          placeholder="owner@yourgym.com"
          autoComplete="email"
          defaultValue={state.values?.email}
          disabled={isPending}
          error={state.fieldErrors?.email}
          icon={Mail}
        />

        <FormField
          name="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          disabled={isPending}
          error={state.fieldErrors?.password}
          icon={Lock}
        />
      </div>

      <SubmitButton
        idleLabel="Sign in to dashboard"
        pendingLabel="Signing in..."
        icon={LogIn}
      />

      <p className="text-center text-xs text-muted-foreground">
        Don&apos;t have a gym account yet?{" "}
        <Link
          href={AUTH_ROUTES.register}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}

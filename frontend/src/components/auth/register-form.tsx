"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, Dumbbell, Lock, Mail, UserPlus } from "lucide-react";
import { registerAction, type AuthActionState } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";

const INITIAL_STATE: AuthActionState = {};

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(
    registerAction,
    INITIAL_STATE,
  );

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3.5 text-xs text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="font-semibold">Registration failed</p>
            <p className="text-destructive/90">{state.error}</p>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <FormField
          key={`gym-${state.values?.gym_name ?? ""}`}
          name="gym_name"
          label="Gym / fitness club name"
          type="text"
          placeholder="e.g. Iron Pulse Fitness Club"
          autoComplete="organization"
          defaultValue={state.values?.gym_name}
          disabled={isPending}
          error={state.fieldErrors?.gym_name}
          icon={Dumbbell}
        />

        <FormField
          key={`email-${state.values?.email ?? ""}`}
          name="email"
          label="Owner email address"
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
          placeholder="Minimum 8 characters"
          autoComplete="new-password"
          disabled={isPending}
          error={state.fieldErrors?.password}
          hint="Use at least 8 characters."
          icon={Lock}
        />
      </div>

      <SubmitButton
        idleLabel="Create gym account"
        pendingLabel="Creating account..."
        icon={UserPlus}
      />

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={AUTH_ROUTES.login}
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

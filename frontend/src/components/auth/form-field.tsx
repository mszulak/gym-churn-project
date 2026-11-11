"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
}

export function FormField({
  name,
  label,
  type = "text",
  placeholder,
  autoComplete,
  defaultValue,
  required = true,
  disabled = false,
  error,
  hint,
  icon: Icon,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium tracking-wide text-foreground"
      >
        {label}
      </label>

      <div className="relative">
        {Icon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground"
          >
            <Icon className="size-4" />
          </span>
        ) : null}

        <input
          id={id}
          name={name}
          type={resolvedType}
          placeholder={placeholder}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "flex h-10 w-full rounded-lg border bg-background/70 px-3.5 py-2 text-sm text-foreground transition-colors",
            "placeholder:text-muted-foreground/60",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-60",
            Icon && "pl-10",
            isPassword && "pr-10",
            error
              ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/25"
              : "border-border/80 hover:border-border",
          )}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

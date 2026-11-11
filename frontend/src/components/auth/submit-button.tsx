"use client";

import { useFormStatus } from "react-dom";
import { Loader2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  idleLabel: string;
  pendingLabel: string;
  icon?: LucideIcon;
}

export function SubmitButton({
  idleLabel,
  pendingLabel,
  icon: Icon,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="lg"
      disabled={pending}
      className="w-full cursor-pointer font-semibold shadow-sm shadow-primary/20"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        <>
          {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
          {idleLabel}
        </>
      )}
    </Button>
  );
}

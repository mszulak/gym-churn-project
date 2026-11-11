"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps extends Omit<React.ComponentProps<typeof Button>, "type"> {
  pendingText: string;
}

/** Przycisk submit świadomy stanu formularza (useFormStatus) — blokuje się i pokazuje spinner. */
export function SubmitButton({ children, pendingText, className, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cn(className)}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

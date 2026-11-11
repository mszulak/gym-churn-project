import { redirect } from "next/navigation";
import { AlertTriangle, Dumbbell, LogOut, Mail } from "lucide-react";
import { ApiError, ApiUnavailableError, type UserResponse } from "@/lib/api";
import { logoutAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSessionToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

export async function UserMenu() {
  const token = await getSessionToken();

  if (!token) {
    return null;
  }

  let user: UserResponse | null = null;
  let backendOffline = false;

  try {
    user = await getCurrentUser();
  } catch (error) {
    // Rethrow internal Next.js control errors (such as HANGING_PROMISE_REJECTION during static prerendering).
    if (
      !(error instanceof ApiUnavailableError) &&
      !(error instanceof ApiError)
    ) {
      throw error;
    }

    console.error("[layout:UserMenu] Failed to fetch user profile:", error);
    backendOffline = true;
  }

  // Redirect outside try/catch so Next.js redirect control errors are not swallowed.
  if (!backendOffline && !user) {
    redirect(AUTH_ROUTES.signout);
  }

  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      {user ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/70 px-3 py-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
            <Dumbbell className="size-3.5" aria-hidden="true" />
          </span>
          <div className="flex flex-col text-left leading-tight">
            <span className="max-w-36 truncate font-heading text-xs font-semibold text-foreground sm:max-w-52">
              {user.gym_name}
            </span>
            <span className="hidden items-center gap-1 font-mono text-[11px] text-muted-foreground sm:inline-flex">
              <Mail className="size-2.5 shrink-0" aria-hidden="true" />
              <span className="max-w-52 truncate">{user.email}</span>
            </span>
          </div>
        </div>
      ) : (
        <div
          title="Cannot reach GET /api/auth/me on the FastAPI backend"
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300"
        >
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">API offline</span>
        </div>
      )}

      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="cursor-pointer gap-1.5 text-xs"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          <span>Sign out</span>
        </Button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div
      aria-label="Loading user profile"
      className="flex items-center gap-2.5"
    >
      <div className="h-9 w-36 animate-pulse rounded-xl border border-border/50 bg-card/50 sm:w-48" />
      <div className="h-7 w-20 animate-pulse rounded-lg border border-border/50 bg-card/50" />
    </div>
  );
}

import { redirect } from "next/navigation";
import { Building2, LogOut, WifiOff } from "lucide-react";
import { ApiError, ApiUnavailableError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/dal";
import { logoutAction } from "@/lib/auth/actions";
import { SIGNOUT_PATH, type User } from "@/lib/auth/constants";
import { SubmitButton } from "@/components/auth/submit-button";
import { Skeleton } from "@/components/ui/skeleton";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton variant="outline" size="lg" pendingText="Wylogowywanie…">
        <LogOut />
        Wyloguj
      </SubmitButton>
    </form>
  );
}

/**
 * Dane zalogowanego właściciela + wylogowanie.
 * Czyta sesję (cookies) → musi być renderowany wewnątrz <Suspense>.
 * Przy nieważnym tokenie przekierowuje na /auth/signout (czyści ciasteczko).
 */
export async function UserMenu() {
  let user: User | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // Przepuszczamy wewnętrzne wyjątki sterujące Next.js / Reacta (np. HANGING_PROMISE_REJECTION przy prerenderze cookies())
    if (!(error instanceof ApiUnavailableError) && !(error instanceof ApiError)) {
      throw error;
    }
    console.error("[auth] Nie udało się pobrać użytkownika:", error);
    return (
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1.5 text-xs text-risk-medium sm:flex">
          <WifiOff className="size-3.5" />
          Brak połączenia z serwerem
        </span>
        <LogoutButton />
      </div>
    );
  }

  // redirect() rzuca wyjątek sterujący — poza try/catch
  if (!user) redirect(SIGNOUT_PATH);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-3 sm:flex">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground ring-1 ring-border"
        >
          {initials(user.gym_name)}
        </span>
        <div className="min-w-0 text-right leading-tight">
          <p className="flex max-w-56 items-center justify-end gap-1.5 truncate text-sm font-medium">
            <Building2 className="size-3.5 shrink-0 text-primary" />
            <span className="truncate" title={user.gym_name}>
              {user.gym_name}
            </span>
          </p>
          <p className="max-w-56 truncate text-xs text-muted-foreground" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>

      <LogoutButton />
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-label="Wczytywanie danych konta">
      <div className="hidden items-center gap-3 sm:flex">
        <Skeleton className="size-9 rounded-full" />
        <div className="grid justify-items-end gap-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
  );
}

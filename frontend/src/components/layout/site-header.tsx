import { Suspense } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { siteConfig } from "@/config/site";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30 transition-colors group-hover:bg-primary/20">
            <Activity className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              {siteConfig.name}
            </span>
            <span className="hidden font-mono text-[10px] tracking-wider text-muted-foreground uppercase sm:inline">
              Retention Intelligence
            </span>
          </div>
        </Link>

        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
              <Activity className="size-4.5" strokeWidth={2.5} />
            </span>
            <span className="hidden text-base sm:inline sm:text-lg">{siteConfig.name}</span>
          </Link>
          <Badge variant="outline" className="hidden border-primary/30 text-primary md:inline-flex">
            v{siteConfig.version} · beta
          </Badge>
        </div>

        {/* Statyczna powłoka nagłówka renderuje się od razu; dane konta dochodzą strumieniowo. */}
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

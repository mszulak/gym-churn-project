import Link from "next/link";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Activity className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-base sm:text-lg">{siteConfig.name}</span>
        </Link>
        <Badge variant="outline" className="border-primary/30 text-primary">
          v{siteConfig.version} · beta
        </Badge>
      </div>
    </header>
  );
}

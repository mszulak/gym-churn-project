import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p className="font-medium text-foreground/80">{siteConfig.name}</p>
        <p className="text-center sm:text-right">
          Churn risk prediction and member retention analytics for fitness clubs.
        </p>
      </div>
    </footer>
  );
}

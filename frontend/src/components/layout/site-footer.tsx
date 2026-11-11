import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>© {siteConfig.name}</p>
        <p>Wersja {siteConfig.version} · Twoje dane widoczne są tylko dla Twojego konta</p>
      </div>
    </footer>
  );
}

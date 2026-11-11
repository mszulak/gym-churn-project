import Link from "next/link";
import { Activity, BellRing, ShieldCheck, TrendingDown } from "lucide-react";
import { siteConfig } from "@/config/site";

const highlights = [
  { icon: TrendingDown, text: "Wykrywaj klientów z wysokim ryzykiem rezygnacji" },
  { icon: BellRing, text: "Poznaj przewidywany termin odejścia i pewność predykcji" },
  { icon: ShieldCheck, text: "Twoje dane są dostępne tylko dla Twojego konta" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-full flex-1 lg:grid-cols-2">
      {/* Panel marki — tylko na dużych ekranach */}
      <aside className="relative hidden overflow-hidden border-r border-border/60 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-glow" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid" />

        <Link href="/" className="relative flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Activity className="size-5" strokeWidth={2.5} />
          </span>
          <span className="text-lg">{siteConfig.name}</span>
        </Link>

        <div className="relative space-y-8">
          <h2 className="max-w-md text-4xl font-semibold tracking-tight text-balance">
            Zatrzymaj klientów,{" "}
            <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              zanim odejdą
            </span>
          </h2>
          <ul className="space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted-foreground">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {siteConfig.name} · wersja {siteConfig.version}
        </p>
      </aside>

      {/* Formularz */}
      <main className="relative flex flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-glow lg:hidden" />

        <Link
          href="/"
          className="relative mb-10 flex items-center gap-2.5 font-semibold tracking-tight lg:hidden"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <Activity className="size-4.5" strokeWidth={2.5} />
          </span>
          <span className="text-lg">{siteConfig.name}</span>
        </Link>

        <div className="relative w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

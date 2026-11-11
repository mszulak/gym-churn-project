import Link from "next/link";
import { Activity, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { siteConfig } from "@/config/site";

const HIGHLIGHTS = [
  {
    icon: TrendingDown,
    title: "Early churn detection",
    description:
      "Identify members at high risk of canceling their membership weeks before they stop visiting the club.",
  },
  {
    icon: Sparkles,
    title: "Actionable retention insights",
    description:
      "Receive clear uncertainty intervals and estimated days to churn so your team can intervene in time.",
  },
  {
    icon: ShieldCheck,
    title: "Isolated club workspace",
    description:
      "Each gym owner accesses an encrypted, isolated session dedicated to their fitness club.",
  },
] as const;

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-12">
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-card/40 p-10 lg:col-span-5 lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -left-28 size-96 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 bottom-0 size-80 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Activity className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-heading text-base font-bold tracking-tight text-foreground">
                {siteConfig.name}
              </span>
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Retention Intelligence
              </span>
            </div>
          </Link>
        </div>

        <div className="relative z-10 my-auto space-y-8 py-12">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs font-medium text-primary">
              Gym Owner Portal
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground xl:text-4xl">
              Retain members before they cancel their membership.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to your gym account, upload a member CSV export, and get a
              list of members requiring immediate retention action.
            </p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-background/50 p-4 backdrop-blur-sm"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-border/50 pt-6 text-xs text-muted-foreground">
          <span>{siteConfig.name}</span>
          <span className="font-mono">FastAPI + Next.js Auth</span>
        </div>
      </aside>

      <main className="flex flex-col justify-center px-4 py-10 sm:px-6 lg:col-span-7 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="flex items-center justify-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
                <Activity className="size-5" aria-hidden="true" />
              </span>
              <span className="font-heading text-base font-bold tracking-tight text-foreground">
                {siteConfig.name}
              </span>
            </Link>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

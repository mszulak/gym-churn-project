import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CsvUpload } from "@/components/upload/csv-upload";
import { HowItWorks } from "@/components/sections/how-it-works";
import { RiskLevels } from "@/components/sections/risk-levels";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-clip">
      {/* dekoracyjne tło */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-glow" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-grid" />

      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-4 pt-16 pb-24 sm:px-6 sm:pt-24">
        <section aria-labelledby="hero" className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="size-3.5" />
              Retencja klientów oparta na danych
            </span>
            <h1
              id="hero"
              className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
            >
              Zatrzymaj klientów,{" "}
              <span className="bg-linear-to-r from-primary to-chart-2 bg-clip-text text-transparent">
                zanim odejdą
              </span>
            </h1>
            <p className="max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
              Wgraj dane swoich klientów, a wskażemy osoby z wysokim ryzykiem rezygnacji
              z karnetu — z prawdopodobieństwem, przewidywanym terminem i poziomem pewności.
            </p>
          </div>

          <CsvUpload />
        </section>

        <HowItWorks />
        <RiskLevels />
      </main>

      <SiteFooter />
    </div>
  );
}

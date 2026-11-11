import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { AnalysisWorkspace } from "@/components/upload/analysis-workspace";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-glow"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-grid"
      />

      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-10 pb-20 sm:px-6 sm:pt-12">
        <AnalysisWorkspace />
      </main>

      <SiteFooter />
    </div>
  );
}

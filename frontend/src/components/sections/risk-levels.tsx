import { ShieldAlert, ShieldCheck, ShieldQuestion, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskLevel {
  icon: LucideIcon;
  label: string;
  range: string;
  description: string;
  className: string;
  barClassName: string;
  width: string;
}

const riskLevels: RiskLevel[] = [
  {
    icon: ShieldAlert,
    label: "Wysokie ryzyko",
    range: "> 70%",
    description: "Klient prawdopodobnie zrezygnuje w najbliższych tygodniach. Wymaga pilnej reakcji.",
    className: "text-risk-high bg-risk-high/10 ring-risk-high/25",
    barClassName: "bg-risk-high",
    width: "w-[85%]",
  },
  {
    icon: ShieldQuestion,
    label: "Średnie ryzyko",
    range: "30–70%",
    description: "Pierwsze sygnały spadku zaangażowania. Warto przypomnieć się klientowi.",
    className: "text-risk-medium bg-risk-medium/10 ring-risk-medium/25",
    barClassName: "bg-risk-medium",
    width: "w-[50%]",
  },
  {
    icon: ShieldCheck,
    label: "Niskie ryzyko",
    range: "< 30%",
    description: "Lojalny, aktywny klient. Dbaj o dobre doświadczenia.",
    className: "text-risk-low bg-risk-low/10 ring-risk-low/25",
    barClassName: "bg-risk-low",
    width: "w-[15%]",
  },
];

export function RiskLevels() {
  return (
    <section aria-labelledby="risk-levels" className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 id="risk-levels" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Co otrzymasz?
        </h2>
        <p className="text-muted-foreground">
          Listę klientów podzieloną na poziomy ryzyka rezygnacji z karnetu.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {riskLevels.map((level) => (
          <div
            key={level.label}
            className="flex flex-col gap-4 rounded-xl bg-card/50 p-5 ring-1 ring-foreground/10"
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm font-medium ring-1",
                  level.className,
                )}
              >
                <level.icon className="size-4" />
                {level.label}
              </span>
              <span className="font-mono text-sm text-muted-foreground">{level.range}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", level.barClassName, level.width)} />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{level.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

import { BrainCircuit, FileUp, Gift, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: FileUp,
    title: "Wgraj dane",
    description:
      "Wyeksportuj dane klientów i ich aktywności do pliku CSV i wgraj go jednym kliknięciem.",
  },
  {
    icon: BrainCircuit,
    title: "Analiza ryzyka",
    description:
      "Model ocenia każdego klienta: prawdopodobieństwo rezygnacji, przewidywany termin i pewność predykcji.",
  },
  {
    icon: Gift,
    title: "Zareaguj na czas",
    description:
      "Zatrzymaj klientów z grupy ryzyka — wyślij maila, zaproponuj voucher lub darmowy trening.",
  },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works" className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 id="how-it-works" className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Jak to działa?
        </h2>
        <p className="text-muted-foreground">Trzy kroki od surowych danych do konkretnych działań.</p>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title}>
            <Card className="h-full bg-card/50 transition-colors hover:bg-card/80">
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
                    <step.icon className="size-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-foreground/60">
                    0{index + 1}
                  </span>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}

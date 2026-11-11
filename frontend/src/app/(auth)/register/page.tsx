import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Gym Account",
  description: "Create a gym owner account in Gym Churn Analysis.",
};

export default function RegisterPage() {
  return (
    <Card className="border-border/80 bg-card/85 shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-2">
        <span className="font-mono text-xs font-medium tracking-wider text-primary uppercase">
          New Club Registration
        </span>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Create an owner account
        </h2>
        <p className="text-sm text-muted-foreground">
          Register your gym to analyze member churn risk from CSV exports.
        </p>
      </CardHeader>

      <CardContent className="pt-4">
        <RegisterForm />
      </CardContent>
    </Card>
  );
}

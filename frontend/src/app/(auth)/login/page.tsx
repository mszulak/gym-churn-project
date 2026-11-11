import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { RegisteredNotice } from "@/components/auth/registered-notice";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to the Gym Churn Analysis owner portal.",
};

export default function LoginPage() {
  return (
    <Card className="border-border/80 bg-card/85 shadow-xl backdrop-blur-sm">
      <CardHeader className="space-y-2 pb-2">
        <span className="font-mono text-xs font-medium tracking-wider text-primary uppercase">
          Owner Access
        </span>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </h2>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to head to the CSV upload and churn analysis
          workspace.
        </p>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        <Suspense fallback={null}>
          <RegisteredNotice />
        </Suspense>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}

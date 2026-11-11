import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RegisteredNotice } from "@/components/auth/registered-notice";

export const metadata: Metadata = {
  title: "Logowanie",
};

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Witaj ponownie</h1>
        <p className="text-muted-foreground">Zaloguj się, aby analizować dane swoich klientów.</p>
      </div>
      <LoginForm
        notice={
          // useSearchParams wymaga granicy Suspense przy prerenderingu
          <Suspense fallback={null}>
            <RegisteredNotice />
          </Suspense>
        }
      />
    </div>
  );
}

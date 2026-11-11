import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Rejestracja",
};

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Załóż konto</h1>
        <p className="text-muted-foreground">
          Zarejestruj swoją siłownię i zacznij wykrywać klientów zagrożonych odejściem.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}

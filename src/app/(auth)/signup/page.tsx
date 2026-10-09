import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Créer un compte · Rushs" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="mb-6 text-lg font-medium">Créer un compte</h1>
      <SignUpForm />
    </>
  );
}

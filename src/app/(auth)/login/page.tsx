import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Connexion · Rushs" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const initialError =
    error === "confirmation" ? "Le lien de confirmation est invalide ou a expiré." : undefined;

  return (
    <>
      <h1 className="mb-6 text-lg font-medium">Connexion</h1>
      <SignInForm initialError={initialError} />
    </>
  );
}

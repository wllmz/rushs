"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signIn, type AuthFormState } from "../actions";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signIn, {
    error: initialError,
  });

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        required
        errors={state.fieldErrors?.email}
      />
      <Field
        name="password"
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        required
        errors={state.fieldErrors?.password}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
      <p className="text-center text-sm text-foreground/70">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}

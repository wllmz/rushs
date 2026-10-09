"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { signUp, type AuthFormState } from "../actions";

export function SignUpForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signUp, {});

  if (state.emailSent) {
    return (
      <div role="status" className="flex flex-col gap-2 text-center">
        <p className="font-medium">Vérifiez votre boîte mail</p>
        <p className="text-sm text-foreground/70">
          Un lien de confirmation vient de vous être envoyé. Ouvrez-le dans ce navigateur pour
          activer votre compte.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field
        name="fullName"
        label="Nom complet"
        autoComplete="name"
        defaultValue={state.values?.fullName}
        required
        errors={state.fieldErrors?.fullName}
      />
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
        autoComplete="new-password"
        required
        errors={state.fieldErrors?.password}
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-foreground/70">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

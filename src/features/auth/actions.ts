"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { signInErrorMessage, signUpErrorMessage } from "./messages";
import { HOME_PATH, SIGN_IN_PATH } from "./routes";
import { signInSchema, signUpSchema } from "./schemas";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  // Set when the account needs its email confirmed before signing in
  emailSent?: boolean;
  // React resets the form after an action: these refill it, never the password
  values?: { email?: string; fullName?: string };
};

function keptValues(formData: FormData) {
  const read = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return { email: read("email"), fullName: read("fullName") };
}

export async function signIn(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keptValues(formData);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { values, error: signInErrorMessage(error.code) };

  redirect(HOME_PATH);
}

export async function signUp(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = keptValues(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { values, fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { fullName, email, password } = parsed.data;
  const origin = (await headers()).get("origin");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Without an origin header, Supabase falls back to the Site URL of the project
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) return { values, error: signUpErrorMessage(error.code) };

  // No session means Supabase waits for the email confirmation
  if (!data.session) return { emailSent: true };

  redirect(HOME_PATH);
}

export async function signOut() {
  const supabase = await createClient();
  // Signs out this browser only, not the user's other devices
  await supabase.auth.signOut({ scope: "local" });
  redirect(SIGN_IN_PATH);
}

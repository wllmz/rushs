import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Nom requis").max(80, "80 caractères maximum"),
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

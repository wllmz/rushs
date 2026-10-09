// Supabase Auth error codes turned into messages for the user.
// Anything unexpected gets a generic message instead of blaming the credentials.

const RATE_LIMITED = ["over_request_rate_limit", "over_email_send_rate_limit"];

export function signInErrorMessage(code: string | undefined): string {
  if (code === "invalid_credentials") return "E-mail ou mot de passe incorrect.";
  if (code === "email_not_confirmed") return "Confirmez d'abord votre adresse e-mail.";
  if (code && RATE_LIMITED.includes(code)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Connexion impossible. Réessayez dans un instant.";
}

export function signUpErrorMessage(code: string | undefined): string {
  if (code === "weak_password") return "Mot de passe trop faible.";
  if (code && RATE_LIMITED.includes(code)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Inscription impossible. Réessayez dans un instant.";
}

import { describe, expect, it } from "vitest";
import { signInErrorMessage, signUpErrorMessage } from "./messages";

describe("signInErrorMessage", () => {
  it("blames the credentials only when they are wrong", () => {
    expect(signInErrorMessage("invalid_credentials")).toBe("E-mail ou mot de passe incorrect.");
    expect(signInErrorMessage("unexpected_failure")).toBe("Connexion impossible. Réessayez dans un instant.");
    expect(signInErrorMessage(undefined)).toBe("Connexion impossible. Réessayez dans un instant.");
  });

  it("explains an unconfirmed email and a rate limit", () => {
    expect(signInErrorMessage("email_not_confirmed")).toBe("Confirmez d'abord votre adresse e-mail.");
    expect(signInErrorMessage("over_request_rate_limit")).toBe(
      "Trop de tentatives. Réessayez dans quelques minutes.",
    );
  });
});

describe("signUpErrorMessage", () => {
  it("explains a weak password, falls back to a generic message", () => {
    expect(signUpErrorMessage("weak_password")).toBe("Mot de passe trop faible.");
    expect(signUpErrorMessage("unexpected_failure")).toBe("Inscription impossible. Réessayez dans un instant.");
  });
});

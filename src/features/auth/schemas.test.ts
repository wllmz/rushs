import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./schemas";

describe("signUpSchema", () => {
  const valid = { fullName: "Léa Martin", email: "lea@studio.fr", password: "motdepasse" };

  it("accepts a valid sign up", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("trims the name and rejects a blank one", () => {
    expect(signUpSchema.parse({ ...valid, fullName: "  Léa  " }).fullName).toBe("Léa");
    expect(signUpSchema.safeParse({ ...valid, fullName: "   " }).success).toBe(false);
  });

  it("rejects a password under 8 characters", () => {
    expect(signUpSchema.safeParse({ ...valid, password: "court" }).success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("rejects a malformed email", () => {
    expect(signInSchema.safeParse({ email: "lea", password: "x" }).success).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));
// redirect() throws in Next: the mock does the same so the code after it never runs
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const { signIn, signUp, signOut } = await import("./actions");

function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => vi.clearAllMocks());

describe("signIn", () => {
  it("does not call Supabase when the input is invalid", async () => {
    const state = await signIn({}, form({ email: "lea", password: "" }));

    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(state.fieldErrors?.email).toBeDefined();
    expect(state.values?.email).toBe("lea");
  });

  it("keeps the email but never the password on wrong credentials", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });

    const state = await signIn({}, form({ email: "lea@studio.fr", password: "secret123" }));

    expect(state.error).toBe("E-mail ou mot de passe incorrect.");
    expect(state.values).toEqual({ email: "lea@studio.fr", fullName: undefined });
    expect(JSON.stringify(state)).not.toContain("secret123");
  });

  it("redirects to the projects once signed in", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });

    await expect(signIn({}, form({ email: "lea@studio.fr", password: "secret123" }))).rejects.toThrow(
      "REDIRECT:/projects",
    );
  });
});

describe("signUp", () => {
  const valid = { fullName: "Léa Martin", email: "lea@studio.fr", password: "motdepasse" };

  it("sends the name as metadata and the callback as redirect", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    await signUp({}, form(valid));

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "lea@studio.fr",
      password: "motdepasse",
      options: {
        data: { full_name: "Léa Martin" },
        emailRedirectTo: "http://localhost:3000/auth/callback",
      },
    });
  });

  it("asks to check the inbox when no session comes back", async () => {
    auth.signUp.mockResolvedValue({ data: { session: null }, error: null });

    expect(await signUp({}, form(valid))).toEqual({ emailSent: true });
  });

  it("maps a rate limit to its own message", async () => {
    auth.signUp.mockResolvedValue({ data: {}, error: { code: "over_email_send_rate_limit" } });

    const state = await signUp({}, form(valid));

    expect(state.error).toBe("Trop de tentatives. Réessayez dans quelques minutes.");
  });
});

describe("signOut", () => {
  it("signs out this browser only, then goes to the sign-in page", async () => {
    await expect(signOut()).rejects.toThrow("REDIRECT:/login");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});

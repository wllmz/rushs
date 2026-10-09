import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "./routes";

describe("getAuthRedirect", () => {
  it("sends signed-out visitors to the sign-in page", () => {
    expect(getAuthRedirect("/projects", false)).toBe("/login");
    expect(getAuthRedirect("/", false)).toBe("/login");
  });

  it("lets signed-out visitors reach the auth pages", () => {
    expect(getAuthRedirect("/login", false)).toBeNull();
    expect(getAuthRedirect("/signup", false)).toBeNull();
  });

  it("sends signed-in users away from the auth pages", () => {
    expect(getAuthRedirect("/login", true)).toBe("/projects");
    expect(getAuthRedirect("/signup", true)).toBe("/projects");
  });

  it("lets signed-in users through the app", () => {
    expect(getAuthRedirect("/projects", true)).toBeNull();
  });

  it("always lets the email confirmation callback through", () => {
    expect(getAuthRedirect("/auth/callback", false)).toBeNull();
    expect(getAuthRedirect("/auth/callback", true)).toBeNull();
  });

  it("does not treat a lookalike path as an auth page", () => {
    expect(getAuthRedirect("/login-help", false)).toBe("/login");
  });
});

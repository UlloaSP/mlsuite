import { describe, expect, test } from "vite-plus/test";
import { HttpError } from "@/shared/api/http";
import { AUTH_COPY, authFailureMessage } from "@/app/pages/auth-landing/authLandingCopy";

const refusal = (status: number, message: string) =>
  new HttpError({ timestamp: "2026-10-27T00:00:00Z", status, message, path: "/api/auth/login" });

describe("authFailureMessage", () => {
  test("a throttled attempt shows the API's reason", () => {
    const message = "Too many failed sign-in attempts from your network. Try again later.";

    expect(authFailureMessage("login", refusal(429, message))).toBe(message);
  });

  test("wrong credentials keep the form's own copy", () => {
    expect(authFailureMessage("login", refusal(401, "Bad credentials"))).toBe(
      AUTH_COPY.login.error,
    );
    expect(authFailureMessage("register", refusal(500, "Failed"))).toBe(AUTH_COPY.register.error);
  });

  test("a refused registration says what to change", () => {
    const message = "The handle 'ada' is already taken.";

    expect(authFailureMessage("register", refusal(409, message))).toBe(message);
    expect(authFailureMessage("register", refusal(400, "The handle 'admin' is reserved."))).toBe(
      "The handle 'admin' is reserved.",
    );
    expect(authFailureMessage("login", refusal(400, "email: must be set"))).toBe(
      AUTH_COPY.login.error,
    );
  });

  test("a network failure keeps the form's own copy", () => {
    expect(authFailureMessage("login", new TypeError("Failed to fetch"))).toBe(
      AUTH_COPY.login.error,
    );
  });
});

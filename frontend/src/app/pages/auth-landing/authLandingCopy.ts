/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isHttpError } from "@/shared/api/http";

export const PASSWORD_MIN_LENGTH = 10;

export const AUTH_MODES = ["login", "register"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const AUTH_COPY = {
  login: {
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New to MLsuite?",
    switchAction: "Create an account",
    error: "We couldn't sign you in. Check your details and try again.",
    passwordAutoComplete: "current-password",
  },
  register: {
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
    error: "We couldn't create your account. Review your details and try again.",
    passwordAutoComplete: "new-password",
  },
} as const;

/**
 * A throttled attempt (429) says why and that waiting helps, and a refused registration (a handle
 * that is taken, reserved or malformed) what to change; any other failure keeps the form's copy.
 */
export function authFailureMessage(mode: AuthMode, error: unknown) {
  if (!isHttpError(error)) return AUTH_COPY[mode].error;
  const explained =
    error.status === 429 || (mode === "register" && [400, 409].includes(error.status));
  return explained ? error.message : AUTH_COPY[mode].error;
}

/**
 * Whether a failure is about what was typed (wrong credentials, a taken handle) rather than the
 * attempt itself (throttled, server or network down), so only the former marks the fields.
 */
export function authFailureBlamesFields(mode: AuthMode, error: unknown) {
  if (!isHttpError(error)) return false;
  return mode === "login" ? [400, 401].includes(error.status) : [400, 409].includes(error.status);
}

const FIELD_NAMES: Record<string, string> = {
  fullName: "your full name",
  username: "a username",
  email: "your email address",
  password: "your password",
};

/** What the browser would refuse in a field, said in the form's words instead of a bubble. */
export function invalidFieldMessage(mode: AuthMode, input: HTMLInputElement) {
  const { validity } = input;
  if (validity.valueMissing) return `Enter ${FIELD_NAMES[input.name] ?? "this field"}.`;
  if (validity.typeMismatch && input.type === "email") {
    return mode === "login"
      ? "Sign in with your email address, like you@example.com, not your username."
      : "Enter a valid email address, like you@example.com.";
  }
  if (validity.tooShort) return `Use at least ${input.minLength} characters.`;
  return input.validationMessage || "Check this field.";
}

export function greetingFor(mode: AuthMode, now: Date) {
  if (mode === "register") return { lead: "Nice to", emphasis: "meet you." };
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return { lead: "Hello,", emphasis: "night owl." };
  const part = hour < 12 ? "morning." : hour < 19 ? "afternoon." : "evening.";
  return { lead: "Good", emphasis: part };
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const PASSWORD_MIN_LENGTH = 10;

export type AuthMode = "login" | "register";

export const AUTH_COPY = {
  login: {
    submit: "Sign in",
    switchPrompt: "New to MLsuite?",
    switchAction: "Create an account",
    error: "We couldn't sign you in. Check your details and try again.",
    passwordAutoComplete: "current-password",
  },
  register: {
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
    error: "We couldn't create your account. Review your details and try again.",
    passwordAutoComplete: "new-password",
  },
} as const;

export function greetingFor(mode: AuthMode, now: Date) {
  if (mode === "register") return { lead: "Nice to", emphasis: "meet you." };
  const hour = now.getHours();
  if (hour < 5 || hour >= 22) return { lead: "Hello,", emphasis: "night owl." };
  const part = hour < 12 ? "morning." : hour < 19 ? "afternoon." : "evening.";
  return { lead: "Good", emphasis: part };
}

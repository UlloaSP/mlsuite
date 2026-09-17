/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const PASSWORD_MIN_LENGTH = 10;

export type AuthMode = "login" | "register";

export const AUTH_COPY = {
  login: {
    titleLead: "Access your",
    titleEmphasis: "workspace.",
    submit: "Sign in",
    pending: "Signing in",
    switchPrompt: "New to ML Suite?",
    switchAction: "Create an account",
    error: "We couldn't sign you in. Check your details and try again.",
    passwordAutoComplete: "current-password",
  },
  register: {
    titleLead: "Create",
    titleEmphasis: "account.",
    submit: "Create account",
    pending: "Creating account",
    switchPrompt: "Already have an account?",
    switchAction: "Sign in",
    error: "We couldn't create your account. Review your details and try again.",
    passwordAutoComplete: "new-password",
  },
} as const;

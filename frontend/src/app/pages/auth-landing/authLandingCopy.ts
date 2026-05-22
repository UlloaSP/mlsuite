/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const APP_NAME = "MLSuite";
export const ISSUE_LABEL = "Vol. 2 · Issue 4";
export const EYEBROW = "Machine Learning Infrastructure";
export const HERO_LINES = ["The suite that", "runs your", "models."] as const;
export const HERO_DESCRIPTION =
  "Deploy, evaluate, and review machine learning models from one controlled workspace.";
export const AUTH_HELP_TEXT = "Use your MLSuite account to enter the workspace.";
export const BACK_LABEL = "Back";
export const PASSWORD_MIN_LENGTH = 10;

const AUTH_MODES = ["login", "register"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export const AUTH_COPY = {
  login: {
    tab: "Iniciar sesión",
    submit: "Take me in →",
    switch: "or create account",
    foot: "Forgot password?",
    emailPlaceholder: "my email",
    passwordAutoComplete: "current-password",
  },
  register: {
    tab: "Crear cuenta",
    submit: "Create my account →",
    switch: "or sign in",
    foot: "By signing up, you agree to the Terms.",
    emailPlaceholder: "email",
    passwordAutoComplete: "new-password",
  },
} as const;

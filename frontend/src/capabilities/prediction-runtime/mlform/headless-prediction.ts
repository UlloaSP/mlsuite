/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";

const MLSUITE_THEME_TOKENS = {
  "--mlf-color-bg": "var(--color-page)",
  "--mlf-color-surface": "var(--color-surface)",
  "--mlf-color-surface-muted": "var(--color-surface-muted)",
  "--mlf-color-surface-elevated": "var(--color-surface-subtle)",
  "--mlf-color-text": "var(--color-fg)",
  "--mlf-color-text-muted": "var(--color-fg-secondary)",
  "--mlf-color-text-inverse": "var(--color-fg-inverse)",
  "--mlf-color-border": "var(--color-line)",
  "--mlf-color-border-strong": "var(--color-line-strong)",
  "--mlf-color-accent": "var(--color-accent)",
  "--mlf-color-accent-hover": "var(--color-accent-strong)",
  "--mlf-color-accent-soft": "var(--color-accent-subtle)",
  "--mlf-color-focus-ring": "var(--color-accent)",
  "--mlf-color-hover-surface": "var(--color-surface-muted)",
  "--mlf-color-success": "var(--color-success-fg)",
  "--mlf-color-warning": "var(--color-warning-fg)",
  "--mlf-color-danger": "var(--color-danger-fg)",
  "--mlf-color-danger-soft": "var(--color-danger-subtle)",
  "--mlf-font-family-body": "var(--font-sans)",
  "--mlf-font-family-heading": "var(--font-sans)",
  "--mlf-font-family-ui": "var(--font-sans)",
  "--mlf-font-family-mono": "var(--font-mono)",
} as const;

export const getPredictionDesignSystem = (theme: PredictionTheme) => ({
  mode: theme,
  theme: "airbnb" as const,
  recipe: "default" as const,
  overrides: { tokens: MLSUITE_THEME_TOKENS },
});

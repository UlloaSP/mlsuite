/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionTheme } from "@/capabilities/prediction-runtime/mlform/shared";

const MLSUITE_THEME_TOKENS = {
  "--mlf-color-bg": "var(--page-bg)",
  "--mlf-color-surface": "var(--surface-primary)",
  "--mlf-color-surface-muted": "var(--surface-muted)",
  "--mlf-color-surface-elevated": "var(--surface-secondary)",
  "--mlf-color-text": "var(--text-primary)",
  "--mlf-color-text-muted": "var(--text-secondary)",
  "--mlf-color-text-inverse": "var(--text-inverse)",
  "--mlf-color-border": "var(--border-soft)",
  "--mlf-color-border-strong": "var(--border-strong)",
  "--mlf-color-accent": "var(--accent-primary)",
  "--mlf-color-accent-hover": "var(--accent-primary-strong)",
  "--mlf-color-accent-soft": "var(--accent-quiet)",
  "--mlf-color-focus-ring": "var(--accent-primary)",
  "--mlf-color-hover-surface": "var(--surface-muted)",
  "--mlf-color-success": "var(--success-text)",
  "--mlf-color-warning": "var(--warning-text)",
  "--mlf-color-danger": "var(--danger-text)",
  "--mlf-color-danger-soft": "var(--danger-quiet)",
  "--mlf-font-family-body": "var(--font-sans)",
  "--mlf-font-family-heading": "var(--font-display)",
  "--mlf-font-family-ui": "var(--font-sans)",
  "--mlf-font-family-mono": "var(--font-mono)",
} as const;

export const getPredictionDesignSystem = (theme: PredictionTheme) => ({
  mode: theme,
  theme: "airbnb" as const,
  recipe: "default" as const,
  overrides: { tokens: MLSUITE_THEME_TOKENS },
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionTheme } from "@/capabilities/mlform/shared";

export const getPredictionDesignSystem = (theme: PredictionTheme) => ({
  mode: theme,
  theme: "airbnb" as const,
  recipe: "default" as const,
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionRunDto } from "./types";

export const prependMissingPredictionRuns = (
  current: readonly PredictionRunDto[] | undefined,
  savedRuns: readonly PredictionRunDto[],
): PredictionRunDto[] => {
  const existing = current ?? [];
  const existingIds = new Set(existing.map((run) => run.id));
  return [...savedRuns.filter((run) => !existingIds.has(run.id)), ...existing];
};

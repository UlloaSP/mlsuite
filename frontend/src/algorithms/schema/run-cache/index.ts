/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PredictionRunDto } from "../../../api/schemas/dtos";

/**
 * prependMissingPredictionRuns: prepends data while preserving immutable state shape
 *
 * Purpose: keeps newly saved schema runs visible in cached run lists.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const prependMissingPredictionRuns = (
  current: readonly PredictionRunDto[] | undefined,
  savedRuns: readonly PredictionRunDto[],
): PredictionRunDto[] => {
  const existing = current ?? [];
  const existingIds = new Set(existing.map((run) => run.id));
  return [...savedRuns.filter((run) => !existingIds.has(run.id)), ...existing];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * schemaRunDebug: performs the exported transformation for this algorithm.
 *
 * Purpose: keeps call sites compiled while diagnostics are disabled.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: No side effects.
 */
export const schemaRunDebug = (_step: string, _details?: unknown): void => {
  // Diagnostic hook intentionally disabled in normal builds/tests.
};

/**
 * schemaRunDebugError: performs the exported transformation for this algorithm.
 *
 * Purpose: keeps error diagnostic call sites compiled while diagnostics are disabled.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: No side effects.
 */
export const schemaRunDebugError = (_step: string, _error: unknown, _details?: unknown): void => {
  // Diagnostic hook intentionally disabled in normal builds/tests.
};

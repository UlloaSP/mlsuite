/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** PREFIX: internal constant/cache for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const PREFIX = "[schema-plugin-debug]";

/**
 * schemaRunDebug: performs the exported transformation for this algorithm.
 *
 * Purpose: emits schema-run diagnostic logs.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Writes diagnostic output to console and does not alter schema/run state.
 */
export const schemaRunDebug = (step: string, details?: unknown): void => {
  console.log(PREFIX, step, details ?? "");
};

/**
 * schemaRunDebugError: performs the exported transformation for this algorithm.
 *
 * Purpose: emits schema-run diagnostic logs.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Writes diagnostic output to console and does not alter schema/run state.
 */
export const schemaRunDebugError = (step: string, error: unknown, details?: unknown): void => {
  console.error(PREFIX, step, { error, details });
};

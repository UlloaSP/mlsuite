/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormController, FormSchema, NormalizedFieldConfig } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../plugin/custom-field-catalog";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";

/**
 * JsonRecord: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type JsonRecord = Record<string, unknown>;
type CompatIssueSeverity = "error" | "warning";

/**
 * CompatIssue: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type CompatIssue = {
  path: Array<string | number>;
  message: string;
  severity: CompatIssueSeverity;
};

/**
 * CompatValidationResult: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type CompatValidationResult =
  | {
      success: true;
      data: FormSchema;
      issues: CompatIssue[];
    }
  | {
      success: false;
      issues: CompatIssue[];
    };

/**
 * PredictionTheme: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type PredictionTheme = "light" | "dark";

/**
 * MountPredictionFormOptions: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type MountPredictionFormOptions = {
  container: HTMLElement;
  schema: unknown;
  modelId: string;
  theme: PredictionTheme;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  onSubmit?: (inputs: Record<string, unknown>, response: Record<string, unknown>) => void;
  onSubmitError?: (error: unknown) => void;
};

/**
 * MountedPredictionForm: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type MountedPredictionForm = {
  readonly form: FormController;
  readonly host: HTMLElement;
  updateTheme: (theme: PredictionTheme) => void;
  unmount: () => void;
};

/**
 * PredictionPayloadField: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Propagates browser/API/runtime failures from the called platform APIs.
 * @remarks Side cases/effects: Performs async catalog/report work and preserves existing cache semantics for repeat calls.
 */
export type PredictionPayloadField = Pick<
  NormalizedFieldConfig,
  "id" | "kind" | "label" | "ui" | "includeInSubmission"
> & {
  mappedTo?: unknown;
  options?: unknown;
};

/**
 * isRecord: returns a boolean guard/result for the requested predicate
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** slugify: internal helper for MLForm compatibility and runtime adaptation. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const slugify = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "item";
};

/**
 * toUniqueId: converts data into another contract shape
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const toUniqueId = (preferred: string, fallback: string, usedIds: Set<string>): string => {
  const base = slugify(preferred || fallback);
  let candidate = base;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
};

/**
 * getString: extracts a derived value without mutating input
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

/**
 * normalizeIssuePath: normalizes loose runtime data into the app contract
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const normalizeIssuePath = (path: readonly PropertyKey[]): Array<string | number> =>
  path.map((part) => (typeof part === "number" ? part : String(part)));

/**
 * hasBlockingIssues: returns whether the requested condition exists
 *
 * Purpose: provides shared MLForm compatibility types and value guards.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const hasBlockingIssues = (issues: readonly CompatIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");

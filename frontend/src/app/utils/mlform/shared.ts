/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type {
  FieldConfig,
  FormController,
  FormSchema,
  NormalizedFieldConfig,
} from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";

export type JsonRecord = Record<string, unknown>;
type CompatIssueSeverity = "error" | "warning";

export type CompatIssue = {
  path: Array<string | number>;
  message: string;
  severity: CompatIssueSeverity;
};

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

export type PredictionTheme = "light" | "dark";

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

export type MountedPredictionForm = {
  readonly form: FormController;
  readonly host: HTMLElement;
  updateTheme: (theme: PredictionTheme) => void;
  unmount: () => void;
};

export type PredictionPayloadField = Pick<
  NormalizedFieldConfig,
  "id" | "kind" | "label" | "ui" | "includeInSubmission"
>;

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

export const getString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

export const getBackendKey = (field: Pick<FieldConfig, "id" | "label" | "ui">): string => {
  if (isRecord(field.ui) && typeof field.ui.backendKey === "string" && field.ui.backendKey.trim()) {
    return field.ui.backendKey;
  }

  return field.label || field.id || "field";
};

export const normalizeIssuePath = (path: readonly PropertyKey[]): Array<string | number> =>
  path.map((part) => (typeof part === "number" ? part : String(part)));

export const hasBlockingIssues = (issues: readonly CompatIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");

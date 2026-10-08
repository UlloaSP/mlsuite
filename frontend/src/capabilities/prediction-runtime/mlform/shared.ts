/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { FormController, FormSchema, NormalizedFieldConfig } from "mlform/runtime";

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

export type MountedPredictionForm = {
  readonly form: FormController;
  readonly host: HTMLElement;
  updateTheme: (theme: PredictionTheme) => void;
  unmount: () => void;
};

export type PredictionPayloadField = Pick<
  NormalizedFieldConfig,
  "id" | "kind" | "label" | "ui" | "includeInSubmission"
> & {
  mappedTo?: unknown;
  options?: unknown;
  aggregations?: unknown;
};

export const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const getString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

export const hasBlockingIssues = (issues: readonly CompatIssue[]): boolean =>
  issues.some((issue) => issue.severity === "error");

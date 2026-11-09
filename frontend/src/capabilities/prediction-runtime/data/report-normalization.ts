/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "@/capabilities/prediction-runtime/mlform/shared";

/** A stored classifier's class labels, in class order. */
export const mappingLabels = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

/**
 * A stored class as the schema names it: a schema's class labels name the stored classes in
 * order, so a class reads as the label in its place among the stored `classes`.
 */
export const classLabel = (
  labels: readonly string[],
  classes: readonly string[],
  value: unknown,
): unknown => labels[classes.indexOf(String(value))] ?? value;

/** What a stored built-in report predicted: a classifier's class, or a regressor's value. */
export const builtinPrediction = (payload: JsonRecord): unknown =>
  payload.prediction ?? (Array.isArray(payload.values) ? payload.values[0] : undefined);

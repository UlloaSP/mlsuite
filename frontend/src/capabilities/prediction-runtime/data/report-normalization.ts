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

/** What a stored built-in report predicted: a classifier's class, or a regressor's value. */
export const builtinPrediction = (payload: JsonRecord): unknown =>
  payload.prediction ?? (Array.isArray(payload.values) ? payload.values[0] : undefined);

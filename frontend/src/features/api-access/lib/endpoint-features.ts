/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  getString,
  isRecord,
  type JsonRecord,
} from "@/capabilities/prediction-runtime/mlform/shared";

/** A scalar the runtime reads from the record; `nullable` features may be sent as null. */
export type ApiDocFeature = { name: string; type: string; nullable: boolean };

export type FeatureDraft = { feature: ApiDocFeature; example: number | boolean };

export const records = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

/** A feature name is a `mappedTo`: a name, or a position for models that name no features. */
const featureName = (mappedTo: unknown): string | undefined =>
  typeof mappedTo === "string" && mappedTo
    ? mappedTo
    : typeof mappedTo === "number"
      ? String(mappedTo)
      : undefined;

const scalar = (
  name: string,
  type: string,
  nullable: boolean,
  example: FeatureDraft["example"],
) => ({
  feature: { name, type, nullable },
  example,
});

/**
 * The scalars one field of the model's signature feeds. The runtime reads numbers (a boolean
 * counts as 1 or 0), so every example is one; a category or a series is still one number.
 */
export function fieldFeatures(field: JsonRecord): FeatureDraft[] {
  const nullable = field.required !== true;
  const kind = getString(field.kind);
  if (kind === "onehot-category") {
    const label = getString(field.label) ?? "group";
    return records(field.options).flatMap((option, index) => {
      const name = featureName(option.mappedTo);
      const choice = getString(option.value) ?? getString(option.label) ?? name;
      return name
        ? [scalar(name, `number, 1 or 0 (${label} is ${choice})`, nullable, index === 0 ? 1 : 0)]
        : [];
    });
  }
  const name = featureName(field.mappedTo);
  const drafts: FeatureDraft[] = [];
  if (name) {
    const options = Array.isArray(field.options) ? field.options.map(String) : [];
    const type =
      kind === "boolean"
        ? "boolean"
        : kind === "category"
          ? `number (a category; labels such as ${options.map((o) => `"${o}"`).join(", ")} are not accepted)`
          : kind === "series"
            ? "number (a series reduced to one value)"
            : "number";
    drafts.push(scalar(name, type, nullable, kind === "boolean" ? false : 0));
  }
  if (kind === "series") {
    records(field.aggregations).forEach((aggregation) => {
      const target = featureName(aggregation.mappedTo);
      const label = getString(aggregation.label) ?? getString(aggregation.kind) ?? "aggregation";
      if (target && target !== name) {
        drafts.push(scalar(target, `number (${label} of a series)`, nullable, 0));
      }
    });
  }
  return drafts;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { ModelManifestView } from "@/features/models/lib/model-manifest";

export type ModelInputRow = {
  label: string;
  kind: string;
  /** What the model takes the field as: its feature name or position; one per one-hot option. */
  targets: string[];
  required: boolean;
  options: string[];
  /** The training frame's column type of each target, where the bundle declares it. */
  dtypes: string[];
};

export type ModelOutputRow = {
  label: string;
  kind: string;
  position: string;
  classes: string[];
  /** The target's name in the training data, when the author declared it. */
  targetName: string | null;
};

const KIND_LABELS: Record<string, string> = { "onehot-category": "One-hot category" };

/** A schema kind as a label: "number" reads "Number". */
const kindLabel = (kind: unknown): string => {
  const value = getString(kind) ?? "";
  return KIND_LABELS[value] ?? `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const targetOf = (mappedTo: unknown): string[] =>
  typeof mappedTo === "string" || typeof mappedTo === "number" ? [String(mappedTo)] : [];

const optionLabel = (option: unknown): string[] => {
  if (typeof option === "string") return [option];
  const label = isRecord(option) ? getString(option.label) : undefined;
  return label ? [label] : [];
};

const records = (value: unknown): Array<Record<string, unknown>> =>
  Array.isArray(value) ? value.filter(isRecord) : [];

export const readModelInputs = (schema: unknown, manifest: ModelManifestView): ModelInputRow[] => {
  // A field maps to a feature by its name, or by its position when the model has no names.
  const dtypeOf = (target: string): string[] => {
    const named = manifest.featureNames.indexOf(target);
    const position = named >= 0 ? named : /^\d+$/.test(target) ? Number(target) : -1;
    const dtype = manifest.featureDtypes[position];
    return dtype ? [dtype] : [];
  };
  return records(isRecord(schema) ? schema.fields : undefined).map((field) => {
    const options = Array.isArray(field.options) ? field.options : [];
    const targets =
      field.kind === "onehot-category"
        ? records(options).flatMap((option) => targetOf(option.mappedTo))
        : targetOf(field.mappedTo);
    return {
      label: getString(field.label) ?? targets[0] ?? "",
      kind: kindLabel(field.kind),
      targets,
      required: field.required === true,
      options: options.flatMap(optionLabel),
      dtypes: [...new Set(targets.flatMap(dtypeOf))],
    };
  });
};

export const readModelOutputs = (schema: unknown, manifest: ModelManifestView): ModelOutputRow[] =>
  records(isRecord(schema) ? schema.reports : undefined).map((report, index) => ({
    label: getString(report.label) ?? "",
    kind: kindLabel(report.kind),
    position: targetOf(report.mappedTo)[0] ?? String(index),
    classes: (Array.isArray(report.labels) ? report.labels : []).filter(
      (label): label is string => typeof label === "string",
    ),
    targetName: manifest.targetNames[index] ?? null,
  }));

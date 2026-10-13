/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "@/capabilities/prediction-runtime/mlform/shared";

type Json = Record<string, unknown>;

export type PipelineStep = {
  /** The step's name in its pipeline; a model that is not a pipeline has none. */
  name: string | null;
  algorithm: string;
};

export type ModelParameter = {
  /** The pipeline step or parameter family the value belongs to. */
  group: string;
  name: string;
  value: string;
};

export type BundleMember = { name: string; sizeBytes: number | null; sha256: string | null };

export type ModelManifestView = {
  /** In prediction order; the last one is the estimator that predicts. */
  steps: PipelineStep[];
  parameters: ModelParameter[];
  /** The library of the estimator that predicts. */
  library: string | null;
  featureOrigin: string | null;
  featureNames: string[];
  /** The training frame's column types, by feature position; null where not declared. */
  featureDtypes: Array<string | null>;
  targetNames: string[];
  bundleId: string | null;
  exportedAt: string | null;
  writerVersion: string | null;
  formatVersion: string | null;
  python: string | null;
  platform: string | null;
  packages: Array<{ name: string; version: string }>;
  members: BundleMember[];
  userMetadata: Array<{ key: string; value: string }>;
};

const LIBRARY_NAMES: Record<string, string> = {
  sklearn: "scikit-learn",
  xgboost: "XGBoost",
  catboost: "CatBoost",
  onnx: "ONNX",
};

const record = (value: unknown): Json => (isRecord(value) ? value : {});

/** A collection of estimators in a pipeline's constructor: its steps, not its settings. */
const COMPOSITION_KEYS = new Set(["steps", "transformers", "transformer_list"]);

const isEstimatorRecord = (value: unknown): boolean =>
  isRecord(value) && ("$estimator" in value || "$estimator_ref" in value);

/** mlbundle writes values JSON has no literal for as one-key `$` records. */
const formatValue = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null) return "None";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (isRecord(value)) {
    const [key, tagged] = Object.entries(value)[0] ?? [];
    if (Object.keys(value).length === 1 && key?.startsWith("$") && typeof tagged === "string") {
      return tagged;
    }
  }
  return JSON.stringify(value);
};

const isLeaf = (value: unknown): boolean =>
  !isRecord(value) ||
  Object.keys(value).length === 0 ||
  Object.keys(value).some((key) => key.startsWith("$"));

/**
 * Scikit-learn names a nested parameter `step__name`, which states its owner itself; other
 * libraries nest objects, whose parameters belong under the object's own name.
 */
const collectParameters = (value: Json, group: string[], into: ModelParameter[]): void => {
  for (const [key, item] of Object.entries(value)) {
    if (COMPOSITION_KEYS.has(key) || isEstimatorRecord(item)) continue;
    const tokens = key.split("__");
    const name = tokens[tokens.length - 1] ?? key;
    const owner = tokens.length > 1 ? tokens.slice(0, -1) : group;
    if (isLeaf(item)) into.push({ group: owner.join(" › "), name, value: formatValue(item) });
    else collectParameters(record(item), [...owner, name], into);
  }
};

const stepsOf = (hyperparameters: Json): PipelineStep[] =>
  (Array.isArray(hyperparameters.steps) ? hyperparameters.steps : []).flatMap((step) => {
    if (!Array.isArray(step)) return [];
    const [name, estimator] = step as unknown[];
    const algorithm = isRecord(estimator)
      ? (getString(estimator.$estimator_ref) ?? getString(record(estimator.$estimator).class))
      : getString(estimator);
    return typeof name === "string" && algorithm ? [{ name, algorithm }] : [];
  });

/**
 * Reads what a bundle's manifest says for the model page. Parameters, steps and feature
 * facts are checked against the model each time it loads; the environment, target names
 * and metadata are the author's own declaration.
 */
export const readModelManifest = (manifest: unknown): ModelManifestView => {
  const root = record(manifest);
  const model = record(root.model);
  const hyperparameters = record(model.hyperparameters);
  const pipeline = record(model.pipeline);
  const estimator = record(record(pipeline.estimator).claims);
  const transformers = record(record(pipeline.transformers).hyperparameters);
  const algorithm = getString(model.estimator_class);

  const steps: PipelineStep[] = [];
  const parameters: ModelParameter[] = [];
  const finalAlgorithm = getString(estimator.estimator_class);
  if (finalAlgorithm) {
    // A pipeline ending in XGBoost or CatBoost keeps its transformers and its estimator apart.
    const names = Array.isArray(pipeline.step_names) ? pipeline.step_names : [];
    const finalName = getString(names[names.length - 1]) ?? finalAlgorithm;
    steps.push(...stepsOf(transformers), { name: finalName, algorithm: finalAlgorithm });
    collectParameters(transformers, ["Pipeline"], parameters);
    collectParameters(record(estimator.hyperparameters), [finalName], parameters);
  } else if (algorithm) {
    const own = stepsOf(hyperparameters);
    steps.push(...(own.length > 0 ? own : [{ name: null, algorithm }]));
    collectParameters(hyperparameters, [algorithm], parameters);
  }

  const libraryId = getString(record(pipeline.estimator).library) ?? getString(model.library);
  const features = record(root.features);
  const target = record(root.target);
  const environment = record(root.environment);
  const python = [environment.python_implementation, environment.python_version]
    .map(getString)
    .filter(Boolean)
    .join(" ");
  const platform = [environment.os, environment.os_version, environment.architecture]
    .map(getString)
    .filter(Boolean)
    .join(" ");

  return {
    steps,
    parameters,
    library: LIBRARY_NAMES[libraryId ?? ""] ?? libraryId ?? null,
    featureOrigin: getString(features.origin) ?? null,
    featureNames: (Array.isArray(features.names) ? features.names : []).filter(
      (name): name is string => typeof name === "string",
    ),
    featureDtypes: (Array.isArray(features.dtypes) ? features.dtypes : []).map(
      (dtype) => getString(dtype) ?? null,
    ),
    targetNames: (Array.isArray(target.names) ? target.names : []).filter(
      (name): name is string => typeof name === "string",
    ),
    bundleId: getString(root.bundle_id) ?? null,
    exportedAt: getString(root.created_at) ?? null,
    writerVersion: getString(root.writer_version) ?? null,
    formatVersion: getString(root.format_version) ?? null,
    python: python || null,
    platform: platform || null,
    packages: Object.entries(record(environment.packages)).flatMap(([name, version]) =>
      typeof version === "string" ? [{ name, version }] : [],
    ),
    members: Object.entries(record(root.integrity)).map(([name, entry]) => ({
      name,
      sizeBytes: typeof record(entry).size === "number" ? (record(entry).size as number) : null,
      sha256: getString(record(entry).sha256) ?? null,
    })),
    userMetadata: Object.entries(record(root.user_metadata)).map(([key, value]) => ({
      key,
      value: formatValue(value),
    })),
  };
};

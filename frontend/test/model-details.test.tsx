/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { expect, test } from "vite-plus/test";
import { ModelDetailTabs } from "@/features/models/components/ModelDetailTabs";
import { readModelManifest } from "@/features/models/lib/model-manifest";
import { readModelInputs, readModelOutputs } from "@/features/models/lib/model-schema-rows";
import type { ModelDetailsDto, ModelDto } from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

/** A scaler and a CatBoost classifier, as mlbundle writes a pipeline ending in a booster. */
const pipelineManifest = {
  format_version: "1",
  bundle_id: "c83da1a8-350e-4627-b4c0-955981109a12",
  created_at: "2026-10-13T11:29:49Z",
  writer_version: "0.1.0a3",
  model: {
    estimator_class: "Pipeline",
    library: "sklearn",
    hyperparameters: { memory: null, verbose: false },
    pipeline: {
      step_names: ["scale", "est"],
      transformers: {
        hyperparameters: {
          steps: [["scale", { $estimator_ref: "StandardScaler" }]],
          scale: { $estimator: { class: "StandardScaler", params: {} } },
          scale__with_mean: true,
        },
      },
      estimator: {
        library: "catboost",
        claims: {
          estimator_class: "CatBoostClassifier",
          hyperparameters: { tree_count: 2000, parameters: { depth: 6, nan_mode: "Min" } },
        },
      },
    },
  },
  features: { names: ["age", "smoker__yes", "smoker__no"], dtypes: ["float64", "int64", "int64"] },
  target: { names: ["risk"] },
  environment: {
    python_implementation: "CPython",
    python_version: "3.14.7",
    os: "Windows",
    os_version: "11",
    architecture: "AMD64",
    packages: { catboost: "1.2.10", "scikit-learn": "1.9.1" },
  },
  integrity: { "model.cbm": { sha256: "46e1502c", size: 2048 } },
  user_metadata: { dataset: "cohort-2026" },
};

const model = {
  id: 12,
  name: "Risk",
  type: "classifier",
  specificType: "Pipeline",
  fileName: "risk.mlbundle",
  updatedAt: "2026-10-13T12:00:00Z",
  updatedByName: "Owner",
  runtimeState: "READY",
  inputSchema: {
    source: "training_data",
    fields: [
      { kind: "number", label: "age", mappedTo: 0, required: true },
      {
        kind: "onehot-category",
        label: "smoker",
        required: false,
        options: [
          { label: "yes", value: "yes", mappedTo: 1 },
          { label: "no", value: "no", mappedTo: 2 },
        ],
      },
    ],
    reports: [
      { kind: "classifier", label: "Predicted class", mappedTo: 0, labels: ["low", "high"] },
    ],
  },
} as unknown as ModelDto;

const details: ModelDetailsDto = {
  manifest: pipelineManifest,
  featureImportances: [
    { feature: "age", importance: 12.5 },
    { feature: "smoker__yes", importance: 80 },
    { feature: "smoker__no", importance: 7.5 },
  ],
  sizeBytes: 4096,
  sha256: "abc123",
  environment: {
    key: "py3.14-mlbundle0.2.1",
    legacy: true,
    pythonVersion: "3.14",
    writerVersion: "0.2.1",
    packages: [],
  },
};

test("a pipeline is read as its steps, ending in the estimator that predicts", () => {
  const manifest = readModelManifest(pipelineManifest);

  expect(manifest.steps).toEqual([
    { name: "scale", algorithm: "StandardScaler" },
    { name: "est", algorithm: "CatBoostClassifier" },
  ]);
  expect(manifest.library).toBe("CatBoost");
  expect(manifest.parameters).toEqual([
    { group: "scale", name: "with_mean", value: "true" },
    { group: "est", name: "tree_count", value: "2000" },
    { group: "est › parameters", name: "depth", value: "6" },
    { group: "est › parameters", name: "nan_mode", value: "Min" },
  ]);
});

test("a scikit-learn pipeline and a single estimator name their own steps", () => {
  const pipeline = readModelManifest({
    model: {
      estimator_class: "Pipeline",
      library: "sklearn",
      hyperparameters: {
        steps: [
          ["sc", { $estimator_ref: "StandardScaler" }],
          ["est", { $estimator_ref: "MLPClassifier" }],
        ],
        est: { $estimator: { class: "MLPClassifier", params: {} } },
        est__hidden_layer_sizes: [150, 100, 50],
        est__alpha: { $float: "nan" },
        memory: null,
      },
    },
  });
  expect(pipeline.steps.map((step) => step.algorithm)).toEqual(["StandardScaler", "MLPClassifier"]);
  expect(pipeline.parameters).toEqual([
    { group: "est", name: "hidden_layer_sizes", value: "[150,100,50]" },
    { group: "est", name: "alpha", value: "nan" },
    { group: "Pipeline", name: "memory", value: "None" },
  ]);

  const single = readModelManifest({
    model: { estimator_class: "XGBClassifier", library: "xgboost" },
  });
  expect(single.steps).toEqual([{ name: null, algorithm: "XGBClassifier" }]);
  expect(single.library).toBe("XGBoost");
});

test("inputs name what they feed and outputs their position, classes and target", () => {
  const manifest = readModelManifest(pipelineManifest);

  expect(readModelInputs(model.inputSchema, manifest)).toEqual([
    {
      label: "age",
      kind: "Number",
      targets: ["0"],
      required: true,
      options: [],
      dtypes: ["float64"],
    },
    {
      label: "smoker",
      kind: "One-hot category",
      targets: ["1", "2"],
      required: false,
      options: ["yes", "no"],
      dtypes: ["int64"],
    },
  ]);
  expect(readModelOutputs(model.inputSchema, manifest)).toEqual([
    {
      label: "Predicted class",
      kind: "Classifier",
      position: "0",
      classes: ["low", "high"],
      targetName: "risk",
    },
  ]);
});

test("the overview ranks features by importance and names the pipeline", async () => {
  const { host } = await mount(<ModelDetailTabs model={model} details={details} />, { route: "/" });

  expect(host.textContent).toContain("2 inputs");
  expect(host.textContent).toContain("1 output, 2 classes");
  expect(host.textContent).toContain("risk.mlbundle (4.0 KB)");
  expect(
    [...host.querySelectorAll("ol")[0].querySelectorAll("li")].map((li) => li.textContent),
  ).toEqual(["StandardScalerscale", "CatBoostClassifierest · predicts"]);
  const ranked = [...host.querySelectorAll("ol")[1].querySelectorAll("li")];
  expect(ranked.map((li) => li.querySelector("span")?.textContent)).toEqual([
    "smoker__yes",
    "age",
    "smoker__no",
  ]);
});

test.each([
  ["inputs", ["age", "smoker", "One-hot category", "1, 2", "float64"]],
  ["outputs", ["Predicted class", "risk", "low", "high"]],
  ["parameters", ["est › parameters", "nan_mode", "with_mean"]],
  [
    "provenance",
    ["c83da1a8-350e-4627-b4c0-955981109a12", "abc123", "CPython 3.14.7", "cohort-2026"],
  ],
])("the %s tab is linkable and shows what the bundle states", async (tab, expected) => {
  const { host } = await mount(<ModelDetailTabs model={model} details={details} />, {
    route: `/?tab=${tab}`,
  });

  for (const text of expected) expect(host.textContent).toContain(text);
});

test("a model without structure says it has no importances instead of an empty chart", async () => {
  const { host } = await mount(
    <ModelDetailTabs model={model} details={{ ...details, featureImportances: null }} />,
    { route: "/" },
  );

  expect(host.textContent).toContain("No feature importances");
});

test("a model stored without its bundle's manifest says so", async () => {
  const { host } = await mount(
    <ModelDetailTabs model={model} details={{ ...details, manifest: {} }} />,
    { route: "/" },
  );

  expect(host.textContent).toContain("No bundle details");
  expect(host.querySelector('[role="tablist"]')).toBeNull();
});

test("details that could not be loaded leave the model's own facts in place", async () => {
  const { host } = await mount(<ModelDetailTabs model={model} details={undefined} />, {
    route: "/",
  });

  expect(host.textContent).toContain("Bundle details unavailable");
  expect(host.textContent).toContain("risk.mlbundle");
});

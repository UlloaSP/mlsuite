/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { normalizeAnalyzerPredictionResult } from "../src/algorithms/mlform/analyzer-result-normalization";
import { describeSchemaCustomReport } from "../src/algorithms/schema/report-descriptor";
import { getSchemaResultReports } from "../src/algorithms/schema/report-display";
import type { CatalogReportDefinition } from "../src/algorithms/plugin/custom-report-catalog";

const catalogReport = (): CatalogReportDefinition =>
  ({
    id: "plugin-1",
    fileName: "crystal-tree.ts",
    source: "",
    updatedAt: "",
    createdAt: "",
    contentType: "text/typescript",
    sizeBytes: 1,
    kind: "Crystal Tree",
    definition: {
      describe: () => ({ type: "text", value: "generic describe" }),
      presenter: {
        describe: (_config: unknown, context: { payload?: unknown }) => ({
          type: "text",
          value: String((context.payload as { explanation?: string }).explanation ?? "missing"),
        }),
      },
    },
  }) as unknown as CatalogReportDefinition;

describe("schema report renderer", () => {
  test("finds model reports when DTO model ids use different scalar types", () => {
    const reports = getSchemaResultReports(
      {
        id: "version-1",
        schemaId: "schema-1",
        version: "1",
        formSchema: {
          fields: [],
          reports: [
            {
              id: "model-report",
              kind: "regressor",
              label: "Model Report",
              mappedTo: { "1": "prediction", "2": "other-prediction" },
            },
          ],
        },
        bindings: [{ modelId: "1" }, { modelId: "2" }],
        createdAt: "",
      },
      {
        modelId: 1,
        output: { reports: [{ mappedTo: "prediction", value: 42 }] },
      } as never,
    );

    expect(reports).toMatchObject([
      {
        id: "model-report",
        label: "Model Report",
        payload: { value: 42 },
      },
    ]);
  });

  test("normalizes analyzer classifier report arrays into display reports", () => {
    const normalized = normalizeAnalyzerPredictionResult({
      parsed: {
        reports: [
          {
            kind: "classifier",
            mapping: { "0": "1", "1": "0" },
            probabilities: [0.2, 0.8],
            showClassProbabilities: true,
          },
        ],
      },
      modelId: "1",
      modelInput: { age: 42 },
      reports: [
        {
          id: "report-2",
          kind: "classifier",
          label: "Predicted class",
          mappedTo: { "1": "predicted" },
        },
      ],
    });
    const reports = getSchemaResultReports(
      {
        id: "version-1",
        schemaId: "schema-1",
        version: "1",
        formSchema: {
          fields: [],
          reports: [
            {
              id: "report-2",
              kind: "classifier",
              label: "Predicted class",
              mappedTo: { "1": "predicted" },
            },
          ],
        },
        bindings: [{ modelId: "1" }],
        createdAt: "",
      },
      {
        modelId: 1,
        output: normalized.raw,
      } as never,
    );

    expect(reports).toMatchObject([
      {
        id: "report-2",
        payload: {
          labels: ["1", "0"],
          prediction: "0",
          probabilities: [0.2, 0.8],
        },
      },
    ]);
  });

  test("uses direct mapped report target when binding lacks model name", () => {
    const reports = getSchemaResultReports(
      {
        id: "version-1",
        schemaId: "schema-1",
        version: "1",
        formSchema: {
          fields: [],
          reports: [
            {
              id: "report-2",
              kind: "classifier",
              label: "Predicted class",
              mappedTo: "predicted",
            },
          ],
        },
        bindings: [{ modelId: "1" }],
        createdAt: "",
      },
      {
        modelId: 1,
        output: {
          reports: [{ mappedTo: "predicted", prediction: "0", probabilities: [0.25, 0.75] }],
        },
      } as never,
    );

    expect(reports).toMatchObject([
      {
        id: "report-2",
        payload: { prediction: "0", probabilities: [0.25, 0.75] },
      },
    ]);
  });

  test("uses plugin presenter before generic describe", () => {
    const descriptor = describeSchemaCustomReport(
      catalogReport(),
      { id: "crystal-tree", kind: "Crystal Tree", label: "Crystal Tree" },
      {
        reportId: "crystal-tree",
        payload: { explanation: "Tree explanation" },
        state: { status: "ready", error: null, payload: { explanation: "Tree explanation" } },
        result: {
          reports: [
            {
              id: "crystal-tree",
              mappedTo: "crystal-tree",
              payload: { explanation: "Tree explanation" },
            },
          ],
          reportStates: {},
          meta: {},
          raw: {},
          values: {},
          fieldValues: {},
          serializedValues: {},
          serializedFieldValues: {},
        },
      },
    );

    expect(descriptor).toEqual({ type: "text", value: "Tree explanation" });
  });
});

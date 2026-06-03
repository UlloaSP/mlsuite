/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaFeedbackSteps } from "../src/schemas/schema-feedback-steps";
import type { PredictionRunDto, SchemaVersionDto } from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: {},
      outputMapping: { report_1: "score" },
    },
  ],
  formSchema: {
    fields: [],
    reports: [
      {
        id: "report_1",
        label: "Score",
        kind: "classifier",
        labels: ["No", "Yes"],
        feedbackQuestionnaire: {
          steps: [{ id: "s", fields: [{ kind: "text", label: "Comment" }] }],
        },
      },
    ],
  },
};

const run: PredictionRunDto = {
  id: "run-1",
  schemaVersionId: "version-1",
  name: "case",
  inputData: {},
  status: "PARTIAL_SUCCESS",
  createdAt: "2026-06-02T00:00:00Z",
  results: [
    {
      id: "result-1",
      runId: "run-1",
      modelId: "model-1",
      signatureId: "signature-1",
      modelInput: {},
      output: { reports: { score: { prediction: 1, probabilities: [0.1, 0.9] } } },
      status: "SUCCESS",
      createdAt: "2026-06-02T00:00:00Z",
    },
    {
      id: "result-2",
      runId: "run-1",
      modelId: "model-2",
      signatureId: "signature-2",
      modelInput: {},
      output: {},
      status: "FAILED",
      createdAt: "2026-06-02T00:00:00Z",
    },
  ],
};

describe("schema feedback steps", () => {
  test("builds output and explanation steps for successful mapped reports only", () => {
    const steps = buildSchemaFeedbackSteps(version, run.results, []);
    expect(steps.map((step) => [step.resultId, step.type, step.title])).toEqual([
      ["result-1", "OUTPUT", "Score"],
      ["result-1", "EXPLANATION", "Score review"],
    ]);
  });

  test("builds feedback steps for custom report kinds", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "custom_report",
            label: "Plugin report",
            kind: "plugin-report",
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
        ],
      },
      bindings: [
        {
          id: "binding-1",
          schemaVersionId: "version-1",
          modelId: "model-1",
          signatureId: "signature-1",
          inputMapping: {},
          outputMapping: { custom_report: "plugin_payload" },
        },
      ],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: { reports: { plugin_payload: { blocks: ["Rendered"] } } },
        },
      ],
    };

    expect(buildSchemaFeedbackSteps(customVersion, customRun.results, []).map((step) => step.type)).toEqual([
      "EXPLANATION",
    ]);
  });

  test("does not create feedback steps for custom reports without questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [{ id: "custom_report", label: "Plugin report", kind: "plugin-report" }],
      },
      bindings: [
        {
          id: "binding-1",
          schemaVersionId: "version-1",
          modelId: "model-1",
          signatureId: "signature-1",
          inputMapping: {},
          outputMapping: { custom_report: "plugin_payload" },
        },
      ],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: { reports: { plugin_payload: { explanation: "Rendered" } } },
        },
      ],
    };

    expect(buildSchemaFeedbackSteps(customVersion, customRun.results, [])).toEqual([]);
  });
});

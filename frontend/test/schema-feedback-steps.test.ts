/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { skippedSchemaReportPayload } from "../src/app/utils/mlform/schema-report-plugin-context";
import { buildSchemaFeedbackSteps } from "../src/schemas/schema-feedback-steps";
import { getSchemaResultReports } from "../src/schemas/schema-run-display";
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

  test("hides skipped custom report and its feedback questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "tree_1",
            label: "Crystal Tree 1",
            kind: "Crystal Tree",
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
          {
            id: "tree_2",
            label: "Crystal Tree 2",
            kind: "Crystal Tree",
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
          outputMapping: { tree_1: "crystal-tree" },
        },
        {
          id: "binding-2",
          schemaVersionId: "version-1",
          modelId: "model-2",
          signatureId: "signature-2",
          inputMapping: {},
          outputMapping: { tree_2: "crystal-tree" },
        },
      ],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: { reports: { "crystal-tree": { explanation: "ok" } } },
        },
        {
          ...run.results[0]!,
          id: "result-2",
          modelId: "model-2",
          signatureId: "signature-2",
          output: { reports: { "crystal-tree": skippedSchemaReportPayload } },
        },
      ],
    };

    expect(getSchemaResultReports(customVersion, customRun.results[0]!).map((report) => report.id)).toEqual(["tree_1"]);
    expect(getSchemaResultReports(customVersion, customRun.results[1]!)).toEqual([]);
    expect(buildSchemaFeedbackSteps(customVersion, customRun.results, []).map((step) => step.resultId)).toEqual(["result-1"]);
  });

  test("hides empty custom report payload and its feedback questionnaire", () => {
    const customVersion: SchemaVersionDto = {
      ...version,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "tree_1",
            label: "Crystal Tree 1",
            kind: "Crystal Tree",
            feedbackQuestionnaire: {
              steps: [{ id: "plugin", fields: [{ kind: "text", id: "note", label: "Note" }] }],
            },
          },
          {
            id: "tree_2",
            label: "Crystal Tree 2",
            kind: "Crystal Tree",
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
          outputMapping: { tree_1: "crystal-tree" },
        },
        {
          id: "binding-2",
          schemaVersionId: "version-1",
          modelId: "model-2",
          signatureId: "signature-2",
          inputMapping: {},
          outputMapping: { tree_2: "crystal-tree" },
        },
      ],
    };
    const customRun = {
      ...run,
      results: [
        {
          ...run.results[0]!,
          output: { reports: { "crystal-tree": { explanation: "ok", explanations: ["ok"] } } },
        },
        {
          ...run.results[0]!,
          id: "result-2",
          modelId: "model-2",
          signatureId: "signature-2",
          output: {
            reports: {
              "crystal-tree": {
                endpoint: "/api/analyzer/explanations",
                explanation: "",
                explanations: [],
                modelId: "model-2",
              },
            },
          },
        },
      ],
    };

    expect(getSchemaResultReports(customVersion, customRun.results[0]!).map((report) => report.id)).toEqual(["tree_1"]);
    expect(getSchemaResultReports(customVersion, customRun.results[1]!)).toEqual([]);
    expect(buildSchemaFeedbackSteps(customVersion, customRun.results, []).map((step) => step.title)).toEqual([
      "Crystal Tree 1 review",
    ]);
  });
});

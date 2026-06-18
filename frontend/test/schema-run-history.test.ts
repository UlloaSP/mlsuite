/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaRunExport } from "../src/algorithms/schema/export";
import {
  getModelInputBulkSchema,
  toSchemaRunSerializedValues,
} from "../src/algorithms/schema/bulk-upload";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "../src/api/schemas/dtos";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [{ modelId: "model-1" }],
  formSchema: {
    fields: [
      {
        id: "blood-group",
        label: "Blood Group",
        kind: "onehot-category",
        options: [
          { label: "A", value: "A", mappedTo: "blood_group__A" },
          { label: "B", value: "B", mappedTo: "blood_group__B" },
        ],
      },
      { id: "age", label: "age", kind: "number", mappedTo: "age" },
    ],
    reports: [
      {
        id: "report_1",
        label: "Predicted class",
        kind: "classifier",
        mappedTo: { "model-1": "predicted_class" },
        labels: ["Low", "High"],
      },
    ],
  },
};

const run: PredictionRunDto = {
  id: "run-1",
  schemaVersionId: "version-1",
  name: "case-1",
  status: "SUCCESS",
  createdAt: "2026-06-02T10:00:00Z",
  inputData: { "Blood Group": "B", age: 52 },
  results: [
    {
      id: "result-1",
      runId: "run-1",
      modelId: "model-1",
      status: "SUCCESS",
      createdAt: "2026-06-02T10:00:00Z",
      modelInput: { blood_group__A: 0, blood_group__B: 1, age: 52 },
      output: {
        reports: { predicted_class: { prediction: 1, probabilities: [0.2, 0.8] } },
      },
    },
  ],
};

describe("schema run history helpers", () => {
  test("bulk schema exposes mapped one-hot model inputs", () => {
    const bulkSchema = getModelInputBulkSchema(version) as { fields: Array<{ label: string }> };

    expect(bulkSchema.fields.map((field) => field.label)).toEqual([
      "blood_group__A",
      "blood_group__B",
      "age",
    ]);
  });

  test("serializes technical one-hot bulk input to visible field id", () => {
    expect(
      toSchemaRunSerializedValues(version, { blood_group__A: 0, blood_group__B: 1, age: 52 }),
    ).toEqual({ "blood-group": "B", age: 52 });
  });

  test("exports technical model inputs and mapped report labels", () => {
    const exported = buildSchemaRunExport([run], version);

    expect(exported.fileName).toContain("Risk_schema");
    expect(exported.content).toContain("input.model-1.blood_group__A");
    expect(exported.content).toContain("input.model-1.blood_group__B");
    expect(exported.content).toContain("output.report_1.predicted");
    expect(exported.content).toContain("High");
  });

  test("exports schema output feedback with signature-style columns", () => {
    const feedback: PredictionResultFeedbackDto[] = [
      {
        id: "feedback-1",
        resultId: "result-1",
        userId: "7",
        userEmail: "reviewer@example.com",
        type: "OUTPUT",
        order: 0,
        value: { assessment: "High" },
        createdAt: "2026-06-02T10:00:00Z",
      },
    ];
    const exported = buildSchemaRunExport([run], version, feedback);

    expect(exported.content).toContain("output.report_1.predicted");
    expect(exported.content).toContain("output.report_1.feedback.reviewer@example.com");
    expect(exported.content).toContain("High");
  });
});

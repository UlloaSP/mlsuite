import { runMatchesQuery } from "@/features/schemas/lib/run-matches-query";
import { parseCsvPredictionFile } from "@/capabilities/prediction-runtime/data/parse-csv-prediction-file";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildSchemaRunExport } from "@/features/schemas/lib/export";
import {
  getModelInputBulkSchema,
  toSchemaRunFieldValues,
} from "@/features/schemas/lib/bulk-upload";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
} from "@/features/schemas/api/prediction-types";

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
        reports: [{ mappedTo: "predicted_class", prediction: 1, probabilities: [0.2, 0.8] }],
      },
    },
  ],
};

describe("schema run history helpers", () => {
  test("searches numeric API ids without crashing on nonmatching names", () => {
    const numericRun = { ...run, id: 20 };
    expect(runMatchesQuery(numericRun, "20")).toBe(true);
    expect(runMatchesQuery(numericRun, " CASE-1 ")).toBe(true);
    expect(runMatchesQuery(numericRun, "success")).toBe(true);
    expect(runMatchesQuery(numericRun, "missing")).toBe(false);
    expect(runMatchesQuery(numericRun, "")).toBe(true);
    expect(runMatchesQuery(run, "run-1")).toBe(true);
  });
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
      toSchemaRunFieldValues(version, { blood_group__A: 0, blood_group__B: 1, age: 52 }),
    ).toEqual({ "blood-group": "B", age: 52 });
  });

  test("parses one-hot numeric columns and rejects unknown or nonnumeric input", () => {
    const schema = getModelInputBulkSchema(version);
    const parsed = parseCsvPredictionFile(
      "name,blood_group__A,blood_group__B,age\ncase,0,1,52",
      schema,
    );
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ blood_group__A: 0, blood_group__B: 1, age: 52 });
    expect(
      parseCsvPredictionFile("name,blood_group__A,blood_group__B,age\ncase,wrong,1,52", schema)
        .skipped,
    ).toHaveLength(1);
    const unknown = parseCsvPredictionFile("name,unexpected,age\ncase,1,52", schema);
    expect(unknown.records).toEqual([]);
    expect(unknown.skipped.length).toBeGreaterThan(0);
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

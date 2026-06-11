/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { buildSchemaRunExport } from "../src/schemas/schema-run-export";
import {
  getModelInputBulkSchema,
  toSchemaRunSerializedValues,
} from "../src/schemas/schema-run-bulk-inputs";
import { getSchemaRunPrefillInputs } from "../src/schemas/schema-run-display";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import {
  emptySchemaRunExportSelection,
  selectedSchemaRunExportData,
} from "../src/schemas/components/schema-run-export-selection";
import type {
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaVersionDto,
} from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: {},
      outputMapping: { report_1: "predicted_class" },
    },
  ],
  formSchema: {
    fields: [
      {
        id: "blood-group",
        label: "Blood Group",
        kind: "mapped-category",
        includeInSubmission: false,
        options: [
          { label: "A", value: "A", mapping: { blood_group__A: 1, blood_group__B: 0 } },
          { label: "B", value: "B", mapping: { blood_group__A: 0, blood_group__B: 1 } },
        ],
      },
      { id: "blood_group__A", label: "blood_group__A", kind: "number", hidden: true },
      { id: "blood_group__B", label: "blood_group__B", kind: "number", hidden: true },
      { id: "age", label: "age", kind: "number" },
    ],
    reports: [
      {
        id: "report_1",
        label: "Predicted class",
        kind: "classifier",
        source: "predicted_class",
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
      signatureId: "signature-1",
      status: "SUCCESS",
      createdAt: "2026-06-02T10:00:00Z",
      modelInput: { blood_group__A: 0, blood_group__B: 1, age: 52 },
      output: { outputs: [{ type: "classifier", prediction: 1, probabilities: [0.2, 0.8] }] },
    },
  ],
};

describe("schema run history helpers", () => {
  test("bulk schema exposes technical model inputs and hides mapped-category UI fields", () => {
    const bulkSchema = getModelInputBulkSchema(version) as {
      fields: Array<{ label: string }>;
    };
    expect(bulkSchema.fields.map((field) => field.label)).toEqual([
      "blood_group__A",
      "blood_group__B",
      "age",
    ]);
  });

  test("serializes technical one-hot bulk input without mapped-category value", () => {
    expect(
      toSchemaRunSerializedValues(version, { blood_group__A: 0, blood_group__B: 1, age: 52 }),
    ).toEqual({
      blood_group__A: 0,
      blood_group__B: 1,
      age: 52,
    });
  });

  test("keeps mapped-category visible input as compatibility expansion", () => {
    expect(toSchemaRunSerializedValues(version, { "Blood Group": "B", age: 52 })).toEqual({
      blood_group__A: 0,
      blood_group__B: 1,
      age: 52,
    });
  });

  test("exports technical model inputs and mapped report labels", () => {
    const exported = buildSchemaRunExport([run], version);
    expect(exported.fileName).toContain("Risk_schema");
    expect(exported.content).toContain("input.model-1.blood_group__A");
    expect(exported.content).toContain("input.model-1.blood_group__B");
    expect(exported.content).not.toContain("Blood Group");
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
    expect(exported.content).not.toContain(
      "Predicted class.feedback.reviewer@example.com.assessment",
    );
    expect(exported.content).toContain("High");
    expect(exported.content).toContain("input.model-1.blood_group__A");
    expect(exported.content).toContain("input.model-1.blood_group__B");
  });

  test("filters schema export feedback by run and reviewer selection", () => {
    const feedback: PredictionResultFeedbackDto[] = [
      {
        id: "feedback-1",
        resultId: "result-1",
        userId: "7",
        userEmail: "selected@example.com",
        type: "OUTPUT",
        order: 0,
        value: { assessment: "keep" },
        createdAt: "2026-06-02T10:00:00Z",
      },
      {
        id: "feedback-2",
        resultId: "result-1",
        userId: "8",
        userEmail: "hidden@example.com",
        type: "OUTPUT",
        order: 0,
        value: { assessment: "drop" },
        createdAt: "2026-06-02T10:00:00Z",
      },
    ];
    const selection = emptySchemaRunExportSelection();
    selection.excludedReviewers.add("hidden@example.com");

    const selected = selectedSchemaRunExportData(selection, [run], [feedback]);
    const exported = buildSchemaRunExport(selected.runs, version, selected.feedback);

    expect(exported.content).toContain("keep");
    expect(exported.content).not.toContain("drop");
  });

  test("rebuilds mapped-category prefill from hidden one-hot inputs", () => {
    expect(
      getSchemaRunPrefillInputs(version.formSchema, {
        blood_group__A: 0,
        blood_group__B: 1,
        age: 52,
      }),
    ).toEqual({
      "Blood Group": "B",
      age: 52,
    });
  });

  test("submits hidden one-hot values when mapped-category default was not touched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const transport = createSchemaRunTransport(
      [{ modelId: "model-1", signatureId: "signature-1", inputMapping: {} }],
      version.formSchema.fields as never,
    );

    const result = await transport.submit({
      serializedValues: { "blood-group": "B", age: 52 },
      reports: [],
    } as never);

    expect(
      (result as { meta: { backendFieldValues: Record<string, unknown> } }).meta.backendFieldValues,
    ).toEqual({
      blood_group__A: 0,
      blood_group__B: 1,
      age: 52,
    });
  });

  test("expands mapped-category default when select was visually prefilled but untouched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const fields = ((version.formSchema.fields as Record<string, unknown>[]) ?? []).map((field) =>
      field.id === "blood-group" ? { ...field, defaultValue: "B" } : field,
    );
    const transport = createSchemaRunTransport(
      [{ modelId: "model-1", signatureId: "signature-1", inputMapping: {} }],
      fields as never,
    );

    const result = await transport.submit({
      serializedValues: { age: 52 },
      reports: [],
    } as never);

    expect(
      (result as { meta: { backendFieldValues: Record<string, unknown> } }).meta.backendFieldValues,
    ).toEqual({
      blood_group__A: 0,
      blood_group__B: 1,
      age: 52,
    });
  });
});

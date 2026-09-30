/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  getModelInputBulkSchema,
  toSchemaRunFieldValues,
} from "@/features/schemas/lib/bulk-upload";
import { parseCsvPredictionFile } from "@/capabilities/prediction-runtime/data/parse-csv-prediction-file";
import { schemaVersion } from "./support/api-fixtures";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";

const version = schemaVersion({
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [],
  formSchema: {
    fields: [{ id: "age-ui", label: "Patient age", kind: "number", mappedTo: "age" }],
    reports: [],
  },
});

describe("schema bulk mappedTo", () => {
  const fields = [
    { id: "anion", label: "Anion GAP_mean", kind: "number", required: true, mappedTo: 0 },
    { id: "sodium", label: "Sodium_mean", kind: "number", required: true, mappedTo: 1 },
  ];
  const positionalVersion = schemaVersion({ formSchema: { fields, reports: [] } });

  test.each([false, true])("maps dataframe headers to positions (scoped: %s)", (scoped) => {
    const sourceFields = fields.map((field) => ({
      ...field,
      ui: {},
      includeInSubmission: true,
      mappedTo: scoped ? { biochemistry: field.mappedTo } : field.mappedTo,
    }));
    const source = schemaVersion({ formSchema: { fields: sourceFields, reports: [] } });
    const parsed = parseCsvPredictionFile(
      "Sodium_mean,Anion GAP_mean\n140,12\n141,13",
      getModelInputBulkSchema(source),
      100,
      0,
    );

    expect(parsed.skipped).toEqual([]);
    expect(parsed.records.map((record) => record.inputs)).toEqual([
      { "0": 12, "1": 140 },
      { "0": 13, "1": 141 },
    ]);
    expect(toSchemaRunFieldValues(source, parsed.records[0]!.inputs)).toEqual({
      anion: 12,
      sodium: 140,
    });
    expect(
      applySchemaRunInputMapping(parsed.records[0]!.inputs, sourceFields, {
        modelId: 1,
        modelName: "biochemistry",
      }),
    ).toEqual({ "0": 12, "1": 140 });
  });

  test("keeps numeric bulk headers supported", () => {
    const parsed = parseCsvPredictionFile(
      "name,0,1\ncase,12,140",
      getModelInputBulkSchema(positionalVersion),
    );
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ "0": 12, "1": 140 });
  });

  test("keeps canonical headers authoritative when a label matches another position", () => {
    const source = schemaVersion({
      formSchema: { fields: [{ ...fields[0], label: "1" }, fields[1]] },
    });
    const parsed = parseCsvPredictionFile("name,0,1\ncase,12,140", getModelInputBulkSchema(source));
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ "0": 12, "1": 140 });
  });

  test.each([
    ["Anion GAP_mean,unknown\n12,140", "Unknown input columns: unknown"],
    ["Anion GAP_mean\n12", "Missing input columns: 1"],
    ["Anion GAP_mean,Sodium_mean\nwrong,140", '"0" must be a finite number'],
    ["Anion GAP_mean,Sodium_mean\n,140", 'Missing required value for "0"'],
    ["Anion GAP_mean,0,1\n12,13,140", "Multiple columns map to input: 0"],
  ])("rejects invalid positional bulk input: %s", (csv, reason) => {
    const parsed = parseCsvPredictionFile(csv, getModelInputBulkSchema(positionalVersion), 100, 0);
    expect(parsed.records).toEqual([]);
    expect(parsed.skipped.some((entry) => entry.reason === reason)).toBe(true);
  });

  test("rejects ambiguous dataframe labels", () => {
    const source = schemaVersion({
      formSchema: { fields: fields.map((field) => ({ ...field, label: "same" })) },
    });
    const parsed = parseCsvPredictionFile(
      "same,1\n12,140",
      getModelInputBulkSchema(source),
      100,
      0,
    );
    expect(parsed.records).toEqual([]);
    expect(parsed.skipped[0]?.reason).toBe("Ambiguous input column: same");
  });

  test("uses mappedTo as technical bulk column after label edits", () => {
    const bulkSchema = getModelInputBulkSchema(version) as { fields: Array<{ label: string }> };
    const parsed = parseCsvPredictionFile("name,age\ncase-1,52\n", bulkSchema, 100, 0);

    expect(bulkSchema.fields.map((field) => field.label)).toEqual(["age"]);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ age: 52 });
    expect(toSchemaRunFieldValues(version, parsed.records[0]?.inputs ?? {})).toEqual({
      "age-ui": 52,
    });
    expect(toSchemaRunFieldValues(version, { "Patient age": 52 })).toEqual({});
  });
});

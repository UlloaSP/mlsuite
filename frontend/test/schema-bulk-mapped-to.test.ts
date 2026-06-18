/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  getModelInputBulkSchema,
  toSchemaRunSerializedValues,
} from "../src/algorithms/schema/bulk-upload";
import { parseCsvPredictionFile } from "../src/algorithms/models/parse-csv-prediction-file";
import type { SchemaVersionDto } from "../src/api/schemas/dtos";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  formSchema: {
    fields: [{ id: "age-ui", label: "Patient age", kind: "number", mappedTo: "age" }],
    reports: [],
  },
};

describe("schema bulk mappedTo", () => {
  test("uses mappedTo as technical bulk column after label edits", () => {
    const bulkSchema = getModelInputBulkSchema(version) as { fields: Array<{ label: string }> };
    const parsed = parseCsvPredictionFile("name,age\ncase-1,52\n", bulkSchema, 100, 0);

    expect(bulkSchema.fields.map((field) => field.label)).toEqual(["age"]);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ age: 52 });
    expect(toSchemaRunSerializedValues(version, parsed.records[0]?.inputs ?? {})).toEqual({
      "age-ui": 52,
    });
    expect(toSchemaRunSerializedValues(version, { "Patient age": 52 })).toEqual({});
  });
});

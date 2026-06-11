/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { applyPredictionInputsToSchema } from "../src/app/utils/mlform/schema";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import {
  getModelInputBulkSchema,
  toSchemaRunSerializedValues,
} from "../src/schemas/schema-run-bulk-inputs";
import {
  getSchemaRunPrefillInputs,
  getVisibleSchemaInputs,
} from "../src/schemas/schema-run-display";
import type { SchemaVersionDto } from "../src/schemas/types";

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
      inputMapping: { "Patient age": "age" },
      outputMapping: {},
    },
  ],
  formSchema: {
    fields: [{ id: "age", label: "Patient age", kind: "number" }],
    reports: [],
  },
};

describe("schema bulk upload with edited labels", () => {
  test("uses signature feature columns when schema labels are edited", () => {
    const bulkSchema = getModelInputBulkSchema(version) as {
      fields: Array<{ id: string; label: string }>;
    };

    expect(bulkSchema.fields).toEqual([expect.objectContaining({ id: "age", label: "age" })]);
    expect(toSchemaRunSerializedValues(version, { age: 52 })).toEqual({ age: 52 });
  });

  test("technical inputs become visible saved inputs for display and predict-again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const transport = createSchemaRunTransport(
      version.bindings,
      version.formSchema.fields as never,
    );

    const result = await transport.submit({
      serializedValues: toSchemaRunSerializedValues(version, { age: 52 }),
      reports: [],
    } as never);
    const raw = (result as { raw: { inputData: Record<string, unknown> } }).raw;
    const prefill = getSchemaRunPrefillInputs(version.formSchema, raw.inputData);
    const schema = applyPredictionInputsToSchema(version.formSchema, prefill) as {
      fields: Array<Record<string, unknown>>;
    };

    expect(raw.inputData).toEqual({ "Patient age": 52 });
    expect(getVisibleSchemaInputs(version.formSchema, raw.inputData)).toEqual([
      { key: "Patient age", label: "Patient age", value: 52 },
    ]);
    expect(schema.fields[0]).toMatchObject({ defaultValue: 52 });
  });
});

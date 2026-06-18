/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunTransport } from "../src/algorithms/schema/run-transport";
import { toSchemaRunSerializedValues } from "../src/algorithms/schema/bulk-upload";
import type { SchemaVersionDto } from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk",
  createdAt: "2026-06-04T00:00:00Z",
  bindings: [{ modelId: "model-1" }],
  formSchema: {
    fields: [
      {
        id: "blood-group",
        label: "Blood Group",
        kind: "onehot-category",
        options: [
          { label: "O Positive", value: "O_positive", mappedTo: "blood_group__O_positive" },
          { label: "A Negative", value: "A_negative", mappedTo: "blood_group__A_negative" },
        ],
      },
      { id: "age", label: "age", kind: "number", mappedTo: "age" },
    ],
    reports: [],
  },
};

describe("schema one-hot select values", () => {
  test("bulk maps technical columns back to one visible field", () => {
    expect(
      toSchemaRunSerializedValues(version, {
        blood_group__O_positive: 0,
        blood_group__A_negative: 1,
        age: 52,
      }),
    ).toEqual({ "blood-group": "A_negative", age: 52 });
  });

  test("submit expands selected value to mapped one-hot columns", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const transport = createSchemaRunTransport(
      version.bindings,
      version.formSchema.fields as never,
    );

    const result = await transport.submit({
      serializedValues: { "blood-group": "O_positive", age: 52 },
      reports: [],
    } as never);

    expect(
      (result as { meta: { backendFieldValues: Record<string, unknown> } }).meta.backendFieldValues,
    ).toEqual({
      blood_group__O_positive: 1,
      blood_group__A_negative: 0,
      age: 52,
    });
  });
});

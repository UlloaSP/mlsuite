/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import { applyPredictionInputsToSchema } from "../src/app/utils/mlform/schema";
import {
  getSchemaRunPrefillInputs,
  getVisibleSchemaInputs,
} from "../src/schemas/schema-run-display";
import { toSchemaRunSerializedValues } from "../src/schemas/schema-run-bulk-inputs";
import type { SchemaVersionDto } from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk",
  createdAt: "2026-06-04T00:00:00Z",
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: {},
      outputMapping: {},
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
          {
            label: "O Positive",
            value: "O_positive",
            mapping: { blood_group__O_positive: 1, blood_group__A_negative: 0 },
          },
          {
            label: "A Negative",
            value: "A_negative",
            mapping: { blood_group__O_positive: 0, blood_group__A_negative: 1 },
          },
        ],
      },
      {
        id: "blood_group__O_positive",
        label: "blood_group__O_positive",
        kind: "number",
        hidden: true,
      },
      {
        id: "blood_group__A_negative",
        label: "blood_group__A_negative",
        kind: "number",
        hidden: true,
      },
      { id: "age", label: "age", kind: "number" },
    ],
    reports: [],
  },
};

describe("schema one-hot select values", () => {
  test("displays labels but prefill uses option values", () => {
    const inputData = {
      "Blood Group": "O Positive",
      blood_group__O_positive: 1,
      blood_group__A_negative: 0,
      age: 52,
    };

    expect(getVisibleSchemaInputs(version.formSchema, inputData)).toContainEqual({
      key: "Blood Group",
      label: "Blood Group",
      value: "O Positive",
    });
    expect(getSchemaRunPrefillInputs(version.formSchema, inputData)).toMatchObject({
      "Blood Group": "O_positive",
      age: 52,
    });
  });

  test("reconstructs labels and prefill values from string one-hot model inputs", () => {
    const inputData = {
      blood_group__O_positive: "0",
      blood_group__A_negative: "1",
      age: 52,
    };

    expect(getVisibleSchemaInputs(version.formSchema, inputData)).toContainEqual({
      key: "Blood Group",
      label: "Blood Group",
      value: "A Negative",
    });
    expect(getSchemaRunPrefillInputs(version.formSchema, inputData)).toMatchObject({
      "Blood Group": "A_negative",
      age: 52,
    });
  });

  test.each([null, ""])(
    "falls back to hidden one-hot inputs when saved visible mapped value is %s",
    (emptyValue) => {
      const inputData = {
        "Blood Group": emptyValue,
        blood_group__O_positive: 0,
        blood_group__A_negative: 1,
        age: 52,
      };

      expect(getVisibleSchemaInputs(version.formSchema, inputData)).toContainEqual({
        key: "Blood Group",
        label: "Blood Group",
        value: "A Negative",
      });
      expect(getSchemaRunPrefillInputs(version.formSchema, inputData)).toMatchObject({
        "Blood Group": "A_negative",
      });
    },
  );

  test("reconstructs mapped-category when hidden one-hot inputs are boolean", () => {
    const inputData = {
      blood_group__O_positive: false,
      blood_group__A_negative: true,
      age: 52,
    };

    expect(getVisibleSchemaInputs(version.formSchema, inputData)).toContainEqual({
      key: "Blood Group",
      label: "Blood Group",
      value: "A Negative",
    });
  });

  test("reconstructs mapped-category from sparse active one-hot input", () => {
    const inputData = {
      blood_group__A_negative: 1,
      age: 52,
    };

    expect(getVisibleSchemaInputs(version.formSchema, inputData)).toContainEqual({
      key: "Blood Group",
      label: "Blood Group",
      value: "A Negative",
    });
  });

  test("predict-again defaults mapped-category select from reconstructed one-hot inputs", () => {
    const prefill = getSchemaRunPrefillInputs(version.formSchema, {
      blood_group__O_positive: "0",
      blood_group__A_negative: "1",
      age: 52,
    });
    const schema = applyPredictionInputsToSchema(version.formSchema, prefill) as {
      fields: Array<Record<string, unknown>>;
    };

    expect(schema.fields.find((field) => field.id === "blood-group")).toMatchObject({
      defaultValue: "A_negative",
    });
  });

  test("expands saved label values to hidden one-hot payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const transport = createSchemaRunTransport(
      version.bindings,
      version.formSchema.fields as never,
    );

    const result = await transport.submit({
      serializedValues: { "blood-group": "O Positive", age: 52 },
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

  test("bulk compatibility accepts label values", () => {
    expect(toSchemaRunSerializedValues(version, { "Blood Group": "O Positive", age: 52 })).toEqual({
      blood_group__O_positive: 1,
      blood_group__A_negative: 0,
      age: 52,
    });
  });
});

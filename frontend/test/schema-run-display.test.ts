/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import type { SignatureDto } from "../src/models/api/modelService";
import { composeSchemaVersion } from "../src/schemas/schema-composer";
import { getVisibleSchemaInputs, mergeSchemaRunInputs } from "../src/schemas/schema-run-display";

const signature = (fields: unknown[]): SignatureDto => ({
  id: "signature-1",
  modelId: "model-1",
  name: "v1",
  inputSignature: { fields, reports: [] },
  major: 1,
  minor: 0,
  patch: 0,
  createdAt: "2026-06-02T00:00:00Z",
});

describe("schema run display", () => {
  test("fills visible fields from model input fallback", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature([
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
          { kind: "number", id: "age", label: "age" },
          { kind: "number", id: "score", label: "score" },
        ]),
      },
    ]);

    const inputData = mergeSchemaRunInputs({ age: 42 }, [
      { modelInput: { blood_group__A: 1, blood_group__B: 0, score: 7 } },
    ]);

    expect(getVisibleSchemaInputs(result.formSchema, inputData)).toEqual([
      { key: "Blood Group", label: "Blood Group", value: "A" },
      { key: "age", label: "age", value: 42 },
      { key: "score", label: "score", value: 7 },
    ]);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  getSchemaRunPrefillInputs,
  getVisibleSchemaInputRecord,
  getVisibleSchemaInputs,
  mergeSchemaRunInputs,
} from "@/capabilities/prediction-runtime/data/input-display";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";

const schema = {
  fields: [
    {
      id: "blood_group",
      label: "Blood Group",
      displayKey: "bloodGroup",
      kind: "onehot-category",
      options: [
        { label: "A", value: "A", mappedTo: { "model-1": "blood_group__A" } },
        { label: "B", value: "B", mappedTo: { "model-1": "blood_group__B" } },
      ],
    },
    { kind: "number", id: "age", label: "Age", displayKey: "age", mappedTo: "age" },
  ],
};

describe("schema run display", () => {
  test("reads visible inputs from displayKey data only", () => {
    expect(getVisibleSchemaInputs(schema, { bloodGroup: "B", age: 52 })).toEqual([
      { key: "bloodGroup", label: "Blood Group", value: "B" },
      { key: "age", label: "Age", value: 52 },
    ]);
    expect(getVisibleSchemaInputRecord(schema, { bloodGroup: "B", age: 52 })).toEqual({
      "Blood Group": "B",
      Age: 52,
    });
  });

  test("rebuilds visible inputs from ids, labels, or model columns", () => {
    expect(
      getVisibleSchemaInputRecord(schema, {
        blood_group: "B",
        "Blood Group": "B",
        blood_group__B: 1,
        age: 52,
      }),
    ).toEqual({ "Blood Group": "B", Age: 52 });
  });

  test("prefill keeps displayKey data and merges model input fallback", () => {
    expect(getSchemaRunPrefillInputs(schema, { bloodGroup: "A", age: 42 })).toEqual({
      bloodGroup: "A",
      age: 42,
    });
    expect(
      mergeSchemaRunInputs({ bloodGroup: "A" }, [{ modelInput: { blood_group__B: 1 } }]),
    ).toEqual({ bloodGroup: "A", blood_group__B: 1 });
  });

  test("restores display keys for generated schemas before validation and prefill", () => {
    const generatedSchema = {
      fields: [{ kind: "number", id: "age", label: "Age", mappedTo: "age" }],
    };
    const validation = validateMlformSchema(generatedSchema);
    const prefill = getSchemaRunPrefillInputs(generatedSchema, { age: 42 });

    expect(validation.success).toBe(true);
    expect(validation.success && validation.data.fields[0]?.displayKey).toBe("Age");
    expect(prefill).toEqual({ Age: 42 });
    expect(applyPredictionInputsToSchema(generatedSchema, prefill)).toMatchObject({
      fields: [{ defaultValue: 42 }],
    });
  });

  test("falls back to id and skips fields without a usable display key", () => {
    const generatedSchema = {
      fields: [
        { kind: "number", id: "score", mappedTo: "score" },
        { kind: "number", mappedTo: "ignored" },
      ],
    };

    expect(getSchemaRunPrefillInputs(generatedSchema, { score: 7, ignored: 9 })).toEqual({
      score: 7,
    });
  });

  test("reads normal and plugin report payload aliases", () => {
    const version = {
      formSchema: {
        reports: [
          {
            id: "normal-report",
            label: "Normal",
            kind: "classifier",
            mappedTo: { "model-1": "normal_output" },
          },
          {
            id: "plugin-report",
            label: "Plugin",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "plugin_output" },
          },
        ],
      },
      bindings: [{ modelId: "model-1", modelName: "model-1" }],
    };

    const reports = getSchemaResultReports(version as never, {
      modelId: "model-1",
      output: {
        reports: [
          { mappedTo: "normal_output", prediction: 1 },
          { mappedTo: "plugin_output", explanation: "ok" },
        ],
      },
    });

    expect(reports.map((report) => report.id)).toEqual(["normal-report", "plugin-report"]);
  });
});

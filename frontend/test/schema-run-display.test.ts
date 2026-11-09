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
import {
  getSchemaResultReports,
  normalizeReportPayload,
} from "@/capabilities/prediction-runtime/data/report-display";
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
  test.each([
    { labels: ["Low", "High"], expected: { prediction: "High", labels: ["Low", "High"] } },
    { labels: undefined, expected: { prediction: "1", labels: ["0", "1"] } },
  ])("names the stored class by the schema's labels $labels", ({ labels, expected }) => {
    const payload = { prediction: "1", labels: ["0", "1"], probabilities: [0.2, 0.8] };
    expect(normalizeReportPayload({ kind: "classifier", labels }, payload)).toMatchObject(expected);
  });

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

  test("shows and restores a series field's rows, not the aggregation its model received", () => {
    const rows = [
      { field1: 1, field2: 100 },
      { field1: 2, field2: 120 },
    ];
    const houses = {
      fields: [
        {
          id: "area_history",
          kind: "series",
          label: "Area history",
          columns: [
            { id: "field1", kind: "number", label: "Year" },
            { id: "field2", kind: "number", label: "Area" },
          ],
          aggregations: [{ operation: "mean", label: "Mean", source: "field2", mappedTo: "area" }],
        },
      ],
    };
    const inputData = { area: 110, "Area history": rows };
    expect(getVisibleSchemaInputs(houses, inputData)).toEqual([
      {
        key: "Area history",
        label: "Area history",
        value: rows,
        columns: [
          { id: "field1", kind: "number", label: "Year" },
          { id: "field2", kind: "number", label: "Area" },
        ],
      },
    ]);
    expect(getSchemaRunPrefillInputs(houses, inputData)).toEqual({ "Area history": rows });
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

  test("reads each report from the copy the run stored under its id", () => {
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
      bindings: [{ modelId: 1, modelName: "model-1" }],
    };

    const reports = getSchemaResultReports(version as never, {
      modelId: 1,
      output: {
        reports: [
          {
            id: "normal-report",
            kind: "classifier",
            mappedTo: "normal_output",
            prediction: "1",
            labels: ["0", "1"],
          },
          {
            id: "plugin-report",
            kind: "Crystal Tree",
            mappedTo: "plugin_output",
            explanation: "ok",
          },
        ],
      },
    });

    expect(reports.map((report) => report.id)).toEqual(["normal-report", "plugin-report"]);
  });

  test("reads a class and its explanation on one output from their own stored copies", () => {
    // Built from a model: the reports have no id, so a run stores them under their labels.
    const version = {
      formSchema: {
        reports: [
          {
            label: "Predicted class",
            kind: "classifier",
            mappedTo: { risk: 0 },
            labels: ["High risk", "Low risk"],
          },
          { label: "Why", kind: "Crystal Tree", mappedTo: { risk: 0 } },
        ],
      },
      bindings: [{ modelId: 1, modelName: "risk" }],
    };

    const reports = getSchemaResultReports(version as never, {
      modelId: 1,
      output: {
        reports: [
          { kind: "classifier", output: 0, mapping: ["high", "low"], prediction: "low" },
          { kind: "Crystal Tree", explanation: "age > 50" },
          {
            id: "Predicted class",
            kind: "classifier",
            mappedTo: "0",
            labels: ["high", "low"],
            prediction: "low",
          },
          { id: "Why", kind: "Crystal Tree", mappedTo: "0", explanation: "age > 50" },
        ],
      },
    });

    expect(reports.map(({ id, payload }) => [id, payload])).toEqual([
      ["Predicted class", { labels: ["High risk", "Low risk"], prediction: "Low risk" }],
      ["Why", { explanation: "age > 50" }],
    ]);
  });
});

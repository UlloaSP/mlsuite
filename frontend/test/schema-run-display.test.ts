/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  getMappedSchemaInputRecord,
  getSchemaResultReports,
  getVisibleSchemaInputRecord,
  getVisibleSchemaInputs,
  mergeSchemaRunInputs,
} from "../src/schemas/schema-run-display";

describe("schema run display", () => {
  test("fills visible fields from model input fallback", () => {
    const formSchema = {
      fields: [
        {
          id: "Blood Group",
          label: "Blood Group",
          kind: "onehot-category",
          options: [
            { label: "A", value: "A", mappedTo: { "model-1": "blood_group__A" } },
            { label: "B", value: "B", mappedTo: { "model-1": "blood_group__B" } },
          ],
        },
        { kind: "number", id: "age", label: "age" },
        { kind: "number", id: "score", label: "score" },
      ],
      reports: [],
    };

    const inputData = mergeSchemaRunInputs({ age: 42 }, [
      { modelInput: { blood_group__A: 1, blood_group__B: 0, score: 7 } },
    ]);

    expect(getVisibleSchemaInputs(formSchema, inputData)).toEqual([
      { key: "Blood Group", label: "Blood Group", value: "A" },
      { key: "age", label: "age", value: 42 },
      { key: "score", label: "score", value: 7 },
    ]);
  });

  test("keeps visible input values over encoded model input fallback", () => {
    const inputData = mergeSchemaRunInputs({ rec_vhc: "N/A", rec_sex: "Masculino" }, [
      { modelInput: { rec_vhc: 1, rec_sex: 1 } },
    ]);

    expect(inputData).toEqual({ rec_vhc: "N/A", rec_sex: "Masculino" });
  });

  test("rebuilds saved visible inputs from mapped model keys", () => {
    const schema = {
      fields: [
        { kind: "category", id: "rec_vhc", label: "REC VHC", mappedTo: { "model-1": "rec_vhc" } },
        {
          kind: "onehot-category",
          id: "sex",
          label: "REC SEX",
          options: [
            { label: "Masculino", value: "M", mappedTo: { "model-1": "rec_sex_m" } },
            { label: "Femenino", value: "F", mappedTo: { "model-1": "rec_sex_f" } },
          ],
        },
      ],
    };

    expect(
      getVisibleSchemaInputRecord(schema, {
        rec_vhc: "N/A",
        rec_sex_m: 1,
        rec_sex_f: 0,
      }),
    ).toEqual({ "REC VHC": "N/A", "REC SEX": "Masculino" });
  });

  test("builds saved input data from mapped targets only", () => {
    const schema = {
      fields: [
        { kind: "category", id: "rec_vhc", label: "REC VHC", mappedTo: { "model-1": "rec_vhc" } },
        {
          kind: "onehot-category",
          id: "sex",
          label: "REC SEX",
          options: [
            { label: "Masculino", value: "M", mappedTo: { "model-1": "rec_sex_m" } },
            { label: "Femenino", value: "F", mappedTo: { "model-1": "rec_sex_f" } },
          ],
        },
      ],
    };

    expect(
      getMappedSchemaInputRecord(schema, {
        "REC VHC": "display-only",
        rec_vhc: "N/A",
        sex: "F",
      }),
    ).toEqual({ rec_vhc: "N/A", rec_sex_m: 0, rec_sex_f: 1 });
  });

  test("reads pending visible values by label without persisting label keys", () => {
    const schema = {
      fields: [
        { kind: "category", id: "rec_vhc", label: "REC VHC", mappedTo: { "model-1": "rec_vhc" } },
      ],
    };

    expect(getVisibleSchemaInputs(schema, { "REC VHC": "N/A" })).toEqual([
      { key: "REC VHC", label: "REC VHC", value: "N/A" },
    ]);
    expect(getMappedSchemaInputRecord(schema, { "REC VHC": "N/A" })).toEqual({
      rec_vhc: "N/A",
    });
  });

  test("ignores empty visible aliases and omits unresolved saved inputs", () => {
    const schema = {
      fields: [
        { kind: "category", id: "rec_vhc", label: "REC VHC", mappedTo: { "model-1": "rec_vhc" } },
        { kind: "number", id: "missing", label: "Missing", mappedTo: { "model-1": "missing" } },
      ],
    };

    expect(
      getVisibleSchemaInputRecord(schema, {
        "REC VHC": undefined,
        rec_vhc: "N/A",
      }),
    ).toEqual({ "REC VHC": "N/A" });
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
        reports: {
          normal_output: { prediction: 1 },
          plugin_output: { explanation: "ok" },
        },
      },
    });

    expect(reports.map((report) => report.id)).toEqual(["normal-report", "plugin-report"]);
  });
});

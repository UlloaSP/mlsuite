import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { schemaRunRuntime } from "./support/schema-run-runtime";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import {
  getModelInputBulkSchema,
  toSchemaRunFieldValues,
} from "@/features/schemas/lib/bulk-upload";
import { parseCsvPredictionFile } from "@/capabilities/prediction-runtime/data/parse-csv-prediction-file";
import { schemaVersion, workspacePrediction } from "./support/api-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const series = {
  id: "history",
  kind: "series",
  label: "History",
  mappedTo: "history",
  columns: [
    { id: "field1", kind: "number", label: "Time" },
    { id: "field2", kind: "number", label: "Value" },
  ],
};
const points = [
  { field1: 1, field2: 2 },
  { field1: 3, field2: 4 },
];

describe("series runtime contract", () => {
  test("dates keep their declared model serialization", async () => {
    const schema = {
      fields: [
        {
          ...series,
          columns: [
            { id: "date", kind: "date", label: "Date" },
            { id: "value", kind: "number", label: "Value" },
          ],
          defaultValue: [{ date: "2025-01-02T15:00:00.000Z", value: 2 }],
        },
      ],
      reports: [],
    };
    const runtime = schemaRunRuntime({ schema, bindings: [] });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: { submit: async () => ({ reports: [] }) },
    });
    const result = await form.submit();
    const expected = [{ date: "2025-01-02T15:00:00.000Z", value: 2 }];
    expect(result.modelValues).toEqual({ history: expected });
    expect(result.displayValues).toEqual({
      History: [{ date: new Date("2025-01-02T15:00:00.000Z"), value: 2 }],
    });
    expect(result.inputs[0].serializedValue).toEqual(expected);
    form.dispose();
  });

  test("restores series inputs from bulk or saved model values", () => {
    const version = schemaVersion({ formSchema: { fields: [series], reports: [] } });
    expect(toSchemaRunFieldValues(version, { history: points })).toEqual({ history: points });
  });

  test.each([false, true])(
    "routes configurable columns and aggregates to each model (raw: %s)",
    async (raw) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init?: RequestInit) => workspacePrediction(init)),
      );
      const field = {
        id: "history",
        kind: "series",
        label: "History",
        ...(raw ? { mappedTo: { "Model A": "rows_a", "Model B": "rows_b" } } : {}),
        columns: [
          { id: "time", kind: "number", label: "Time" },
          { id: "value", kind: "number", label: "Value" },
          { id: "note", kind: "text", label: "Note" },
        ],
        aggregations: [
          {
            operation: "mean",
            label: "Mean",
            source: "value",
            mappedTo: { "Model A": "stats.mean", "Model B": 0 },
          },
        ],
        defaultValue: [
          { time: 1, value: 2, note: "first" },
          { time: 3, value: 4, note: "last" },
        ],
      };
      const runtime = schemaRunRuntime({
        schema: { fields: [field], reports: [] },
        bindings: [
          { modelId: 1, modelName: "Model A" },
          { modelId: 2, modelName: "Model B" },
        ],
      });
      const form = createForm({
        schema: runtime.formSchema,
        registry: runtime.registry,
        transport: runtime.transport,
      });
      const result = await form.submit();
      expect(result.raw).toMatchObject({
        results: [
          {
            modelId: 1,
            modelInput: raw ? { rows_a: field.defaultValue, "stats.mean": 3 } : { "stats.mean": 3 },
          },
          { modelId: 2, modelInput: raw ? { rows_b: field.defaultValue, "0": 3 } : { "0": 3 } },
        ],
      });
      form.dispose();
    },
  );

  test("uses numeric aggregate targets in bulk upload", () => {
    const field = {
      ...series,
      columns: [{ id: "value", kind: "number", label: "Value" }],
      aggregations: [{ operation: "mean", label: "Mean", source: "value", mappedTo: "mean" }],
    };
    const version = schemaVersion({ formSchema: { fields: [field], reports: [] } });
    const parsed = parseCsvPredictionFile(
      'name,history,mean\ncase,"[{""value"":2}]",2',
      getModelInputBulkSchema(version),
    );
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0].inputs).toEqual({ history: [{ value: 2 }], mean: 2 });
  });

  test.each([
    { ...series, columns: undefined },
    { ...series, columns: [] },
    {
      ...series,
      columns: [{ id: "value", kind: "number", label: "Value" }],
      aggregations: [{ operation: "mean", label: "Mean", source: "missing", mappedTo: "mean" }],
    },
  ])("rejects invalid series contracts", (field) => {
    expect(validateMlformSchema({ fields: [field], reports: [] }).success).toBe(false);
  });
});

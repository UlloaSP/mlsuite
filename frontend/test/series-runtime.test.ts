import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import {
  getModelInputBulkSchema,
  toSchemaRunFieldValues,
} from "@/features/schemas/lib/bulk-upload";
import { parseCsvPredictionFile } from "@/capabilities/prediction-runtime/data/parse-csv-prediction-file";
import { schemaVersion } from "./support/api-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pair = {
  id: "history",
  kind: "series",
  label: "History",
  mappedTo: "history",
  field1: { kind: "number", label: "Time" },
  field2: { kind: "number", label: "Value" },
};
const points = [
  { field1: 1, field2: 2 },
  { field1: 3, field2: 4 },
];

describe("series runtime contract", () => {
  test.each(
    [
      points,
      [
        [1, 2],
        [3, 4],
      ],
      [
        { time: 1, value: 2 },
        { time: 3, value: 4 },
      ],
    ].map((defaultValue) => ({ defaultValue })),
  )(
    "preserves persisted pair defaults and model values for $defaultValue",
    async ({ defaultValue }) => {
      const schema = { fields: [{ ...pair, defaultValue }], reports: [] };
      const original = structuredClone(schema);
      const runtime = createSchemaRunRuntime({ schema, bindings: [] });
      const form = createForm({
        schema: runtime.formSchema,
        registry: runtime.registry,
        transport: { submit: async () => ({ reports: [] }) },
      });
      expect(form.fields[0].config).toMatchObject({
        columns: [{ id: "field1" }, { id: "field2" }],
      });
      expect((await form.submit()).modelValues).toEqual({ history: points });
      expect(schema).toEqual(original);
      form.dispose();
    },
  );

  test("restores pair inputs from bulk or saved model values", () => {
    const version = schemaVersion({ formSchema: { fields: [pair], reports: [] } });
    expect(
      toSchemaRunFieldValues(version, {
        history: [
          [1, 2],
          [3, 4],
        ],
      }),
    ).toEqual({ history: points });
  });

  test.each([false, true])(
    "routes configurable columns and aggregates to each model (raw: %s)",
    async (raw) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify({ reports: [] }))),
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
      const runtime = createSchemaRunRuntime({
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
      ...pair,
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
    { ...pair, field1: undefined },
    { ...pair, columns: [] },
    {
      ...pair,
      columns: [{ id: "value", kind: "number", label: "Value" }],
      aggregations: [{ operation: "mean", label: "Mean", source: "missing", mappedTo: "mean" }],
    },
  ])("rejects invalid series contracts", (field) => {
    expect(validateMlformSchema({ fields: [field], reports: [] }).success).toBe(false);
  });
});

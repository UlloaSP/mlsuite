import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { calculateSeriesAggregation, type SeriesAggregation } from "mlform/builtins";
import { createForm } from "mlform/runtime";
import { schemaRunRuntime } from "./support/schema-run-runtime";
import { validateMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import {
  getModelInputBulkSchema,
  toSchemaRunFieldValues,
} from "@/features/schemas/lib/bulk-upload";
import { parseCsvPredictionFile } from "@/capabilities/prediction-runtime/data/parse-csv-prediction-file";
import {
  applySchemaRunInputMapping,
  withSeriesModelValues,
} from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import { predictionRequest, schemaVersion, workspacePrediction } from "./support/api-fixtures";

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
/** A series whose rows no model reads: its model receives only their mean, as `area`. */
const areaHistory = {
  id: "area_history",
  kind: "series",
  label: "Area history",
  columns: [
    { id: "field1", kind: "number", label: "Year" },
    { id: "field2", kind: "number", label: "Area" },
  ],
  aggregations: [{ operation: "mean", label: "Mean", source: "field2", mappedTo: "area" }],
};
const areaRows = [
  { field1: 1, field2: 100 },
  { field1: 2, field2: 120 },
];
const AREA_ROWS_CELL = `"${JSON.stringify(areaRows).replaceAll('"', '""')}"`;

/**
 * Series and the aggregate MLForm computes from each, which the API's own aggregation of a
 * public run's rows is held to as well (SeriesAggregationParityTest reads the same file).
 */
type AggregationFixture = {
  series: Record<string, Record<string, unknown>[]>;
  cases: { series: string; aggregation: Record<string, unknown>; expected: number | null }[];
};
const aggregationFixture = JSON.parse(
  readFileSync(
    new URL("../../api/src/test/resources/series-aggregations.json", import.meta.url),
    "utf8",
  ),
) as AggregationFixture;

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

  test("every aggregation equals the server's on the fixture both read", () => {
    expect(aggregationFixture.cases).toHaveLength(588);
    for (const { series: name, aggregation, expected } of aggregationFixture.cases) {
      const actual = calculateSeriesAggregation(aggregationFixture.series[name]!, {
        ...aggregation,
        label: "Value",
        source: "value",
        mappedTo: "feature",
      } as SeriesAggregation);
      const label = `${name} ${JSON.stringify(aggregation)}`;
      if (expected === null) {
        expect(actual, label).toBeNull();
      } else {
        // pow, exp and log may round their last bit differently between engines and platforms.
        expect(Math.abs(actual! - expected), label).toBeLessThanOrEqual(
          4 * Number.EPSILON * Math.abs(expected),
        );
      }
    }
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
      const modelInputs = [
        raw ? { rows_a: field.defaultValue, "stats.mean": 3 } : { "stats.mean": 3 },
        raw ? { rows_b: field.defaultValue, "0": 3 } : { "0": 3 },
      ];
      expect(result.raw).toMatchObject({
        results: [
          { modelId: 1, modelInput: modelInputs[0] },
          { modelId: 2, modelInput: modelInputs[1] },
        ],
      });
      // A bulk upload stores the rows under the field's display key and gives each model the same record.
      const bulkValues = withSeriesModelValues(
        { History: field.defaultValue },
        runtime.normalizedFields,
      );
      expect(
        [1, 2].map((modelId) =>
          applySchemaRunInputMapping(bulkValues, runtime.normalizedFields, {
            modelId,
            modelName: modelId === 1 ? "Model A" : "Model B",
          }),
        ),
      ).toEqual(modelInputs);
      form.dispose();
    },
  );

  test("a run keeps a series field's rows while its model receives their aggregations", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => workspacePrediction(init));
    vi.stubGlobal("fetch", fetchMock);
    const rooms = {
      id: "rooms",
      kind: "number",
      label: "Rooms",
      mappedTo: "rooms",
      defaultValue: 3,
    };
    const runtime = schemaRunRuntime({
      schema: { fields: [rooms, { ...areaHistory, defaultValue: areaRows }], reports: [] },
      bindings: [{ modelId: 1, modelName: "houses" }],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    await form.submit();
    expect(predictionRequest(fetchMock.mock.calls[0]![1])).toEqual({
      schemaVersionId: 1,
      modelId: 1,
      modelInput: { rooms: 3, area: 110 },
      inputData: { rooms: 3, area: 110, "Area history": areaRows },
    });
    form.dispose();
  });

  test("bulk upload reads a series field's rows from its own column, not its aggregations'", () => {
    const version = schemaVersion({ formSchema: { fields: [areaHistory], reports: [] } });
    const schema = getModelInputBulkSchema(version);
    const parsed = parseCsvPredictionFile(`name,Area history\ncase,${AREA_ROWS_CELL}`, schema);
    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]!.inputs).toEqual({ "Area history": areaRows });
    expect(parseCsvPredictionFile("name,area\ncase,110", schema).skipped).toEqual([
      { line: 1, reason: "Missing input columns: Area history" },
      { line: 1, reason: "Unknown input columns: area" },
    ]);
  });

  test("bulk upload skips series values the form would refuse", () => {
    const version = schemaVersion({ formSchema: { fields: [areaHistory], reports: [] } });
    const parsed = parseCsvPredictionFile(
      'name,Area history\nno-area,"[{""field1"":1}]"\nnot-rows,"{}"\nbroken,[',
      getModelInputBulkSchema(version),
    );
    expect(parsed.records).toEqual([]);
    expect(parsed.skipped).toEqual([
      { line: 2, name: "no-area", reason: expect.stringMatching(/^"Area history": .*Area/) },
      { line: 3, name: "not-rows", reason: '"Area history" must be a JSON array' },
      { line: 4, name: "broken", reason: '"Area history" must be a JSON array' },
    ]);
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

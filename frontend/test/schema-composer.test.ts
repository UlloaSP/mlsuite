import { describe, expect, test } from "vite-plus/test";
import { composeSchemaVersion } from "../src/algorithms/schema/merge";
import { countVisibleSchemaFields } from "../src/algorithms/schema/one-hot-category";
import type { ModelDto } from "../src/api/models/services";

const withMappedTo = (items: unknown[]): unknown[] =>
  items.map((item) =>
    typeof item === "object" && item !== null && !("mappedTo" in item)
      ? {
          ...item,
          mappedTo:
            "source" in item && typeof item.source === "string"
              ? item.source
              : "label" in item && typeof item.label === "string"
                ? item.label
                : "id" in item && typeof item.id === "string"
                  ? item.id
                  : undefined,
        }
      : item,
  );

const model = (fields: unknown[], reports: unknown[] = [], id = "model-1"): ModelDto => ({
  id,
  name: id,
  type: "classifier",
  specificType: "LogisticRegression",
  fileName: "model.joblib",
  inputSchema: { fields: withMappedTo(fields), reports: withMappedTo(reports) },
  createdAt: "2026-06-02T00:00:00Z",
  updatedAt: "2026-06-02T00:00:00Z",
  archivedAt: null,
  fieldCount: fields.length,
  reportCount: reports.length,
});

const selected = (item: ModelDto) => ({ modelId: item.id, modelName: item.name, model: item });

describe("composeSchemaVersion one-hot mapping", () => {
  test("converts safe one-hot groups into native onehot categories", () => {
    const result = composeSchemaVersion("v1", [
      selected(
        model([
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
          { kind: "number", id: "age", label: "age" },
        ]),
      ),
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.find((field) => field.kind === "onehot-category")).toMatchObject({
      label: "Blood Group",
      options: [
        { value: "A", mappedTo: { "model-1": "blood_group__A" } },
        { value: "B", mappedTo: { "model-1": "blood_group__B" } },
      ],
    });
    expect(fields.filter((field) => field.hidden === true)).toHaveLength(0);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(2);
  });

  test("accepts analyzer one-hot categories without parent mappedTo", () => {
    const analyzerModel = {
      ...model([]),
      inputSchema: {
        fields: [
          {
            kind: "onehot-category",
            label: "Blood Group",
            options: [
              { label: "A", value: "A", mappedTo: "blood_group__A" },
              { label: "B", value: "B", mappedTo: "blood_group__B" },
            ],
          },
        ],
        reports: [],
      },
    };
    const result = composeSchemaVersion("v1", [selected(analyzerModel)]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      kind: "onehot-category",
      label: "Blood Group",
      options: [
        { value: "A", mappedTo: { "model-1": "blood_group__A" } },
        { value: "B", mappedTo: { "model-1": "blood_group__B" } },
      ],
    });
    expect(fields[0]).not.toHaveProperty("mappedTo");
  });

  test("keeps plus and minus one-hot categories as unique mapped targets", () => {
    const result = composeSchemaVersion("v1", [
      selected(
        model([
          { kind: "number", id: "rec_blood_group__A+", label: "rec_blood_group__A+" },
          { kind: "number", id: "rec_blood_group__A-", label: "rec_blood_group__A-" },
          { kind: "number", id: "rec_blood_group__B+", label: "rec_blood_group__B+" },
        ]),
      ),
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    const master = fields.find((field) => field.kind === "onehot-category");
    const mappedTargets = (master?.options as Array<Record<string, unknown>> | undefined)?.map(
      (option) => option.mappedTo,
    );
    expect(master).toMatchObject({ kind: "onehot-category" });
    expect(mappedTargets).toEqual([
      { "model-1": "rec_blood_group__A+" },
      { "model-1": "rec_blood_group__A-" },
      { "model-1": "rec_blood_group__B+" },
    ]);
  });

  test("does not convert singleton encoded fields", () => {
    const result = composeSchemaVersion("v1", [
      selected(model([{ kind: "number", id: "blood_group__A", label: "blood_group__A" }])),
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.some((field) => field.kind === "onehot-category")).toBe(false);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(1);
  });

  test("does not convert groups when base field already exists", () => {
    const result = composeSchemaVersion("v1", [
      selected(
        model([
          { kind: "category", id: "blood_group", label: "blood_group" },
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
        ]),
      ),
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.some((field) => field.kind === "onehot-category")).toBe(false);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(3);
  });

  test("keeps model reports on the schema", () => {
    const report = { kind: "classifier", id: "risk", source: "risk", label: "Risk" };
    const result = composeSchemaVersion("v1", [selected(model([], [report]))]);

    const reports = result.formSchema.reports as Array<Record<string, unknown>>;
    expect(reports).toHaveLength(1);
    expect(reports.every((item) => !("id" in item) && !("source" in item))).toBe(true);
    expect(reports[0]?.mappedTo).toEqual({ "model-1": "risk" });
  });

  test("composes one schema from multiple models", () => {
    const result = composeSchemaVersion("v1", [
      selected(model([{ kind: "number", id: "age", label: "age" }], [], "model-1")),
      selected(model([{ kind: "number", id: "score", label: "score" }], [], "model-2")),
    ]);

    expect(result.bindings).toEqual([
      expect.objectContaining({ modelId: "model-1" }),
      expect.objectContaining({ modelId: "model-2" }),
    ]);
    expect(result.formSchema.fields).toEqual([
      expect.objectContaining({ mappedTo: { "model-1": "age" } }),
      expect.objectContaining({ mappedTo: { "model-2": "score" } }),
    ]);
  });
});

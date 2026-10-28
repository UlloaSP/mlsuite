import { describe, expect, test } from "vite-plus/test";
import { composeSchemaVersion } from "@/features/schemas/lib/merge";
import type { ModelDto } from "@/shared/api/openapi.gen";

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

const model = (fields: unknown[], reports: unknown[] = [], id = 1): ModelDto => ({
  id,
  name: `model-${id}`,
  type: "classifier",
  specificType: "LogisticRegression",
  fileName: "model.mlbundle",
  inputSchema: { fields: withMappedTo(fields), reports: withMappedTo(reports) },
  createdAt: "2026-06-02T00:00:00Z",
  updatedAt: "2026-06-02T00:00:00Z",
  archivedAt: null,
  updatedByName: "Owner",
  updatedByEmail: "owner@example.com",
  updatedByAvatarUrl: null,
  version: 0,
  fieldCount: fields.length,
  reportCount: reports.length,
  runtimeState: "READY",
  runtimeError: null,
});

describe("composeSchemaVersion one-hot mapping", () => {
  test("leaves one-hot grouping to the model schema", () => {
    const result = composeSchemaVersion("v1", [
      model([
        { kind: "number", id: "blood_group__A", label: "blood_group__A" },
        { kind: "number", id: "blood_group__B", label: "blood_group__B" },
      ]),
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.map((field) => field.kind)).toEqual(["number", "number"]);
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
    const result = composeSchemaVersion("v1", [analyzerModel]);

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

  test("keeps model reports on the schema", () => {
    const report = { kind: "classifier", id: "risk", source: "risk", label: "Risk" };
    const result = composeSchemaVersion("v1", [model([], [report])]);

    const reports = result.formSchema.reports as Array<Record<string, unknown>>;
    expect(reports).toHaveLength(1);
    expect(reports.every((item) => !("id" in item) && !("source" in item))).toBe(true);
    expect(reports[0]?.mappedTo).toEqual({ "model-1": "risk" });
  });

  test("composes one schema from multiple models", () => {
    const result = composeSchemaVersion("v1", [
      model([{ kind: "number", id: "age", label: "age" }], [], 1),
      model([{ kind: "number", id: "score", label: "score" }], [], 2),
    ]);

    expect(result.bindings).toEqual([
      expect.objectContaining({ modelId: 1, modelName: "model-1" }),
      expect.objectContaining({ modelId: 2, modelName: "model-2" }),
    ]);
    expect(result.formSchema.fields).toEqual([
      expect.objectContaining({ mappedTo: { "model-1": "age" } }),
      expect.objectContaining({ mappedTo: { "model-2": "score" } }),
    ]);
  });
});

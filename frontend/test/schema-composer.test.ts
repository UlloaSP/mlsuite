/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { composeSchemaVersion } from "../src/schemas/schema-composer";
import { countVisibleSchemaFields } from "../src/schemas/one-hot-schema";
import type { SignatureDto } from "../src/models/api/modelService";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import { getSchemaResultReports, getVisibleSchemaInputs, mergeSchemaRunInputs } from "../src/schemas/schema-run-display";

const signature = (fields: unknown[], reports: unknown[] = []): SignatureDto => ({
  id: "signature-1",
  modelId: "model-1",
  name: "v1",
  inputSignature: { fields, reports },
  major: 1,
  minor: 0,
  patch: 0,
  createdAt: "2026-06-02T00:00:00Z",
});

const signatureFor = (id: string, modelId: string, fields: unknown[], reports: unknown[] = []): SignatureDto => ({
  ...signature(fields, reports),
  id,
  modelId,
});

describe("composeSchemaVersion one-hot mapping", () => {
  test("converts safe one-hot groups into mapped categories with hidden subordinates", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature([
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
          { kind: "number", id: "age", label: "age" },
        ]),
      },
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.find((field) => field.kind === "mapped-category")).toMatchObject({
      id: "blood-group",
      label: "Blood Group",
    });
    expect(fields.filter((field) => field.hidden === true)).toHaveLength(2);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(2);
    expect(result.bindings[0]?.inputMapping).toEqual({
      "blood_group__A": "blood_group__A",
      "blood_group__B": "blood_group__B",
      age: "age",
    });
    expect(fields.every((field) => !((field.ui as Record<string, unknown> | undefined)?.backendKey))).toBe(true);
  });

  test("keeps plus and minus one-hot categories as unique hidden numeric targets", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature([
          { kind: "number", id: "rec_blood_group__A+", label: "rec_blood_group__A+" },
          { kind: "number", id: "rec_blood_group__A-", label: "rec_blood_group__A-" },
          { kind: "number", id: "rec_blood_group__B+", label: "rec_blood_group__B+" },
        ]),
      },
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    const master = fields.find((field) => field.kind === "mapped-category");
    const ids = fields.map((field) => String(field.id));
    const mappedIds = Object.keys(
      ((master?.options as Array<Record<string, unknown>> | undefined)?.[0]?.mapping as Record<string, unknown>) ??
        {},
    );
    expect(new Set(ids).size).toBe(ids.length);
    expect(master).toMatchObject({ includeInSubmission: false });
    expect(mappedIds.every((id) => ids.includes(id))).toBe(true);
    expect(result.bindings[0]?.inputMapping).toEqual({
      "rec_blood_group__A+": "rec_blood_group__A+",
      "rec_blood_group__A-": "rec_blood_group__A-",
      "rec_blood_group__B+": "rec_blood_group__B+",
    });
  });

  test("converts one-hot groups only after fields from all selected models are merged", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signatureFor("signature-1", "model-1", [
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
        ]),
      },
      {
        modelId: "model-2",
        signature: signatureFor("signature-2", "model-2", [
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
        ]),
      },
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.find((field) => field.kind === "mapped-category")).toMatchObject({
      id: "blood-group",
      label: "Blood Group",
    });
    expect(fields.filter((field) => field.hidden === true)).toHaveLength(2);
    expect(result.bindings[0]?.inputMapping).toEqual({ "blood_group__A": "blood_group__A" });
    expect(result.bindings[1]?.inputMapping).toEqual({ "blood_group__B": "blood_group__B" });
  });

  test("does not convert singleton encoded fields", () => {
    const result = composeSchemaVersion("v1", [{
      modelId: "model-1",
      signature: signature([{ kind: "number", id: "blood_group__A", label: "blood_group__A" }]),
    }]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.some((field) => field.kind === "mapped-category")).toBe(false);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(1);
  });

  test("does not convert groups when base field already exists", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature([
          { kind: "category", id: "blood_group", label: "blood_group" },
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
        ]),
      },
    ]);

    const fields = result.formSchema.fields as Array<Record<string, unknown>>;
    expect(fields.some((field) => field.kind === "mapped-category")).toBe(false);
    expect(countVisibleSchemaFields(result.formSchema)).toBe(3);
  });

  test("keeps reports per selected model instead of merging them like fields", () => {
    const report = { kind: "classifier", id: "risk", source: "risk", label: "Risk" };
    const result = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signatureFor("signature-1", "model-1", [], [report]) },
      { modelId: "model-2", signature: signatureFor("signature-2", "model-2", [], [report]) },
    ]);

    const reports = result.formSchema.reports as Array<Record<string, unknown>>;
    expect(reports).toHaveLength(2);
    expect(new Set(reports.map((item) => item.id)).size).toBe(2);
    expect(result.bindings[0]?.outputMapping).toEqual({ [String(reports[0]?.id)]: "risk" });
    expect(result.bindings[1]?.outputMapping).toEqual({ [String(reports[1]?.id)]: "risk" });
  });

  test("schema-run transport returns mapped reports for mlform rendering", async () => {
    const first = { prediction: "low", probabilities: [0.8, 0.2] };
    const second = { prediction: "high", probabilities: [0.3, 0.7] };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ reports: { risk: first } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            outputs: [{ type: "classifier", mapping: ["low", "high"], probabilities: [[0.3, 0.7]] }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const transport = createSchemaRunTransport(
      [
        { modelId: "model-1", signatureId: "signature-1", inputMapping: { age: "age" }, outputMapping: { "model-1-risk": "risk" } },
        { modelId: "model-2", signatureId: "signature-2", inputMapping: { age: "age" }, outputMapping: { "model-2-risk": "risk" } },
      ],
      [{ kind: "number", id: "age", label: "age" }],
    );
    const result = await transport.submit({
      serializedValues: { age: 42 },
      reports: [
        { kind: "classifier", id: "model-1-risk", source: "model-1-risk" },
        { kind: "classifier", id: "model-2-risk", source: "model-2-risk" },
      ],
    } as never);

    expect(result.reports).toMatchObject({
      "model-1-risk": first,
      "model-2-risk": second,
    });
    vi.unstubAllGlobals();
  });

  test("schema run display shows visible mapped category input from technical one-hot values", () => {
    const result = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature([
          { kind: "number", id: "blood_group__A", label: "blood_group__A" },
          { kind: "number", id: "blood_group__B", label: "blood_group__B" },
          { kind: "number", id: "age", label: "age" },
        ]),
      },
    ]);

    expect(
      getVisibleSchemaInputs(result.formSchema, {
        blood_group__A: 0,
        blood_group__B: 1,
        age: 42,
      }),
    ).toEqual([
      { key: "Blood Group", label: "Blood Group", value: "B" },
      { key: "age", label: "age", value: 42 },
    ]);
  });

  test("schema run display maps result output into schema reports", () => {
    const report = {
      kind: "classifier",
      id: "risk",
      source: "risk",
      label: "Risk",
      labels: ["Moricion", "Vivicion"],
    };
    const result = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signatureFor("signature-1", "model-1", [], [report]) },
    ]);
    const reportId = String((result.formSchema.reports as Array<Record<string, unknown>>)[0]?.id);

    expect(
      getSchemaResultReports(
        {
          id: "version-1",
          schemaId: "schema-1",
          version: 1,
          name: "v1",
          formSchema: result.formSchema,
          bindings: result.bindings.map((binding) => ({
            id: "binding-1", schemaVersionId: "version-1", inputMapping: {},
            outputMapping: binding.outputMapping ?? {}, modelId: binding.modelId, signatureId: binding.signatureId,
          })),
          createdAt: "2026-06-02T00:00:00Z",
        },
        {
          modelId: "model-1",
          signatureId: "signature-1",
          output: { reports: { risk: { prediction: "1", probabilities: [0.25, 0.75] } } },
        },
      ),
    ).toEqual([
      {
        id: reportId,
        label: "Risk · model-1",
        kind: "classifier",
        labels: ["Moricion", "Vivicion"],
        payload: {
          labels: ["Moricion", "Vivicion"],
          prediction: "Vivicion",
          probabilities: [0.25, 0.75],
        },
      },
    ]);
  });

  test("schema run display fills visible fields from model input fallback", () => {
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

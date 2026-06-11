/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { applyPredictionInputsToSchema } from "../src/app/utils/mlform/schema";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import {
  getModelInputBulkSchema,
  toSchemaRunSerializedValues,
} from "../src/schemas/schema-run-bulk-inputs";
import {
  getSchemaRunPrefillInputs,
  getVisibleSchemaInputs,
} from "../src/schemas/schema-run-display";
import { parseCsvPredictionFile } from "../src/models/parseCsvPredictionFile";
import type { SchemaVersionDto } from "../src/schemas/types";

const version: SchemaVersionDto = {
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Risk schema",
  createdAt: "2026-06-02T00:00:00Z",
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: { "Patient age": "age" },
      outputMapping: {},
    },
  ],
  formSchema: {
    fields: [{ id: "age", label: "Patient age", kind: "number" }],
    reports: [],
  },
};

const labelEdgeCases = [
  { modelKey: "rec_uci_hours", oldLabel: "REC_UCI_HOURS", label: "TOTAL HORAS UCI" },
  { modelKey: "rec_gpt", oldLabel: "REC_GPT", label: "Gpt receptor (UI/L)" },
  { modelKey: "don_creatinine_fin", oldLabel: "DON_CREATININE_FIN", label: "Creatinina final" },
  { modelKey: "rec_bilirubin", oldLabel: "REC_BILIRUBIN", label: "Bilirrubina total" },
  { modelKey: "afp_receptor_ng_ml", oldLabel: "AFP_RECEPTOR_NG_ML", label: "AFP receptor (ng/mL)" },
  { modelKey: "don_size", oldLabel: "DON_SIZE", label: "Tamaño donante + receptor" },
  { modelKey: "rec_imc_percent", oldLabel: "REC_IMC_PERCENT", label: "IMC receptor %" },
  { modelKey: "don_sex", oldLabel: "DON_SEX", label: "Sexo donante/órgano" },
] as const;

describe("schema bulk upload with edited labels", () => {
  test("uses signature feature columns when schema labels are edited", () => {
    const bulkSchema = getModelInputBulkSchema(version) as {
      fields: Array<{ id: string; label: string }>;
    };

    expect(bulkSchema.fields).toEqual([expect.objectContaining({ id: "age", label: "age" })]);
    expect(toSchemaRunSerializedValues(version, { age: 52 })).toEqual({ age: 52 });
  });

  test("technical inputs become visible saved inputs for display and predict-again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const transport = createSchemaRunTransport(
      version.bindings,
      version.formSchema.fields as never,
    );

    const result = await transport.submit({
      serializedValues: toSchemaRunSerializedValues(version, { age: 52 }),
      reports: [],
    } as never);
    const raw = (result as { raw: { inputData: Record<string, unknown> } }).raw;
    const prefill = getSchemaRunPrefillInputs(version.formSchema, raw.inputData);
    const schema = applyPredictionInputsToSchema(version.formSchema, prefill) as {
      fields: Array<Record<string, unknown>>;
    };

    expect(raw.inputData).toEqual({ "Patient age": 52 });
    expect(getVisibleSchemaInputs(version.formSchema, raw.inputData)).toEqual([
      { key: "Patient age", label: "Patient age", value: 52 },
    ]);
    expect(schema.fields[0]).toMatchObject({ defaultValue: 52 });
  });

  test("accepts technical id headers when labels differ by case or display text", () => {
    const versionWithoutMapping: SchemaVersionDto = {
      ...version,
      bindings: [{ ...version.bindings[0], inputMapping: {} }],
      formSchema: {
        fields: [{ id: "rec_uci_hours", label: "REC_UCI_HOURS", kind: "number" }],
        reports: [],
      },
    };

    const parsed = parseCsvPredictionFile(
      "name,rec_uci_hours\ncase-1,36\n",
      getModelInputBulkSchema(versionWithoutMapping),
      100,
      0,
    );

    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ rec_uci_hours: 36 });
    expect(toSchemaRunSerializedValues(versionWithoutMapping, { rec_uci_hours: 36 })).toEqual({
      rec_uci_hours: 36,
    });
  });

  test("maps technical bulk values into renamed schema fields for saved display and predict-again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );
    const renamedVersion: SchemaVersionDto = {
      ...version,
      bindings: [
        {
          ...version.bindings[0],
          inputMapping: { REC_UCI_HOURS: "rec_uci_hours" },
        },
      ],
      formSchema: {
        fields: [{ id: "rec_uci_hours", label: "TOTAL HORAS UCI", kind: "number" }],
        reports: [],
      },
    };
    const parsed = parseCsvPredictionFile(
      "name,rec_uci_hours\ncase-1,36\n",
      getModelInputBulkSchema(renamedVersion),
      100,
      0,
    );
    const serializedValues = toSchemaRunSerializedValues(
      renamedVersion,
      parsed.records[0]?.inputs ?? {},
    );
    const transport = createSchemaRunTransport(
      renamedVersion.bindings,
      renamedVersion.formSchema.fields as never,
    );

    const result = await transport.submit({ serializedValues, reports: [] } as never);
    const raw = (result as { raw: { inputData: Record<string, unknown> } }).raw;
    const prefill = getSchemaRunPrefillInputs(renamedVersion.formSchema, {
      ...raw.inputData,
      rec_uci_hours: 36,
    });

    expect(serializedValues).toEqual({ rec_uci_hours: 36 });
    expect(raw.inputData).toEqual({ "TOTAL HORAS UCI": 36 });
    expect(getVisibleSchemaInputs(renamedVersion.formSchema, raw.inputData)).toEqual([
      { key: "TOTAL HORAS UCI", label: "TOTAL HORAS UCI", value: 36 },
    ]);
    expect(prefill).toEqual({ "TOTAL HORAS UCI": 36 });
  });

  test("displays and prefills technical saved inputs when visible label is missing", () => {
    const renamedSchema = {
      fields: [{ id: "rec_uci_hours", label: "TOTAL HORAS UCI", kind: "number" }],
      reports: [],
    };
    const technicalOnlyInput = { rec_uci_hours: 36 };

    expect(getVisibleSchemaInputs(renamedSchema, technicalOnlyInput)).toEqual([
      { key: "TOTAL HORAS UCI", label: "TOTAL HORAS UCI", value: 36 },
    ]);
    expect(getSchemaRunPrefillInputs(renamedSchema, technicalOnlyInput)).toEqual({
      "TOTAL HORAS UCI": 36,
    });
  });

  test("displays and prefills special-character labels from exact field id fallback", () => {
    const schema = {
      fields: [{ id: "br4is-mnioz-coastrado", label: "BR4IS MÑIOZ COASTRADO`^^", kind: "number" }],
      reports: [],
    };
    const inputData = { "br4is-mnioz-coastrado": 9 };

    expect(getVisibleSchemaInputs(schema, inputData)).toEqual([
      { key: "BR4IS MÑIOZ COASTRADO`^^", label: "BR4IS MÑIOZ COASTRADO`^^", value: 9 },
    ]);
    expect(getSchemaRunPrefillInputs(schema, inputData)).toEqual({
      "BR4IS MÑIOZ COASTRADO`^^": 9,
    });
  });

  test("keeps model feature names exact when they contain case and symbols", () => {
    const exactVersion: SchemaVersionDto = {
      ...version,
      bindings: [
        {
          ...version.bindings[0],
          inputMapping: { "Friendly label": "Rec GPT receptor (UI/L)" },
        },
      ],
      formSchema: {
        fields: [
          { id: "Rec GPT receptor (UI/L)", label: "Gpt receptor descriptivo", kind: "number" },
        ],
        reports: [],
      },
    };

    const parsed = parseCsvPredictionFile(
      "name,Rec GPT receptor (UI/L)\ncase-1,44\n",
      getModelInputBulkSchema(exactVersion),
      100,
      0,
    );

    expect(parsed.skipped).toEqual([]);
    expect(parsed.records[0]?.inputs).toEqual({ "Rec GPT receptor (UI/L)": 44 });
    expect(toSchemaRunSerializedValues(exactVersion, parsed.records[0]?.inputs ?? {})).toEqual({
      "Rec GPT receptor (UI/L)": 44,
    });
  });

  test("maps technical columns through case, accent, and symbol label edits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ outputs: [] }))),
    );

    for (const item of labelEdgeCases) {
      const edgeVersion: SchemaVersionDto = {
        ...version,
        bindings: [
          {
            ...version.bindings[0],
            inputMapping: { [item.oldLabel]: item.modelKey },
          },
        ],
        formSchema: {
          fields: [{ id: item.modelKey, label: item.label, kind: "number" }],
          reports: [],
        },
      };
      const parsed = parseCsvPredictionFile(
        `name,${item.modelKey}\ncase-1,37\n`,
        getModelInputBulkSchema(edgeVersion),
        100,
        0,
      );
      const serializedValues = toSchemaRunSerializedValues(
        edgeVersion,
        parsed.records[0]?.inputs ?? {},
      );
      const transport = createSchemaRunTransport(
        edgeVersion.bindings,
        edgeVersion.formSchema.fields as never,
      );

      const result = await transport.submit({ serializedValues, reports: [] } as never);
      const raw = (result as { raw: { inputData: Record<string, unknown> } }).raw;

      expect(parsed.skipped, item.label).toEqual([]);
      expect(parsed.records[0]?.inputs, item.label).toEqual({ [item.modelKey]: 37 });
      expect(serializedValues, item.label).toEqual({ [item.modelKey]: 37 });
      expect(raw.inputData, item.label).toEqual({ [item.label]: 37 });
      expect(getVisibleSchemaInputs(edgeVersion.formSchema, raw.inputData), item.label).toEqual([
        { key: item.label, label: item.label, value: 37 },
      ]);
      expect(
        getSchemaRunPrefillInputs(edgeVersion.formSchema, { [item.modelKey]: 37 }),
        item.label,
      ).toEqual({ [item.label]: 37 });
    }
  });
});

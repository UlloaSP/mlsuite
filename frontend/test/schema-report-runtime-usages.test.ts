/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import type { CatalogReportDefinition } from "../src/app/utils/mlform/custom-report";
import { createSchemaRunRuntime } from "../src/app/utils/mlform/schema-run-runtime";
import { buildSchemaFeedbackSteps } from "../src/schemas/schema-feedback-steps";
import { getSchemaResultReports } from "../src/schemas/schema-run-display";
import type { PredictionResultDto, SchemaVersionDto } from "../src/schemas/types";

const questionnaire = {
  steps: [{ id: "review", fields: [{ id: "assessment", kind: "text", label: "Assessment" }] }],
};

const crystalDefinition = (): CatalogReportDefinition => ({
  id: "crystal-plugin",
  fileName: "crystal.ts",
  source: "",
  updatedAt: "",
  createdAt: "",
  contentType: "text/typescript",
  sizeBytes: 1,
  active: true,
  kind: "Crystal Tree",
  definition: defineReportKind({
    kind: "Crystal Tree",
    schema: z.object({
      id: z.string().optional(),
      source: z.string().optional(),
      label: z.string().optional(),
      kind: z.literal("Crystal Tree"),
      endpoint: z.string().default("/api/analyzer/explanations"),
    }),
    resolve: ({ report, result }) => result.reports[report.id],
    fetch: ({ config, reportId }) => ({
      submit: async (request) => {
        const modelId = String(request.meta?.modelId ?? "");
        const response = await fetch(`${config.endpoint}?modelId=${modelId}&reportId=${reportId}`);
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      },
    }),
    render: {
      content: ({ payload }) => ({
        type: "text",
        value: String((payload as { explanation?: string }).explanation ?? ""),
      }),
    },
  }),
});

const version = (includeSingleton = false): SchemaVersionDto => ({
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: "Runtime reports",
  createdAt: "2026-06-10T00:00:00Z",
  formSchema: {
    fields: [{ id: "age", label: "age", kind: "number" }],
    reports: [
      {
        id: "crystal",
        source: "crystal",
        label: "Crystal Tree",
        kind: "Crystal Tree",
        feedbackQuestionnaire: questionnaire,
      },
      ...(includeSingleton
        ? [
            {
              id: "single",
              source: "single-source",
              label: "Single Report",
              kind: "Crystal Tree",
            },
          ]
        : []),
    ],
  },
  bindings: [
    {
      id: "binding-1",
      schemaVersionId: "version-1",
      modelId: "model-1",
      signatureId: "sig-1",
      inputMapping: { age: "age" },
      outputMapping: includeSingleton
        ? { crystal: "crystal-source-1", single: "single-source" }
        : { crystal: "crystal-source-1" },
    },
    {
      id: "binding-2",
      schemaVersionId: "version-1",
      modelId: "model-2",
      signatureId: "sig-2",
      inputMapping: { age: "age" },
      outputMapping: { crystal: "crystal-source-2" },
    },
    {
      id: "binding-3",
      schemaVersionId: "version-1",
      modelId: "model-3",
      signatureId: "sig-3",
      inputMapping: { age: "age" },
      outputMapping: { crystal: "crystal-source-3" },
    },
  ],
});

const result = (
  id: string,
  modelId: string,
  signatureId: string,
  reports: Record<string, unknown>,
): PredictionResultDto => ({
  id,
  runId: "run-1",
  modelId,
  signatureId,
  modelInput: { age: 42 },
  output: { reports },
  status: "SUCCESS",
  createdAt: "2026-06-10T00:00:00Z",
});

describe("schema report runtime usages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("expands one canonical report into one runtime report per mapped binding", () => {
    const runtime = createSchemaRunRuntime({
      schema: version().formSchema,
      bindings: version().bindings,
      customReportDefinitions: [crystalDefinition()],
    });

    expect(runtime.formSchema.reports).toHaveLength(3);
    expect(new Set(runtime.formSchema.reports.map((report) => report.id)).size).toBe(3);
    expect(runtime.formSchema.reports.map((report) => report.source)).toEqual([
      "crystal-source-1",
      "crystal-source-2",
      "crystal-source-3",
    ]);
  });

  test("keeps runtime report contexts separate for shared canonical reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        const modelId = new URL(url, "http://local").searchParams.get("modelId");
        return new Response(JSON.stringify({ explanation: `tree-${modelId}` }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: version().formSchema,
      bindings: version().bindings,
      customReportDefinitions: [crystalDefinition()],
    });

    const submitted = await runtime.transport.submit({
      values: { age: 42 },
      fieldValues: { age: 42 },
      serializedValues: { age: 42 },
      serializedFieldValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);
    const raw = submitted.raw as {
      results: Array<{ output: { reports?: Record<string, unknown> } }>;
      reportContextById: Record<string, unknown>;
    };

    expect(Object.keys(submitted.reports)).toHaveLength(3);
    expect(Object.keys(raw.reportContextById)).toHaveLength(3);
    expect(raw.results[0]?.output.reports?.["crystal"]).toEqual({ explanation: "tree-model-1" });
    expect(raw.results[1]?.output.reports?.["crystal"]).toEqual({ explanation: "tree-model-2" });
    expect(raw.results[2]?.output.reports?.["crystal"]).toEqual({ explanation: "tree-model-3" });
  });

  test("displays shared reports once per result and keeps singleton report separate", () => {
    const schemaVersion = version(true);
    const reports = [
      result("result-1", "model-1", "sig-1", {
        "crystal-source-1": { explanation: "tree-1" },
        "single-source": { explanation: "single" },
      }),
      result("result-2", "model-2", "sig-2", {
        "crystal-source-2": { explanation: "tree-2" },
      }),
      result("result-3", "model-3", "sig-3", {
        "crystal-source-3": { explanation: "tree-3" },
      }),
    ].flatMap((item) => getSchemaResultReports(schemaVersion, item));

    expect(reports.map((report) => report.id)).toEqual(["crystal", "single", "crystal", "crystal"]);
  });

  test("keeps feedback grouped by canonical report definition", () => {
    const schemaVersion = version();
    const steps = buildSchemaFeedbackSteps(
      schemaVersion,
      [
        result("result-1", "model-1", "sig-1", { "crystal-source-1": { explanation: "tree-1" } }),
        result("result-2", "model-2", "sig-2", { "crystal-source-2": { explanation: "tree-2" } }),
        result("result-3", "model-3", "sig-3", { "crystal-source-3": { explanation: "tree-3" } }),
      ],
      [],
    );

    expect(steps).toHaveLength(1);
    expect(steps[0]?.usages).toHaveLength(3);
  });
});

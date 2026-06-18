/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { createForm, executeFormPipeline } from "mlform/runtime";
import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { createSchemaRunRuntime } from "../src/algorithms/schema/run-runtime";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "../src/algorithms/mlform/schema-run-result-state";
import type { CatalogReportDefinition } from "../src/algorithms/plugin/custom-report-catalog";

const crystal = (): CatalogReportDefinition => ({
  id: "crystal",
  fileName: "crystal.ts",
  source: "",
  updatedAt: "",
  createdAt: "",
  contentType: "text/typescript",
  sizeBytes: 1,
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
    payloadSchema: z.object({ explanation: z.string() }),
    resolve: ({ report, result }) => result.reports[report.id],
    fetch: ({ config }) => ({
      submit: async (request) => {
        const modelId = String(request.meta?.modelId ?? "");
        const response = await fetch(`${config.endpoint}?modelId=${modelId}`, {
          method: "POST",
          body: JSON.stringify({ instance: request.meta?.backendFieldValues }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      },
    }),
    render: {
      content: ({ payload }) => ({
        type: "text",
        value: String((payload as { explanation?: string })?.explanation ?? ""),
      }),
    },
  }),
});

describe("schema plugin real mlform lifecycle", () => {
  afterEach(() => vi.restoreAllMocks());

  test("creates one fetchable report controller per bound model", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanation: url }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "crystal_1",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
            endpoint: "/api/analyzer/explanations",
          },
          {
            id: "crystal_2",
            kind: "Crystal Tree",
            mappedTo: { "model-2": "crystal-tree" },
            endpoint: "/api/analyzer/explanations",
          },
          {
            id: "crystal_3",
            kind: "Crystal Tree",
            mappedTo: { "model-3": "crystal-tree" },
            endpoint: "/api/analyzer/explanations",
          },
        ],
      },
      bindings: [{ modelId: "model-1" }, { modelId: "model-2" }, { modelId: "model-3" }],
      customReportDefinitions: [crystal()],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    const result = await form.submit();
    expect(form.reports.map((report) => report.id)).toEqual([
      "crystal-1",
      "crystal-2",
      "crystal-3",
    ]);
    expect(form.reports.map((report) => report.state.status)).toEqual(["ready", "ready", "ready"]);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toEqual([
      "/api/analyzer/explanations?modelId=model-1",
      "/api/analyzer/explanations?modelId=model-2",
      "/api/analyzer/explanations?modelId=model-3",
    ]);
    expect(result.reports["crystal-1"]).toEqual({
      explanation: "/api/analyzer/explanations?modelId=model-1",
    });
  });

  test("fetches custom reports through upstream form pipeline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanation: url }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "crystal_1",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
          },
          {
            id: "crystal_2",
            kind: "Crystal Tree",
            mappedTo: { "model-2": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }, { modelId: "model-2" }],
      customReportDefinitions: [crystal()],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    const result = await executeFormPipeline({ form });
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toEqual([
      "/api/analyzer/explanations?modelId=model-1",
      "/api/analyzer/explanations?modelId=model-2",
    ]);
    expect(result.submitResult.reports["crystal-1"]).toEqual({
      explanation: "/api/analyzer/explanations?modelId=model-1",
    });
  });

  test("mounted-style submit uses transport-prefetched custom reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        if (url.includes("modelId=model-2")) {
          return new Response("unsupported", { status: 400 });
        }
        return new Response(JSON.stringify({ explanation: url }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "crystal",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
          },
          {
            id: "crystal_2",
            kind: "Crystal Tree",
            mappedTo: { "model-2": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }, { modelId: "model-2" }],
      customReportDefinitions: [crystal()],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    const result = await form.submit();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toEqual([
      "/api/analyzer/explanations?modelId=model-1",
      "/api/analyzer/explanations?modelId=model-2",
    ]);
    expect(form.reports[0]?.state).toMatchObject({
      status: "ready",
      payload: { explanation: "/api/analyzer/explanations?modelId=model-1" },
    });
    expect(form.reports[1]?.state.status).toBe("idle");
    expect(form.reports[1]?.state.error).toBeNull();
    expect((result.raw as { skippedReportIds?: string[] }).skippedReportIds).toContain(
      "crystal-2",
    );
    const built = buildSchemaRunRawFromSubmitResult(
      result.raw as Record<string, unknown>,
      form.reports,
      reportStatesFromSnapshot(form.state.reportStates),
      [{ modelId: "model-1" }, { modelId: "model-2" }],
    );
    expect(built.reportsPending).toBe(false);
  });

  test("submits no-id schema with all normal and one-hot features plus report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanation: url }));
      }),
    );
    const normalFields = Array.from({ length: 18 }, (_, index) => ({
      kind: "number",
      label: `feature_${index + 1}`,
      mappedTo: { "Model One": `feature_${index + 1}` },
    }));
    const oneHotOptions = Array.from({ length: 11 }, (_, index) => ({
      label: String(index + 1),
      value: String(index + 1),
      mappedTo: { "Model One": `category__${index + 1}` },
    }));
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [
          ...normalFields,
          {
            label: "Category",
            kind: "onehot-category",
            options: oneHotOptions,
          },
        ],
        reports: [
          {
            kind: "Crystal Tree",
            label: "Report",
            mappedTo: { "Model One": "crystal-tree" },
          },
        ],
      },
      bindings: [
        {
          modelId: "model-1",
          modelName: "Model One",
        },
      ],
      customReportDefinitions: [crystal()],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({
      ...Object.fromEntries(normalFields.map((_, index) => [`feature-${index + 1}`, index + 1])),
      category: "1",
    });

    const result = await executeFormPipeline({ form });
    const modelInput = (
      result.submitResult as { raw: { results: Array<{ modelInput: Record<string, unknown> }> } }
    ).raw.results[0].modelInput;

    expect(Object.keys(modelInput)).toHaveLength(29);
    expect(modelInput).toMatchObject({
      feature_1: 1,
      feature_18: 18,
      category__1: 1,
      category__11: 0,
    });
    expect(result.submitResult.reports.report).toEqual({
      explanation: "/api/analyzer/explanations?modelId=model-1",
    });
  });
});

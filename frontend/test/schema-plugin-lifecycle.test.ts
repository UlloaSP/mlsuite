/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi, afterEach } from "vite-plus/test";
import { createForm } from "mlform/runtime";
import { createReportFetchRequest } from "mlform/schema";
import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { createSchemaRunRuntime } from "../src/app/utils/mlform/schema-run-runtime";
import type { CatalogReportDefinition } from "../src/plugin/mlform/custom-report";

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
    await Promise.all(
      form.reports.map((report) =>
        report.fetch(createReportFetchRequest(result, { reportId: report.id })),
      ),
    );
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toEqual([
      "/api/analyzer/explanations?modelId=model-1",
      "/api/analyzer/explanations?modelId=model-2",
      "/api/analyzer/explanations?modelId=model-3",
    ]);
  });

  test("prefetches custom reports during form submit without manual report fetch", async () => {
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
    const result = await form.submit();
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toEqual([
      "/api/analyzer/explanations?modelId=model-1",
      "/api/analyzer/explanations?modelId=model-2",
    ]);
    expect((result as { reports: Record<string, unknown> }).reports["crystal-1"]).toEqual({
      explanation: "/api/analyzer/explanations?modelId=model-1",
    });
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

    const result = await form.submit();
    const modelInput = (
      result as { raw: { results: Array<{ modelInput: Record<string, unknown> }> } }
    ).raw.results[0].modelInput;

    expect(Object.keys(modelInput)).toHaveLength(29);
    expect(modelInput).toMatchObject({
      feature_1: 1,
      feature_18: 18,
      category__1: 1,
      category__11: 0,
    });
    expect((result as { reports: Record<string, unknown> }).reports.report).toEqual({
      explanation: "/api/analyzer/explanations?modelId=model-1",
    });
  });
});

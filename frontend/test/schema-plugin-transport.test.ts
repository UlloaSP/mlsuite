/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { createSchemaRunRuntime } from "../src/app/utils/mlform/schema-run-runtime";
import { isSkippedSchemaReportPayload } from "../src/app/utils/mlform/schema-report-plugin-context";
import type { CatalogReportDefinition } from "../src/plugin/mlform/custom-report";

const crystalTreeDefinition = (): CatalogReportDefinition => ({
  id: "crystal-plugin",
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
        value: String((payload as { explanation?: string }).explanation ?? ""),
      }),
    },
  }),
});

const innerOnlyCrystalTreeDefinition = (): CatalogReportDefinition => {
  const definition = crystalTreeDefinition();
  return {
    ...definition,
    definition: {
      ...definition.definition,
      fetch: undefined,
    },
  };
};

describe("schema plugin transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches multi-model custom reports and keeps successful payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) {
          return new Response(JSON.stringify({ reports: {} }));
        }
        if (url.includes("modelId=model-1")) {
          return new Response(JSON.stringify({ explanation: "tree-1" }));
        }
        return new Response("unsupported", { status: 400 });
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "crystal_1",
            kind: "Crystal Tree",
            endpoint: "/api/analyzer/explanations",
            mappedTo: { "model-1": "crystal-tree" },
          },
          {
            id: "crystal_2",
            kind: "Crystal Tree",
            endpoint: "/api/analyzer/explanations",
            mappedTo: { "model-2": "crystal-tree" },
          },
        ],
      },
      bindings: [
        {
          modelId: "model-1",
        },
        {
          modelId: "model-2",
        },
      ],
      customReportDefinitions: [crystalTreeDefinition()],
    });

    const result = await runtime.transport.submit({
      values: { age: 42 },
      fieldValues: { age: 42 },
      serializedValues: { age: 42 },
      serializedFieldValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/predictions"))).toHaveLength(2);
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-2"))).toBe(
      true,
    );
    const reports = (result as { reports: Record<string, unknown> }).reports;
    expect(reports["crystal-1"]).toEqual({ explanation: "tree-1" });
    expect(isSkippedSchemaReportPayload(reports["crystal-2"])).toBe(true);
    const raw = (
      result as { raw: { results: Array<{ output: { reports?: Record<string, unknown> } }> } }
    ).raw;
    expect(raw.results[0]?.output.reports?.["crystal-tree"]).toEqual({ explanation: "tree-1" });
    expect(raw.results[1]?.output.reports).toEqual({});
  });

  test("skips mapped custom report when its model result failed before context exists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) {
          return new Response(JSON.stringify({ message: "prediction failed" }), { status: 400 });
        }
        return new Response(JSON.stringify({ explanation: "should-not-run" }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "3-5-crystal-tree",
            kind: "Crystal Tree",
            endpoint: "/api/analyzer/explanations",
            mappedTo: { "3": "crystal-tree" },
          },
        ],
      },
      bindings: [
        {
          modelId: "3",
        },
      ],
      customReportDefinitions: [crystalTreeDefinition()],
    });

    const result = await runtime.transport.submit({
      values: { age: 42 },
      fieldValues: { age: 42 },
      serializedValues: { age: 42 },
      serializedFieldValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);

    const reports = (result as { reports: Record<string, unknown> }).reports;
    expect(isSkippedSchemaReportPayload(reports["3-5-crystal-tree"])).toBe(true);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toHaveLength(0);
  });

  test("fetches mapped custom report even when binding policy lacks report kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanation: "tree" }));
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
        ],
      },
      bindings: [
        {
          modelId: "model-1",
          pluginPolicy: { reportKinds: ["classifier"] },
        },
      ],
      customReportDefinitions: [crystalTreeDefinition()],
    });

    const result = await runtime.transport.submit({
      values: { age: 42 },
      fieldValues: { age: 42 },
      serializedValues: { age: 42 },
      serializedFieldValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect((result as { reports: Record<string, unknown> }).reports.crystal).toEqual({
      explanation: "tree",
    });
  });

  test("prefetch uses inner mlform report fetch when top-level fetch is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanation: "inner" }));
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
        ],
      },
      bindings: [
        {
          modelId: "model-1",
        },
      ],
      customReportDefinitions: [innerOnlyCrystalTreeDefinition()],
    });

    const result = await runtime.transport.submit({
      values: { age: 42 },
      fieldValues: { age: 42 },
      serializedValues: { age: 42 },
      serializedFieldValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect((result as { reports: Record<string, unknown> }).reports.crystal).toEqual({
      explanation: "inner",
    });
  });
});

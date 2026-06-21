/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { createForm, executeFormPipeline } from "mlform/runtime";
import { z } from "zod";
import { createSchemaRunRuntime } from "../src/algorithms/schema/runtime-assembly";
import type { CatalogReportDefinition } from "../src/algorithms/plugin/custom-report-catalog";

const stringMeta = (value: unknown): string => (typeof value === "string" ? value : "");

const requestBody = (request: RequestInit | undefined): string =>
  typeof request?.body === "string" ? request.body : "";

const findReport = (reports: readonly unknown[], id: string) =>
  reports.find(
    (report): report is { id?: string; payload?: unknown } =>
      typeof report === "object" &&
      report !== null &&
      "id" in report &&
      (report as { id?: unknown }).id === id,
  );

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
    resolve: ({ report, result }) => findReport(result.reports, report.id)?.payload,
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: { meta?: Record<string, unknown> }) => {
        const modelId = stringMeta(request.meta?.modelId);
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

describe("schema plugin transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("fetches multi-model custom reports and keeps successful payloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) {
          return new Response(JSON.stringify({ reports: [] }));
        }
        if (url.includes("modelId=model-1")) {
          return new Response(JSON.stringify({ explanation: "tree-1" }));
        }
        return new Response("unsupported", { status: 400 });
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [
          {
            id: "age",
            label: "age",
            kind: "number",
            displayKey: "age",
            mappedTo: { "model-1": "age", "model-2": "years" },
          },
          {
            id: "rec",
            label: "rec",
            kind: "number",
            displayKey: "rec",
            mappedTo: { "model-1": "rec" },
          },
          {
            id: "don",
            label: "don",
            kind: "number",
            displayKey: "don",
            mappedTo: { "model-2": "don" },
          },
        ],
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

    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42, rec: 1, don: 2 });
    const result = await executeFormPipeline({ form });

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
    const urls = calls.map((call) => String(call[0]));
    expect(urls.filter((url) => url.includes("/predictions"))).toHaveLength(2);
    expect(urls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect(urls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-2"))).toBe(
      true,
    );
    const explanationBodies = calls
      .filter((call) => String(call[0]).includes("/api/analyzer/explanations"))
      .map((call) => JSON.parse(requestBody(call[1] as RequestInit | undefined)));
    expect(explanationBodies).toEqual([
      { instance: { age: 42, rec: 1 } },
      { instance: { years: 42, don: 2 } },
    ]);
    expect(result.reportFetchResults["crystal-1"]).toEqual({ explanation: "tree-1" });
    expect(result.reportFetchResults["crystal-2"]).toBeUndefined();
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
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
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

    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    const result = await executeFormPipeline({ form });

    expect(
      result.submitResult.reports.some(
        (report) =>
          typeof report === "object" &&
          report !== null &&
          "id" in report &&
          (report as { id?: unknown }).id === "3-5-crystal-tree",
      ),
    ).toBe(false);
    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toHaveLength(0);
  });

  test("fetches mapped custom report even when binding policy lacks report kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ explanation: "tree" }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
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

    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    const result = await executeFormPipeline({ form });

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect(result.reportFetchResults.crystal).toEqual({
      explanation: "tree",
    });
  });
});

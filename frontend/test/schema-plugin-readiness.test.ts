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

const stringMeta = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

const findReport = (reports: readonly unknown[], id: string) =>
  reports.find(
    (report): report is { id?: string; payload?: unknown } =>
      typeof report === "object" &&
      report !== null &&
      "id" in report &&
      (report as { id?: unknown }).id === id,
  );

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
    resolve: ({ report, result }) => findReport(result.reports, report.id)?.payload,
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: { meta?: Record<string, unknown> }) => {
        const modelId = stringMeta(request.meta?.modelId);
        const response = await fetch(`${config.endpoint}?modelId=${modelId}`, {
          method: "POST",
          body: JSON.stringify({ instance: request.meta?.backendFieldValues }),
        });
        return response.json();
      },
    }),
    render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
  }),
});

const submit = (runtime: ReturnType<typeof createSchemaRunRuntime>) => {
  const form = createForm({
    schema: runtime.formSchema,
    registry: runtime.registry,
    transport: runtime.transport,
  });
  form.setValues({ age: 42 });
  return executeFormPipeline({ form });
};

describe("schema plugin readiness failures", () => {
  afterEach(() => vi.restoreAllMocks());

  test("missing active catalog definition fails before submit", () => {
    expect(() =>
      createSchemaRunRuntime({
        schema: {
          fields: [],
          reports: [{ id: "crystal", kind: "Crystal Tree" }],
        },
        bindings: [],
        customReportDefinitions: [],
      }),
    ).toThrow('Custom report kind "Crystal Tree" does not exist in plugin catalog.');
  });

  test("schema without Crystal Tree report never calls explanations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ reports: [{ mappedTo: "risk", value: 1 }] })),
      ),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "risk",
            label: "Risk",
            kind: "classifier",
            mappedTo: { "model-1": "risk" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }],
      customReportDefinitions: [crystal()],
    });

    await submit(runtime);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/predictions"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toHaveLength(0);
  });

  test("custom report without mappedTo fails before submit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reports: [] }))),
    );
    expect(() =>
      createSchemaRunRuntime({
        schema: {
          fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
          reports: [{ id: "crystal", source: "crystal", kind: "Crystal Tree" }],
        },
        bindings: [{ modelId: "model-1" }],
        customReportDefinitions: [crystal()],
      }),
    ).toThrow("Schema report 1 falta mappedTo");
  });

  test("normalized report ids still map and call explanations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ reports: [{ explanation: "ok" }] }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "crystal_tree_1",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }],
      customReportDefinitions: [crystal()],
    });

    await submit(runtime);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
  });

  test("numeric backend ids still call explanations with string modelId", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ reports: [{ explanation: "ok" }] }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "crystal",
            kind: "Crystal Tree",
            mappedTo: { "1": "crystal" },
          },
        ],
      },
      bindings: [{ modelId: 1 } as never],
      customReportDefinitions: [crystal()],
    });

    await submit(runtime);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
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
        return response.json();
      },
    }),
    render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
  }),
});

const submit = (runtime: ReturnType<typeof createSchemaRunRuntime>) =>
  runtime.transport.submit({
    values: { age: 42 },
    fieldValues: { age: 42 },
    serializedValues: { age: 42 },
    serializedFieldValues: { age: 42 },
    reports: runtime.formSchema.reports,
  } as never);

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
      vi.fn(async () => new Response(JSON.stringify({ reports: { risk: { value: 1 } } }))),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [{ id: "risk", label: "Risk", kind: "classifier" }],
      },
      bindings: [
        {
          modelId: "model-1",
          signatureId: "sig-1",
          inputMapping: { age: "age" },
          outputMapping: { risk: "risk" },
        },
      ],
      customReportDefinitions: [crystal()],
    });

    await submit(runtime);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.filter((url) => url.includes("/predictions"))).toHaveLength(1);
    expect(calls.filter((url) => url.includes("/api/analyzer/explanations"))).toHaveLength(0);
  });

  test("custom report without outputMapping fails with unbound context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reports: {} }))),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [{ id: "crystal", source: "crystal", kind: "Crystal Tree" }],
      },
      bindings: [
        {
          modelId: "model-1",
          signatureId: "sig-1",
          inputMapping: { age: "age" },
          outputMapping: {},
        },
      ],
      customReportDefinitions: [crystal()],
    });

    await expect(submit(runtime)).rejects.toThrow(
      'Schema report "crystal" is not bound to a model context.',
    );
  });

  test("normalized report ids still map and call explanations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanations: ["ok"] }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [{ id: "crystal_tree_1", source: "crystal_tree_1", kind: "Crystal Tree" }],
      },
      bindings: [
        {
          modelId: "model-1",
          signatureId: "sig-1",
          inputMapping: { age: "age" },
          outputMapping: { crystal_tree_1: "crystal-tree" },
        },
      ],
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
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: {} }));
        return new Response(JSON.stringify({ explanations: ["ok"] }));
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [{ id: "crystal", source: "crystal", kind: "Crystal Tree" }],
      },
      bindings: [
        {
          modelId: 1,
          signatureId: 2,
          inputMapping: { age: "age" },
          outputMapping: { crystal: "crystal" },
        },
      ] as never,
      customReportDefinitions: [crystal()],
    });

    await submit(runtime);

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
  });
});

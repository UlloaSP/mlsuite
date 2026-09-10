/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { createForm, executeFormPipeline } from "mlform/runtime";
import { z } from "zod";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { buildSchemaRunRawFromSubmitResult } from "@/capabilities/prediction-runtime/mlform/schema-run-result-state";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";

const stringMeta = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const requestBody = (request: RequestInit | undefined): string =>
  typeof request?.body === "string" ? request.body : "";

const customReportDefinition = (): CatalogReportDefinition => ({
  id: "report-plugin",
  fileName: "report.ts",
  source: "",
  updatedAt: "",
  createdAt: "",
  contentType: "text/typescript",
  sizeBytes: 1,
  kind: "plugin-report",
  definition: defineReportKind({
    kind: "plugin-report",
    schema: z.object({
      id: z.string().optional(),
      source: z.string().optional(),
      label: z.string().optional(),
      kind: z.literal("plugin-report"),
      extra: z.string().optional(),
      feedbackQuestionnaire: z.unknown().optional(),
    }),
    resolve: ({ payload }) => payload,
    render: {
      content: ({ result }) => ({
        type: "text",
        value: stringMeta(
          (result?.meta as Record<string, unknown> | undefined)?.modelId,
          "missing",
        ),
      }),
    },
  }),
});

const explanationFetch = ({ config }: { config: { endpoint?: string } }) => ({
  submit: async (request: {
    reportContext?: {
      modelValues?: Record<string, unknown>;
      meta: Record<string, unknown>;
    };
  }) => {
    const modelId = stringMeta(request.reportContext?.meta.modelId);
    return fetch(`${config.endpoint ?? "/api/analyzer/explanations"}?modelId=${modelId}`, {
      method: "POST",
      body: JSON.stringify({
        instance: request.reportContext?.modelValues,
      }),
    }).then((response) => response.json());
  },
});

describe("schema binding plugin policy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("exposes a mapped report even when stale policy lacks its kind", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response(JSON.stringify({ reports: [{ mappedTo: "score", value: 1 }] })),
      ),
    );
    const transport = createSchemaRunTransport(
      [
        {
          modelId: "model-1",
          pluginPolicy: { reportKinds: ["other-report"] },
        },
      ],
      [],
    );

    const result = await transport.submit({
      inputs: [],
      displayValues: {},
      modelValues: {},
      reports: [
        {
          id: "report_1",
          label: "Score",
          kind: "plugin-report",
          mappedTo: { "model-1": "score" },
        },
      ],
    } as never);

    expect((result as { reports: unknown[] }).reports).toMatchObject([
      {
        backend: "model-1",
        mappedTo: "score",
        status: "ready",
        payload: { value: 1 },
      },
    ]);
  });

  test("schema report context maps schema report ids to model contexts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ reports: [{ mappedTo: "score", value: 1 }] })),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ reports: [{ mappedTo: "score", value: 2 }] })),
        ),
    );
    const transport = createSchemaRunTransport(
      [{ modelId: "model-1" }, { modelId: "model-2" }],
      [],
    );
    const result = await transport.submit({
      inputs: [],
      displayValues: {},
      modelValues: {},
      reports: [
        {
          id: "report_a",
          label: "A",
          kind: "plugin-report",
          mappedTo: { "model-1": "score" },
        },
        {
          id: "report_b",
          label: "B",
          kind: "plugin-report",
          mappedTo: { "model-2": "score" },
        },
      ],
    } as never);
    const reports = (result as { reports: Array<{ context?: { meta?: { modelId?: string } } }> })
      .reports;
    expect(reports[0]?.context?.meta?.modelId).toBe("model-1");
    expect(reports[1]?.context?.meta?.modelId).toBe("model-2");
  });

  test("schema report context exists when custom report payload must be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reports: [] }))),
    );
    const transport = createSchemaRunTransport([{ modelId: "model-1" }], []);
    const result = await transport.submit({
      inputs: [],
      displayValues: {},
      modelValues: {},
      reports: [
        {
          id: "report_1",
          label: "Score",
          kind: "plugin-report",
          mappedTo: { "model-1": "score" },
        },
      ],
    } as never);
    expect((result as { reports: unknown[] }).reports).toMatchObject([
      {
        backend: "model-1",
        mappedTo: "score",
        status: "pending",
        context: { meta: { modelId: "model-1" } },
      },
    ]);
  });

  test("registered schema report fetch handles real mlform request shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ reports: [] })))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ reports: [{ explanation: "root||leaf" }] })),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ reports: [{ explanation: "root||leaf" }] })),
        ),
    );
    const base = customReportDefinition();
    const fetchDefinition = {
      ...base,
      definition: {
        ...base.definition,
        fetch: explanationFetch,
        definition: {
          ...base.definition.definition,
          fetch: explanationFetch,
        },
      },
    };
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "crystal-schema",
            kind: "plugin-report",
            mappedTo: { "model-1": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }],
      customReportDefinitions: [fetchDefinition],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });
    await executeFormPipeline({ form });
    const explanationCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(String(explanationCall?.[0])).toContain("modelId=model-1");
    expect(JSON.parse(requestBody(explanationCall?.[1])).instance).toEqual({ age: 42 });
  });

  test("schema raw builder treats skipped as terminal", () => {
    const built = buildSchemaRunRawFromSubmitResult(
      { reports: [], results: [] },
      [{ id: "report_1", state: { status: "skipped" } }],
      {},
      [],
    );
    expect(built.raw.reports).toEqual([]);
    expect(built.reportsPending).toBe(false);
  });

  test("schema raw builder persists async plugin payload in owning result output", () => {
    const initialRaw = {
      reports: [],
      results: [
        {
          modelId: "model-1",
          output: { reports: [], meta: { modelId: "model-1" } },
        },
      ],
    };
    const built = buildSchemaRunRawFromSubmitResult(
      initialRaw,
      [
        {
          id: "report_1",
          mappedTo: { "model-1": "score" },
          state: { status: "ready", payload: { explanation: "ok" } },
        },
      ],
      {},
      [{ modelId: "model-1" }],
      {
        report_1: {
          reportId: "report_1",
          kind: "plugin-report",
          target: "score",
          backend: "model-1",
          displayValues: {},
          modelValues: {},
          reports: [],
          meta: { modelId: "model-1" },
          raw: {},
        },
      },
    );
    const raw = built.raw as {
      results: Array<{ output?: { reports: Array<Record<string, unknown>> } }>;
    };
    const output = raw.results[0]?.output;
    expect(output?.reports).toMatchObject([
      { id: "report_1", mappedTo: "score", payload: { explanation: "ok" } },
    ]);
    expect(built.raw.reports).toMatchObject([
      { id: "report_1", mappedTo: "score", payload: { explanation: "ok" } },
    ]);
    expect(built.reportsPending).toBe(false);
  });
});

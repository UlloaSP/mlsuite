/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { createForm, executeFormPipeline } from "mlform/runtime";
import { z } from "zod";
import { createSchemaRunTransport } from "../src/algorithms/schema/run-transport";
import { createSchemaRunRuntime } from "../src/algorithms/schema/runtime-assembly";
import { buildSchemaRunRawFromSubmitResult } from "../src/algorithms/mlform/schema-run-result-state";
import {
  isSkippedSchemaReportPayload,
  wrapSchemaReportDefinitions,
} from "../src/algorithms/schema/report-plugin-context";
import { readReportContext } from "../src/algorithms/mlform/schema-run-report-mapping";
import type { CatalogReportDefinition } from "../src/algorithms/plugin/custom-report-catalog";

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
        value: String((result?.meta as Record<string, unknown> | undefined)?.modelId ?? "missing"),
      }),
    },
  }),
});

const explanationFetch = ({ config }: { config: { endpoint?: string } }) => ({
  submit: async (request: {
    meta?: Record<string, unknown>;
    serializedFieldValues?: Record<string, unknown>;
  }) => {
    const modelId = String(request.meta?.modelId ?? "");
    return fetch(`${config.endpoint ?? "/api/analyzer/explanations"}?modelId=${modelId}`, {
      method: "POST",
      body: JSON.stringify({
        instance: request.meta?.backendFieldValues ?? request.serializedFieldValues,
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
      vi.fn(async () => new Response(JSON.stringify({ reports: { score: { value: 1 } } }))),
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
      serializedValues: {},
      reports: [
        {
          id: "report_1",
          label: "Score",
          kind: "plugin-report",
          mappedTo: { "model-1": "score" },
        },
      ],
    } as never);

    expect((result as { reports: Record<string, unknown> }).reports).toMatchObject({
      "report-1": { value: 1 },
      report_1: { value: 1 },
      score: { value: 1 },
    });
  });

  test("schema report context maps schema report ids to model contexts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ reports: { score: { value: 1 } } })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ reports: { score: { value: 2 } } }))),
    );
    const transport = createSchemaRunTransport(
      [{ modelId: "model-1" }, { modelId: "model-2" }],
      [],
    );
    const result = await transport.submit({
      serializedValues: {},
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
    const context = (result as { raw: { reportContextById: Record<string, { modelId: string }> } })
      .raw.reportContextById;
    expect(readReportContext(context, "report_a")?.modelId).toBe("model-1");
    expect(readReportContext(context, "report_b")?.modelId).toBe("model-2");
  });

  test("schema report context exists when custom report payload must be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ reports: {} }))),
    );
    const transport = createSchemaRunTransport([{ modelId: "model-1" }], []);
    const result = await transport.submit({
      serializedValues: {},
      reports: [
        {
          id: "report_1",
          label: "Score",
          kind: "plugin-report",
          mappedTo: { "model-1": "score" },
        },
      ],
    } as never);
    const raw = (result as { raw: { reportContextById: Record<string, { modelId: string }> } }).raw;
    expect((result as { reports: Record<string, unknown> }).reports).toEqual({});
    expect(readReportContext(raw.reportContextById, "report_1")?.modelId).toBe("model-1");
  });

  test("registered schema report fetch handles real mlform request shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ reports: {} })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ explanations: ["root||leaf"] })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ explanations: ["root||leaf"] }))),
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
        fields: [{ id: "age", label: "age", kind: "number", mappedTo: "age" }],
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
    expect(JSON.parse(String(explanationCall?.[1]?.body)).instance).toEqual({ age: 42 });
  });

  test("wrapped custom report fetch exposes missing context errors", async () => {
    const definition = {
      ...customReportDefinition(),
      definition: {
        ...customReportDefinition().definition,
        fetch: () => ({
          submit: async () => {
            throw new Error("unsupported");
          },
        }),
      },
    };
    const [wrapped] = wrapSchemaReportDefinitions([definition]);
    const fetcher = wrapped?.definition.definition.fetch?.({ reportId: "report_1" } as never);
    await expect(
      fetcher?.submit({ meta: {}, raw: { reportContextById: { report_1: {} } } } as never),
    ).rejects.toThrow("unsupported");
  });

  test("schema raw builder ignores skipped custom report payloads", () => {
    const payload = { __mlsuiteSchemaReportSkipped: true };
    const built = buildSchemaRunRawFromSubmitResult(
      { reports: {}, results: [], reportContextById: { report_1: {} } },
      [{ id: "report_1", state: { status: "ready", payload } }],
      {},
      [],
    );
    expect(isSkippedSchemaReportPayload(payload)).toBe(true);
    expect(built.raw.reports).toEqual({});
    expect(built.reportsPending).toBe(false);
  });

  test("schema raw builder persists async plugin payload in owning result output", () => {
    const initialRaw = {
      reports: {},
      results: [
        {
          modelId: "model-1",
          output: { reports: {}, meta: { modelId: "model-1" } },
        },
      ],
      reportContextById: {
        report_1: {
          modelId: "model-1",
          modelInput: {},
          meta: {},
          raw: {},
        },
      },
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
    );
    const output = built.raw.results[0]?.output as { reports: Record<string, unknown> };
    expect(output.reports.score).toEqual({ explanation: "ok" });
    expect(output.reports["report-1"]).toEqual({ explanation: "ok" });
    expect(output.reports.report_1).toEqual({ explanation: "ok" });
    expect(built.raw.reports).toMatchObject({
      "report-1": { explanation: "ok" },
      report_1: { explanation: "ok" },
      score: { explanation: "ok" },
    });
    expect(built.reportsPending).toBe(false);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { createReportFetchRequest } from "mlform/schema";
import { z } from "zod";
import { createSchemaRunTransport } from "../src/app/utils/mlform/schema-run-transport";
import { createSchemaRunRuntime } from "../src/app/utils/mlform/schema-run-runtime";
import { buildSchemaRunRawFromSubmitResult } from "../src/app/utils/mlform/schema-run-result-state";
import {
  isSkippedSchemaReportPayload,
  patchSchemaReportRequest,
  wrapSchemaReportDefinitions,
} from "../src/app/utils/mlform/schema-report-plugin-context";
import { readReportContext } from "../src/app/utils/mlform/schema-run-report-mapping";
import { composeSchemaVersion } from "../src/schemas/schema-composer";
import type { SignatureDto } from "../src/models/api/modelService";
import type { CatalogReportDefinition } from "../src/plugin/mlform/custom-report";

const signature = (inputSignature: unknown): SignatureDto => ({
  id: "signature-1",
  modelId: "model-1",
  name: "v1",
  inputSignature,
  major: 1,
  minor: 0,
  patch: 0,
  createdAt: "2026-06-02T00:00:00Z",
});

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
          signatureId: "signature-1",
          outputMapping: { report_1: "score" },
          pluginPolicy: { reportKinds: ["other-report"] },
        },
      ],
      [],
    );

    const result = await transport.submit({
      serializedValues: {},
      reports: [{ id: "report_1", label: "Score", kind: "plugin-report", source: "report_1" }],
    } as never);

    expect((result as { reports: Record<string, unknown> }).reports).toEqual({
      "report-1": { value: 1 },
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
      [
        { modelId: "model-1", signatureId: "signature-1", outputMapping: { report_a: "score" } },
        { modelId: "model-2", signatureId: "signature-2", outputMapping: { report_b: "score" } },
      ],
      [],
    );
    const result = await transport.submit({
      serializedValues: {},
      reports: [
        { id: "report_a", label: "A", kind: "plugin-report", source: "report_a" },
        { id: "report_b", label: "B", kind: "plugin-report", source: "report_b" },
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
    const transport = createSchemaRunTransport(
      [{ modelId: "model-1", signatureId: "signature-1", outputMapping: { report_1: "score" } }],
      [],
    );
    const result = await transport.submit({
      serializedValues: {},
      reports: [{ id: "report_1", label: "Score", kind: "plugin-report", source: "report_1" }],
    } as never);
    const raw = (result as { raw: { reportContextById: Record<string, { modelId: string }> } }).raw;
    expect((result as { reports: Record<string, unknown> }).reports).toEqual({});
    expect(readReportContext(raw.reportContextById, "report_1")?.modelId).toBe("model-1");
  });

  test("schema report fetch request is patched with selected model context", () => {
    const request = patchSchemaReportRequest(
      {
        meta: { schemaRun: true },
        raw: {
          reportContextById: {
            report_a: {
              modelId: "model-1",
              modelInput: { age: 40 },
              meta: { backendUrl: "/api", backendFieldValues: { age: 40 } },
              raw: { reports: {} },
            },
          },
        },
      },
      "report_a",
    );
    expect(request.meta.modelId).toBe("model-1");
    expect(request.meta.backendFieldValues).toEqual({ age: 40 });
    expect(request.serializedFieldValues).toEqual({ age: 40 });
  });

  test("wrapped custom report fetch receives model patched request", async () => {
    let receivedModelId: unknown;
    const definition = {
      ...customReportDefinition(),
      definition: {
        ...customReportDefinition().definition,
        fetch: () => ({
          submit: async (request: { meta?: Record<string, unknown> }) => {
            receivedModelId = request.meta?.modelId;
            return { ok: true };
          },
        }),
      },
    };
    const [wrapped] = wrapSchemaReportDefinitions([definition]);
    const fetcher = wrapped?.definition.definition.fetch?.({ reportId: "report_a" } as never);
    await fetcher?.submit({
      meta: {},
      raw: {
        reportContextById: {
          report_a: { modelId: "model-1", meta: {}, modelInput: {}, raw: {} },
        },
      },
    } as never);
    expect(receivedModelId).toBe("model-1");
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
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [{ id: "crystal-schema", source: "crystal-schema", kind: "plugin-report" }],
      },
      bindings: [
        {
          modelId: "model-1",
          signatureId: "signature-1",
          inputMapping: { age: "age" },
          outputMapping: { "crystal-schema": "crystal-tree" },
        },
      ],
      customReportDefinitions: [fetchDefinition],
    });
    const submitResult = await runtime.transport.submit({
      serializedValues: { age: 42 },
      reports: runtime.formSchema.reports,
    } as never);
    const report = runtime.registry.getReport("plugin-report");
    const fetcher = report?.fetch?.({
      config: runtime.formSchema.reports[0],
      reportId: "crystal-schema",
    });
    await fetcher?.submit(
      createReportFetchRequest(submitResult as never, { reportId: "crystal-schema" }),
    );
    const explanationCall = (fetch as ReturnType<typeof vi.fn>).mock.calls[2];
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
          signatureId: "signature-1",
          output: { reports: {}, meta: { modelId: "model-1" } },
        },
      ],
      reportContextById: {
        report_1: {
          modelId: "model-1",
          signatureId: "signature-1",
          modelInput: {},
          meta: {},
          raw: {},
        },
      },
    };
    const built = buildSchemaRunRawFromSubmitResult(
      initialRaw,
      [{ id: "report_1", state: { status: "ready", payload: { explanation: "ok" } } }],
      {},
      [{ modelId: "model-1", signatureId: "signature-1", outputMapping: { report_1: "score" } }],
    );
    const output = built.raw.results[0]?.output as { reports: Record<string, unknown> };
    expect(output.reports.score).toEqual({ explanation: "ok" });
    expect(built.reportsPending).toBe(false);
  });
});

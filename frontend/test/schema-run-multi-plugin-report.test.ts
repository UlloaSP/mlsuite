/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { mountSchemaRunForm } from "../src/app/utils/mlform/schema-run-mount";
import type { CatalogReportDefinition } from "../src/algorithms/plugin/custom-report-catalog";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const crystal = (): CatalogReportDefinition => ({
  id: "crystal-tree",
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
      label: z.string().optional(),
      kind: z.literal("Crystal Tree"),
      endpoint: z.string().default("/api/analyzer/explanations"),
    }),
    payloadSchema: z.object({ explanation: z.string() }),
    resolve: ({ report, result }) =>
      result.reports.find(
        (value): value is { id: string; payload: unknown } =>
          typeof value === "object" &&
          value !== null &&
          "id" in value &&
          (value as { id?: unknown }).id === report.id,
      )?.payload,
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: { meta?: Record<string, unknown> }) => {
        const modelId = String(request.meta?.modelId ?? "");
        const response = await fetch(`${config.endpoint}?modelId=${modelId}`, { method: "POST" });
        return response.json();
      },
    }),
    render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
  }),
});

describe("schema run multi-model plugin reports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("expands one plugin report mapped to several models before modal persistence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ explanation: url }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountSchemaRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
        reports: [
          {
            id: "crystal",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree", "model-2": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }, { modelId: "model-2" }],
      theme: "light",
      customReportDefinitions: [crystal()],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    expect(mounted.form.reports.map((report) => report.id)).toEqual([
      "crystal-model-1",
      "crystal-model-2",
    ]);
    mounted.form.setValues({ age: 42 });
    container
      .querySelector("mlf-form")
      ?.shadowRoot?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    const results = updates.at(-1)?.raw.results as Array<{ output: { reports: unknown[] } }>;
    expect(updates.at(-1)?.pending).toBe(false);
    expect(results.map((result) => result.output.reports.length)).toEqual([1, 1]);
    mounted.unmount();
  });
});

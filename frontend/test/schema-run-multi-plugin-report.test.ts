/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/view";
import { z } from "zod";
import { mountSchemaRunForm } from "@/capabilities/prediction-runtime/mlform/schema-run-mount";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { RUN_TARGET, workspacePrediction, predictionRequest } from "./support/api-fixtures";

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
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: { reportContext?: { meta: Record<string, unknown> } }) => {
        const rawModelId = request.reportContext?.meta.modelId;
        const modelId = typeof rawModelId === "string" ? rawModelId : "";
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

  test("shows each model's server explanation for one plugin report mapped to several", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!url.includes("/predictions")) throw new Error(`unexpected ${url}`);
        const { modelId } = predictionRequest(init);
        return workspacePrediction(init, [
          {
            id: "crystal",
            kind: "Crystal Tree",
            mappedTo: "crystal-tree",
            explanation: `tree ${modelId}`,
          },
        ]);
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountSchemaRunForm({
      target: RUN_TARGET,
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "crystal",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree", "model-2": "crystal-tree" },
          },
        ],
      },
      bindings: [
        { modelId: 1, modelName: "model-1" },
        { modelId: 2, modelName: "model-2" },
      ],
      theme: "light",
      customReportDefinitions: [crystal()],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    expect(mounted.form.reports.map((report) => report.id)).toEqual(["crystal-1", "crystal-2"]);
    mounted.form.setValues({ age: 42 });
    container
      .querySelector("mlf-kit-tabs")
      ?.shadowRoot?.querySelector<HTMLButtonElement>(".btn-submit")
      ?.click();
    await flush();
    await flush();

    const results = updates.at(-1)?.raw.results as Array<{ output: { reports: unknown[] } }>;
    expect(updates.at(-1)?.pending).toBe(false);
    expect(results.map((result) => result.output.reports.length)).toEqual([1, 1]);
    expect(mounted.form.state.reportStates).toMatchObject({
      "crystal-1": { status: "ready", payload: { explanation: "tree 1" } },
      "crystal-2": { status: "ready", payload: { explanation: "tree 2" } },
    });
    mounted.unmount();
  });
});

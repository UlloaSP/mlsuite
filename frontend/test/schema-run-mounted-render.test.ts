/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/view";
import { z } from "zod";
import { mountRunForm } from "./support/schema-run-runtime";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { workspacePrediction } from "./support/api-fixtures";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const crystal = (fileName = "crystal.ts"): CatalogReportDefinition => ({
  fileName,
  source: "",
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
      submit: async (request: {
        reportContext?: { modelValues?: Record<string, unknown>; meta: Record<string, unknown> };
      }) => {
        if (typeof request.reportContext?.meta.modelId !== "string") {
          throw new Error("Missing modelId in report fetch meta.");
        }
        const modelId = request.reportContext.meta.modelId;
        const response = await fetch(`${config.endpoint}?modelId=${modelId}`, {
          method: "POST",
          body: JSON.stringify({ instance: request.reportContext.modelValues }),
        });
        return response.json();
      },
    }),
    render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
  }),
});

describe("schema run mounted render", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("renders fields before reports and emits display inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        workspacePrediction(init, [{ mappedTo: "prediction", value: 1 }]),
      ),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const submitted: Record<string, unknown>[] = [];
    const mounted = mountRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [{ id: "prediction", kind: "regressor", mappedTo: "prediction" }],
      },
      bindings: [{ modelId: 1, modelName: "model-1" }],
      theme: "light",
      onSubmit(inputData) {
        submitted.push(inputData);
      },
    });

    await flush();
    const root = container.querySelector("mlf-kit-tabs")?.shadowRoot;
    expect(root?.querySelectorAll("mlf-field-frame")).toHaveLength(1);

    mounted.form.setValues({ age: 42 });
    root?.querySelector<HTMLButtonElement>(".btn-submit")?.click();
    await flush();
    await flush();

    expect(root?.querySelectorAll("mlf-report-frame")).toHaveLength(1);
    expect(submitted[0]).toEqual({ age: 42 });
    mounted.unmount();
  });

  test("renders direct-target reports when binding model name is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        workspacePrediction(init, [
          { mappedTo: "predicted", prediction: "0", probabilities: [0.25, 0.75] },
        ]),
      ),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [{ id: "report-2", kind: "classifier", mappedTo: "predicted" }],
      },
      bindings: [{ modelId: 1 } as never],
      theme: "light",
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-kit-tabs")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root?.querySelector<HTMLButtonElement>(".btn-submit")?.click();
    await flush();
    await flush();

    expect(updates.at(-1)?.pending).toBe(false);
    expect(updates.at(-1)?.raw.reports).toMatchObject([
      {
        mappedTo: "predicted",
        status: "ready",
        payload: { prediction: "0", probabilities: [0.25, 0.75] },
      },
    ]);
    mounted.unmount();
  });

  test("mounted submit fetches schema plugin reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/predictions")) return workspacePrediction(init);
        return new Response(JSON.stringify({ explanation: "ok" }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [{ id: "crystal", kind: "Crystal Tree", mappedTo: { "model-1": "crystal-tree" } }],
      },
      bindings: [{ modelId: 1, modelName: "model-1" }],
      theme: "light",
      customReportDefinitions: [crystal()],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-kit-tabs")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root?.querySelector<HTMLButtonElement>(".btn-submit")?.click();
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
    expect(updates.at(-1)?.pending).toBe(false);
    // The browser's payload is only shown: the run keeps the server's result as sealed.
    expect(mounted.form.state.reportStates).toMatchObject({
      crystal: { status: "ready", payload: { explanation: "ok" } },
    });
    expect(updates.at(-1)?.raw.results).toEqual([
      expect.objectContaining({
        modelId: 1,
        attestation: "seal-1",
        output: expect.objectContaining({ reports: [] }),
      }),
    ]);
    mounted.unmount();
  });

  test("mounted submit fetches Crystal Tree when schema report id differs from plugin id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/predictions")) return workspacePrediction(init);
        return new Response(JSON.stringify({ explanation: "ok" }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "report-2",
            label: "Report 2",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: 1, modelName: "model-1" }],
      theme: "light",
      customReportDefinitions: [crystal("crystal-tree")],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-kit-tabs")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root?.querySelector<HTMLButtonElement>(".btn-submit")?.click();
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
    expect(updates.at(-1)?.pending).toBe(false);
    // The browser's payload is only shown: the run keeps the server's result as sealed.
    expect(mounted.form.state.reportStates).toMatchObject({
      "report-2": { status: "ready", payload: { explanation: "ok" } },
    });
    expect(updates.at(-1)?.raw.results).toEqual([
      expect.objectContaining({
        modelId: 1,
        attestation: "seal-1",
        output: expect.objectContaining({ reports: [] }),
      }),
    ]);
    mounted.unmount();
  });

  test("mounted submit passes numeric backend model ids to strict plugins as strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("/predictions")) return workspacePrediction(init);
        return new Response(JSON.stringify({ explanation: "ok" }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountRunForm({
      container,
      schema: {
        fields: [
          { id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: { 1: "age" } },
        ],
        reports: [{ id: "crystal", kind: "Crystal Tree", mappedTo: { 1: "crystal-tree" } }],
      },
      bindings: [{ modelId: 1 } as never],
      theme: "light",
      customReportDefinitions: [crystal("crystal-tree")],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-kit-tabs")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root?.querySelector<HTMLButtonElement>(".btn-submit")?.click();
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
    expect(updates.at(-1)?.pending).toBe(false);
    mounted.unmount();
  });
});

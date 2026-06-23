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

const crystal = (id = "crystal"): CatalogReportDefinition => ({
  id,
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
    resolve: ({ report, result }) => {
      const item = result.reports.find(
        (value): value is Record<string, unknown> =>
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value) &&
          value.id === report.id,
      );
      return item && "payload" in item ? item.payload : item;
    },
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: { meta?: Record<string, unknown> }) => {
        if (typeof request.meta?.modelId !== "string") {
          throw new Error("Missing modelId in report fetch meta.");
        }
        const modelId = request.meta.modelId;
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

describe("schema run mounted render", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("renders fields before reports and emits display inputs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ reports: [{ mappedTo: "prediction", value: 1 }] })),
      ),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const submitted: Record<string, unknown>[] = [];
    const mounted = mountSchemaRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
        reports: [{ id: "prediction", kind: "regressor", mappedTo: "prediction" }],
      },
      bindings: [{ modelId: "model-1" }],
      theme: "light",
      onSubmit(inputData) {
        submitted.push(inputData);
      },
    });

    await flush();
    const root = container.querySelector("mlf-form")?.shadowRoot;
    expect(root?.querySelectorAll("mlf-field-frame")).toHaveLength(1);

    mounted.form.setValues({ age: 42 });
    root
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    expect(root?.querySelectorAll("mlf-report-frame")).toHaveLength(1);
    expect(submitted[0]).toEqual({ Age: 42 });
    mounted.unmount();
  });

  test("renders direct-target reports when binding model name is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              reports: [{ mappedTo: "predicted", prediction: "0", probabilities: [0.25, 0.75] }],
            }),
          ),
      ),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountSchemaRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
        reports: [{ id: "report-2", kind: "classifier", mappedTo: "predicted" }],
      },
      bindings: [{ modelId: 1 } as never],
      theme: "light",
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-form")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    expect(updates.at(-1)?.pending).toBe(false);
    expect(updates.at(-1)?.raw.reports).toMatchObject([
      { mappedTo: "predicted", prediction: "0", probabilities: [0.25, 0.75] },
    ]);
    mounted.unmount();
  });

  test("mounted submit fetches schema plugin reports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ explanation: "ok" }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountSchemaRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
        reports: [{ id: "crystal", kind: "Crystal Tree", mappedTo: { "model-1": "crystal-tree" } }],
      },
      bindings: [{ modelId: "model-1" }],
      theme: "light",
      customReportDefinitions: [crystal()],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-form")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect(updates.at(-1)?.pending).toBe(false);
    expect(updates.at(-1)?.raw.reports).toMatchObject([
      { id: "crystal", mappedTo: "crystal-tree", payload: { explanation: "ok" } },
    ]);
    mounted.unmount();
  });

  test("mounted submit fetches Crystal Tree when schema report id differs from plugin id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ explanation: "ok" }));
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
            id: "report-2",
            label: "Report 2",
            kind: "Crystal Tree",
            mappedTo: { "model-1": "crystal-tree" },
          },
        ],
      },
      bindings: [{ modelId: "model-1" }],
      theme: "light",
      customReportDefinitions: [crystal("crystal-tree")],
      onSubmit(_inputData, raw, reportsPending) {
        updates.push({ raw, pending: reportsPending });
      },
    });

    await flush();
    const root = container.querySelector("mlf-form")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=model-1"))).toBe(
      true,
    );
    expect(updates.at(-1)?.pending).toBe(false);
    expect(updates.at(-1)?.raw.reports).toMatchObject([
      { id: "report-2", mappedTo: "crystal-tree", payload: { explanation: "ok" } },
    ]);
    mounted.unmount();
  });

  test("mounted submit passes numeric backend model ids to strict plugins as strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/predictions")) return new Response(JSON.stringify({ reports: [] }));
        return new Response(JSON.stringify({ explanation: "ok" }));
      }),
    );
    const container = document.createElement("div");
    document.body.append(container);
    const updates: Array<{ raw: Record<string, unknown>; pending: boolean }> = [];
    const mounted = mountSchemaRunForm({
      container,
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: { 1: "age" } }],
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
    const root = container.querySelector("mlf-form")?.shadowRoot;
    mounted.form.setValues({ age: 42 });
    root
      ?.querySelector("mlf-submit-button")
      ?.dispatchEvent(new CustomEvent("mlf-submit-request", { bubbles: true, composed: true }));
    await flush();
    await flush();

    const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/api/analyzer/explanations?modelId=1"))).toBe(true);
    expect(updates.at(-1)?.pending).toBe(false);
    mounted.unmount();
  });
});

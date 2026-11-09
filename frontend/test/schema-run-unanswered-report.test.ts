/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/view";
import { z } from "zod";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { mountRunForm } from "./support/schema-run-runtime";
import { workspacePrediction } from "./support/api-fixtures";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A plugin report that only shows what the server stored: it fetches nothing itself. */
const note: CatalogReportDefinition = {
  fileName: "note.ts",
  source: "",
  kind: "note",
  definition: defineReportKind({
    kind: "note",
    schema: z.object({
      id: z.string().optional(),
      label: z.string().optional(),
      kind: z.literal("note"),
    }),
    render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
  }),
};

const runOnce = async (reports: readonly unknown[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => workspacePrediction(init, reports)),
  );
  const container = document.createElement("div");
  document.body.append(container);
  const settled: boolean[] = [];
  const updates: boolean[] = [];
  const mounted = mountRunForm({
    container,
    schema: {
      fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
      reports: [
        { id: "score", label: "Score", kind: "regressor", mappedTo: { risk: 0 } },
        { id: "note", label: "Note", kind: "note", mappedTo: { risk: 0 } },
      ],
    },
    bindings: [{ modelId: 1, modelName: "risk" }],
    theme: "light",
    customReportDefinitions: [note],
    onSubmit: (_inputData, _raw, reportsPending) => settled.push(reportsPending),
    onResultUpdate: (_inputData, _raw, reportsPending) => updates.push(reportsPending),
  });
  await flush();
  mounted.form.setValues({ age: 52 });
  container
    .querySelector("mlf-kit-tabs")
    ?.shadowRoot?.querySelector<HTMLButtonElement>(".btn-submit")
    ?.click();
  await flush();
  await flush();
  return { mounted, settled, updates };
};

describe("a report the server answered nothing for", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  test("settles the run as not produced when no plugin can fetch it", async () => {
    const { mounted, settled, updates } = await runOnce([
      { id: "score", kind: "regressor", mappedTo: "0", values: [41.5] },
    ]);

    expect(settled).toEqual([false]);
    expect(updates.at(-1)).toBe(false);
    expect(mounted.form.state.reportStates).toMatchObject({
      score: { status: "ready" },
      note: { status: "skipped" },
    });
    mounted.unmount();
  });

  test("shows the plugin's stored answer when the server has one", async () => {
    const { mounted, settled } = await runOnce([
      { id: "score", kind: "regressor", mappedTo: "0", values: [41.5] },
      { id: "note", kind: "note", mappedTo: "0", text: "checked" },
    ]);

    expect(settled).toEqual([false]);
    expect(mounted.form.state.reportStates).toMatchObject({
      note: { status: "ready", payload: { text: "checked" } },
    });
    mounted.unmount();
  });
});

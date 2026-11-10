/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createForm, executeFormPipeline } from "mlform/runtime";
import { resolveMappedReportPayload } from "mlform/schema";
import { defineReportKind } from "mlform/view";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { z } from "zod";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { schemaRunRuntime } from "./support/schema-run-runtime";
import { workspacePrediction, predictionRequest } from "./support/api-fixtures";

describe("schema run report regressions", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("keeps model report payloads distinct when mappedTo labels collide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!url.includes("/predictions")) throw new Error(`unexpected ${url}`);
        const { modelId } = predictionRequest(init);
        const id = modelId === 1 ? "classifier-a" : "classifier-b";
        return workspacePrediction(init, [
          { id, kind: "classifier", mappedTo: "classifier9", prediction: String(modelId) },
        ]);
      }),
    );
    const runtime = schemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          {
            id: "classifier-a",
            label: "First label",
            kind: "classifier",
            mappedTo: { "model-1": "classifier9" },
          },
          {
            id: "classifier-b",
            label: "Any other label",
            kind: "classifier",
            mappedTo: { "model-2": "classifier9" },
          },
        ],
      },
      bindings: [
        { modelId: 1, modelName: "model-1" },
        { modelId: 2, modelName: "model-2" },
      ],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });

    const result = await executeFormPipeline({ form });

    expect(result.submitResult.reports).toHaveLength(2);
    const payloads = result.submitResult.reports;
    expect(payloads.map(({ backend, mappedTo }) => [backend, mappedTo])).toEqual([
      ["model-1", "classifier9"],
      ["model-2", "classifier9"],
    ]);
    const reportConfigs = runtime.formSchema.reports as Array<
      Parameters<typeof resolveMappedReportPayload>[0]
    >;
    expect(
      reportConfigs.map((report) => resolveMappedReportPayload(report, result.submitResult)),
    ).toEqual([{ prediction: "1" }, { prediction: "2" }]);
    expect(
      (
        result.submitResult.raw as { results: Array<{ output: { reports: unknown[] } }> }
      ).results.map((item) => item.output.reports),
    ).toEqual([
      [{ id: "classifier-a", kind: "classifier", mappedTo: "classifier9", prediction: "1" }],
      [{ id: "classifier-b", kind: "classifier", mappedTo: "classifier9", prediction: "2" }],
    ]);
  });

  test("gives a class and its explanation on one model output each its own result", async () => {
    // As the API answers: the runtime's reports, then one copy per form report, both on output 0.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) =>
        workspacePrediction(init, [
          { kind: "classifier", output: 0, mapping: ["high", "low"], prediction: "low" },
          { kind: "Crystal Tree", explanation: "age > 50" },
          { id: "Predicted class", kind: "classifier", mappedTo: "0", labels: ["high", "low"] },
          { id: "Why", kind: "Crystal Tree", mappedTo: "0", explanation: "age > 50" },
        ]),
      ),
    );
    const explanation: CatalogReportDefinition = {
      fileName: "crystal.ts",
      source: "",
      kind: "Crystal Tree",
      definition: defineReportKind({
        kind: "Crystal Tree",
        schema: z.object({
          id: z.string().optional(),
          label: z.string().optional(),
          kind: z.literal("Crystal Tree"),
        }),
        render: { content: ({ payload }) => ({ type: "text", value: String(payload) }) },
      }),
    };
    const runtime = schemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", displayKey: "age", mappedTo: "age" }],
        reports: [
          { label: "Predicted class", kind: "classifier", mappedTo: { risk: 0 } },
          { label: "Why", kind: "Crystal Tree", mappedTo: { risk: 0 } },
        ],
      },
      bindings: [{ modelId: 1, modelName: "risk" }],
      customReportDefinitions: [explanation],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 52 });

    const { submitResult } = await executeFormPipeline({ form });

    const reports = runtime.formSchema.reports as Array<
      Parameters<typeof resolveMappedReportPayload>[0]
    >;
    expect(reports.map((report) => resolveMappedReportPayload(report, submitResult))).toEqual([
      { labels: ["high", "low"] },
      { explanation: "age > 50" },
    ]);
  });
});

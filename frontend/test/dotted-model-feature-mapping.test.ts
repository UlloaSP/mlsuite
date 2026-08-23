/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { afterEach, expect, test, vi } from "vite-plus/test";
import { defineReportKind } from "mlform/kit";
import { createForm, executeFormPipeline } from "mlform/runtime";
import { z } from "zod";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import type { CatalogReportDefinition } from "@/capabilities/prediction-runtime/plugins/custom-report-catalog";

const crystalReport: CatalogReportDefinition = {
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
    schema: z.object({ kind: z.literal("Crystal Tree"), endpoint: z.string() }),
    payloadSchema: z.object({ explanation: z.string() }),
    fetch: ({ config }: { config: { endpoint: string } }) => ({
      submit: async (request: {
        reportContext?: { modelValues?: Record<string, unknown>; meta: Record<string, unknown> };
      }) => {
        const response = await fetch(config.endpoint, {
          method: "POST",
          body: JSON.stringify({ instance: request.reportContext?.modelValues }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
      },
    }),
    render: {
      content: ({ payload }) => ({
        type: "text",
        value: String((payload as { explanation?: string }).explanation ?? ""),
      }),
    },
  }),
};

afterEach(() => vi.restoreAllMocks());

test("prefers an exact literal feature over its dotted path", () => {
  const result = applySchemaRunInputMapping({ "feature.value": 7, feature: { value: 3 } }, [
    { id: "feature", kind: "number", mappedTo: "feature.value" },
  ] as never);

  expect(result).toEqual({ "feature.value": 7 });
});

test("keeps dotted model feature names literal in prediction and explanation payloads", async () => {
  let predictionInput: Record<string, unknown> | undefined;
  let explanationInput: Record<string, unknown> | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/predictions")) {
        const data = init?.body instanceof FormData ? init.body.get("data") : null;
        predictionInput = JSON.parse(data instanceof File ? await data.text() : "{}") as Record<
          string,
          unknown
        >;
        return new Response(JSON.stringify({ reports: [] }));
      }
      const bodyText = typeof init?.body === "string" ? init.body : "{}";
      const body = JSON.parse(bodyText) as { instance: Record<string, unknown> };
      explanationInput = body.instance;
      return new Response(JSON.stringify({ explanation: "ok" }));
    }),
  );
  const runtime = createSchemaRunRuntime({
    schema: {
      fields: [
        {
          id: "rec_vhc",
          label: "VHC",
          displayKey: "rec_vhc",
          kind: "onehot-category",
          options: [
            { label: "No", value: "0.0", mappedTo: { Tree: "rec_vhc__0.0" } },
            { label: "Sí", value: "1.0", mappedTo: { Tree: "rec_vhc__1.0" } },
          ],
        },
      ],
      reports: [
        {
          id: "crystal",
          label: "CTREE",
          kind: "Crystal Tree",
          endpoint: "/api/analyzer/explanations?modelId=3",
          mappedTo: { Tree: "crystal-tree" },
        },
      ],
    },
    bindings: [{ modelId: "3", modelName: "Tree" }],
    customReportDefinitions: [crystalReport],
  });
  const form = createForm({
    schema: runtime.formSchema,
    registry: runtime.registry,
    transport: runtime.transport,
  });
  form.setValues({ "rec-vhc": "1.0" });

  await executeFormPipeline({ form });

  const expected = { "rec_vhc__0.0": 0, "rec_vhc__1.0": 1 };
  expect(predictionInput).toEqual(expected);
  expect(explanationInput).toEqual(expected);
});

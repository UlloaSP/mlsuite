/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createForm, executeFormPipeline } from "mlform/runtime";
import { resolveMappedReportPayload } from "mlform/schema";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunRuntime } from "@/capabilities/mlform/runtime-assembly";
import {
  buildSchemaRunRawFromSubmitResult,
  mergeReportFetchResults,
} from "@/capabilities/mlform/schema-run-result-state";

describe("schema run report regressions", () => {
  afterEach(() => vi.unstubAllGlobals());

  test("keeps model report payloads distinct when mappedTo labels collide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const modelId = new URL(url).searchParams.get("modelId");
        return new Response(
          JSON.stringify({
            reports: [{ mappedTo: "classifier9", prediction: modelId }],
          }),
        );
      }),
    );
    const runtime = createSchemaRunRuntime({
      schema: {
        fields: [{ id: "age", label: "Age", kind: "number", mappedTo: "age" }],
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
      bindings: [{ modelId: "model-1" }, { modelId: "model-2" }],
    });
    const form = createForm({
      schema: runtime.formSchema,
      registry: runtime.registry,
      transport: runtime.transport,
    });
    form.setValues({ age: 42 });

    const result = await executeFormPipeline({ form });

    expect(result.submitResult.reports).toHaveLength(2);
    const payloads = result.submitResult.reports as Array<{ mappedTo?: unknown }>;
    expect(payloads.map((report) => report.mappedTo)).toEqual([
      "report:classifier-a",
      "report:classifier-b",
    ]);
    const reportConfigs = runtime.formSchema.reports as Array<
      Parameters<typeof resolveMappedReportPayload>[0]
    >;
    expect(
      reportConfigs.map((report) =>
        resolveMappedReportPayload(report, result.submitResult),
      ),
    ).toEqual([{ prediction: "model-1" }, { prediction: "model-2" }]);
    expect(
      (result.submitResult.raw as { results: Array<{ output: { reports: unknown[] } }> }).results
        .map((item) => item.output.reports),
    ).toEqual([
      [{ mappedTo: "classifier9", prediction: "model-1" }],
      [{ mappedTo: "classifier9", prediction: "model-2" }],
    ]);
  });

  test("merges fetched CrystalTree payload into modal and persistence results", () => {
    const raw = {
      reports: [],
      results: [{ modelId: "model-1", output: { reports: [] } }],
      reportContextById: {
        crystal: { modelId: "model-1", target: "crystal-tree" },
      },
    };
    const reports = [
      {
        id: "crystal",
        kind: "CrystalTree",
        mappedTo: { "model-1": "crystal-tree" },
      },
    ];
    const states = mergeReportFetchResults({}, { crystal: { explanation: "root||leaf" } });

    const built = buildSchemaRunRawFromSubmitResult(
      raw,
      reports,
      states,
      [{ modelId: "model-1" }],
    );

    expect(built.raw.results).toEqual([
      {
        modelId: "model-1",
        output: {
          reports: [
            {
              id: "crystal",
              kind: "CrystalTree",
              mappedTo: "crystal-tree",
              payload: { explanation: "root||leaf" },
            },
          ],
        },
      },
    ]);
    expect(built.reportsPending).toBe(false);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunTransport } from "../src/algorithms/schema/run-transport";

describe("schema run transport mapping", () => {
  test("runs every binding when labels changed but mappedTo keeps model keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const data = init?.body instanceof FormData ? init.body.get("data") : null;
        const text = data instanceof File ? await data.text() : "{}";
        const input = JSON.parse(text) as Record<string, unknown>;
        if (Object.keys(input).length === 0) {
          return new Response(JSON.stringify({ message: "missing features" }), { status: 400 });
        }
        const modelId = new URL(url).searchParams.get("modelId") ?? "";
        return new Response(
          JSON.stringify({
            outputs: [{ type: "classifier", prediction: 0, probabilities: [0.8, 0.2] }],
            reports: { predicted: { prediction: 0, probabilities: [0.8, 0.2] } },
            meta: { modelId },
          }),
        );
      }),
    );
    const bindings = Array.from({ length: 6 }, (_, index) => ({
      modelId: `model-${index + 1}`,
    }));
    const reports = bindings.flatMap((binding, index) => {
      const baseReport = {
        id: `report-${index + 1}`,
        label: `Predicted class · ${binding.modelId}`,
        kind: "classifier",
        mappedTo: { [binding.modelId]: "predicted" },
      };
      if (index !== 0) {
        return [baseReport];
      }
      return [
        baseReport,
        {
          id: "report-1-extra",
          label: "Extra predicted class · model-1",
          kind: "classifier",
          mappedTo: { "model-1": "predicted" },
        },
      ];
    });
    const transport = createSchemaRunTransport(bindings, [
      { id: "rec_uci_hours", label: "TOTAL HORAS UCI", kind: "number", mappedTo: "rec_uci_hours" },
    ] as never);

    const result = await transport.submit({
      serializedValues: { rec_uci_hours: 36 },
      reports,
    } as never);
    const raw = (result as { raw: { results: Array<{ status: string; modelInput: unknown }> } })
      .raw;
    const reportPayloads = (result as { reports: Record<string, unknown> }).reports;

    expect(raw.results).toHaveLength(6);
    expect(raw.results.every((item) => item.status === "SUCCESS")).toBe(true);
    expect(raw.results.map((item) => item.modelInput)).toEqual(
      Array.from({ length: 6 }, () => ({ rec_uci_hours: 36 })),
    );
    expect(Object.keys(reportPayloads).filter((key) => key.startsWith("report-"))).toHaveLength(7);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";

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
            reports: [
              {
                kind: "classifier",
                output: 0,
                prediction: 0,
                probabilities: [0.8, 0.2],
              },
            ],
            meta: { modelId },
          }),
        );
      }),
    );
    const bindings = Array.from({ length: 6 }, (_, index) => ({
      modelId: index + 1,
      modelName: `model-${index + 1}`,
    }));
    const reports = bindings.flatMap((binding, index) => {
      const baseReport = {
        id: `report-${index + 1}`,
        label: `Predicted class · ${binding.modelName}`,
        kind: "classifier",
        mappedTo: { [binding.modelName]: 0 },
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
          mappedTo: { "model-1": 0 },
        },
      ];
    });
    const transport = createSchemaRunTransport(bindings, [
      {
        id: "rec_uci_hours",
        label: "TOTAL HORAS UCI",
        kind: "number",
        displayKey: "icuHours",
        mappedTo: "rec_uci_hours",
      },
    ] as never);

    const result = await transport.submit({
      modelValues: { rec_uci_hours: 36 },
      displayValues: { icuHours: 36 },
      inputs: [],
      reports,
    } as never);
    const raw = (result as { raw: { results: Array<{ status: string; modelInput: unknown }> } })
      .raw;
    const reportPayloads = (result as { reports: Array<{ status?: string }> }).reports;

    expect(raw.results).toHaveLength(6);
    expect(raw.results.every((item) => item.status === "SUCCESS")).toBe(true);
    expect(raw.results.map((item) => item.modelInput)).toEqual(
      Array.from({ length: 6 }, () => ({ rec_uci_hours: 36 })),
    );
    expect(reportPayloads).toHaveLength(7);
    expect(reportPayloads.every((item) => item.status === "ready")).toBe(true);
  });

  test("routes each output of a model to the report mapped to its position", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              reports: [
                { kind: "regressor", output: 0, values: [220] },
                { kind: "regressor", output: 1, values: [3] },
              ],
            }),
          ),
      ),
    );
    const transport = createSchemaRunTransport([{ modelId: 1, modelName: "homes" }], [
      { id: "rooms", label: "Rooms", kind: "number", mappedTo: 0 },
    ] as never);

    const result = await transport.submit({
      modelValues: { 0: 3 },
      displayValues: { rooms: 3 },
      inputs: [],
      reports: [
        { id: "area", label: "Area", kind: "regressor", mappedTo: { homes: 1 } },
        { id: "price", label: "Price", kind: "regressor", mappedTo: { homes: 0 } },
        { id: "none", label: "None", kind: "regressor", mappedTo: { homes: 2 } },
      ],
    } as never);

    const stored = (
      result as { raw: { results: Array<{ output: { reports: Array<Record<string, unknown>> } }> } }
    ).raw.results[0].output.reports.filter((report) => "id" in report);
    expect(stored.map(({ id, mappedTo, values }) => ({ id, mappedTo, values }))).toEqual([
      { id: "area", mappedTo: "1", values: [3] },
      { id: "price", mappedTo: "0", values: [220] },
    ]);
  });

  test("stores the class the model decides, not the most probable one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              reports: [
                {
                  kind: "classifier",
                  output: 0,
                  mapping: ["0", "1"],
                  probabilities: [0.263, 0.737],
                  prediction: "0",
                },
              ],
            }),
          ),
      ),
    );
    const transport = createSchemaRunTransport([{ modelId: 1, modelName: "risk" }], [
      { id: "age", label: "Age", kind: "number", mappedTo: "age" },
    ] as never);

    const result = await transport.submit({
      modelValues: { age: 52 },
      displayValues: { age: 52 },
      inputs: [],
      reports: [{ id: "risk", label: "Risk", kind: "classifier", mappedTo: { risk: 0 } }],
    } as never);

    const stored = (
      result as { raw: { results: Array<{ output: { reports: Array<Record<string, unknown>> } }> } }
    ).raw.results[0].output.reports.find((report) => report.id === "risk");
    expect(stored).toMatchObject({ prediction: "0", labels: ["0", "1"] });
  });
});

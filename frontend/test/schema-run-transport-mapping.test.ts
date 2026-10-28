/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test, vi } from "vite-plus/test";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";
import { RUN_TARGET, workspacePrediction, predictionRequest } from "./support/api-fixtures";

describe("schema run transport mapping", () => {
  test("runs every binding when labels changed but mappedTo keeps model keys", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const { modelInput } = predictionRequest(init);
        if (Object.keys(modelInput).length === 0) {
          return workspacePrediction(init, [], "missing features");
        }
        return workspacePrediction(init, [
          { kind: "classifier", mappedTo: "0", prediction: 0, probabilities: [0.8, 0.2] },
        ]);
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
    const transport = createSchemaRunTransport(RUN_TARGET, bindings, [
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

  test("asks the API to run each model for the bookmark's snapshot", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => workspacePrediction(init));
    vi.stubGlobal("fetch", fetchMock);
    const transport = createSchemaRunTransport(RUN_TARGET, [{ modelId: 1, modelName: "risk" }], [
      { id: "age", label: "Age", kind: "number", mappedTo: "age" },
    ] as never);

    const result = await transport.submit({
      modelValues: { age: 52 },
      displayValues: { age: 52 },
      inputs: [],
      reports: [],
    } as never);

    const [url, init] = fetchMock.mock.calls[0];
    expect(new URL(url).pathname).toBe("/api/schema-bookmarks/70/predictions");
    expect(init?.method).toBe("POST");
    expect(predictionRequest(init)).toEqual({
      schemaVersionId: 1,
      modelId: 1,
      modelInput: { age: 52 },
    });
    expect((result as { raw: { results: unknown[] } }).raw.results).toEqual([
      expect.objectContaining({ modelId: 1, status: "SUCCESS", attestation: "seal-1" }),
    ]);
  });

  test("a prediction the API refuses fails the run instead of becoming a result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            timestamp: "",
            status: 409,
            message: "The bookmark moved to another snapshot",
            path: "",
          },
          { status: 409 },
        ),
      ),
    );
    const transport = createSchemaRunTransport(RUN_TARGET, [{ modelId: 1, modelName: "risk" }], [
      { id: "age", label: "Age", kind: "number", mappedTo: "age" },
    ] as never);

    await expect(
      transport.submit({
        modelValues: { age: 52 },
        displayValues: { age: 52 },
        inputs: [],
        reports: [],
      } as never),
    ).rejects.toThrow("The bookmark moved to another snapshot");
  });
});

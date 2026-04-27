/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { buildPersistedPredictionPayload } from "./buildPersistedPredictionPayload";
import { derivePredictionTargets } from "./derivePredictionTargets";
import { parseJsonlFile } from "./parseJsonlFile";

describe("bulk upload helpers", () => {
  it("parses valid jsonl rows", () => {
    const result = parseJsonlFile('{"name":"a","inputs":{"x":1}}\n{"name":"b","inputs":{"x":2}}');

    expect(result.records).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
  });

  it("skips invalid jsonl rows and max overflow", () => {
    const invalid = parseJsonlFile('{"name":"a","inputs":{"x":1}}\nnope');
    const overflow = parseJsonlFile('{"name":"a","inputs":{}}\n{"name":"b","inputs":{}}', 1);
    const defaultLimit = parseJsonlFile(
      Array.from({ length: 10001 }, (_, index) => `{"name":"item-${index}","inputs":{}}`).join(
        "\n",
      ),
    );

    expect(invalid.records).toHaveLength(1);
    expect(invalid.skipped[0]?.reason).toContain("Invalid JSON");
    expect(overflow.records).toHaveLength(0);
    expect(overflow.skipped[0]?.reason).toContain("maximum");
    expect(defaultLimit.skipped[0]?.reason).toContain("10000");
  });

  it("builds persisted payload with explanation results and errors", () => {
    const payload = buildPersistedPredictionPayload(
      {
        outputs: [{ type: "classifier" }],
        reports: { existing: { value: 1 } },
        meta: { requestId: "abc" },
      },
      [
        { id: "tree-a", status: "done", result: { explanations: ["ok"] } },
        { id: "tree-b", status: "error", error: "boom" },
      ],
    );

    expect(payload.reports).toMatchObject({
      existing: { value: 1 },
      "tree-a": { explanations: ["ok"] },
    });
    expect(payload.meta).toMatchObject({
      requestId: "abc",
      explainErrors: { "tree-b": "boom" },
    });
  });

  it("derives classifier and regressor targets", () => {
    const classifierTargets = derivePredictionTargets(
      {
        outputs: [{ type: "classifier", probabilities: [[0.1, 0.9]], mapping: ["0", "1"] }],
      },
      { reports: [{ kind: "classifier", labels: ["zero", "one"] }] },
    );
    const regressorTargets = derivePredictionTargets(
      { outputs: [{ type: "regressor", values: [2.5, 4.5] }] },
      { reports: [{ kind: "regressor" }, { kind: "regressor" }] },
    );

    expect(classifierTargets).toEqual([
      { order: 0, value: { value: "one", classIndex: 1, probability: 0.9 } },
    ]);
    expect(regressorTargets).toEqual([
      { order: 0, value: 2.5 },
      { order: 1, value: 4.5 },
    ]);
  });
});

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { buildPersistedPredictionPayload } from "../src/models/buildPersistedPredictionPayload";
import { derivePredictionTargets } from "../src/models/derivePredictionTargets";
import { parseCsvPredictionFile } from "../src/models/parseCsvPredictionFile";
import { parseTabularPredictionRecords } from "../src/models/parseTabularPredictionRecords";

const bulkSchema = {
  fields: [
    { kind: "number", label: "age", required: true },
    { kind: "boolean", label: "active", required: true },
    { kind: "text", label: "segment" },
    { kind: "multi-choice", label: "tags" },
    { kind: "series", label: "points" },
  ],
};

describe("bulk upload helpers", () => {
  it("parses csv rows and coerces values by schema field kind", () => {
    const result = parseCsvPredictionFile(
      'name,age,active,segment,tags,points\nrow-1,42,true,A,red; blue,"[1,2]"\nrow-2,31,0,B,,"[]"',
      bulkSchema,
    );

    expect(result.records).toHaveLength(2);
    expect(result.skipped).toHaveLength(0);
    expect(result.records[0]?.inputs).toEqual({
      age: 42,
      active: true,
      segment: "A",
      tags: ["red", "blue"],
      points: [1, 2],
    });
    expect(result.records[1]?.inputs.active).toBe(false);
    expect(result.records[1]?.inputs.tags).toBeUndefined();
  });

  it("parses worksheet rows with native xlsx cell values", () => {
    const result = parseTabularPredictionRecords(
      [
        { line: 1, values: ["name", "age", "active", "segment", "tags", "points"] },
        { line: 2, values: ["row-1", 42, true, "A", "red; blue", [1, 2]] },
      ],
      bulkSchema,
    );

    expect(result.records).toHaveLength(1);
    expect(result.skipped).toHaveLength(0);
    expect(result.records[0]?.inputs).toEqual({
      age: 42,
      active: true,
      segment: "A",
      tags: ["red", "blue"],
      points: [1, 2],
    });
  });

  it("generates prediction names when name column is omitted", () => {
    const result = parseCsvPredictionFile(
      'age,active,segment,tags,points\n42,true,A,red; blue,"[1,2]"\n31,false,B,,"[]"',
      bulkSchema,
      10000,
      41,
    );

    expect(result.skipped).toHaveLength(0);
    expect(result.records.map((record) => record.name)).toEqual([
      "bulk-upload-42",
      "bulk-upload-43",
    ]);
    expect(result.records[0]?.inputs.age).toBe(42);
  });

  it("requires db prediction id base when name column is omitted", () => {
    const result = parseCsvPredictionFile(
      'age,active,segment,tags,points\n42,true,A,red; blue,"[1,2]"',
      bulkSchema,
    );

    expect(result.records).toHaveLength(0);
    expect(result.skipped[0]?.reason).toContain("prediction id base");
  });

  it("reports missing and unknown csv headers", () => {
    const missingInput = parseCsvPredictionFile(
      "name,age,active,segment,tags\nrow,1,true,A,,",
      bulkSchema,
    );
    const unknownInput = parseCsvPredictionFile(
      "name,age,active,segment,tags,points,extra\nrow,1,true,A,,[],x",
      bulkSchema,
    );

    expect(missingInput.skipped[0]?.reason).toContain("Missing input columns");
    expect(unknownInput.skipped[0]?.reason).toContain("Unknown input columns");
  });

  it("skips rows with empty names or invalid typed values", () => {
    const emptyName = parseCsvPredictionFile(
      "name,age,active,segment,tags,points\n,1,true,A,,[]",
      bulkSchema,
    );
    const badNumber = parseCsvPredictionFile(
      "name,age,active,segment,tags,points\nrow,nope,true,A,,[]",
      bulkSchema,
    );
    const badBoolean = parseCsvPredictionFile(
      "name,age,active,segment,tags,points\nrow,1,maybe,A,,[]",
      bulkSchema,
    );
    const badSeries = parseCsvPredictionFile(
      "name,age,active,segment,tags,points\nrow,1,true,A,,{}",
      bulkSchema,
    );

    expect(emptyName.skipped[0]?.reason).toContain("name");
    expect(badNumber.skipped[0]?.reason).toContain("finite number");
    expect(badBoolean.skipped[0]?.reason).toContain("boolean");
    expect(badSeries.skipped[0]?.reason).toContain("JSON array");
  });

  it("handles quoted commas, malformed quotes, and max overflow", () => {
    const quoted = parseCsvPredictionFile(
      'name,age,active,segment,tags,points\nrow,1,true,"A, B",,"[]"',
      bulkSchema,
    );
    const malformed = parseCsvPredictionFile(
      'name,age,active,segment,tags,points\nrow,1,true,"A,,[]',
      bulkSchema,
    );
    const overflow = parseCsvPredictionFile(
      Array.from({ length: 10001 }, (_, index) => `row-${index},1,true,A,,[]`)
        .join("\n")
        .replace(/^/, "name,age,active,segment,tags,points\n"),
      bulkSchema,
    );

    expect(quoted.records[0]?.inputs.segment).toBe("A, B");
    expect(malformed.records).toHaveLength(0);
    expect(malformed.skipped[0]?.reason).toContain("quoted");
    expect(overflow.records).toHaveLength(0);
    expect(overflow.skipped[0]?.reason).toContain("maximum");
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

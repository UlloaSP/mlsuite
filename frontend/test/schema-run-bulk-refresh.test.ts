import { describe, expect, it } from "vite-plus/test";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY } from "@/api/schemas/hooks";
import { prependMissingPredictionRuns } from "@/algorithms/schema/run-cache";
import type { PredictionRunDto } from "@/api/schemas/dtos";

const run = (id: string): PredictionRunDto => ({
  id,
  schemaVersionId: "version-1",
  name: `Run ${id}`,
  inputData: {},
  status: "SUCCESS",
  results: [],
  createdAt: "2026-06-04T00:00:00Z",
});

describe("schema run bulk refresh", () => {
  it("normalizes prediction-runs query keys across route and dto id shapes", () => {
    expect(BOOKMARK_PREDICTION_RUNS_QUERY_KEY(7, "42")).toEqual(
      BOOKMARK_PREDICTION_RUNS_QUERY_KEY(7, 42),
    );
  });

  it("prepends newly saved bulk runs without duplicating existing cache rows", () => {
    expect(prependMissingPredictionRuns([run("old"), run("2")], [run("1"), run("2")])).toEqual([
      run("1"),
      run("old"),
      run("2"),
    ]);
  });
});

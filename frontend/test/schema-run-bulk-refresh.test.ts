import { bulkUploadSummary } from "@/features/schemas/lib/bulk-upload";
import { describe, expect, it } from "vite-plus/test";
import { BOOKMARK_PREDICTION_RUNS_QUERY_KEY } from "@/features/schemas/api/schema-keys";
import { prependMissingPredictionRuns } from "@/features/schemas/lib/run-cache";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";

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
  it.each([
    [2, 0, 0, 0, false, "2 saved, 0 failed, 0 skipped"],
    [1, 0, 2, 0, true, "1 saved, 0 failed, 2 skipped"],
    [0, 1, 0, 0, true, "0 saved, 1 failed, 0 skipped"],
    [0, 0, 3, 0, true, "0 saved, 0 failed, 3 skipped"],
    [0, 0, 0, 0, true, "0 saved, 0 failed, 0 skipped"],
    [1, 0, 0, 2, true, "1 saved, 0 failed, 0 skipped, 2 not processed"],
  ] as const)(
    "summarizes %i saved, %i failed, %i skipped, %i remaining",
    (saved, failed, skipped, remaining, warning, message) => {
      expect(bulkUploadSummary(saved, failed, skipped, remaining)).toEqual({ warning, message });
    },
  );
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

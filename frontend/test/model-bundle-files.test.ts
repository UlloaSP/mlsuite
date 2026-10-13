/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { saveModelBundlesSequentially } from "@/features/models/lib/bundle-save";
import { appendBundleFiles, isBundleFile } from "@/features/models/lib/bundle-utils";

const file = (name: string) => new File(["x"], name);

describe("model bundle file handling", () => {
  it("accepts only .mlbundle files", () => {
    expect(isBundleFile("risk-model.mlbundle")).toBe(true);
    expect(isBundleFile("RISK-MODEL.MLBUNDLE")).toBe(true);
    expect(isBundleFile("risk-model.joblib")).toBe(false);
    expect(isBundleFile("risk-model.onnx")).toBe(false);
  });

  it("lists each file as an unsaved bundle named after it", () => {
    const bundles = appendBundleFiles([], [file("risk_model.mlbundle"), file("churn.mlbundle")], 1);

    expect(bundles.map((bundle) => bundle.id)).toEqual([1, 2]);
    expect(bundles.map((bundle) => bundle.name)).toEqual(["Risk Model", "Churn"]);
    expect(bundles.every((bundle) => !bundle.saved && !bundle.saving)).toBe(true);
  });

  it("does not list the same file name twice", () => {
    const first = appendBundleFiles([], [file("risk.mlbundle")], 1);
    const bundles = appendBundleFiles(first, [file("risk.mlbundle"), file("churn.mlbundle")], 2);

    expect(bundles.map((bundle) => bundle.modelFile.name)).toEqual([
      "risk.mlbundle",
      "churn.mlbundle",
    ]);
  });

  it("saves bundles sequentially", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const saved: number[] = [];

    const complete = await saveModelBundlesSequentially([1, 2, 3], async (id) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      saved.push(id);
      inFlight -= 1;
      return true;
    });

    expect(complete).toBe(true);
    expect(saved).toEqual([1, 2, 3]);
    expect(maxInFlight).toBe(1);
  });

  it("continues after one bundle fails and reports partial failure", async () => {
    const attempted: number[] = [];

    const complete = await saveModelBundlesSequentially([1, 2, 3], async (id) => {
      attempted.push(id);
      return id !== 2;
    });

    expect(complete).toBe(false);
    expect(attempted).toEqual([1, 2, 3]);
  });
});

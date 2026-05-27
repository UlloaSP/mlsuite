/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { applyInspectedBundleFiles } from "../src/models/bundle-planner";
import { ALL_EXTS, DF_EXTS, isJoblibFile } from "../src/models/bundle-utils";

const file = (name: string) => new File(["x"], name);

describe("model bundle file handling", () => {
  it("accepts joblib dataframes for explicit dataframe upload controls", () => {
    expect(DF_EXTS).toContain(".joblib");
    expect(ALL_EXTS.filter((ext) => ext === ".joblib")).toHaveLength(1);
  });

  it("routes joblib artifacts to backend inspection", () => {
    expect(isJoblibFile("risk-model.joblib")).toBe(true);
    expect(isJoblibFile("risk-model.pkl")).toBe(false);
  });

  it("creates a pending bundle when a dataframe arrives before its model", () => {
    const result = applyInspectedBundleFiles(
      [],
      [{ file: file("risk.joblib"), kind: "dataframe" }],
      1,
    );

    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0].modelFile).toBeNull();
    expect(result.bundles[0].dfFile?.name).toBe("risk.joblib");
  });

  it("fills a pending dataframe bundle when the matching model arrives later", () => {
    const pending = applyInspectedBundleFiles(
      [],
      [{ file: file("risk.joblib"), kind: "dataframe" }],
      1,
    );
    const result = applyInspectedBundleFiles(
      pending.bundles,
      [{ file: file("risk.joblib"), kind: "model" }],
      pending.nextId,
    );

    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0].modelFile?.name).toBe("risk.joblib");
    expect(result.bundles[0].dfFile?.name).toBe("risk.joblib");
  });
});

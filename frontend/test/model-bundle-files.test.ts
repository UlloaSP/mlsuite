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

  it("assigns one matched dataframe to multiple models", () => {
    const modelA = file("classifier.joblib");
    const modelB = file("regressor.joblib");
    const dataframe = file("shared.joblib");
    const result = applyInspectedBundleFiles(
      [],
      [
        { file: modelA, kind: "model" },
        { file: modelB, kind: "model" },
        { file: dataframe, kind: "dataframe" },
      ],
      1,
      {
        matchModels: [modelA, modelB],
        matchDataframes: [dataframe],
        match: {
          dataframes: [{ index: 0, fileName: "shared.joblib", columns: [], rows: 2 }],
          models: [
            {
              index: 0,
              fileName: "classifier.joblib",
              type: "classifier",
              specificType: "LogisticRegression",
              library: "sklearn",
              features: ["age"],
              matches: [],
              autoDataframeIndex: 0,
            },
            {
              index: 1,
              fileName: "regressor.joblib",
              type: "regressor",
              specificType: "LinearRegression",
              library: "sklearn",
              features: ["area"],
              matches: [],
              autoDataframeIndex: 0,
            },
          ],
        },
      },
    );

    expect(result.bundles).toHaveLength(2);
    expect(result.bundles.map((bundle) => bundle.dfFile?.name)).toEqual([
      "shared.joblib",
      "shared.joblib",
    ]);
  });
});

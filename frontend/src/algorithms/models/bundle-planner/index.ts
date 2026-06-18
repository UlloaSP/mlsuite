/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactKind } from "../../../api/models/services";
import type { ArtifactMatchDto } from "../../../api/models/services";
import type { Bundle } from "../../../models/bundle-types";
import { getStem, slugToTitle } from "../bundle-utils";

/**
 * InspectedBundleFile: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: matches uploaded model/dataframe artifacts to inspected bundle file plans.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type InspectedBundleFile = {
  file: File;
  kind: ArtifactKind;
};

type ApplyResult = {
  bundles: Bundle[];
  nextId: number;
};

type ApplyOptions = {
  match?: ArtifactMatchDto;
  matchModels?: File[];
  matchDataframes?: File[];
};

/**
 * applyInspectedBundleFiles: applies a deterministic transformation to the supplied data
 *
 * Purpose: matches uploaded model/dataframe artifacts to inspected bundle file plans.
 * @param previous - Input consumed by applyInspectedBundleFiles; uses the matches uploaded model/dataframe artifacts to inspected bundle file plans contract.
 * @param inspected - Input consumed by applyInspectedBundleFiles; uses the matches uploaded model/dataframe artifacts to inspected bundle file plans contract.
 * @param firstId - Input consumed by applyInspectedBundleFiles; uses the matches uploaded model/dataframe artifacts to inspected bundle file plans contract.
 * @param options - Input consumed by applyInspectedBundleFiles; uses the matches uploaded model/dataframe artifacts to inspected bundle file plans contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function applyInspectedBundleFiles(
  previous: Bundle[],
  inspected: InspectedBundleFile[],
  firstId: number,
  options: ApplyOptions = {},
): ApplyResult {
  const next = previous.map((bundle) => ({ ...bundle }));
  let nextId = firstId;
  const dataframes = inspected.filter((item) => item.kind === "dataframe").map((item) => item.file);
  const models = inspected.filter((item) => item.kind === "model").map((item) => item.file);
  const match = options.match;
  const matchModels = options.matchModels ?? models;
  const matchDataframes = options.matchDataframes ?? dataframes;

  models.forEach((modelFile) => {
    if (next.some((bundle) => bundle.modelFile?.name === modelFile.name)) return;
    const stem = getStem(modelFile.name);
    const matchedDf = findMatchedDataframe(modelFile, match, matchModels, matchDataframes);
    const pending =
      (matchedDf
        ? next.find((bundle) => !bundle.modelFile && bundle.dfFile === matchedDf)
        : undefined) ??
      next.find(
        (bundle) =>
          !bundle.modelFile &&
          bundle.dfFile &&
          getStem(bundle.dfFile.name).toLowerCase() === stem.toLowerCase(),
      );

    if (pending) {
      pending.modelFile = modelFile;
      pending.name = pending.name.trim() ? pending.name : slugToTitle(stem);
      pending.saved = false;
      return;
    }

    next.push({
      id: nextId++,
      modelFile,
      dfFile: matchedDf,
      name: slugToTitle(stem),
      saved: false,
      saving: false,
    });
  });

  applyMatches(next, match, matchModels, matchDataframes);

  dataframes.forEach((dfFile) => {
    if (next.some((bundle) => bundle.dfFile === dfFile && bundle.modelFile)) return;
    const stem = getStem(dfFile.name).toLowerCase();
    const target =
      next.find(
        (bundle) =>
          bundle.modelFile &&
          getStem(bundle.modelFile.name).toLowerCase() === stem &&
          !bundle.dfFile,
      ) ?? next.find((bundle) => bundle.modelFile && !bundle.dfFile);
    if (target) {
      target.dfFile = dfFile;
      target.saved = false;
    } else if (!next.some((bundle) => bundle.dfFile?.name === dfFile.name && !bundle.modelFile)) {
      next.push({
        id: nextId++,
        modelFile: null,
        dfFile,
        name: slugToTitle(getStem(dfFile.name)),
        saved: false,
        saving: false,
      });
    }
  });

  return { bundles: next, nextId };
}

/** applyMatches: internal transformation helper for model prediction, feedback, upload, and export data shaping. @remarks Args: bundles, match, models, dataframes; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
function applyMatches(
  bundles: Bundle[],
  match: ArtifactMatchDto | undefined,
  models: File[],
  dataframes: File[],
) {
  match?.models.forEach((modelMatch) => {
    if (typeof modelMatch.autoDataframeIndex !== "number") return;
    const modelFile = models[modelMatch.index];
    const dfFile = dataframes[modelMatch.autoDataframeIndex];
    if (!modelFile || !dfFile) return;

    const modelBundle = bundles.find((bundle) => bundle.modelFile === modelFile);
    if (modelBundle) {
      modelBundle.dfFile = dfFile;
      modelBundle.saved = false;
      return;
    }

    const pending = bundles.find((bundle) => !bundle.modelFile && bundle.dfFile === dfFile);
    if (pending) {
      pending.modelFile = modelFile;
      pending.name = pending.name.trim() ? pending.name : slugToTitle(getStem(modelFile.name));
      pending.saved = false;
    }
  });
}

/** findMatchedDataframe: internal lookup helper for model prediction, feedback, upload, and export data shaping. @remarks Args: modelFile, match, models, dataframes; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
function findMatchedDataframe(
  modelFile: File,
  match: ArtifactMatchDto | undefined,
  models: File[],
  dataframes: File[],
) {
  const modelIndex = models.findIndex((candidate) => candidate === modelFile);
  if (!match || modelIndex < 0) return null;
  const modelMatch = match.models.find((candidate) => candidate.index === modelIndex);
  if (typeof modelMatch?.autoDataframeIndex !== "number") return null;
  return dataframes[modelMatch.autoDataframeIndex] ?? null;
}

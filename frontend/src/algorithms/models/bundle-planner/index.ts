/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactKind } from "../../../models/api/artifactService";
import type { ArtifactMatchDto } from "../../../models/api/artifactService";
import type { Bundle } from "../../../models/bundle-types";
import { getStem, slugToTitle } from "../bundle-utils";

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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactKind } from "./api/artifactService";
import type { Bundle } from "./bundle-types";
import { getStem, slugToTitle } from "./bundle-utils";

export type InspectedBundleFile = {
  file: File;
  kind: ArtifactKind;
};

type ApplyResult = {
  bundles: Bundle[];
  nextId: number;
};

export function applyInspectedBundleFiles(
  previous: Bundle[],
  inspected: InspectedBundleFile[],
  firstId: number,
): ApplyResult {
  const next = previous.map((bundle) => ({ ...bundle }));
  let nextId = firstId;
  const dataframes = inspected.filter((item) => item.kind === "dataframe").map((item) => item.file);
  const pool = [...dataframes];

  inspected
    .filter((item) => item.kind === "model")
    .forEach(({ file: modelFile }) => {
      if (next.some((bundle) => bundle.modelFile?.name === modelFile.name)) return;
      const stem = getStem(modelFile.name);
      const pending = next.find(
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
      const index = pool.findIndex((df) => getStem(df.name).toLowerCase() === stem.toLowerCase());
      const dfFile = index !== -1 ? pool.splice(index, 1)[0] : null;
      next.push({
        id: nextId++,
        modelFile,
        dfFile,
        name: slugToTitle(stem),
        saved: false,
        saving: false,
      });
    });

  pool.forEach((dfFile) => {
    const stem = getStem(dfFile.name).toLowerCase();
    const target =
      next.find((bundle) => bundle.modelFile && getStem(bundle.modelFile.name).toLowerCase() === stem && !bundle.dfFile) ??
      next.find((bundle) => bundle.modelFile && !bundle.dfFile);
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

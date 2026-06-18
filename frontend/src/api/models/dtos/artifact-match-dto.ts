/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactModelMatchDto } from "./index";

export type ArtifactMatchDto = {
  models: ArtifactModelMatchDto[];
  dataframes: Array<{
    index: number;
    fileName: string;
    columns: string[];
    rows: number;
  }>;
};

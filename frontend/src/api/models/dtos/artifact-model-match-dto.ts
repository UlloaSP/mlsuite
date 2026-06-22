/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactDataframeMatchDto } from "./index";

export type ArtifactModelMatchDto = {
  index: number;
  fileName: string;
  type: string;
  specificType: string;
  library: string;
  features: string[];
  matches: ArtifactDataframeMatchDto[];
  autoDataframeIndex: number | null;
};

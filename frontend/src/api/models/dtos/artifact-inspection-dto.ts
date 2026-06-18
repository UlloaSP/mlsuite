/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ArtifactKind } from "./index";

export interface ArtifactInspectionDto {
  kind: ArtifactKind;
  fileName: string;
  type?: "classifier" | "regressor" | string;
  specificType?: string;
  library?: string;
  rows?: number;
  columns?: string[];
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

export type ArtifactKind = "model" | "dataframe";

export interface ArtifactInspectionDto {
  kind: ArtifactKind;
  fileName: string;
  type?: "classifier" | "regressor" | string;
  specificType?: string;
  library?: string;
  rows?: number;
  columns?: string[];
}

export const inspectArtifact = async (artifact: File): Promise<ArtifactInspectionDto> => {
  const formData = new FormData();
  formData.append("artifact", artifact);
  return appFetch<ArtifactInspectionDto>("/api/analyzer/artifacts/inspect", {
    method: "POST",
    body: formData,
  });
};

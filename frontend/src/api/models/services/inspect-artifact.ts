/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { ArtifactInspectionDto } from "@/api/models/dtos";

export const inspectArtifact = async (artifact: File): Promise<ArtifactInspectionDto> => {
  const formData = new FormData();
  formData.append("artifact", artifact);
  return appFetch<ArtifactInspectionDto>("/api/analyzer/artifacts/inspect", {
    method: "POST",
    body: formData,
  });
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { MatchArtifactsRequest, ArtifactMatchDto } from "../dtos";

export const matchArtifacts = async ({
  models,
  dataframes,
}: MatchArtifactsRequest): Promise<ArtifactMatchDto> => {
  const formData = new FormData();
  models.forEach((model) => formData.append("models", model));
  dataframes.forEach((dataframe) => formData.append("dataframes", dataframe));
  return appFetch<ArtifactMatchDto>("/api/analyzer/artifacts/match", {
    method: "POST",
    body: formData,
  });
};

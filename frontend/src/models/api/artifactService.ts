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

export type MatchArtifactsRequest = {
  models: File[];
  dataframes: File[];
};

export type ArtifactDataframeMatchDto = {
  dataframeIndex: number;
  compatible: boolean;
  missing: string[];
  extra: string[];
  score: number;
};

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

export type ArtifactMatchDto = {
  models: ArtifactModelMatchDto[];
  dataframes: Array<{
    index: number;
    fileName: string;
    columns: string[];
    rows: number;
  }>;
};

export const inspectArtifact = async (artifact: File): Promise<ArtifactInspectionDto> => {
  const formData = new FormData();
  formData.append("artifact", artifact);
  return appFetch<ArtifactInspectionDto>("/api/analyzer/artifacts/inspect", {
    method: "POST",
    body: formData,
  });
};

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

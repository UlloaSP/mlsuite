/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface ModelDto {
  id: string;
  name: string;
  type: string;
  specificType: string;
  fileName: string;
  inputSchema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  fieldCount: number;
  reportCount: number;
}

export interface ModelPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}

export interface ModelPageDto {
  items: ModelDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

export interface ModelNameRequest {
  id: string;
  name: string;
}

export interface CreateModelRequest {
  name: string;
  modelFile: File;
  dataframeFile?: File;
  oneHotSeparator?: string;
}

export interface CreateModelDto {
  model: ModelDto;
}

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

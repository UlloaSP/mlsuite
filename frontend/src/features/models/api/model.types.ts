/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface ModelPageRequest {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  status?: string;
}

export interface ModelNameRequest {
  id: number | string;
  name: string;
  version?: number;
}

export interface ModelVersionRequest {
  id: number | string;
  version: number;
}

export interface CreateModelRequest {
  name: string;
  modelFile: File;
}

export interface ArtifactInspectionDto {
  fileName: string;
  type: "classifier" | "regressor";
  specificType: string;
  library: string;
  features: string[];
  featureSource: string;
  schema: Record<string, unknown>;
}

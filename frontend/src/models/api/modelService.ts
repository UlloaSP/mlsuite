/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

/** ---------- DTOs ---------- */
export interface CreateModelRequest {
  name: string;
  modelFile: File;
  dataframeFile?: File;
}

export interface ModelDto {
  id: string;
  name: string;
  type: string;
  specificType: string;
  fileName: string;
  inputSchema: Record<string, unknown>;
  createdAt: string;
}

export interface CreateModelDto {
  model: ModelDto;
}

/** ---------- services ---------- */
export const createModel = async ({
  name,
  modelFile,
  dataframeFile,
}: CreateModelRequest): Promise<CreateModelDto> => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("modelFile", modelFile);
  if (dataframeFile) formData.append("dataframeFile", dataframeFile);

  // Browser sets multipart boundary; do not set Content-Type manually
  return appFetch<CreateModelDto>("/api/models", { method: "POST", body: formData });
};

export const getModels = async (): Promise<ModelDto[]> => {
  return appFetch<ModelDto[]>("/api/models");
};

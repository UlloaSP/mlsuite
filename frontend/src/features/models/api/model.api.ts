/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type {
  ArtifactInspectionDto,
  CreateModelRequest,
  ModelNameRequest,
  ModelPageRequest,
  ModelVersionRequest,
} from "./model.types";
import type {
  CreateModelDto,
  ModelDetailsDto,
  ModelDto,
  PageDtoModelDto,
} from "@/shared/api/openapi.gen";

export const getModel = (modelId: number | string, signal?: AbortSignal): Promise<ModelDto> =>
  appFetch<ModelDto>(`/api/models/${encodeURIComponent(modelId)}`, { signal });

export const getModelDetails = (
  modelId: number | string,
  signal?: AbortSignal,
): Promise<ModelDetailsDto> =>
  appFetch<ModelDetailsDto>(`/api/models/${encodeURIComponent(modelId)}/details`, { signal });

export const getModelPage = (
  { page, search = "", size, sort = "updated", status = "active" }: ModelPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoModelDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<PageDtoModelDto>(`/api/models?${params.toString()}`, { signal });
};

export const createModel = ({ name, modelFile }: CreateModelRequest): Promise<CreateModelDto> => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("modelFile", modelFile);
  return appFetch<CreateModelDto>("/api/models", { method: "POST", body: formData });
};

export const archiveModel = ({ id, version }: ModelVersionRequest): Promise<ModelDto> =>
  appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}/archive?version=${version}`, {
    method: "POST",
  });

export const deleteModel = async ({ id, version }: ModelVersionRequest): Promise<void> => {
  await appFetch(`/api/models/${encodeURIComponent(id)}?version=${version}`, { method: "DELETE" });
};

export const duplicateModel = ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<ModelDto>(
    `/api/models/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};

export const renameModel = ({ id, name, version }: ModelNameRequest): Promise<ModelDto> => {
  if (version === undefined) throw new Error("Model version is required for rename");
  const params = new URLSearchParams({ name, version: String(version) });
  return appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}?${params.toString()}`, {
    method: "PATCH",
  });
};

export const inspectArtifact = (artifact: File): Promise<ArtifactInspectionDto> => {
  const formData = new FormData();
  formData.append("artifact", artifact);
  return appFetch<ArtifactInspectionDto>("/api/analyzer/artifacts/inspect", {
    method: "POST",
    body: formData,
  });
};

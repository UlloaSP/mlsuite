/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type {
  ArtifactInspectionDto,
  ArtifactMatchDto,
  CreateModelDto,
  CreateModelRequest,
  MatchArtifactsRequest,
  ModelDto,
  ModelNameRequest,
  ModelPageDto,
  ModelPageRequest,
} from "./model.types";

export const getModels = (signal?: AbortSignal): Promise<ModelDto[]> =>
  appFetch<ModelDto[]>("/api/models/all", { signal });

export const getModelPage = (
  { page, search = "", size, sort = "updated", status = "active" }: ModelPageRequest,
  signal?: AbortSignal,
): Promise<ModelPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    status,
  });
  return appFetch<ModelPageDto>(`/api/models?${params.toString()}`, { signal });
};

export const createModel = ({
  name,
  modelFile,
  dataframeFile,
  oneHotSeparator = "__",
}: CreateModelRequest): Promise<CreateModelDto> => {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("modelFile", modelFile);
  formData.append("oneHotSeparator", oneHotSeparator);
  if (dataframeFile) formData.append("dataframeFile", dataframeFile);
  return appFetch<CreateModelDto>("/api/models", { method: "POST", body: formData });
};

export const archiveModel = (id: string): Promise<ModelDto> =>
  appFetch<ModelDto>(`/api/models/${encodeURIComponent(id)}/archive`, { method: "POST" });

export const deleteModel = async (id: string): Promise<void> => {
  await appFetch(`/api/models/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export const duplicateModel = ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
  return appFetch<ModelDto>(
    `/api/models/${encodeURIComponent(id)}/duplicate?${params.toString()}`,
    { method: "POST" },
  );
};

export const renameModel = ({ id, name }: ModelNameRequest): Promise<ModelDto> => {
  const params = new URLSearchParams({ name });
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

export const matchArtifacts = ({
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

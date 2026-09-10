/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { PluginDto, PluginPageDto, PluginPageRequest, PluginStatsDto } from "./plugin.types";

export const getPluginPage = (
  { page, search = "", size, sort = "updated", type = "all" }: PluginPageRequest,
  signal?: AbortSignal,
): Promise<PluginPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    type,
  });
  return appFetch<PluginPageDto>(`/api/plugins?${params.toString()}`, { signal });
};

export const getPluginStats = (signal?: AbortSignal): Promise<PluginStatsDto> =>
  appFetch<PluginStatsDto>("/api/plugins/stats", { signal });

export const uploadPlugin = (file: File): Promise<PluginDto> => {
  const formData = new FormData();
  formData.append("file", file);
  return appFetch<PluginDto>("/api/plugins", {
    method: "POST",
    body: formData,
  });
};

export const deletePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins?id=${encodeURIComponent(id)}`, { method: "DELETE" });
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

export interface PluginDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  source: string;
  pluginType: "field" | "report" | "invalid";
  kind: string | null;
}

export interface PluginPageDto {
  items: PluginDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

export interface PluginStatsDto {
  fieldPlugins: number;
  reportPlugins: number;
}

export type PluginPageRequest = {
  page: number;
  size: number;
  type?: "all" | "field" | "report";
  search?: string;
  sort?: "updated" | "name";
};

export const getPluginPage = async ({
  page,
  search = "",
  size,
  sort = "updated",
  type = "all",
}: PluginPageRequest): Promise<PluginPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    type,
  });
  return appFetch<PluginPageDto>(`/api/plugins?${params.toString()}`);
};

export const getPluginStats = async (): Promise<PluginStatsDto> =>
  appFetch<PluginStatsDto>("/api/plugins/stats");

export const getAllPlugins = async (size = 100): Promise<PluginDto[]> => {
  const items: PluginDto[] = [];
  let page = 0;
  while (true) {
    const response = await getPluginPage({ page, size });
    items.push(...response.items);
    if (!response.hasNext) {
      return items;
    }
    page += 1;
  }
};

export const uploadPlugin = async (file: File): Promise<PluginDto> => {
  const formData = new FormData();
  formData.append("file", file);
  return appFetch<PluginDto>("/api/plugins", {
    method: "POST",
    body: formData,
  });
};

export const deletePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

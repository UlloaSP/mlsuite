/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "./appFetch";

export interface PluginDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
  source: string;
}

export const getPlugins = async (): Promise<PluginDto[]> =>
  appFetch<PluginDto[]>("/api/plugins/all");

export const getActivePlugins = async (): Promise<PluginDto[]> =>
  appFetch<PluginDto[]>("/api/plugins/active");

export const uploadPlugin = async (file: File): Promise<PluginDto> => {
  const formData = new FormData();
  formData.append("file", file);
  return appFetch<PluginDto>("/api/plugins/upload", {
    method: "POST",
    body: formData,
  });
};

export const activatePlugin = async (id: string): Promise<PluginDto> =>
  appFetch<PluginDto>(`/api/plugins/activate?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });

export const deactivatePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins/deactivate?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });
};

export const deactivateAllPlugins = async (): Promise<void> => {
  await appFetch("/api/plugins/deactivate-all", {
    method: "POST",
  });
};

export const deletePlugin = async (id: string): Promise<void> => {
  await appFetch(`/api/plugins/delete?id=${encodeURIComponent(id)}`, {
    method: "POST",
  });
};

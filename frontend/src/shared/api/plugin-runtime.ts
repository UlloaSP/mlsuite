/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";

export interface PluginRuntimeSource {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  source: string;
}

type PluginRuntimePage = {
  items: PluginRuntimeSource[];
  hasNext: boolean;
};

export const getAllPluginRuntimeSources = async (size = 100): Promise<PluginRuntimeSource[]> => {
  const items: PluginRuntimeSource[] = [];
  let page = 0;
  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      search: "",
      size: String(size),
      sort: "updated",
      type: "all",
    });
    const response = await appFetch<PluginRuntimePage>(`/api/plugins?${params.toString()}`);
    items.push(...response.items);
    if (!response.hasNext) return items;
    page += 1;
  }
};

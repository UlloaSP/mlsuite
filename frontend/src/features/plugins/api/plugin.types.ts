/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface PluginDto {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  source: string;
  pluginType: "field" | "report" | "invalid";
  kind: string | null;
}

export type PluginPageRequest = {
  page: number;
  size: number;
  type?: "all" | "field" | "report";
  search?: string;
  sort?: "updated" | "name";
};

export type PluginCatalogType = NonNullable<PluginPageRequest["type"]>;
export type PluginCatalogSort = NonNullable<PluginPageRequest["sort"]>;

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

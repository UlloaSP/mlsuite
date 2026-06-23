/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type PluginPageRequest = {
  page: number;
  size: number;
  type?: "all" | "field" | "report";
  search?: string;
  sort?: "updated" | "name";
};

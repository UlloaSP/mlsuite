/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { PluginDto } from "./index";

export interface PluginPageDto {
  items: PluginDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaCatalogItemDto } from "./index";

export interface SchemaPageDto {
  items: SchemaCatalogItemDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

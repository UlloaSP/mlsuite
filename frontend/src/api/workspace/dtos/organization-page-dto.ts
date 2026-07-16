/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationCatalogItemDto } from "./organization-catalog-item-dto";

export interface OrganizationPageDto {
  items: OrganizationCatalogItemDto[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
}

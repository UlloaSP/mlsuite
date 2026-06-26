/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaCatalogItemDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  modelCount: number;
  fieldCount: number;
  reportCount: number;
};

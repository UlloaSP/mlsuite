/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export interface OrganizationCatalogItemDto {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerAvatarUrl?: string | null;
  updatedByName?: string | null;
  updatedByEmail?: string | null;
  updatedByAvatarUrl?: string | null;
  teamCount: number;
  modelCount: number;
  schemaCount: number;
  pluginCount: number;
  inferenceCount: number;
  publicAccess: boolean;
  memberCount: number;
}

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { OrganizationPageDto } from "@/api/workspace/dtos";

export type OrganizationPageRequest = {
  page: number;
  search?: string;
  size: number;
  sort?: string;
  filter?: string;
};

export const getOrganizationPage = (
  { page, search = "", size, sort = "updated", filter = "all" }: OrganizationPageRequest,
  signal?: AbortSignal,
): Promise<OrganizationPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    search,
    size: String(size),
    sort,
    filter,
  });
  return appFetch<OrganizationPageDto>(`/api/organizations/catalog?${params.toString()}`, {
    signal,
  });
};

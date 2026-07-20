/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { AdminUserPageDto, AdminUserPageRequest } from "@/api/admin-users/dtos";

export const listUsers = (
  { page, role, search, size, sort }: AdminUserPageRequest,
  signal?: AbortSignal,
): Promise<AdminUserPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    role,
    search,
    size: String(size),
    sort,
  });

  return appFetch<AdminUserPageDto>(`/api/admin/users?${params.toString()}`, { signal });
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { AdminUserPageDto, AdminUserPageRequest } from "../dtos";

export const listUsers = ({
  page,
  role,
  search,
  size,
  sort,
}: AdminUserPageRequest): Promise<AdminUserPageDto> => {
  const params = new URLSearchParams({
    page: String(page),
    role,
    search,
    size: String(size),
    sort,
  });

  return appFetch<AdminUserPageDto>(`/api/admin/users?${params.toString()}`);
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AdminUserPageRequest } from "../dtos";
import * as adminApi from "../services";
import { adminUsersPageQueryKey } from "./query-keys";

const DEFAULT_ADMIN_USERS_PAGE: AdminUserPageRequest = {
  page: 0,
  role: "all",
  search: "",
  size: 100,
  sort: "name",
};

export const useAdminUsers = (request: Partial<AdminUserPageRequest> = {}) => {
  const pageRequest = { ...DEFAULT_ADMIN_USERS_PAGE, ...request };

  return useQuery({
    queryKey: adminUsersPageQueryKey(
      pageRequest.page,
      pageRequest.search,
      pageRequest.sort,
      pageRequest.role,
    ),
    queryFn: () => adminApi.listUsers(pageRequest),
    placeholderData: keepPreviousData,
  });
};

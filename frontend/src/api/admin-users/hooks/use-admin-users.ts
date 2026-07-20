/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import type { AdminUserPageRequest } from "@/api/admin-users/dtos";
import { adminUsersQueryOptions } from "@/api/admin-users/admin-user-queries";

export const useAdminUsers = (request: Partial<AdminUserPageRequest> = {}) => {
  return useQuery(adminUsersQueryOptions(request));
};

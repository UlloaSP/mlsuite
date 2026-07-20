import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { listUsers } from "./admin-user.api";
import { adminUserKeys } from "./admin-user.keys";
import type { AdminUserPageRequest } from "./admin-user.types";

export const DEFAULT_ADMIN_USERS_PAGE: AdminUserPageRequest = {
  page: 0,
  role: "all",
  search: "",
  size: 100,
  sort: "name",
};

export const adminUsersQueryOptions = (request: Partial<AdminUserPageRequest> = {}) => {
  const pageRequest = { ...DEFAULT_ADMIN_USERS_PAGE, ...request };
  return queryOptions({
    queryKey: adminUserKeys.page(
      pageRequest.page,
      pageRequest.search,
      pageRequest.sort,
      pageRequest.role,
    ),
    queryFn: ({ signal }) => listUsers(pageRequest, signal),
    placeholderData: keepPreviousData,
  });
};

export const useAdminUsers = (request: Partial<AdminUserPageRequest> = {}) =>
  useQuery(adminUsersQueryOptions(request));

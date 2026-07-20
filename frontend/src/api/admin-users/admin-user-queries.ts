import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type { AdminUserPageRequest } from "./dtos";
import { listUsers } from "./services";
import { adminUsersPageQueryKey } from "./hooks/query-keys";

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
    queryKey: adminUsersPageQueryKey(
      pageRequest.page,
      pageRequest.search,
      pageRequest.sort,
      pageRequest.role,
    ),
    queryFn: ({ signal }) => listUsers(pageRequest, signal),
    placeholderData: keepPreviousData,
  });
};

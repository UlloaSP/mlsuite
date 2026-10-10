import { appFetch } from "@/shared/api/http";
import type { CatalogPage } from "@/shared/api/infinite-catalog";
import type { AdminUserDto } from "@/shared/api/openapi.gen";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useInfiniteCatalog, infiniteCatalogOptions } from "@/shared/api/infinite-catalog";
import { listUsers } from "./admin-user.api";
import { adminUserKeys } from "./admin-user.keys";
import type { AdminUserPageRequest } from "./admin-user.types";

export const DEFAULT_ADMIN_USERS_PAGE: AdminUserPageRequest = {
  page: 0,
  role: "all",
  search: "",
  size: 24,
  sort: "name",
};

export const adminUserCatalogOptions = (
  request: Partial<AdminUserPageRequest> = {},
  enabled = true,
) => {
  const params = { ...DEFAULT_ADMIN_USERS_PAGE, ...request, size: request.size ?? 24 };
  return infiniteCatalogOptions({
    queryKey: [
      ...adminUserKeys.all,
      "infinite",
      params.search,
      params.sort,
      params.role,
      params.size,
    ],
    queryFn: async (page, signal) => ({
      ...(await listUsers({ ...params, page }, signal)),
      page,
      size: params.size,
    }),
    enabled,
  });
};
export const useAdminUserCatalog = (request: Partial<AdminUserPageRequest> = {}, enabled = true) =>
  useInfiniteQuery(adminUserCatalogOptions(request, enabled));

export function useOwnerCandidateCatalog(search: string) {
  return useInfiniteCatalog({
    queryKey: [...adminUserKeys.all, "owner-candidates", "infinite", search],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<AdminUserDto>>(
        `/api/admin/users/owner-candidates/catalog?${new URLSearchParams({ page: String(page), size: "24", search })}`,
        { signal },
      ),
  });
}

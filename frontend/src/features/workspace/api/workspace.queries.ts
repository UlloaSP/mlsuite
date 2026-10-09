import { queryOptions, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { infiniteCatalogOptions } from "@/shared/api/infinite-catalog";
import { getOrganizationAdminDashboard, getOrganizationPage } from "./organizations.api";
import {
  ORGANIZATION_CATALOG_PAGE_SIZE,
  ORGANIZATION_CATALOG_PAGE_QUERY_KEY,
  organizationAdminDashboardQueryKey,
} from "./workspace.keys";

export const organizationCatalogQueryOptions = (search: string, sort: string, enabled = true) =>
  infiniteCatalogOptions({
    queryKey: [...ORGANIZATION_CATALOG_PAGE_QUERY_KEY, "infinite", search, sort],
    queryFn: (page, signal) =>
      getOrganizationPage({ page, search, size: ORGANIZATION_CATALOG_PAGE_SIZE, sort }, signal),
    enabled,
  });

export const organizationAdminDashboardQueryOptions = (organizationId: number) =>
  queryOptions({
    queryKey: organizationAdminDashboardQueryKey(organizationId),
    queryFn: ({ signal }) => getOrganizationAdminDashboard(organizationId, signal),
    enabled: Boolean(organizationId),
  });

export const useOrganizationCatalogPageQuery = (search: string, sort: string, enabled = true) =>
  useInfiniteQuery(organizationCatalogQueryOptions(search, sort, enabled));
export const useOrganizationAdminDashboardQuery = (organizationId: number) =>
  useQuery(organizationAdminDashboardQueryOptions(organizationId));
